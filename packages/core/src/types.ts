/** Default scorer signature. Return 0 to hide an item; > 0 to show (higher = better). */
export type FilterFn = (value: string, search: string, keywords: readonly string[]) => number

/** Built-in filters plus a custom scorer. */
export type CommandFilter = FilterFn | "fuzzy" | "contains" | "none"

export type ItemInput = {
  /** Stable identity. Required, can be ''. Never used as a CSS selector. */
  value: string
  /** Aliases that affect filter scoring. */
  keywords?: readonly string[]
  /** Group this item belongs to (must match a registered group's id). */
  groupId?: string
  /** When true, item is rendered but not selectable. */
  disabled?: boolean
  /** When true, item is always visible regardless of filter. */
  forceMount?: boolean
  /** Fired by triggerSelect() when this item is the current selection. */
  onSelect?: (value: string, event?: Event) => void
}

export type ItemData = ItemInput & {
  /** Insertion order, used for stable secondary sort. */
  order: number
  /** Latest computed score. 0 means "not visible". */
  score: number
}

export type GroupInput = {
  /** Stable identity. Required. */
  id: string
  /** When true, group is always visible even if all its items are filtered out. */
  forceMount?: boolean
}

export type GroupData = GroupInput & {
  order: number
}

export type CommandStoreOptions = {
  /** Initial highlighted value. */
  initialValue?: string
  /** Initial search query. */
  initialSearch?: string
  /** Built-in filter or custom scorer. Default 'fuzzy'. */
  filter?: CommandFilter
  /** Wrap arrow-key navigation past the ends. Default false. */
  loop?: boolean
  /** When true, pointer hover updates selection. Default true. */
  selectOnHover?: boolean
  /** Called whenever the highlighted value changes. */
  onValueChange?: (value: string) => void
  /** Called whenever the search query changes. */
  onSearchChange?: (search: string) => void
}

export type CommandState = {
  search: string
  /** Currently highlighted item's value. '' if none. */
  value: string
  /** Registered items. Treat as read-only and update through store methods only. */
  items: ReadonlyMap<string, ItemData>
  /** Registered groups. Treat as read-only and update through store methods only. */
  groups: ReadonlyMap<string, GroupData>
  /** Visible items in display order. Includes disabled items (they render but are not navigable). */
  filteredOrder: readonly string[]
  /** Same set as filteredOrder — for O(1) `has()` lookups. Includes disabled items. */
  visibleSet: ReadonlySet<string>
  /** Items available for keyboard navigation (excludes disabled). */
  navigableOrder: readonly string[]
  /** Group ids that contain at least one visible item OR have forceMount. */
  visibleGroups: ReadonlySet<string>
  /** True while an IME composition is in progress (input adapter sets this). */
  isComposing: boolean
  /** Whether pointer hover updates selection. */
  selectOnHover: boolean
}

export type CommandStoreListener = (state: CommandState, prevState: CommandState) => void

export type CommandSliceSubscribeOptions<T> = {
  /** Custom equality function used to detect slice changes. Defaults to `Object.is`. */
  equalityFn?: (a: T, b: T) => boolean
  /** Invoke the listener immediately with the current slice. */
  fireImmediately?: boolean
}

export type CommandStore = {
  // Item / group registration
  registerItem: (item: ItemInput) => () => void
  registerGroup: (group: GroupInput) => () => void
  updateItem: (value: string, patch: Partial<Omit<ItemInput, "value">>) => void
  updateOptions: (
    options: Partial<
      Pick<
        CommandStoreOptions,
        "filter" | "loop" | "selectOnHover" | "onSearchChange" | "onValueChange"
      >
    >,
  ) => void

  // State mutations
  setSearch: (search: string) => void
  setValue: (value: string) => void
  setComposing: (isComposing: boolean) => void

  // Selection navigation (operates over filteredOrder)
  selectNext: () => void
  selectPrev: () => void
  selectFirst: () => void
  selectLast: () => void
  triggerSelect: (event?: Event) => void

  // State access
  /** Current store snapshot. Treat the returned state as read-only. */
  getState: () => CommandState
  /** Initial store snapshot captured at creation time. Treat the returned state as read-only. */
  getInitialState: () => CommandState
  subscribe: {
    (listener: CommandStoreListener): () => void
    <T>(
      selector: (state: CommandState) => T,
      listener: (slice: T, prevSlice: T) => void,
      options?: CommandSliceSubscribeOptions<T>,
    ): () => void
  }
}
