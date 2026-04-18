import type { CommandState, CommandStore } from '@unvalley/cmdk-core'
import { type ComputedRef, computed, type InjectionKey, inject, type ShallowRef } from 'vue'

export const CommandStoreKey: InjectionKey<CommandStore> = Symbol('cmdk-command-store')
export const CommandVersionKey: InjectionKey<ShallowRef<number>> = Symbol('cmdk-command-version')
export const CommandIdAllocatorKey: InjectionKey<(prefix: string) => string> = Symbol(
  'cmdk-command-id-allocator',
)
export const GroupIdKey: InjectionKey<string | null> = Symbol('cmdk-group-id')

export const useCommandStore = (): CommandStore => {
  const store = inject(CommandStoreKey, null)
  if (!store) {
    throw new Error('cmdk: component must be rendered inside <Command>')
  }
  return store
}

export const useCommandSlice = <T>(selector: (state: CommandState) => T): ComputedRef<T> => {
  const store = useCommandStore()
  const version = inject(CommandVersionKey, null)
  if (!version) {
    throw new Error('cmdk: component must be rendered inside <Command>')
  }

  return computed(() => {
    version.value
    return selector(store.getState())
  })
}

export const useCommandId = (prefix: string): string => {
  const allocateId = inject(CommandIdAllocatorKey, null)
  if (!allocateId) {
    throw new Error('cmdk: component must be rendered inside <Command>')
  }

  return allocateId(prefix)
}
