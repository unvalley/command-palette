import { defineComponent, type ExtractPublicPropTypes, h, mergeProps } from 'vue'

export const commandLoadingProps = {
  progress: Number,
} as const

export type CommandLoadingProps = ExtractPublicPropTypes<typeof commandLoadingProps>

export const CommandLoading = defineComponent({
  name: 'CommandLoading',
  inheritAttrs: false,
  props: commandLoadingProps,
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        mergeProps(
          {
            'cmdk-loading': '',
            role: 'progressbar',
            'aria-valuenow':
              props.progress != null ? Math.round(props.progress * 100).toString() : undefined,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
          },
          attrs,
        ),
        slots.default?.(),
      )
  },
})
