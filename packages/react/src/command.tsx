import { type CommandFilter, type CommandStore, createCommand } from "@command-palette/core"
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef } from "react"
import { CommandA11yContext, CommandContext } from "./context"

/**
 * Props for the root command palette container.
 *
 * This component owns the command store, keyboard navigation, and the shared
 * selection/search state consumed by the rest of the primitives.
 */
export type CommandProps = {
  /** Accessible name used by the command input when it does not provide one. */
  label?: string
  /** Class name applied to the root element. */
  className?: string
  /** Controlled selected item value. */
  value?: string
  /** Initial selected item value when `value` is uncontrolled. */
  defaultValue?: string
  /** Controlled search query. */
  search?: string
  /** Initial search query when `search` is uncontrolled. */
  defaultSearch?: string
  /** Called when the selected item value changes. */
  onValueChange?: (value: string) => void
  /** Called when the search query changes. */
  onSearchChange?: (search: string) => void
  /** Custom item filtering implementation. */
  filter?: CommandFilter
  /** Wrap keyboard navigation from last item to first, and vice versa. */
  loop?: boolean
  /** Move selection as the pointer hovers items. */
  selectOnHover?: boolean
  /** Command palette content such as input, list, groups, and items. */
  children?: ReactNode
}

/**
 * Provides command palette state to all descendant primitives and wires up the
 * keyboard interactions used to move and activate items.
 */
export const Command = ({ label, className, children, ...options }: CommandProps): ReactNode => {
  const baseId = useId()
  // Create store once. We pass *initial* options only; controlled props are
  // synced via effects below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: store is intentionally created once
  const store = useMemo<CommandStore>(
    () =>
      createCommand({
        filter: options.filter,
        initialSearch: options.search ?? options.defaultSearch,
        initialValue: options.value ?? options.defaultValue,
        loop: options.loop,
        onSearchChange: options.onSearchChange,
        onValueChange: options.onValueChange,
        selectOnHover: options.selectOnHover,
      }),
    [],
  )

  // Sync controlled value
  const valueProp = options.value
  const lastValue = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (valueProp !== undefined && valueProp !== lastValue.current) {
      lastValue.current = valueProp
      store.setValue(valueProp)
    }
  }, [store, valueProp])

  // Sync controlled search
  const searchProp = options.search
  const lastSearch = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (searchProp !== undefined && searchProp !== lastSearch.current) {
      lastSearch.current = searchProp
      store.setSearch(searchProp)
    }
  }, [store, searchProp])

  useEffect(() => {
    store.updateOptions({
      filter: options.filter,
      loop: options.loop,
      onSearchChange: options.onSearchChange,
      onValueChange: options.onValueChange,
      selectOnHover: options.selectOnHover,
    })
  }, [
    store,
    options.filter,
    options.loop,
    options.onSearchChange,
    options.onValueChange,
    options.selectOnHover,
  ])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (store.getState().isComposing) return
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        store.selectNext()
        break
      case "ArrowUp":
        e.preventDefault()
        store.selectPrev()
        break
      case "Home":
        e.preventDefault()
        store.selectFirst()
        break
      case "End":
        e.preventDefault()
        store.selectLast()
        break
      case "Enter":
        e.preventDefault()
        store.triggerSelect(e.nativeEvent)
        break
    }
  }

  return (
    <CommandContext.Provider value={store}>
      <CommandA11yContext.Provider
        value={{
          getLabel: () => label,
          getItemId: (value) => `${baseId}-item-${encodeItemValue(value)}`,
          listId: `${baseId}-list`,
        }}
      >
        <div
          aria-label={label}
          className={className}
          command-palette-root=""
          onKeyDown={handleKeyDown}
          role="group"
        >
          {children}
        </div>
      </CommandA11yContext.Provider>
    </CommandContext.Provider>
  )
}

const encodeItemValue = (value: string): string => `${value.length}:${encodeURIComponent(value)}`
