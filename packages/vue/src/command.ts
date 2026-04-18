import { type CommandFilter, createCommand } from '@command-palette/core'
import {
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onScopeDispose,
  provide,
  shallowRef,
  watch,
} from 'vue'
import { CommandIdAllocatorKey, CommandStoreKey, CommandVersionKey } from './context'
import { commandProps, type CommandProps as SharedCommandProps } from './shared'

export type CommandProps = SharedCommandProps & {
  filter?: CommandFilter
}

export const Command = defineComponent({
  name: 'Command',
  inheritAttrs: false,
  props: commandProps,
  emits: {
    'update:modelValue': (_value: string) => true,
    'update:search': (_search: string) => true,
  },
  setup(props, { attrs, emit, slots }) {
    let nextId = 0
    const store = createCommand({
      filter: props.filter,
      initialSearch: props.search ?? props.defaultSearch,
      initialValue: props.modelValue ?? props.defaultValue,
      loop: props.loop,
      onSearchChange: (search) => emit('update:search', search),
      onValueChange: (value) => emit('update:modelValue', value),
      selectOnHover: props.selectOnHover,
    })

    const version = shallowRef(0)
    const unsubscribe = store.subscribe(() => {
      version.value += 1
    })

    onScopeDispose(unsubscribe)
    provide(CommandStoreKey, store)
    provide(CommandVersionKey, version)
    provide(CommandIdAllocatorKey, (prefix: string) => `command-palette-vue-${prefix}-${++nextId}`)

    onMounted(() => {
      if (props.modelValue !== undefined) {
        store.setValue(props.modelValue)
      }
      if (props.search !== undefined) {
        store.setSearch(props.search)
      }
    })

    watch(
      () => props.modelValue,
      (value) => {
        if (value !== undefined) store.setValue(value)
      },
      { flush: 'post', immediate: true },
    )

    watch(
      () => props.search,
      (search) => {
        if (search !== undefined) store.setSearch(search)
      },
      { flush: 'post', immediate: true },
    )

    watch(
      [() => props.filter, () => props.loop, () => props.selectOnHover],
      ([filter, loop, selectOnHover]) => {
        store.updateOptions({
          filter,
          loop,
          onSearchChange: (search) => emit('update:search', search),
          onValueChange: (value) => emit('update:modelValue', value),
          selectOnHover,
        })
      },
      { immediate: true },
    )

    const handleKeydown = (event: KeyboardEvent): void => {
      if (store.getState().isComposing) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          store.selectNext()
          break
        case 'ArrowUp':
          event.preventDefault()
          store.selectPrev()
          break
        case 'Home':
          event.preventDefault()
          store.selectFirst()
          break
        case 'End':
          event.preventDefault()
          store.selectLast()
          break
        case 'Enter':
          event.preventDefault()
          store.triggerSelect(event)
          break
      }
    }

    return () =>
      h(
        'div',
        mergeProps(
          {
            'command-palette-root': '',
            role: 'application',
            'aria-label': props.label,
            onKeydown: handleKeydown,
          },
          attrs,
        ),
        slots.default?.(),
      )
  },
})
