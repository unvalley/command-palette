<script setup lang="ts">
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@command-palette/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

type Action = {
  value: string
  label: string
  hint?: string
  keywords?: readonly string[]
}

const frameworkLabel = '@command-palette/vue'
const open = ref(false)
const log = ref<string[]>([])

const navigation: readonly Action[] = [
  { value: 'go-home', label: 'Go to Home', hint: 'G H' },
  { value: 'go-projects', label: 'Go to Projects', hint: 'G P' },
  { value: 'go-issues', label: 'Go to Issues', hint: 'G I', keywords: ['bugs', 'tasks'] },
  { value: 'go-settings', label: 'Go to Settings', hint: 'G S', keywords: ['prefs'] },
]

const actions: readonly Action[] = [
  { value: 'new-file', label: 'New file', hint: '⌘N', keywords: ['create'] },
  { value: 'save', label: 'Save', hint: '⌘S' },
  { value: 'duplicate', label: 'Duplicate', hint: '⌘D' },
  { value: 'delete', label: 'Delete', keywords: ['remove', 'trash'] },
]

const account: readonly Action[] = [
  { value: 'profile', label: 'View profile', keywords: ['me', 'account'] },
  { value: 'sign-out', label: 'Sign out', keywords: ['logout', 'exit'] },
]

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    open.value = !open.value
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

const run = (value: string): void => {
  log.value = [`Ran: ${value} (${new Date().toLocaleTimeString()})`, ...log.value].slice(0, 8)
  open.value = false
}
</script>

<template>
  <div class="page">
    <header>
      <h1>cmdk demo</h1>
      <p>
        Framework-agnostic command menu —
        <code>{{ frameworkLabel }}</code>
      </p>
    </header>

    <section class="hero">
      <button type="button" class="trigger" @click="open = true">Open command menu</button>
      <p class="hint">
        <span>or press </span>
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </p>
    </section>

    <section>
      <h2>Recent activity</h2>
      <p v-if="log.length === 0" class="muted">Select a command — activity will appear here.</p>
      <ul v-else class="log">
        <li v-for="line in log" :key="line">{{ line }}</li>
      </ul>
    </section>

    <CommandDialog v-model:open="open" label="Global command menu" loop>
      <CommandInput placeholder="What do you want to do?" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            v-for="action in navigation"
            :key="action.value"
            :value="action.value"
            :keywords="action.keywords"
            @select="run"
          >
            <span>{{ action.label }}</span>
            <span v-if="action.hint" class="hint-mono">{{ action.hint }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            v-for="action in actions"
            :key="action.value"
            :value="action.value"
            :keywords="action.keywords"
            @select="run"
          >
            <span>{{ action.label }}</span>
            <span v-if="action.hint" class="hint-mono">{{ action.hint }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem
            v-for="action in account"
            :key="action.value"
            :value="action.value"
            :keywords="action.keywords"
            @select="run"
          >
            {{ action.label }}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  </div>
</template>
