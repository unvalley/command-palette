/** Default scorer signature. Return 0 to hide an item; > 0 to show (higher = better). */
export type FilterFn = (value: string, search: string, keywords: readonly string[]) => number

/** Behavior when arrow keys reach the boundary. */
export type PointerSelectionMode = 'hover' | 'click'

export interface ItemInput {
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

export interface ItemData extends ItemInput {
  /** Insertion order, used for stable secondary sort. */
  order: number
  /** Latest computed score. 0 means "not visible". */
  score: number
}

export interface GroupInput {
  /** Stable identity. Required. */
  id: string
  /** When true, group is always visible even if all its items are filtered out. */
  forceMount?: boolean
}

export interface GroupData extends GroupInput {
  order: number
}

export interface CommandOptions {
  /** Run the filter? Default true. Set false when caller filters externally. */
  shouldFilter?: boolean
  /** Custom scorer. Default = built-in command-score. */
  filter?: FilterFn
  /** Wrap arrow-key navigation past the ends. Default false. */
  loop?: boolean
  /** 'hover' (default) selects on pointer move; 'click' only on click (Raycast-style). */
  pointerSelection?: PointerSelectionMode
  /** Initial controlled value. */
  value?: string
  /** Initial controlled search. */
  search?: string
  /** Called whenever the highlighted value changes. */
  onValueChange?: (value: string) => void
  /** Called whenever the search query changes. */
  onSearchChange?: (search: string) => void
}

export interface CommandState {
  search: string
  /** Currently highlighted item's value. '' if none. */
  value: string
  items: ReadonlyMap<string, ItemData>
  groups: ReadonlyMap<string, GroupData>
  /** Visible items in display order (score desc, then insertion order). */
  filteredOrder: readonly string[]
  /** Same set as filteredOrder — for O(1) `has()` lookups by item subscribers. */
  visibleSet: ReadonlySet<string>
  /** Group ids that contain at least one visible item OR have forceMount. */
  visibleGroups: ReadonlySet<string>
  /** True while an IME composition is in progress (input adapter sets this). */
  isComposing: boolean
  /** Pointer selection mode set at construction time. */
  pointerSelection: PointerSelectionMode
}

export interface CommandStore {
  // Item / group registration
  registerItem(item: ItemInput): () => void
  registerGroup(group: GroupInput): () => void
  updateItem(value: string, patch: Partial<Omit<ItemInput, 'value'>>): void

  // State mutations
  setSearch(search: string): void
  setValue(value: string): void
  setComposing(isComposing: boolean): void

  // Selection navigation (operates over filteredOrder)
  selectNext(): void
  selectPrev(): void
  selectFirst(): void
  selectLast(): void
  triggerSelect(event?: Event): void

  // State access
  getState(): CommandState
  subscribe(listener: () => void): () => void
}
