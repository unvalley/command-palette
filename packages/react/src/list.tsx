import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'

export interface ListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export const List = forwardRef<HTMLDivElement, ListProps>(function List(
  { children, ...rest },
  ref,
) {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: cmdk list is navigated via keyboard from the input, not directly
    // biome-ignore lint/a11y/useSemanticElements: cmdk uses role="listbox" on div for styling flexibility
    <div ref={ref} cmdk-list="" role="listbox" {...rest}>
      {children}
    </div>
  )
})
