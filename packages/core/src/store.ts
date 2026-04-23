import { normalize } from "./normalize"
import { commandBuiltInScorePrepared, prepareCommandScoreHaystack } from "./score"
import type {
  CommandFilter,
  CommandSliceSubscribeOptions,
  CommandState,
  CommandStore,
  CommandStoreListener,
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
  items: Map<string, ItemData>
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
  const nextItems = new Map<string, ItemData>()
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
      const nextItem = item.score === 1 ? item : { ...item, score: 1 }
      nextItems.set(nextItem.value, nextItem)
      includeItem(nextItem)
    }
  } else {
    const normalizedSearch = isBuiltInFilter(filter) ? normalize(search) : ""
    const visibleItems: ItemData[] = []

    for (const item of items.values()) {
      const nextScore = scoreItem({
        item,
        filter,
        search,
        normalizedSearch,
        getPreparedScoreHaystack,
        onFilterError,
      })
      const nextItem = item.score === nextScore ? item : { ...item, score: nextScore }
      nextItems.set(nextItem.value, nextItem)

      if (nextItem.score > 0 || nextItem.forceMount) {
        visibleItems.push(nextItem)
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
    items: nextItems,
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

const parseSliceSubscribeOptions = <T>(
  options: CommandSliceSubscribeOptions<T> = {},
): Required<CommandSliceSubscribeOptions<T>> => {
  return {
    equalityFn: options.equalityFn ?? Object.is,
    fireImmediately: options.fireImmediately ?? false,
  }
}

const withMapEntry = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V): Map<K, V> => {
  const next = new Map(map)
  next.set(key, value)
  return next
}

const withoutMapEntry = <K, V>(map: ReadonlyMap<K, V>, key: K): Map<K, V> => {
  const next = new Map(map)
  next.delete(key)
  return next
}

const resolveSelectedValue = ({
  value,
  hasValue,
  navigableIndex,
  navigableOrder,
  initialized,
  hasBeenSelected,
}: {
  value: string
  hasValue: boolean
  navigableIndex: ReadonlyMap<string, number>
  navigableOrder: readonly string[]
  initialized: boolean
  hasBeenSelected: boolean
}): { value: string; hasValue: boolean } => {
  if (!initialized || !hasBeenSelected || (hasValue && navigableIndex.has(value))) {
    return { value, hasValue }
  }

  const nextValue = navigableOrder[0]
  if (nextValue === undefined) {
    return { value: "", hasValue: false }
  }

  return { value: nextValue, hasValue: true }
}

const getClearedSelectionState = (state: CommandState): CommandState => ({
  ...state,
  value: "",
  hasValue: false,
})

export const createCommand = (options: CommandStoreOptions = {}): CommandStore => {
  let filter = options.filter ?? DEFAULT_FILTER
  let loop = options.loop ?? false
  let selectOnHover = options.selectOnHover ?? true
  let onValueChange = options.onValueChange
  let onSearchChange = options.onSearchChange

  const initialHasValue = options.initialValue !== undefined
  let nextOrder = 0
  let state: CommandState = {
    search: options.initialSearch ?? "",
    value: options.initialValue ?? "",
    hasValue: initialHasValue,
    items: new Map(),
    groups: new Map(),
    filteredOrder: [],
    visibleSet: new Set(),
    navigableOrder: [],
    visibleGroups: new Set(),
    isComposing: false,
    selectOnHover,
  }
  let navigableIndex = new Map<string, number>()
  let initialized = false
  let initialState: CommandState
  let hasBeenSelected = initialHasValue

  const preparedScoreHaystacks = new Map<string, PreparedScoreHaystack>()

  const listeners = new Set<CommandStoreListener>()

  const notify = (nextState: CommandState, prevState: CommandState): void => {
    for (const listener of listeners) listener(nextState, prevState)
  }

  const deriveState = (baseState: CommandState): DerivedCollections =>
    deriveCollections({
      items: baseState.items,
      groups: baseState.groups,
      filter,
      search: baseState.search,
      getPreparedScoreHaystack,
      onFilterError: (item, error) => {
        if (isDev) {
          console.warn(`command-palette: filter threw for value "${item.value}":`, error)
        }
      },
    })

  const applyDerivedState = (
    baseState: CommandState,
    derivedState: DerivedCollections,
  ): {
    nextState: CommandState
    nextNavigableIndex: Map<string, number>
    valueChanged: boolean
  } => {
    const resolvedSelection = resolveSelectedValue({
      value: baseState.value,
      hasValue: baseState.hasValue,
      navigableIndex: derivedState.navigableIndex,
      navigableOrder: derivedState.navigableOrder,
      initialized,
      hasBeenSelected,
    })

    return {
      nextState: {
        ...baseState,
        value: resolvedSelection.value,
        hasValue: resolvedSelection.hasValue,
        items: derivedState.items,
        filteredOrder: derivedState.filteredOrder,
        visibleSet: derivedState.visibleSet,
        navigableOrder: derivedState.navigableOrder,
        visibleGroups: derivedState.visibleGroups,
      },
      nextNavigableIndex: derivedState.navigableIndex,
      valueChanged:
        resolvedSelection.value !== baseState.value ||
        resolvedSelection.hasValue !== baseState.hasValue,
    }
  }

  const deriveNextState = (
    baseState: CommandState,
  ): { nextState: CommandState; nextNavigableIndex: Map<string, number>; valueChanged: boolean } =>
    applyDerivedState(baseState, deriveState(baseState))

  const commit = ({
    nextState,
    nextNavigableIndex = navigableIndex,
    notifySearchChange = false,
    notifyValueChange = false,
  }: {
    nextState: CommandState
    nextNavigableIndex?: Map<string, number>
    notifySearchChange?: boolean
    notifyValueChange?: boolean
  }): void => {
    const prevState = state
    state = nextState
    navigableIndex = nextNavigableIndex

    if (notifyValueChange) {
      onValueChange?.(state.value)
    }
    if (notifySearchChange) {
      onSearchChange?.(state.search)
    }

    notify(state, prevState)
  }

  const getState = (): CommandState => state

  const getInitialState = (): CommandState => initialState

  const commitDerivedState = (baseState: CommandState): void => {
    const { nextState, nextNavigableIndex, valueChanged } = deriveNextState(baseState)
    commit({
      nextState,
      nextNavigableIndex,
      notifyValueChange: valueChanged,
    })
  }

  const commitItemChange = ({
    nextItems,
    invalidatePreparedScoreHaystackFor,
  }: {
    nextItems: Map<string, ItemData>
    invalidatePreparedScoreHaystackFor?: string
  }): void => {
    if (invalidatePreparedScoreHaystackFor !== undefined) {
      preparedScoreHaystacks.delete(invalidatePreparedScoreHaystackFor)
    }

    commitDerivedState({ ...state, items: nextItems })
  }

  const commitGroupChange = (nextGroups: Map<string, GroupData>): void => {
    commitDerivedState({ ...state, groups: nextGroups })
  }

  const subscribeStore = (listener: CommandStoreListener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const registerItem = (input: ItemInput): (() => void) => {
    if (typeof input.value !== "string") {
      throw new TypeError(`command-palette: item value must be a string, got ${typeof input.value}`)
    }
    if (isDev && state.items.has(input.value)) {
      console.warn(
        `command-palette: duplicate item value "${input.value}". Last registration wins.`,
      )
    }
    const data: ItemData = {
      ...input,
      order: nextOrder++,
      score: 0,
    }
    commitItemChange({
      nextItems: withMapEntry(state.items, input.value, data),
      invalidatePreparedScoreHaystackFor: input.value,
    })
    return () => {
      if (state.items.get(input.value)?.order === data.order) {
        commitItemChange({
          nextItems: withoutMapEntry(state.items, input.value),
          invalidatePreparedScoreHaystackFor: input.value,
        })
      }
    }
  }

  const registerGroup = (input: GroupInput): (() => void) => {
    if (typeof input.id !== "string") {
      throw new TypeError("command-palette: group id must be a string")
    }
    if (isDev && state.groups.has(input.id)) {
      console.warn(`command-palette: duplicate group id "${input.id}". Last registration wins.`)
    }
    const data: GroupData = { ...input, order: nextOrder++ }
    commitGroupChange(withMapEntry(state.groups, input.id, data))
    return () => {
      if (state.groups.get(input.id)?.order === data.order) {
        commitGroupChange(withoutMapEntry(state.groups, input.id))
      }
    }
  }

  const updateItem = (itemValue: string, patch: Partial<Omit<ItemInput, "value">>): void => {
    const existing = state.items.get(itemValue)
    if (!existing) return

    const nextItem = updateItemData(existing, patch)
    if (!nextItem.changed) return

    if (nextItem.invalidatePreparedScoreHaystack) {
      commitItemChange({
        nextItems: withMapEntry(state.items, itemValue, nextItem.next),
        invalidatePreparedScoreHaystackFor: itemValue,
      })
      return
    }
    commitItemChange({ nextItems: withMapEntry(state.items, itemValue, nextItem.next) })
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

    const nextState = { ...state, selectOnHover: nextSelectOnHover }

    if (needsRecompute) {
      commitDerivedState(nextState)
      return
    }

    commit({ nextState })
  }

  const subscribe = (<T>(
    selectorOrListener: CommandStoreListener | ((storeState: CommandState) => T),
    maybeListener?: ((slice: T, prevSlice: T) => void) | undefined,
    options?: CommandSliceSubscribeOptions<T>,
  ): (() => void) => {
    if (!maybeListener) {
      return subscribeStore(selectorOrListener as CommandStoreListener)
    }

    const selector = selectorOrListener as (storeState: CommandState) => T
    const listener = maybeListener
    const { equalityFn, fireImmediately } = parseSliceSubscribeOptions(options)
    let currentSlice = selector(state)

    if (fireImmediately) {
      listener(currentSlice, currentSlice)
    }

    return subscribeStore((nextState) => {
      const nextSlice = selector(nextState)
      if (!equalityFn(currentSlice, nextSlice)) {
        const prevSlice = currentSlice
        currentSlice = nextSlice
        listener(nextSlice, prevSlice)
      }
    })
  }) as CommandStore["subscribe"]

  const setSearch = (next: string): void => {
    if (next === state.search) return
    const { nextState, nextNavigableIndex, valueChanged } = deriveNextState({
      ...state,
      search: next,
    })
    commit({
      nextState,
      nextNavigableIndex,
      notifySearchChange: true,
      notifyValueChange: valueChanged,
    })
  }

  const setValue = (next: string): void => {
    if (state.hasValue && next === state.value) return
    hasBeenSelected = true
    if (!navigableIndex.has(next)) {
      if (!state.hasValue) return
      commit({
        nextState: getClearedSelectionState(state),
        notifyValueChange: true,
      })
      return
    }
    commit({
      nextState: { ...state, value: next, hasValue: true },
      notifyValueChange: true,
    })
  }

  const currentIndex = (): number => {
    if (!state.hasValue) return -1
    return navigableIndex.get(state.value) ?? -1
  }

  const selectFirst = (): void => {
    const first = getBoundaryValue(state.navigableOrder, "first")
    if (first === undefined) return
    setValue(first)
  }

  const selectLast = (): void => {
    const last = getBoundaryValue(state.navigableOrder, "last")
    if (last === undefined) return
    setValue(last)
  }

  const selectNext = (): void => {
    const next = getAdjacentValue(state.navigableOrder, currentIndex(), "next", loop)
    if (next !== undefined) setValue(next)
  }

  const selectPrev = (): void => {
    const prev = getAdjacentValue(state.navigableOrder, currentIndex(), "prev", loop)
    if (prev !== undefined) setValue(prev)
  }

  const setComposing = (next: boolean): void => {
    if (next === state.isComposing) return
    commit({ nextState: { ...state, isComposing: next } })
  }

  const triggerSelect = (event?: Event): void => {
    if (!state.hasValue) return
    const item = state.items.get(state.value)
    if (!item || item.disabled) return
    item.onSelect?.(state.value, event)
  }

  const getPreparedScoreHaystack = (item: ItemData): PreparedScoreHaystack => {
    const cached = preparedScoreHaystacks.get(item.value)
    if (cached) return cached

    const prepared = prepareCommandScoreHaystack(item.value, item.keywords ?? [])
    preparedScoreHaystacks.set(item.value, prepared)
    return prepared
  }

  const { nextState, nextNavigableIndex } = deriveNextState(state)
  state = nextState
  navigableIndex = nextNavigableIndex
  initialState = state
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
    getInitialState,
    subscribe,
  }
}
