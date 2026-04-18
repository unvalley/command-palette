import { defineComponent, h, mergeProps } from 'vue'
import { useCommandSlice } from './context'

export const CommandEmpty = defineComponent({
  name: 'CommandEmpty',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const isEmpty = useCommandSlice((state) => state.filteredOrder.length === 0)

    return () => {
      if (!isEmpty.value) return null

      return h(
        'div',
        mergeProps(
          {
            'command-palette-empty': '',
            role: 'presentation',
          },
          attrs,
        ),
        slots.default?.(),
      )
    }
  },
})
