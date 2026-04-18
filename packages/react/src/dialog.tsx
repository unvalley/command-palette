import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Command, type CommandProps } from './command'

export type CommandDialogProps = CommandProps & {
  ref?: Ref<HTMLDialogElement>
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Class applied to the native `<dialog>` element. */
  dialogClassName?: string
  /**
   * Clear the search input when the dialog closes. Default true. Has no
   * effect when `search` is controlled by the consumer.
   */
  resetSearchOnClose?: boolean
  children?: ReactNode
}

/**
 * Wraps <Command> in a native <dialog> element. The browser provides
 * focus trap, ESC-to-close, return-focus, top-layer portal behavior,
 * aria-modal, and the ::backdrop pseudo-element for free.
 *
 * Requires a browser that supports <dialog>: Safari 15.4+, Chrome 37+,
 * Firefox 98+.
 */
export const CommandDialog = ({
  ref,
  open,
  onOpenChange,
  dialogClassName,
  resetSearchOnClose = true,
  children,
  // Pull search control out so we can manage the reset-on-close behavior
  // without disturbing a consumer that wants full control.
  search: searchProp,
  onSearchChange,
  ...commandProps
}: CommandDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isSearchControlled = searchProp !== undefined
  const [internalSearch, setInternalSearch] = useState('')
  const search = isSearchControlled ? searchProp : internalSearch

  const handleSearchChange = (next: string) => {
    if (!isSearchControlled) setInternalSearch(next)
    onSearchChange?.(next)
  }

  // Forward ref to the dialog element.
  useEffect(() => {
    if (!ref) return
    if (typeof ref === 'function') ref(dialogRef.current)
    else ref.current = dialogRef.current
  })

  // Sync `open` prop -> dialog imperative state.
  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  // Clear the search when the dialog closes, so the next open starts fresh.
  // Only applies when search is uncontrolled.
  useEffect(() => {
    if (!open && resetSearchOnClose && !isSearchControlled) {
      setInternalSearch('')
    }
  }, [open, resetSearchOnClose, isSearchControlled])

  // The native dialog fires a `close` event when the user presses ESC
  // or the element's `close()` is called. Mirror that back to the parent.
  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handleClose = () => onOpenChange(false)
    el.addEventListener('close', handleClose)
    return () => el.removeEventListener('close', handleClose)
  }, [onOpenChange])

  // Treat a click whose target is the <dialog> itself (not a descendant)
  // as a backdrop click — close the dialog.
  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onOpenChange(false)
  }

  // Native <dialog> should close on ESC via the `cancel` event, but some
  // browsers let the inner <input> swallow the ESC keydown before the
  // dialog can react. Intercept it explicitly.
  const handleKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Escape') return
    // Allow consumers to pre-empt (and respect IME composition).
    if (e.defaultPrevented || e.nativeEvent.isComposing) return
    e.preventDefault()
    onOpenChange(false)
  }

  return (
    <dialog
      ref={dialogRef}
      command-palette-dialog=""
      className={dialogClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Command search={search} onSearchChange={handleSearchChange} {...commandProps}>
        {children}
      </Command>
    </dialog>
  )
}
