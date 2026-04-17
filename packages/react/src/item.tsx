import {
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useRef,
} from 'react'
import { useCommandSlice, useCommandStore } from './context'

export type CommandItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  ref?: Ref<HTMLDivElement>
  value: string
  keywords?: readonly string[]
  disabled?: boolean
  forceMount?: boolean
  groupId?: string
  onSelect?: (value: string, event?: Event) => void
  children?: ReactNode
}

export const CommandItem = ({
  ref,
  value,
  keywords,
  disabled,
  forceMount,
  groupId,
  onSelect,
  children,
  ...rest
}: CommandItemProps) => {
  const store = useCommandStore()
  const id = useId()

  // Stable refs so the registered onSelect always sees the latest closure.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Register on mount, unregister on unmount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit keywords/disabled/forceMount/groupId — they are patched via updateItem
  useEffect(() => {
    const unregister = store.registerItem({
      value,
      keywords,
      disabled,
      forceMount,
      groupId,
      onSelect: (v, e) => onSelectRef.current?.(v, e),
    })
    return unregister
  }, [store, value])

  // Patch other props that don't change identity.
  useEffect(() => {
    store.updateItem(value, { keywords, disabled, forceMount, groupId })
  }, [store, value, keywords, disabled, forceMount, groupId])

  const isVisible = useCommandSlice((s) => s.getState().visibleSet.has(value))
  const isSelected = useCommandSlice((s) => s.getState().value === value)
  const pointerMode = useCommandSlice((s) => s.getState().pointerSelection)

  if (!isVisible) return null

  const handlePointerMove = (): void => {
    if (disabled) return
    // Default mode is 'hover' (cmdk-compat). Only skip when explicitly 'click'.
    if (pointerMode === 'click') return
    store.setValue(value)
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (disabled) return
    store.setValue(value)
    store.triggerSelect(e.nativeEvent)
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: items are navigated via arrow keys on the root, not individually focused
    // biome-ignore lint/a11y/useFocusableInteractive: items are navigated via the input, not directly focused
    <div
      ref={ref}
      cmdk-item=""
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      data-selected={isSelected || undefined}
      data-disabled={disabled || undefined}
      {...rest}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}
