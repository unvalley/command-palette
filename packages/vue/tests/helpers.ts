import { h } from 'vue'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '../src'

export const itemNode = (value: string, label: string, props: Record<string, unknown> = {}) =>
  h(CommandItem, { value, ...props }, { default: () => label })

export const groupNode = (
  heading: string,
  children: ReturnType<typeof h>[],
  props: Record<string, unknown> = {},
) =>
  h(
    CommandGroup,
    { heading, ...props },
    {
      default: () => children,
    },
  )

export const commandSlots = (children: ReturnType<typeof h>[]) => ({
  default: () => children,
})

export const commandWithInputSlots = (children: ReturnType<typeof h>[]) => ({
  default: () => [
    h(CommandInput, { placeholder: 'Search' }),
    h(
      CommandList,
      {},
      {
        default: () => children,
      },
    ),
  ],
})

export const baseMenuSlots = () =>
  commandWithInputSlots([itemNode('a', 'A'), itemNode('b', 'B'), itemNode('c', 'C')])

export { Command, CommandInput, CommandItem, CommandList }
