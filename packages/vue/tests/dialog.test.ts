import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { CommandDialog } from '../src/dialog'
import { CommandInput } from '../src/input'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'

describe('<CommandDialog>', () => {
  it('does not render dialog content visibly when open=false', () => {
    render(CommandDialog, {
      props: { open: false, label: 'menu' },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    const dialog = document.querySelector('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog?.open).toBe(false)
  })

  it('opens the dialog when open=true', () => {
    render(CommandDialog, {
      props: { open: true, label: 'menu' },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    expect(document.querySelector('dialog')?.open).toBe(true)
  })

  it('fires update:open(false) when the native close event is dispatched', () => {
    const onOpenChange = vi.fn()
    render(CommandDialog, {
      props: {
        open: true,
        label: 'menu',
        'onUpdate:open': onOpenChange,
      },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    const dialog = document.querySelector('dialog')
    if (!dialog) throw new Error('dialog not found')

    fireEvent(dialog, new Event('close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes when Escape is pressed from the input', () => {
    const onOpenChange = vi.fn()
    render(CommandDialog, {
      props: {
        open: true,
        label: 'menu',
        'onUpdate:open': onOpenChange,
      },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    fireEvent.keyDown(screen.getByPlaceholderText('Search'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears the search input when the dialog closes', async () => {
    const Wrapper = defineComponent({
      setup() {
        const open = ref(true)
        return () => [
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                open.value = true
              },
            },
            'open',
          ),
          h(
            CommandDialog,
            {
              open: open.value,
              label: 'menu',
              'onUpdate:open': (nextOpen: boolean) => {
                open.value = nextOpen
              },
            },
            {
              default: () => h(CommandInput, { placeholder: 'Search' }),
            },
          ),
        ]
      },
    })

    render(Wrapper)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    await fireEvent.update(input, 'hello')
    expect(input.value).toBe('hello')
    fireEvent.keyDown(input, { key: 'Escape' })
    await nextTick()
    fireEvent.click(screen.getByText('open'))
    await nextTick()
    expect((screen.getByPlaceholderText('Search') as HTMLInputElement).value).toBe('')
  })

  it('honors defaultSearch for uncontrolled dialogs', () => {
    render(CommandDialog, {
      props: {
        open: true,
        label: 'menu',
        defaultSearch: 'hello',
      },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    expect(screen.getByPlaceholderText('Search')).toHaveValue('hello')
  })

  it('does not clear search on close when search is controlled', async () => {
    const Wrapper = defineComponent({
      setup() {
        const open = ref(true)
        const search = ref('hello')
        return () => [
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                open.value = true
              },
            },
            'open',
          ),
          h(
            CommandDialog,
            {
              open: open.value,
              search: search.value,
              label: 'menu',
              'onUpdate:open': (nextOpen: boolean) => {
                open.value = nextOpen
              },
              'onUpdate:search': (nextSearch: string) => {
                search.value = nextSearch
              },
            },
            {
              default: () => h(CommandInput, { placeholder: 'Search' }),
            },
          ),
        ]
      },
    })

    render(Wrapper)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.keyDown(input, { key: 'Escape' })
    await nextTick()
    fireEvent.click(screen.getByText('open'))
    await nextTick()
    expect((screen.getByPlaceholderText('Search') as HTMLInputElement).value).toBe('hello')
  })

  it('does not close on Escape during IME composition', () => {
    const onOpenChange = vi.fn()
    render(CommandDialog, {
      props: {
        open: true,
        label: 'menu',
        'onUpdate:open': onOpenChange,
      },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    fireEvent.keyDown(screen.getByPlaceholderText('Search'), { key: 'Escape', isComposing: true })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('contains the Command with the command-palette-root attribute', () => {
    render(CommandDialog, {
      props: { open: true, label: 'menu' },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    expect(
      document.querySelector('dialog')?.querySelector('[command-palette-root]'),
    ).toBeInTheDocument()
  })

  it('renders children as Command content', () => {
    const onSearchChange = vi.fn()
    render(CommandDialog, {
      props: {
        open: true,
        label: 'menu',
        'onUpdate:search': onSearchChange,
      },
      slots: {
        default: () => [
          h(CommandInput, { placeholder: 'Search' }),
          h(
            CommandList,
            {},
            {
              default: () => [h(CommandItem, { value: 'apple' }, { default: () => 'Apple' })],
            },
          ),
        ],
      },
    })

    fireEvent.input(screen.getByPlaceholderText('Search'), { target: { value: 'a' } })
    expect(onSearchChange).toHaveBeenCalledWith('a')
  })

  it('closing via backdrop click fires update:open(false)', () => {
    const onOpenChange = vi.fn()
    render(CommandDialog, {
      props: {
        open: true,
        label: 'menu',
        'onUpdate:open': onOpenChange,
      },
      slots: {
        default: () => h(CommandInput, { placeholder: 'Search' }),
      },
    })

    const dialog = document.querySelector('dialog')
    if (!dialog) throw new Error('dialog not found')
    fireEvent.click(dialog, { target: dialog })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
