import type { CommandFilter } from '@command-palette/core'
import type { ExtractPublicPropTypes, PropType } from 'vue'

export const commandProps = {
  label: String,
  modelValue: String,
  defaultValue: String,
  search: String,
  defaultSearch: String,
  filter: [String, Function] as PropType<CommandFilter>,
  loop: Boolean,
  selectOnHover: {
    type: null as unknown as PropType<boolean | undefined>,
    default: undefined,
  },
} as const

export type CommandProps = ExtractPublicPropTypes<typeof commandProps>
