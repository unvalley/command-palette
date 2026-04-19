import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@command-palette/react"
import type { JSX } from "react"
import { useEffect, useState } from "react"

type Action = {
  value: string
  label: string
  hint?: string
  keywords?: readonly string[]
}

const NAVIGATION: readonly Action[] = [
  { value: "go-home", label: "Go to Home", hint: "G H" },
  { value: "go-projects", label: "Go to Projects", hint: "G P" },
  { value: "go-issues", label: "Go to Issues", hint: "G I", keywords: ["bugs", "tasks"] },
  { value: "go-settings", label: "Go to Settings", hint: "G S", keywords: ["prefs"] },
]

const ACTIONS: readonly Action[] = [
  { value: "new-file", label: "New file", hint: "⌘N", keywords: ["create"] },
  { value: "save", label: "Save", hint: "⌘S" },
  { value: "duplicate", label: "Duplicate", hint: "⌘D" },
  { value: "delete", label: "Delete", keywords: ["remove", "trash"] },
]

const ACCOUNT: readonly Action[] = [
  { value: "profile", label: "View profile", keywords: ["me", "account"] },
  { value: "sign-out", label: "Sign out", keywords: ["logout", "exit"] },
]

const commandDialogClassName =
  "command-dialog m-auto w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-zinc-200 bg-white/95 p-0 text-zinc-950"

const commandListClassName = "h-[360px] space-y-2 overflow-y-auto p-3"
const commandInputClassName =
  "w-full border-b border-zinc-200 bg-transparent px-4 py-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"

const commandGroupClassName =
  "[&_[command-palette-group-heading]]:px-3 [&_[command-palette-group-heading]]:pb-2 [&_[command-palette-group-heading]]:pt-3 [&_[command-palette-group-heading]]:text-[11px] [&_[command-palette-group-heading]]:font-semibold [&_[command-palette-group-heading]]:uppercase [&_[command-palette-group-heading]]:tracking-[0.24em] [&_[command-palette-group-heading]]:text-zinc-400"

const commandItemClassName =
  "flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-950 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40"

const hintClassName =
  "rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-500"

export const App = (): JSX.Element => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const run = (value: string) => {
    setOpen(false)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-20">
      <header className="space-y-4">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-5xl">
            @command-palette/react
          </h1>
          <p className="text-sm leading-7 text-zinc-600 sm:text-base">
            Library-agnostic command menu primitives, styled tailwindcss.
          </p>
        </div>
      </header>

      <section className="pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-[#00d8ff] px-5 py-3 text-sm font-medium text-[#003847] transition hover:bg-[#33e1ff]"
            onClick={() => setOpen(true)}
          >
            Open command menu
          </button>
          <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <span>Shortcut</span>
            <kbd className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700">
              ⌘
            </kbd>
            <kbd className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700">
              K
            </kbd>
          </p>
        </div>
      </section>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Palette"
        loop
        dialogClassName={commandDialogClassName}
      >
        <CommandInput className={commandInputClassName} placeholder="What do you want to do?" />
        <CommandList className={commandListClassName}>
          <CommandEmpty className="px-4 py-10 text-center text-sm text-zinc-400">
            No matching command.
          </CommandEmpty>
          <CommandGroup className={commandGroupClassName} heading="Navigation">
            {NAVIGATION.map((action) => (
              <CommandItem
                key={action.value}
                className={commandItemClassName}
                value={action.value}
                keywords={action.keywords}
                onSelect={run}
              >
                <span>{action.label}</span>
                {action.hint && <span className={hintClassName}>{action.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="my-2 h-px bg-zinc-100" />
          <CommandGroup className={commandGroupClassName} heading="Actions">
            {ACTIONS.map((action) => (
              <CommandItem
                key={action.value}
                className={commandItemClassName}
                value={action.value}
                keywords={action.keywords}
                onSelect={run}
              >
                <span>{action.label}</span>
                {action.hint && <span className={hintClassName}>{action.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="my-2 h-px bg-zinc-100" />
          <CommandGroup className={commandGroupClassName} heading="Account">
            {ACCOUNT.map((action) => (
              <CommandItem
                key={action.value}
                className={commandItemClassName}
                value={action.value}
                keywords={action.keywords}
                onSelect={run}
              >
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
