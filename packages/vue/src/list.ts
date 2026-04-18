import { defineComponent, h, mergeProps } from 'vue'

export const CommandList = defineComponent({
  name: 'CommandList',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(
        'div',
        mergeProps(
          {
            'cmdk-list': '',
            role: 'listbox',
          },
          attrs,
        ),
        slots.default?.(),
      )
  },
})
