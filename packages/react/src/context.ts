import type { CommandStore } from '@unvalley/cmdk-core'
import { createContext, useContext, useSyncExternalStore } from 'react'

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
 * Subscribe to a slice of command state. The selector should return a
 * primitive (or stable reference) — React compares with Object.is and skips
 * re-renders when the slice is unchanged. This is what fixes #377
 * (re-renders on every hover) when used per-item.
 */
export const useCommandSlice = <T>(selector: (store: CommandStore) => T): T => {
  const store = useCommandStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store),
    () => selector(store),
  )
}
