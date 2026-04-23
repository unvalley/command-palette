import {
  type ChangeEvent,
  type CompositionEvent,
  type JSX,
  type Ref,
  useEffect,
  useRef,
} from "react"
import { useCommandA11y, useCommandSlice, useCommandStore } from "./context"

/**
 * Props for the search input.
 *
 * Native input attributes are forwarded, except `value` and `onChange`, which
 * are driven through the command palette store.
 */
export type CommandInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  /** Ref forwarded to the underlying `<input>`. */
  ref?: Ref<HTMLInputElement>
  /** Override the displayed value. If omitted, the store's search is used. */
  value?: string
  /** Called with the new search value (after IME composition completes). */
  onValueChange?: (value: string) => void
}

/** Binds a text input to the command palette search state. */
export const CommandInput = ({
  ref,
  value,
  onValueChange,
  onCompositionStart,
  onCompositionEnd,
  ...rest
}: CommandInputProps): JSX.Element => {
  const store = useCommandStore()
  const { getItemId, getLabel, listId } = useCommandA11y()
  const search = useCommandSlice((s) => s.search)
  const hasVisibleItems = useCommandSlice((s) => s.filteredOrder.length > 0)
  const activeValue = useCommandSlice((s) =>
    s.hasValue && s.navigableOrder.includes(s.value) ? s.value : undefined,
  )
  const pendingValueRef = useRef<string>("")
  const isControlled = value !== undefined
  const activeDescendant = activeValue === undefined ? undefined : getItemId(activeValue)
  const hasExplicitLabel = rest["aria-label"] !== undefined || rest["aria-labelledby"] !== undefined
  const defaultAriaLabel = hasExplicitLabel ? undefined : getLabel()

  useEffect(() => {
    if (value === undefined) return
    if (store.getState().search === value) return
    store.setSearch(value)
  }, [store, value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (store.getState().isComposing) {
      pendingValueRef.current = e.target.value
      return
    }
    if (!isControlled) {
      store.setSearch(e.target.value)
    }
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
    if (!isControlled) {
      store.setSearch(finalValue)
    }
    onValueChange?.(finalValue)
    pendingValueRef.current = ""
    onCompositionEnd?.(e)
  }

  return (
    <input
      aria-activedescendant={activeDescendant}
      aria-autocomplete="list"
      aria-controls={listId}
      aria-expanded={hasVisibleItems}
      aria-label={defaultAriaLabel}
      autoComplete="off"
      autoCorrect="off"
      command-palette-input=""
      ref={ref}
      role="combobox"
      spellCheck={false}
      {...rest}
      onChange={handleChange}
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      value={value ?? search}
    />
  )
}
