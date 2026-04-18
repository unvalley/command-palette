import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@command-palette/vue'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'

type Action = {
  value: string
  label: string
  hint?: string
  keywords?: readonly string[]
}

const NAVIGATION: readonly Action[] = [
  { value: 'go-home', label: 'Go to Home', hint: 'G H' },
  { value: 'go-projects', label: 'Go to Projects', hint: 'G P' },
  { value: 'go-issues', label: 'Go to Issues', hint: 'G I', keywords: ['bugs', 'tasks'] },
  { value: 'go-settings', label: 'Go to Settings', hint: 'G S', keywords: ['prefs'] },
]

const ACTIONS: readonly Action[] = [
  { value: 'new-file', label: 'New file', hint: '⌘N', keywords: ['create'] },
  { value: 'save', label: 'Save', hint: '⌘S' },
  { value: 'duplicate', label: 'Duplicate', hint: '⌘D' },
  { value: 'delete', label: 'Delete', keywords: ['remove', 'trash'] },
]

const ACCOUNT: readonly Action[] = [
  { value: 'profile', label: 'View profile', keywords: ['me', 'account'] },
  { value: 'sign-out', label: 'Sign out', keywords: ['logout', 'exit'] },
]

const renderAction = (action: Action, run: (value: string) => void) =>
  h(
    CommandItem,
    {
      key: action.value,
      value: action.value,
      keywords: action.keywords,
      onSelect: run,
    },
    {
      default: () => [
        h('span', action.label),
        action.hint ? h('span', { class: 'hint-mono' }, action.hint) : null,
      ],
    },
  )

export const App = defineComponent({
  name: 'VueDemoApp',
  setup() {
    const open = ref(false)
    const log = ref<string[]>([])
    const frameworkLabel = computed(() => '@command-palette/vue')

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        open.value = !open.value
      }
    }

    onMounted(() => {
      document.addEventListener('keydown', onKey)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', onKey)
    })

    const run = (value: string): void => {
      log.value = [`Ran: ${value} (${new Date().toLocaleTimeString()})`, ...log.value].slice(0, 8)
      open.value = false
    }

    return () =>
      h('div', { class: 'page' }, [
        h('header', [
          h('h1', 'cmdk demo'),
          h('p', ['Framework-agnostic command menu — ', h('code', frameworkLabel.value)]),
        ]),
        h('section', { class: 'hero' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'trigger',
              onClick: () => {
                open.value = true
              },
            },
            'Open command menu',
          ),
          h('p', { class: 'hint' }, [h('span', 'or press '), h('kbd', '⌘'), ' ', h('kbd', 'K')]),
        ]),
        h('section', [
          h('h2', 'Recent activity'),
          log.value.length === 0
            ? h('p', { class: 'muted' }, 'Select a command — activity will appear here.')
            : h(
                'ul',
                { class: 'log' },
                log.value.map((line) => h('li', { key: line }, line)),
              ),
        ]),
        h(
          CommandDialog,
          {
            open: open.value,
            label: 'Global command menu',
            loop: true,
            'onUpdate:open': (nextOpen: boolean) => {
              open.value = nextOpen
            },
          },
          {
            default: () => [
              h(CommandInput, { placeholder: 'What do you want to do?' }),
              h(CommandList, [
                h(CommandEmpty, 'No matching command.'),
                h(CommandGroup, { heading: 'Navigation' }, () =>
                  NAVIGATION.map((action) => renderAction(action, run)),
                ),
                h(CommandSeparator),
                h(CommandGroup, { heading: 'Actions' }, () =>
                  ACTIONS.map((action) => renderAction(action, run)),
                ),
                h(CommandSeparator),
                h(CommandGroup, { heading: 'Account' }, () =>
                  ACCOUNT.map((action) =>
                    h(
                      CommandItem,
                      {
                        key: action.value,
                        value: action.value,
                        keywords: action.keywords,
                        onSelect: run,
                      },
                      {
                        default: () => action.label,
                      },
                    ),
                  ),
                ),
              ]),
            ],
          },
        ),
      ])
  },
})
