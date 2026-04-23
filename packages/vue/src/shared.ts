import type { CommandFilter } from "@command-palette/core"
import type { PropType } from "vue"

type CommandPropsOptions = {
  label: StringConstructor
  modelValue: StringConstructor
  defaultValue: StringConstructor
  search: StringConstructor
  defaultSearch: StringConstructor
  filter: PropType<CommandFilter>
  loop: BooleanConstructor
  selectOnHover: {
    type: PropType<boolean | undefined>
    default: undefined
  }
}

export const commandProps: CommandPropsOptions = {
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

/**
 * Shared public props used by the root Vue command palette primitives.
 */
export type CommandProps = {
  /** Accessible name used by the command input when it does not provide one. */
  label?: string
  /** Controlled selected item value used with `v-model`. */
  modelValue?: string
  /** Initial selected item value when `modelValue` is uncontrolled. */
  defaultValue?: string
  /** Controlled search query. */
  search?: string
  /** Initial search query when `search` is uncontrolled. */
  defaultSearch?: string
  /** Custom item filtering implementation. */
  filter?: CommandFilter
  /** Wrap keyboard navigation from last item to first, and vice versa. */
  loop?: boolean
  /** Move selection as the pointer hovers items. */
  selectOnHover?: boolean
}
