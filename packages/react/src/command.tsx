import { type CommandOptions, type CommandStore, createCommand } from '@unvalley/cmdk-core'
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { CommandContext } from './context'

export type CommandProps = CommandOptions & {
  label?: string
  className?: string
  children?: ReactNode
}

export const Command = ({ label, className, children, ...options }: CommandProps): ReactNode => {
  // Create store once. We pass *initial* options only; controlled props are
  // synced via effects below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: store is intentionally created once
  const store = useMemo<CommandStore>(() => createCommand(options), [])

  // Sync controlled value
  const valueProp = options.value
  const lastValue = useRef(valueProp)
  useEffect(() => {
    if (valueProp !== undefined && valueProp !== lastValue.current) {
      lastValue.current = valueProp
      store.setValue(valueProp)
    }
  }, [store, valueProp])

  // Sync controlled search
  const searchProp = options.search
  const lastSearch = useRef(searchProp)
  useEffect(() => {
    if (searchProp !== undefined && searchProp !== lastSearch.current) {
      lastSearch.current = searchProp
      store.setSearch(searchProp)
    }
  }, [store, searchProp])

  useEffect(() => {
    store.updateOptions({
      filter: options.filter,
      filterMode: options.filterMode,
      loop: options.loop,
      onSearchChange: options.onSearchChange,
      onValueChange: options.onValueChange,
      pointerSelection: options.pointerSelection,
    })
  }, [
    store,
    options.filter,
    options.filterMode,
    options.loop,
    options.onSearchChange,
    options.onValueChange,
    options.pointerSelection,
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
        cmdk-root=""
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
