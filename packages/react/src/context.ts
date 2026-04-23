import type { CommandState, CommandStore } from "@command-palette/core"
import type { Context } from "react"
import { createContext, useCallback, useContext, useSyncExternalStore } from "react"

export const CommandContext: Context<CommandStore | null> = createContext<CommandStore | null>(null)
export const CommandA11yContext: Context<{
  getLabel: () => string | undefined
  getItemId: (value: string) => string
  listId: string
} | null> = createContext<{
  getLabel: () => string | undefined
  getItemId: (value: string) => string
  listId: string
} | null>(null)

/**
 * When a <CommandItem> is rendered inside a <CommandGroup>, the group's
 * id is provided via this context so items auto-associate without the
 * consumer needing to pass a `groupId` prop explicitly.
 */
export const GroupContext: Context<string | null> = createContext<string | null>(null)

export const useCommandStore = (): CommandStore => {
  const store = useContext(CommandContext)
  if (!store) {
    throw new Error("command-palette: component must be rendered inside <Command>")
  }
  return store
}

export const useCommandA11y = (): {
  getLabel: () => string | undefined
  getItemId: (value: string) => string
  listId: string
} => {
  const a11y = useContext(CommandA11yContext)
  if (!a11y) {
    throw new Error("command-palette: component must be rendered inside <Command>")
  }
  return a11y
}

/**
 * Subscribe to a slice of command state. The selector receives the current
 * state object and should return a
 * primitive (or stable reference) — React compares with Object.is and skips
 * re-renders when the slice is unchanged. This is what fixes #377
 * (re-renders on every hover) when used per-item.
 */
export const useCommandSlice = <T>(selector: (state: CommandState) => T): T => {
  const store = useCommandStore()
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(selector, () => onStoreChange()),
    [store, selector],
  )
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
