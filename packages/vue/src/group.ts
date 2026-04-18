import { defineComponent, h, mergeProps, provide, watch } from 'vue'
import { GroupIdKey, useCommandId, useCommandSlice, useCommandStore } from './context'

export const commandGroupProps = {
  heading: String,
  forceMount: Boolean,
} as const

export type CommandGroupProps = {
  heading?: string
  forceMount?: boolean
}

export const CommandGroup = defineComponent({
  name: 'CommandGroup',
  inheritAttrs: false,
  props: commandGroupProps,
  setup(props, { attrs, slots }) {
    const store = useCommandStore()
    const id = useCommandId('group')

    watch(
      () => props.forceMount,
      (forceMount, _previousValue, onCleanup) => {
        const unregister = store.registerGroup({ id, forceMount })
        onCleanup(unregister)
      },
      { immediate: true },
    )

    provide(GroupIdKey, id)

    const isVisible = useCommandSlice((state) => state.visibleGroups.has(id))

    return () => {
      const headingContent = slots.heading?.() ?? props.heading

      return h(
        'div',
        mergeProps(
          {
            'cmdk-group': '',
            role: 'presentation',
            hidden: !isVisible.value || undefined,
            'data-group-id': id,
          },
          attrs,
        ),
        [
          headingContent != null
            ? h(
                'div',
                {
                  id,
                  'cmdk-group-heading': '',
                },
                headingContent,
              )
            : null,
          h(
            'div',
            {
              'cmdk-group-items': '',
              role: 'group',
              'aria-labelledby': headingContent != null ? id : undefined,
            },
            slots.default?.(),
          ),
        ],
      )
    }
  },
})
