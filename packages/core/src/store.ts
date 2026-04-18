import { normalize } from './normalize'
import { commandBuiltInScorePrepared, prepareCommandScoreHaystack } from './score'
import type {
  CommandFilter,
  CommandState,
  CommandStore,
  CommandStoreOptions,
  FilterFn,
  GroupData,
  GroupInput,
  ItemData,
  ItemInput,
} from './types'

const isDev = process.env.NODE_ENV !== 'production'
const DEFAULT_FILTER: Exclude<CommandFilter, FilterFn> = 'fuzzy'

const isBuiltInFilter = (filter: CommandFilter): filter is Exclude<CommandFilter, FilterFn> =>
  typeof filter === 'string'

export const createCommand = (options: CommandStoreOptions = {}): CommandStore => {
  let filter = options.filter ?? DEFAULT_FILTER
  let loop = options.loop ?? false
  let selectOnHover = options.selectOnHover ?? true
  let onValueChange = options.onValueChange
  let onSearchChange = options.onSearchChange

  let nextOrder = 0
  const items = new Map<string, ItemData>()
  const groups = new Map<string, GroupData>()
  let search = options.initialSearch ?? ''
  let value = options.initialValue ?? ''
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

    if (filter === 'none' || search === '') {
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
      const normalizedSearch = isBuiltInFilter(filter) ? normalize(search) : ''
      const visible: ItemData[] = []

      for (const item of items.values()) {
        try {
          item.score = isBuiltInFilter(filter)
            ? commandBuiltInScorePrepared(
                getPreparedScoreHaystack(item),
                search,
                normalizedSearch,
                filter,
              )
            : filter(item.value, search, item.keywords ?? [])
        } catch (err) {
          if (isDev) {
            console.warn(`command-palette: filter threw for value "${item.value}":`, err)
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
    // Skip during initial recompute (respect options.initialValue).
    // Skip if user has never made a selection (initial mount has no highlight).
    if (initialized && hasBeenSelected && !navigableIndex.has(value)) {
      const next = navigableOrder[0] ?? ''
      if (next !== value) {
        value = next
        // Notify synchronously — the caller (e.g. setSearch, registerItem) will call
        // notify() afterwards, so subscribers observe the corrected state.
        onValueChange?.(value)
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
    selectOnHover,
  })

  const registerItem = (input: ItemInput): (() => void) => {
    if (typeof input.value !== 'string') {
      throw new TypeError(`command-palette: item value must be a string, got ${typeof input.value}`)
    }
    if (isDev && items.has(input.value)) {
      console.warn(
        `command-palette: duplicate item value "${input.value}". Last registration wins.`,
      )
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
      throw new TypeError('command-palette: group id must be a string')
    }
    if (isDev && groups.has(input.id)) {
      console.warn(`command-palette: duplicate group id "${input.id}". Last registration wins.`)
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

  const updateOptions = (
    patch: Partial<
      Pick<
        CommandStoreOptions,
        'filter' | 'loop' | 'selectOnHover' | 'onSearchChange' | 'onValueChange'
      >
    >,
  ): void => {
    const nextFilter = 'filter' in patch ? (patch.filter ?? DEFAULT_FILTER) : filter
    const nextLoop = 'loop' in patch ? (patch.loop ?? false) : loop
    const nextSelectOnHover =
      'selectOnHover' in patch ? (patch.selectOnHover ?? true) : selectOnHover
    const nextOnValueChange = 'onValueChange' in patch ? patch.onValueChange : onValueChange
    const nextOnSearchChange = 'onSearchChange' in patch ? patch.onSearchChange : onSearchChange

    const needsRecompute = nextFilter !== filter
    const needsNotify = needsRecompute || nextSelectOnHover !== selectOnHover

    filter = nextFilter
    loop = nextLoop
    selectOnHover = nextSelectOnHover
    onValueChange = nextOnValueChange
    onSearchChange = nextOnSearchChange

    if (!needsNotify) return

    if (needsRecompute) {
      recompute()
    }

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
    onSearchChange?.(search)
    notify()
  }

  const setValue = (next: string): void => {
    if (next === value) return
    if (next !== '') hasBeenSelected = true
    value = next
    onValueChange?.(value)
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
      if (loop) {
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
      if (loop) {
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
    updateOptions,
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
