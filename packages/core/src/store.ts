import { normalize } from "./normalize"
import { commandBuiltInScorePrepared, prepareCommandScoreHaystack } from "./score"
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
} from "./types"

const isDev = process.env.NODE_ENV !== "production"
type BuiltInFilter = Exclude<CommandFilter, FilterFn>
type ScoringBuiltInFilter = Exclude<BuiltInFilter, "none">
type PreparedScoreHaystack = ReturnType<typeof prepareCommandScoreHaystack>

type DerivedCollections = {
  filteredOrder: string[]
  visibleSet: Set<string>
  navigableOrder: string[]
  navigableIndex: Map<string, number>
  visibleGroups: Set<string>
}

type UpdateItemResult = {
  changed: boolean
  invalidatePreparedScoreHaystack: boolean
  next: ItemData
}

const DEFAULT_FILTER: BuiltInFilter = "fuzzy"

const isBuiltInFilter = (filter: CommandFilter): filter is Exclude<CommandFilter, FilterFn> =>
  typeof filter === "string"

const deriveCollections = ({
  items,
  groups,
  filter,
  search,
  getPreparedScoreHaystack,
  onFilterError,
}: {
  items: ReadonlyMap<string, ItemData>
  groups: ReadonlyMap<string, GroupData>
  filter: CommandFilter
  search: string
  getPreparedScoreHaystack: (item: ItemData) => PreparedScoreHaystack
  onFilterError?: (item: ItemData, error: unknown) => void
}): DerivedCollections => {
  const filteredOrder: string[] = []
  const visibleSet = new Set<string>()
  const navigableOrder: string[] = []
  const navigableIndex = new Map<string, number>()
  const visibleGroups = new Set<string>()

  const includeItem = (item: ItemData): void => {
    filteredOrder.push(item.value)
    visibleSet.add(item.value)
    if (item.groupId) visibleGroups.add(item.groupId)
    if (!item.disabled) {
      navigableIndex.set(item.value, navigableOrder.length)
      navigableOrder.push(item.value)
    }
  }

  if (filter === "none" || search === "") {
    for (const item of items.values()) {
      item.score = 1
      includeItem(item)
    }
  } else {
    const normalizedSearch = isBuiltInFilter(filter) ? normalize(search) : ""
    const visibleItems: ItemData[] = []

    for (const item of items.values()) {
      item.score = scoreItem({
        item,
        filter,
        search,
        normalizedSearch,
        getPreparedScoreHaystack,
        onFilterError,
      })

      if (item.score > 0 || item.forceMount) {
        visibleItems.push(item)
      }
    }

    visibleItems.sort(compareByScore)

    for (const item of visibleItems) {
      includeItem(item)
    }
  }

  for (const group of groups.values()) {
    if (group.forceMount) visibleGroups.add(group.id)
  }

  return {
    filteredOrder,
    visibleSet,
    navigableOrder,
    navigableIndex,
    visibleGroups,
  }
}

const scoreItem = ({
  item,
  filter,
  search,
  normalizedSearch,
  getPreparedScoreHaystack,
  onFilterError,
}: {
  item: ItemData
  filter: ScoringBuiltInFilter | FilterFn
  search: string
  normalizedSearch: string
  getPreparedScoreHaystack: (item: ItemData) => PreparedScoreHaystack
  onFilterError?: (item: ItemData, error: unknown) => void
}): number => {
  try {
    return isBuiltInFilter(filter)
      ? commandBuiltInScorePrepared(
          getPreparedScoreHaystack(item),
          search,
          normalizedSearch,
          filter,
        )
      : filter(item.value, search, item.keywords ?? [])
  } catch (error) {
    onFilterError?.(item, error)
    return 0
  }
}

const compareByScore = (a: ItemData, b: ItemData): number => {
  if (b.score !== a.score) return b.score - a.score
  return a.order - b.order
}

const getBoundaryValue = (
  navigableOrder: readonly string[],
  boundary: "first" | "last",
): string | undefined => {
  return boundary === "first" ? navigableOrder[0] : navigableOrder[navigableOrder.length - 1]
}

const getAdjacentValue = (
  navigableOrder: readonly string[],
  currentIndex: number,
  direction: "next" | "prev",
  loop: boolean,
): string | undefined => {
  if (navigableOrder.length === 0) return undefined
  if (currentIndex === -1) {
    return getBoundaryValue(navigableOrder, direction === "next" ? "first" : "last")
  }

  const nextIndex = currentIndex + (direction === "next" ? 1 : -1)
  const nextValue = navigableOrder[nextIndex]
  if (nextValue !== undefined) return nextValue
  if (!loop) return undefined

  return getBoundaryValue(navigableOrder, direction === "next" ? "first" : "last")
}

