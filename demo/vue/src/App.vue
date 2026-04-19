<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: components are referenced from the Vue template
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@command-palette/vue"
import { onBeforeUnmount, onMounted, ref } from "vue"

type Action = {
  value: string
  label: string
  hint?: string
  keywords?: readonly string[]
}

// biome-ignore lint/correctness/noUnusedVariables: referenced from the Vue template
const frameworkLabel = "@command-palette/vue"
const open = ref(false)

// biome-ignore lint/correctness/noUnusedVariables: referenced from the Vue template
const navigation: readonly Action[] = [
  { value: "go-home", label: "Go to Home", hint: "G H" },
  { value: "go-projects", label: "Go to Projects", hint: "G P" },
  { value: "go-issues", label: "Go to Issues", hint: "G I", keywords: ["bugs", "tasks"] },
  { value: "go-settings", label: "Go to Settings", hint: "G S", keywords: ["prefs"] },
]

// biome-ignore lint/correctness/noUnusedVariables: referenced from the Vue template
const actions: readonly Action[] = [
  { value: "new-file", label: "New file", hint: "⌘N", keywords: ["create"] },
  { value: "save", label: "Save", hint: "⌘S" },
  { value: "duplicate", label: "Duplicate", hint: "⌘D" },
  { value: "delete", label: "Delete", keywords: ["remove", "trash"] },
]

// biome-ignore lint/correctness/noUnusedVariables: referenced from the Vue template
const account: readonly Action[] = [
  { value: "profile", label: "View profile", keywords: ["me", "account"] },
  { value: "sign-out", label: "Sign out", keywords: ["logout", "exit"] },
]

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    open.value = !open.value
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown)
})

// biome-ignore lint/correctness/noUnusedVariables: referenced from the Vue template
const run = (value: string): void => {
  open.value = false
}
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-20">
    <header class="space-y-4">
      <div class="max-w-2xl space-y-3">
        <h1 class="text-4xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-5xl">
          @command-palette/vue
        </h1>
        <p class="text-sm leading-7 text-zinc-600 sm:text-base">
          Library-agnostic command menu primitives, styled tailwindcss.
        </p>
      </div>
    </header>

    <section class="pt-2">
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-400"
          @click="open = true"
        >
          Open command menu
        </button>
        <p class="inline-flex items-center gap-2 text-sm text-zinc-500">
          <span>Shortcut</span>
          <kbd class="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700">
            ⌘
          </kbd>
          <kbd class="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-700">
            K
          </kbd>
        </p>
      </div>
    </section>

    <CommandDialog
      v-model:open="open"
      dialog-class="command-dialog m-auto w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-zinc-200 bg-white/95 p-0 text-zinc-950"
      label="Global Command Palette"
      loop
    >
      <CommandInput
        class="w-full border-b border-zinc-200 bg-transparent px-4 py-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
        placeholder="What do you want to do?"
      />
      <CommandList class="h-[360px] space-y-2 overflow-y-auto p-3">
        <CommandEmpty class="px-4 py-10 text-center text-sm text-zinc-400">
          No matching command.
        </CommandEmpty>

        <CommandGroup
          class="[&_[command-palette-group-heading]]:px-3 [&_[command-palette-group-heading]]:pb-2 [&_[command-palette-group-heading]]:pt-3 [&_[command-palette-group-heading]]:text-[11px] [&_[command-palette-group-heading]]:font-semibold [&_[command-palette-group-heading]]:uppercase [&_[command-palette-group-heading]]:tracking-[0.24em] [&_[command-palette-group-heading]]:text-zinc-400"
          heading="Navigation"
        >
          <CommandItem
            v-for="action in navigation"
            :key="action.value"
            class="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-950 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40"
            :value="action.value"
            :keywords="action.keywords"
            @select="run"
          >
            <span>{{ action.label }}</span>
            <span
              v-if="action.hint"
              class="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-500"
            >
              {{ action.hint }}
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator class="my-2 h-px bg-zinc-100" />

        <CommandGroup
          class="[&_[command-palette-group-heading]]:px-3 [&_[command-palette-group-heading]]:pb-2 [&_[command-palette-group-heading]]:pt-3 [&_[command-palette-group-heading]]:text-[11px] [&_[command-palette-group-heading]]:font-semibold [&_[command-palette-group-heading]]:uppercase [&_[command-palette-group-heading]]:tracking-[0.24em] [&_[command-palette-group-heading]]:text-zinc-400"
          heading="Actions"
        >
          <CommandItem
            v-for="action in actions"
            :key="action.value"
            class="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-950 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40"
            :value="action.value"
            :keywords="action.keywords"
            @select="run"
          >
            <span>{{ action.label }}</span>
            <span
              v-if="action.hint"
              class="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-500"
            >
              {{ action.hint }}
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator class="my-2 h-px bg-zinc-100" />

        <CommandGroup
          class="[&_[command-palette-group-heading]]:px-3 [&_[command-palette-group-heading]]:pb-2 [&_[command-palette-group-heading]]:pt-3 [&_[command-palette-group-heading]]:text-[11px] [&_[command-palette-group-heading]]:font-semibold [&_[command-palette-group-heading]]:uppercase [&_[command-palette-group-heading]]:tracking-[0.24em] [&_[command-palette-group-heading]]:text-zinc-400"
          heading="Account"
        >
          <CommandItem
            v-for="action in account"
            :key="action.value"
            class="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-950 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40"
            :value="action.value"
            :keywords="action.keywords"
            @select="run"
          >
            <span>{{ action.label }}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  </div>
</template>
