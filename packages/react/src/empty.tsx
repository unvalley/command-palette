import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { useCommandSlice } from './context'

export type CommandEmptyProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
  children?: ReactNode
}

export const CommandEmpty = ({ ref, children, ...rest }: CommandEmptyProps) => {
  const isEmpty = useCommandSlice((s) => s.filteredOrder.length === 0)
  if (!isEmpty) return null
  return (
    <div ref={ref} cmdk-empty="" role="presentation" {...rest}>
      {children}
    </div>
  )
}