const updateItemData = (
  existing: ItemData,
  patch: Partial<Omit<ItemInput, "value">>,
): UpdateItemResult => {
  let changed = false
  let invalidatePreparedScoreHaystack = false
  const next = { ...existing }

  if ("keywords" in patch && !Object.is(existing.keywords, patch.keywords)) {
    next.keywords = patch.keywords
    changed = true
    invalidatePreparedScoreHaystack = true
  }
  if ("groupId" in patch && !Object.is(existing.groupId, patch.groupId)) {
    next.groupId = patch.groupId
    changed = true
  }
  if ("disabled" in patch && !Object.is(existing.disabled, patch.disabled)) {
    next.disabled = patch.disabled
    changed = true
  }
  if ("forceMount" in patch && !Object.is(existing.forceMount, patch.forceMount)) {
    next.forceMount = patch.forceMount
    changed = true
  }
  if ("onSelect" in patch && !Object.is(existing.onSelect, patch.onSelect)) {
    next.onSelect = patch.onSelect
    changed = true
  }

  return {
    changed,
    invalidatePreparedScoreHaystack,
    next,
  }
}

export const createCommand = (options: CommandStoreOptions = {}): CommandStore => {
  let filter = options.filter ?? DEFAULT_FILTER
  let loop = options.loop ?? false
  let selectOnHover = options.selectOnHover ?? true
  let onValueChange = options.onValueChange
  let onSearchChange = options.onSearchChange

  let nextOrder = 0
  const items = new Map<string, ItemData>()
  const groups = new Map<string, GroupData>()
  let search = options.initialSearch ?? ""
  let value = options.initialValue ?? ""
  let hasBeenSelected = value !== "" // true if controlled with non-empty initial
  let isComposing = false
  let filteredOrder: string[] = []
  let visibleSet = new Set<string>()
  let navigableOrder: string[] = []
  let navigableIndex = new Map<string, number>()
  let visibleGroups = new Set<string>()
  let initialized = false

  const preparedScoreHaystacks = new Map<string, PreparedScoreHaystack>()

  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const l of listeners) l()
  }

  const recompute = (): void => {
    const nextCollections = deriveCollections({
      items,
      groups,
      filter,
      search,
      getPreparedScoreHaystack,
      onFilterError: (item, error) => {
        if (isDev) {
          console.warn(`command-palette: filter threw for value "${item.value}":`, error)
        }
      },
    })

    filteredOrder = nextCollections.filteredOrder
    visibleSet = nextCollections.visibleSet
    navigableOrder = nextCollections.navigableOrder
    navigableIndex = nextCollections.navigableIndex
    visibleGroups = nextCollections.visibleGroups

    // Auto-correct selection if the previously-selected value is no longer navigable.
    // Skip during initial recompute (respect options.initialValue).
    // Skip if user has never made a selection (initial mount has no highlight).
    if (initialized && hasBeenSelected && !navigableIndex.has(value)) {
      const next = navigableOrder[0] ?? ""
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
    if (typeof input.value !== "string") {
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
    if (typeof input.id !== "string") {
      throw new TypeError("command-palette: group id must be a string")
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

  const updateItem = (itemValue: string, patch: Partial<Omit<ItemInput, "value">>): void => {
    const existing = items.get(itemValue)
    if (!existing) return

    const nextItem = updateItemData(existing, patch)
    if (!nextItem.changed) return

    if (nextItem.invalidatePreparedScoreHaystack) {
      preparedScoreHaystacks.delete(itemValue)
    }

    items.set(itemValue, nextItem.next)
    recompute()
    notify()
  }

  const updateOptions = (
    patch: Partial<
      Pick<
        CommandStoreOptions,
        "filter" | "loop" | "selectOnHover" | "onSearchChange" | "onValueChange"
      >
    >,
  ): void => {
    const nextFilter = "filter" in patch ? (patch.filter ?? DEFAULT_FILTER) : filter
    const nextLoop = "loop" in patch ? (patch.loop ?? false) : loop
    const nextSelectOnHover =
      "selectOnHover" in patch ? (patch.selectOnHover ?? true) : selectOnHover
    const nextOnValueChange = "onValueChange" in patch ? patch.onValueChange : onValueChange
    const nextOnSearchChange = "onSearchChange" in patch ? patch.onSearchChange : onSearchChange

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
    if (next !== "") hasBeenSelected = true
    value = next
    onValueChange?.(value)
    notify()
  }

  const currentIndex = (): number => navigableIndex.get(value) ?? -1

  const selectFirst = (): void => {
    const first = getBoundaryValue(navigableOrder, "first")
    if (first === undefined) return
    setValue(first)
  }

  const selectLast = (): void => {
    const last = getBoundaryValue(navigableOrder, "last")
    if (last === undefined) return
    setValue(last)
  }

  const selectNext = (): void => {
    const next = getAdjacentValue(navigableOrder, currentIndex(), "next", loop)
    if (next !== undefined) setValue(next)
  }

  const selectPrev = (): void => {
    const prev = getAdjacentValue(navigableOrder, currentIndex(), "prev", loop)
    if (prev !== undefined) setValue(prev)
  }

  const setComposing = (next: boolean): void => {
    if (next === isComposing) return
    isComposing = next
    notify()
  }

  const triggerSelect = (event?: Event): void => {
    if (value === "") return
    const item = items.get(value)
    if (!item || item.disabled) return
    item.onSelect?.(value, event)
  }

  const getPreparedScoreHaystack = (item: ItemData): PreparedScoreHaystack => {
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
