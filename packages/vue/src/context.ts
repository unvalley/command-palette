import type { CommandState, CommandStore } from "@command-palette/core"
import { type ComputedRef, computed, type InjectionKey, inject, type ShallowRef } from "vue"

export const CommandStoreKey: InjectionKey<CommandStore> = Symbol("command-palette-command-store")
export const CommandVersionKey: InjectionKey<ShallowRef<number>> = Symbol(
  "command-palette-command-version",
)
export const CommandA11yKey: InjectionKey<{
  getLabel: () => string | undefined
  getItemId: (value: string) => string
  listId: string
}> = Symbol("command-palette-command-a11y")
export const CommandIdAllocatorKey: InjectionKey<(prefix: string) => string> = Symbol(
  "command-palette-command-id-allocator",
)
export const GroupIdKey: InjectionKey<string | null> = Symbol("command-palette-group-id")

export const useCommandStore = (): CommandStore => {
  const store = inject(CommandStoreKey, null)
  if (!store) {
    throw new Error("command-palette: component must be rendered inside <Command>")
  }
  return store
}

export const useCommandSlice = <T>(selector: (state: CommandState) => T): ComputedRef<T> => {
  const store = useCommandStore()
  const version = inject(CommandVersionKey, null)
  if (!version) {
    throw new Error("command-palette: component must be rendered inside <Command>")
  }

  return computed(() => {
    version.value
    return selector(store.getState())
  })
}

export const useCommandId = (prefix: string): string => {
  const allocateId = inject(CommandIdAllocatorKey, null)
  if (!allocateId) {
    throw new Error("command-palette: component must be rendered inside <Command>")
  }

  return allocateId(prefix)
}

export const useCommandA11y = (): {
  getLabel: () => string | undefined
  getItemId: (value: string) => string
  listId: string
} => {
  const a11y = inject(CommandA11yKey, null)
  if (!a11y) {
    throw new Error("command-palette: component must be rendered inside <Command>")
  }

  return a11y
}
