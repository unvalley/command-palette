import type { CommandState, CommandStore } from '@unvalley/cmdk-core'
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'

export const CommandContext = createContext<CommandStore | null>(null)

/**
 * When a <CommandItem> is rendered inside a <CommandGroup>, the group's
 * id is provided via this context so items auto-associate without the
 * consumer needing to pass a `groupId` prop explicitly.
 */
export const GroupContext = createContext<string | null>(null)

export const useCommandStore = (): CommandStore => {
  const store = useContext(CommandContext)
  if (!store) {
    throw new Error('cmdk: component must be rendered inside <Command>')
  }
  return store
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
    (onStoreChange: () => void) => store.subscribeSlice(selector, () => onStoreChange()),
    [store, selector],
  )
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
