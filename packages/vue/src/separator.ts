import { defineComponent, type ExtractPublicPropTypes, h, mergeProps } from 'vue'
import { useCommandSlice } from './context'

export const commandSeparatorProps = {
  alwaysRender: Boolean,
} as const

export type CommandSeparatorProps = ExtractPublicPropTypes<typeof commandSeparatorProps>

export const CommandSeparator = defineComponent({
  name: 'CommandSeparator',
  inheritAttrs: false,
  props: commandSeparatorProps,
  setup(props, { attrs }) {
    const search = useCommandSlice((state) => state.search)

    return () => {
      if (!props.alwaysRender && search.value !== '') return null

      return h(
        'div',
        mergeProps(
          {
            'cmdk-separator': '',
            role: 'separator',
          },
          attrs,
        ),
      )
    }
  },
})
