import { commandScore } from './score'
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

export function createCommand(options: CommandOptions = {}): CommandStore {
  const filter = options.filter ?? commandScore
  const shouldFilter = options.shouldFilter ?? true
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
  let visibleGroups: Set<string> = new Set()
  let initialized = false

  const listeners = new Set<() => void>()

  function notify(): void {
    for (const l of listeners) l()
  }

  function recompute(): void {
    // Score every item
    for (const item of items.values()) {
      if (!shouldFilter || search === '') {
        item.score = item.disabled ? 0 : 1
      } else {
        item.score = filter(item.value, search, item.keywords ?? [])
      }
    }

    // Build filteredOrder: visible items, score desc, then insertion order
    const visible: ItemData[] = []
    for (const item of items.values()) {
      if (item.forceMount || item.score > 0) visible.push(item)
    }
    visible.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.order - b.order
    })
    filteredOrder = visible.map((i) => i.value)
    visibleSet = new Set(filteredOrder)

    // visibleGroups: any group containing a visible item, plus forceMount groups
    visibleGroups = new Set()
    for (const g of groups.values()) {
      if (g.forceMount) visibleGroups.add(g.id)
    }
    for (const item of visible) {
      if (item.groupId) visibleGroups.add(item.groupId)
    }

    // Auto-correct selection if the previously-selected value is no longer visible.
    // Skip during initial recompute (respect options.value).
    // Skip if user has never made a selection (initial mount has no highlight).
    if (initialized && hasBeenSelected && !visibleSet.has(value)) {
      const next = filteredOrder[0] ?? ''
      if (next !== value) {
        value = next
        // Notify synchronously — the caller (e.g. setSearch, registerItem) will call
        // notify() afterwards, so subscribers observe the corrected state.
        options.onValueChange?.(value)
      }
    }
  }

  function getState(): CommandState {
    return {
      search,
      value,
      items,
      groups,
      filteredOrder,
      visibleSet,
      visibleGroups,
      isComposing,
      pointerSelection,
    }
  }

  function registerItem(input: ItemInput): () => void {
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
    items.set(input.value, data)
    recompute()
    notify()
    return () => {
      if (items.get(input.value) === data) {
        items.delete(input.value)
        recompute()
        notify()
      }
    }
  }

  function registerGroup(input: GroupInput): () => void {
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

  function updateItem(itemValue: string, patch: Partial<Omit<ItemInput, 'value'>>): void {
    const existing = items.get(itemValue)
    if (!existing) return
    items.set(itemValue, { ...existing, ...patch })
    recompute()
    notify()
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  // Stub mutations — implemented in later tasks
  function setSearch(next: string): void {
    if (next === search) return
    search = next
    recompute()
    options.onSearchChange?.(search)
    notify()
  }

  function setValue(next: string): void {
    if (next === value) return
    if (next !== '') hasBeenSelected = true
    value = next
    options.onValueChange?.(value)
    notify()
  }

  function currentIndex(): number {
    return filteredOrder.indexOf(value)
  }

  function selectFirst(): void {
    const first = filteredOrder[0]
    if (first === undefined) return
    setValue(first)
  }

  function selectLast(): void {
    const last = filteredOrder[filteredOrder.length - 1]
    if (last === undefined) return
    setValue(last)
  }

  function selectNext(): void {
    if (filteredOrder.length === 0) return
    const idx = currentIndex()
    if (idx === -1) {
      selectFirst()
      return
    }
    const nextIdx = idx + 1
    if (nextIdx >= filteredOrder.length) {
      const first = filteredOrder[0]
      if (options.loop && first !== undefined) setValue(first)
      return
    }
    const next = filteredOrder[nextIdx]
    if (next !== undefined) setValue(next)
  }

  function selectPrev(): void {
    if (filteredOrder.length === 0) return
    const idx = currentIndex()
    if (idx === -1) {
      selectLast()
      return
    }
    const prevIdx = idx - 1
    if (prevIdx < 0) {
      const last = filteredOrder[filteredOrder.length - 1]
      if (options.loop && last !== undefined) setValue(last)
      return
    }
    const prev = filteredOrder[prevIdx]
    if (prev !== undefined) setValue(prev)
  }

  function setComposing(next: boolean): void {
    if (next === isComposing) return
    isComposing = next
    notify()
  }
  function triggerSelect(event?: Event): void {
    if (value === '') return
    const item = items.get(value)
    if (!item || item.disabled) return
    item.onSelect?.(value, event)
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
  }
}
