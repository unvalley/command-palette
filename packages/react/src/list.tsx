import type { HTMLAttributes, ReactNode, Ref } from 'react'

export type CommandListProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
  children?: ReactNode
}

export const CommandList = ({ ref, children, ...rest }: CommandListProps) => (
  <div ref={ref} command-palette-list="" role="listbox" {...rest}>
    {children}
  </div>
)
