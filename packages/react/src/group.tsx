import { type HTMLAttributes, type ReactNode, type Ref, useEffect, useId } from 'react'
import { useCommandSlice, useCommandStore } from './context'

export type CommandGroupProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
  heading?: ReactNode
  forceMount?: boolean
  children?: ReactNode
}

export const CommandGroup = ({
  ref,
  heading,
  forceMount,
  children,
  ...rest
}: CommandGroupProps) => {
  const store = useCommandStore()
  const id = useId()

  useEffect(() => store.registerGroup({ id, forceMount }), [store, id, forceMount])

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
      <div cmdk-group-items="" role="group" aria-labelledby={heading != null ? id : undefined}>
        {children}
      </div>
    </div>
  )
}
