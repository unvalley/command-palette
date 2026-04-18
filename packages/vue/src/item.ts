import { computed, defineComponent, h, inject, mergeProps, type PropType, watch } from 'vue'
import { GroupIdKey, useCommandId, useCommandSlice, useCommandStore } from './context'

export const commandItemProps = {
  value: {
    type: String,
    required: true,
  },
  keywords: Array as PropType<readonly string[]>,
  disabled: Boolean,
  forceMount: Boolean,
  groupId: String,
} as const

export type CommandItemProps = {
  value: string
  keywords?: readonly string[]
  disabled?: boolean
  forceMount?: boolean
  groupId?: string
}

export const CommandItem = defineComponent({
  name: 'CommandItem',
  inheritAttrs: false,
  props: commandItemProps,
  emits: {
    select: (_value: string, _event?: Event) => true,
  },
  setup(props, { attrs, emit, slots }) {
    const store = useCommandStore()
    const inheritedGroupId = inject(GroupIdKey, null)
    const resolvedGroupId = computed(() => props.groupId ?? inheritedGroupId ?? undefined)
    const id = useCommandId('item')

    watch(
      () => props.value,
      (value, _previousValue, onCleanup) => {
        const unregister = store.registerItem({
          value,
          keywords: props.keywords,
          disabled: props.disabled,
          forceMount: props.forceMount,
          groupId: resolvedGroupId.value,
          onSelect: (selectedValue, event) => emit('select', selectedValue, event),
        })

        onCleanup(unregister)
      },
      { immediate: true },
    )

    watch(
      [
        () => props.value,
        () => props.keywords,
        () => props.disabled,
        () => props.forceMount,
        resolvedGroupId,
      ],
      ([value, keywords, disabled, forceMount, groupId]) => {
        store.updateItem(value, { keywords, disabled, forceMount, groupId })
      },
      { immediate: true },
    )

    const isVisible = useCommandSlice((state) => state.visibleSet.has(props.value))
    const isSelected = useCommandSlice((state) => state.value === props.value)
    const selectOnHover = useCommandSlice((state) => state.selectOnHover)

    const handlePointerMove = (): void => {
      if (props.disabled) return
      if (!selectOnHover.value) return
      store.setValue(props.value)
    }

    const handleClick = (event: MouseEvent): void => {
      if (props.disabled) return
      store.setValue(props.value)
      store.triggerSelect(event)
    }

    return () => {
      if (!isVisible.value) return null

      return h(
        'div',
        mergeProps(
          {
            id,
            'cmdk-item': '',
            role: 'option',
            'aria-selected': isSelected.value ? 'true' : 'false',
            'aria-disabled': props.disabled ? 'true' : undefined,
            'data-selected': isSelected.value ? 'true' : undefined,
            'data-disabled': props.disabled ? 'true' : undefined,
            onPointermove: handlePointerMove,
            onClick: handleClick,
          },
          attrs,
        ),
        slots.default?.(),
      )
    }
  },
})
