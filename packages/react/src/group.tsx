import { type HTMLAttributes, type ReactNode, forwardRef, useEffect, useId } from 'react'
import { useCommandSlice, useCommandStore } from './context'

export interface GroupProps extends HTMLAttributes<HTMLDivElement> {
  heading?: ReactNode
  forceMount?: boolean
  children?: ReactNode
}

export const Group = forwardRef<HTMLDivElement, GroupProps>(function Group(
  { heading, forceMount, children, ...rest },
  ref,
) {
  const store = useCommandStore()
  const id = useId()

  useEffect(() => {
    return store.registerGroup({ id, forceMount })
  }, [store, id, forceMount])

  const isVisible = useCommandSlice((s) => s.getState().visibleGroups.has(id))

  return (
    <div
      ref={ref}
      cmdk-group=""
      role="presentation"
      hidden={!isVisible || undefined}
      data-group-id={id}
      {...rest}
    >
      {heading != null && (
        <div id={id} cmdk-group-heading="">
          {heading}
        </div>
      )}
      <div
        cmdk-group-items=""
        role="group"
        aria-labelledby={heading != null ? id : undefined}
      >
        {children}
      </div>
    </div>
  )
})
