import { type CommandFilter, type CommandStore, createCommand } from '@command-palette/core'
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { CommandContext } from './context'

export type CommandProps = {
  label?: string
  className?: string
  value?: string
  defaultValue?: string
  search?: string
  defaultSearch?: string
  onValueChange?: (value: string) => void
  onSearchChange?: (search: string) => void
  filter?: CommandFilter
  loop?: boolean
  selectOnHover?: boolean
  children?: ReactNode
}

export const Command = ({ label, className, children, ...options }: CommandProps): ReactNode => {
  // Create store once. We pass *initial* options only; controlled props are
  // synced via effects below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: store is intentionally created once
  const store = useMemo<CommandStore>(
    () =>
      createCommand({
        filter: options.filter,
        initialSearch: options.search ?? options.defaultSearch,
        initialValue: options.value ?? options.defaultValue,
        loop: options.loop,
        onSearchChange: options.onSearchChange,
        onValueChange: options.onValueChange,
        selectOnHover: options.selectOnHover,
      }),
    [],
  )

  // Sync controlled value
  const valueProp = options.value
  const lastValue = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (valueProp !== undefined && valueProp !== lastValue.current) {
      lastValue.current = valueProp
      store.setValue(valueProp)
    }
  }, [store, valueProp])

  // Sync controlled search
  const searchProp = options.search
  const lastSearch = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (searchProp !== undefined && searchProp !== lastSearch.current) {
      lastSearch.current = searchProp
      store.setSearch(searchProp)
    }
  }, [store, searchProp])

  useEffect(() => {
    store.updateOptions({
      filter: options.filter,
      loop: options.loop,
      onSearchChange: options.onSearchChange,
      onValueChange: options.onValueChange,
      selectOnHover: options.selectOnHover,
    })
  }, [
    store,
    options.filter,
    options.loop,
    options.onSearchChange,
    options.onValueChange,
    options.selectOnHover,
  ])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (store.getState().isComposing) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        store.selectNext()
        break
      case 'ArrowUp':
        e.preventDefault()
        store.selectPrev()
        break
      case 'Home':
        e.preventDefault()
        store.selectFirst()
        break
      case 'End':
        e.preventDefault()
        store.selectLast()
        break
      case 'Enter':
        e.preventDefault()
        store.triggerSelect(e.nativeEvent)
        break
    }
  }

  return (
    <CommandContext.Provider value={store}>
      <div
        command-palette-root=""
        role="application"
        aria-label={label}
        className={className}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}
