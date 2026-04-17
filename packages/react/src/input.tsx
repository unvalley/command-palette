import { type ChangeEvent, type CompositionEvent, type Ref, useRef } from 'react'
import { useCommandSlice, useCommandStore } from './context'

export type CommandInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> & {
  ref?: Ref<HTMLInputElement>
  /** Override the displayed value. If omitted, the store's search is used. */
  value?: string
  /** Called with the new search value (after IME composition completes). */
  onValueChange?: (value: string) => void
}

export const CommandInput = ({
  ref,
  value,
  onValueChange,
  onCompositionStart,
  onCompositionEnd,
  ...rest
}: CommandInputProps) => {
  const store = useCommandStore()
  const search = useCommandSlice((s) => s.getState().search)
  const hasVisibleItems = useCommandSlice((s) => s.getState().filteredOrder.length > 0)
  const pendingValueRef = useRef<string>('')

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (store.getState().isComposing) {
      pendingValueRef.current = e.target.value
      return
    }
    store.setSearch(e.target.value)
    onValueChange?.(e.target.value)
  }

  const handleCompositionStart = (e: CompositionEvent<HTMLInputElement>): void => {
    store.setComposing(true)
    pendingValueRef.current = (e.target as HTMLInputElement).value
    onCompositionStart?.(e)
  }

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>): void => {
    store.setComposing(false)
    const target = e.target as HTMLInputElement
    const finalValue = target.value || pendingValueRef.current
    store.setSearch(finalValue)
    onValueChange?.(finalValue)
    pendingValueRef.current = ''
    onCompositionEnd?.(e)
  }

  return (
    <input
      ref={ref}
      cmdk-input=""
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={hasVisibleItems}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      {...rest}
      value={value ?? search}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  )
}
