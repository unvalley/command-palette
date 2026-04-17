import { normalize } from './normalize'
import { commandBuiltInScorePrepared, prepareCommandScoreHaystack } from './score'
import type {
  CommandOptions,
  CommandState,
  CommandStore,
  GroupData,
  GroupInput,
  ItemData,
  ItemInput,
} from './types'

const isDev = process.env.NODE_ENV !== 'production'

export const createCommand = (options: CommandOptions = {}): CommandStore => {
  const filterMode = options.filterMode ?? 'fuzzy'
  const filter = filterMode === 'none' ? null : options.filter
  const pointerSelection = options.pointerSelection ?? 'hover'

  let nextOrder = 0
  const items = new Map<string, ItemData>()
  const groups = new Map<string, GroupData>()
  let search = options.search ?? ''
  let value = options.value ?? ''
  let hasBeenSelected = value !== '' // true if controlled with non-empty initial
  let isComposing = false
  let filteredOrder: string[] = []
  let visibleSet: Set<string> = new Set()
  let navigableOrder: string[] = []
  let navigableIndex: Map<string, number> = new Map()
  let visibleGroups: Set<string> = new Set()
  let initialized = false

  const preparedScoreHaystacks = new Map<string, ReturnType<typeof prepareCommandScoreHaystack>>()

  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const l of listeners) l()
  }

  const recompute = (): void => {
    const nextFilteredOrder: string[] = []
    const nextVisibleSet: Set<string> = new Set()
    const nextNavigableOrder: string[] = []
    const nextNavigableIndex: Map<string, number> = new Map()
    const nextVisibleGroups: Set<string> = new Set()

    if (filterMode === 'none' || search === '') {
      for (const item of items.values()) {
        item.score = 1
        nextFilteredOrder.push(item.value)
        nextVisibleSet.add(item.value)
        if (item.groupId) nextVisibleGroups.add(item.groupId)
        if (!item.disabled) {
          nextNavigableIndex.set(item.value, nextNavigableOrder.length)
          nextNavigableOrder.push(item.value)
        }
      }
    } else {
      const normalizedSearch = filter == null ? normalize(search) : ''
      const visible: ItemData[] = []

      for (const item of items.values()) {
        try {
          item.score =
            filter == null
              ? commandBuiltInScorePrepared(
                  getPreparedScoreHaystack(item),
                  search,
                  normalizedSearch,
                  filterMode,
                )
              : filter(item.value, search, item.keywords ?? [])
        } catch (err) {
          if (isDev) {
            console.warn(`cmdk: filter threw for value "${item.value}":`, err)
          }
          item.score = 0
        }

        if (item.forceMount || item.score > 0) visible.push(item)
      }

      visible.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.order - b.order
      })

      for (const item of visible) {
        nextFilteredOrder.push(item.value)
        nextVisibleSet.add(item.value)
        if (item.groupId) nextVisibleGroups.add(item.groupId)
        if (!item.disabled) {
          nextNavigableIndex.set(item.value, nextNavigableOrder.length)
          nextNavigableOrder.push(item.value)
        }
      }
    }

    for (const g of groups.values()) {
      if (g.forceMount) nextVisibleGroups.add(g.id)
    }

    filteredOrder = nextFilteredOrder
    visibleSet = nextVisibleSet
    navigableOrder = nextNavigableOrder
    navigableIndex = nextNavigableIndex
    visibleGroups = nextVisibleGroups

    // Auto-correct selection if the previously-selected value is no longer navigable.
    // Skip during initial recompute (respect options.value).
    // Skip if user has never made a selection (initial mount has no highlight).
    if (initialized && hasBeenSelected && !navigableIndex.has(value)) {
      const next = navigableOrder[0] ?? ''
      if (next !== value) {
        value = next
        // Notify synchronously — the caller (e.g. setSearch, registerItem) will call
        // notify() afterwards, so subscribers observe the corrected state.
        options.onValueChange?.(value)
      }
    }
  }

  const getState = (): CommandState => ({
    search,
    value,
    items,
    groups,
    filteredOrder,
    visibleSet,
    navigableOrder,
    visibleGroups,
    isComposing,
    pointerSelection,
  })

  const registerItem = (input: ItemInput): (() => void) => {
    if (typeof input.value !== 'string') {
      throw new TypeError(`cmdk: item value must be a string, got ${typeof input.value}`)
    }
    if (isDev && items.has(input.value)) {
      console.warn(`cmdk: duplicate item value "${input.value}". Last registration wins.`)
    }
    const data: ItemData = {
      ...input,
      order: nextOrder++,
      score: 0,
    }
    preparedScoreHaystacks.delete(input.value)
    items.set(input.value, data)
    recompute()
    notify()
    return () => {
      if (items.get(input.value) === data) {
        items.delete(input.value)
        preparedScoreHaystacks.delete(input.value)
        recompute()
        notify()
      }
    }
  }

  const registerGroup = (input: GroupInput): (() => void) => {
    if (typeof input.id !== 'string') {
      throw new TypeError('cmdk: group id must be a string')
    }
    if (isDev && groups.has(input.id)) {
      console.warn(`cmdk: duplicate group id "${input.id}". Last registration wins.`)
    }
    const data: GroupData = { ...input, order: nextOrder++ }
    groups.set(input.id, data)
    recompute()
    notify()
    return () => {
      if (groups.get(input.id) === data) {
        groups.delete(input.id)
        recompute()
        notify()
      }
    }
  }

  const updateItem = (itemValue: string, patch: Partial<Omit<ItemInput, 'value'>>): void => {
    const existing = items.get(itemValue)
    if (!existing) return
    let changed = false
    const next = { ...existing }

    if ('keywords' in patch && !Object.is(existing.keywords, patch.keywords)) {
      next.keywords = patch.keywords
      preparedScoreHaystacks.delete(itemValue)
      changed = true
    }
    if ('groupId' in patch && !Object.is(existing.groupId, patch.groupId)) {
      next.groupId = patch.groupId
      changed = true
    }
    if ('disabled' in patch && !Object.is(existing.disabled, patch.disabled)) {
      next.disabled = patch.disabled
      changed = true
    }
    if ('forceMount' in patch && !Object.is(existing.forceMount, patch.forceMount)) {
      next.forceMount = patch.forceMount
      changed = true
    }
    if ('onSelect' in patch && !Object.is(existing.onSelect, patch.onSelect)) {
      next.onSelect = patch.onSelect
      changed = true
    }

    if (!changed) return

    items.set(itemValue, next)
    recompute()
    notify()
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const subscribeSlice = <T>(
    selector: (state: CommandState) => T,
    listener: (slice: T) => void,
    isEqual: (a: T, b: T) => boolean = Object.is,
  ): (() => void) => {
    let prev = selector(getState())
    return subscribe(() => {
      const next = selector(getState())
      if (!isEqual(prev, next)) {
        prev = next
        listener(next)
      }
    })
  }

  const setSearch = (next: string): void => {
    if (next === search) return
    search = next
    recompute()
    options.onSearchChange?.(search)
    notify()
  }

  const setValue = (next: string): void => {
    if (next === value) return
    if (next !== '') hasBeenSelected = true
    value = next
    options.onValueChange?.(value)
    notify()
  }

  const currentIndex = (): number => navigableIndex.get(value) ?? -1

  const selectFirst = (): void => {
    const first = navigableOrder[0]
    if (first === undefined) return
    setValue(first)
  }

  const selectLast = (): void => {
    const last = navigableOrder[navigableOrder.length - 1]
    if (last === undefined) return
    setValue(last)
  }

  const selectNext = (): void => {
    if (navigableOrder.length === 0) return
    const idx = currentIndex()
    if (idx === -1) {
      selectFirst()
      return
    }
    const nextIdx = idx + 1
    if (nextIdx >= navigableOrder.length) {
      if (options.loop) {
        const first = navigableOrder[0]
        if (first !== undefined) setValue(first)
      }
      return
    }
    const next = navigableOrder[nextIdx]
    if (next !== undefined) setValue(next)
  }

  const selectPrev = (): void => {
    if (navigableOrder.length === 0) return
    const idx = currentIndex()
    if (idx === -1) {
      selectLast()
      return
    }
    const prevIdx = idx - 1
    if (prevIdx < 0) {
      if (options.loop) {
        const last = navigableOrder[navigableOrder.length - 1]
        if (last !== undefined) setValue(last)
      }
      return
    }
    const prev = navigableOrder[prevIdx]
    if (prev !== undefined) setValue(prev)
  }

  const setComposing = (next: boolean): void => {
    if (next === isComposing) return
    isComposing = next
    notify()
  }

  const triggerSelect = (event?: Event): void => {
    if (value === '') return
    const item = items.get(value)
    if (!item || item.disabled) return
    item.onSelect?.(value, event)
  }

  const getPreparedScoreHaystack = (
    item: ItemData,
  ): ReturnType<typeof prepareCommandScoreHaystack> => {
    const cached = preparedScoreHaystacks.get(item.value)
    if (cached) return cached

    const prepared = prepareCommandScoreHaystack(item.value, item.keywords ?? [])
    preparedScoreHaystacks.set(item.value, prepared)
    return prepared
  }

  recompute()
  initialized = true

  return {
    registerItem,
    registerGroup,
    updateItem,
    setSearch,
    setValue,
    setComposing,
    selectNext,
    selectPrev,
    selectFirst,
    selectLast,
    triggerSelect,
    getState,
    subscribe,
    subscribeSlice,
  }
}
