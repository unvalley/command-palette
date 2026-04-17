import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@unvalley/cmdk-react'
import { useEffect, useState } from 'react'

type Action = {
  value: string
  label: string
  hint?: string
  keywords?: readonly string[]
}

const NAVIGATION: readonly Action[] = [
  { value: 'go-home', label: 'Go to Home', hint: 'G then H' },
  { value: 'go-projects', label: 'Go to Projects', hint: 'G then P' },
  { value: 'go-settings', label: 'Go to Settings', hint: 'G then S', keywords: ['prefs'] },
]

const ACTIONS: readonly Action[] = [
  { value: 'new-file', label: 'New file', hint: '⌘N', keywords: ['create'] },
  { value: 'save', label: 'Save', hint: '⌘S' },
  { value: 'duplicate', label: 'Duplicate', hint: '⌘D' },
  { value: 'delete', label: 'Delete', keywords: ['remove', 'trash'] },
]

const THEME: readonly Action[] = [
  { value: 'theme-light', label: 'Light', keywords: ['white'] },
  { value: 'theme-dark', label: 'Dark', keywords: ['black', 'night'] },
  { value: 'theme-system', label: 'System', keywords: ['auto'] },
]

export const App = () => {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const run = (value: string) => {
    setLog((l) => [`Ran: ${value} (${new Date().toLocaleTimeString()})`, ...l].slice(0, 8))
    setOpen(false)
  }

  return (
    <div className="page">
      <header>
        <h1>cmdk demo</h1>
        <p>
          Framework-agnostic command menu — <code>@unvalley/cmdk-react</code>
        </p>
      </header>

      <section className="hero">
        <button type="button" className="trigger" onClick={() => setOpen(true)}>
          Open command menu
        </button>
        <p className="hint">
          or press <kbd>⌘</kbd> <kbd>K</kbd>
        </p>
      </section>

      <section>
        <h2>Inline</h2>
        <p className="muted">Embedded directly on the page — no dialog.</p>
        <div className="inline-wrap">
          <Command label="Inline command menu" loop>
            <CommandInput placeholder="Type to filter…" />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {NAVIGATION.map((a) => (
                  <CommandItem key={a.value} value={a.value} keywords={a.keywords} onSelect={run}>
                    <span>{a.label}</span>
                    {a.hint && <span className="hint-mono">{a.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                {ACTIONS.map((a) => (
                  <CommandItem key={a.value} value={a.value} keywords={a.keywords} onSelect={run}>
                    <span>{a.label}</span>
                    {a.hint && <span className="hint-mono">{a.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </section>

      <section>
        <h2>Recent activity</h2>
        {log.length === 0 ? (
          <p className="muted">Select something — activity will appear here.</p>
        ) : (
          <ul className="log">
            {log.map((line, i) => (
              <li key={`${line}-${i}`}>{line}</li>
            ))}
          </ul>
        )}
      </section>

      <CommandDialog open={open} onOpenChange={setOpen} label="Global command menu" loop>
        <CommandInput placeholder="What do you want to do?" />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {NAVIGATION.map((a) => (
              <CommandItem key={a.value} value={a.value} keywords={a.keywords} onSelect={run}>
                <span>{a.label}</span>
                {a.hint && <span className="hint-mono">{a.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            {ACTIONS.map((a) => (
              <CommandItem key={a.value} value={a.value} keywords={a.keywords} onSelect={run}>
                <span>{a.label}</span>
                {a.hint && <span className="hint-mono">{a.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            {THEME.map((a) => (
              <CommandItem key={a.value} value={a.value} keywords={a.keywords} onSelect={run}>
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
