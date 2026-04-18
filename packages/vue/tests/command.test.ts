import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useCommandSlice } from '../src/context'
import * as cmdk from '../src/index'
import {
  Command,
  CommandInput,
  CommandList,
  commandSlots,
  commandWithInputSlots,
  itemNode,
} from './helpers'

describe('<Command>', () => {
  it('renders children', () => {
    render(Command, {
      slots: commandSlots([h('div', 'hello')]),
    })

    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders with cmdk-root data attribute', () => {
    const { container } = render(Command, {
      props: { label: 'test' },
    })

    expect(container.querySelector('[cmdk-root]')).toBeInTheDocument()
  })

  it('forwards label as aria-label', () => {
    const { container } = render(Command, {
      props: { label: 'My Menu' },
    })

    expect(container.querySelector('[cmdk-root]')?.getAttribute('aria-label')).toBe('My Menu')
  })

  it('updates filter after rerender', async () => {
    const { rerender } = render(Command, {
      props: { search: 'app', filter: 'none' },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode('apple', 'Apple'), itemNode('banana', 'Banana')],
          },
        ),
      ]),
    })

    expect(screen.getByText('Banana')).toBeInTheDocument()

    await rerender({ search: 'app', filter: 'contains' })

    expect(screen.queryByText('Banana')).not.toBeInTheDocument()
  })

  it('updates custom filter after rerender', async () => {
    const startsWithApp = (value: string, search: string) => (value.startsWith(search) ? 1 : 0)
    const endsWithApp = (value: string, search: string) => (value.endsWith(search) ? 1 : 0)

    const { rerender } = render(Command, {
      props: { search: 'app', filter: startsWithApp },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode('apple', 'Apple'), itemNode('snapapp', 'Snapapp')],
          },
        ),
      ]),
    })

    expect(screen.queryByText('Snapapp')).not.toBeInTheDocument()

    await rerender({ search: 'app', filter: endsWithApp })

    expect(screen.getByText('Snapapp')).toBeInTheDocument()
  })
})

describe('<CommandInput>', () => {
  it('forwards typing to update:search', async () => {
    const onSearchChange = vi.fn()
    render(Command, {
      props: {
        'onUpdate:search': onSearchChange,
      },
      slots: commandSlots([h(CommandInput, { placeholder: 'Search' })]),
    })

    const input = screen.getByPlaceholderText('Search')
    await userEvent.type(input, 'app')

    expect(onSearchChange).toHaveBeenLastCalledWith('app')
  })

  it('does not fire update:search while IME composing', () => {
    const onSearchChange = vi.fn()
    render(Command, {
      props: {
        'onUpdate:search': onSearchChange,
      },
      slots: commandSlots([h(CommandInput, { placeholder: 'Search' })]),
    })

    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: 'こ' } })
    expect(onSearchChange).not.toHaveBeenCalled()
    fireEvent.input(input, { target: { value: 'こんにちは' } })
    fireEvent.compositionEnd(input)
    expect(onSearchChange).toHaveBeenCalledWith('こんにちは')
  })

  it('supports defaultSearch for uncontrolled usage', () => {
    render(Command, {
      props: { defaultSearch: 'apple' },
      slots: commandSlots([h(CommandInput, { placeholder: 'Search' })]),
    })

    expect(screen.getByPlaceholderText('Search')).toHaveValue('apple')
  })

  it('prefers search over defaultSearch', () => {
    render(Command, {
      props: { search: 'banana', defaultSearch: 'apple' },
      slots: commandSlots([h(CommandInput, { placeholder: 'Search' })]),
    })

    expect(screen.getByPlaceholderText('Search')).toHaveValue('banana')
  })

  it('syncs CommandInput modelValue into the store for programmatic updates', async () => {
    const Wrapper = defineComponent({
      setup() {
        const inputValue = ref('app')

        return () => [
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                inputValue.value = 'ban'
              },
            },
            'set-ban',
          ),
          h(
            Command,
            {},
            {
              default: () => [
                h(CommandInput, {
                  placeholder: 'Search',
                  modelValue: inputValue.value,
                }),
                h(
                  CommandList,
                  {},
                  {
                    default: () => [itemNode('apple', 'Apple'), itemNode('banana', 'Banana')],
                  },
                ),
              ],
            },
          ),
        ]
      },
    })

    render(Wrapper)

    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.queryByText('Banana')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('set-ban'))
    await nextTick()

    expect(screen.queryByText('Apple')).not.toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('emits update:modelValue when keyboard selection changes', () => {
    const onValueChange = vi.fn()
    render(Command, {
      props: {
        'onUpdate:modelValue': onValueChange,
      },
      slots: commandWithInputSlots([itemNode('apple', 'Apple')]),
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(onValueChange).toHaveBeenCalledWith('apple')
  })

  it('supports defaultValue for uncontrolled usage', () => {
    render(Command, {
      props: { defaultValue: 'apple' },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode('apple', 'Apple'), itemNode('banana', 'Banana')],
          },
        ),
      ]),
    })

    expect(screen.getByText('Apple').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe(
      'true',
    )
  })

  it('prefers modelValue over defaultValue', async () => {
    render(Command, {
      props: { modelValue: 'banana', defaultValue: 'apple' },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [itemNode('apple', 'Apple'), itemNode('banana', 'Banana')],
          },
        ),
      ]),
    })

    await nextTick()

    expect(screen.getByText('Banana').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe(
      'true',
    )
  })
})

describe('useCommandSlice', () => {
  it('selects from state directly', () => {
    const SearchValue = defineComponent({
      setup() {
        const search = useCommandSlice((state) => state.search)
        return () => h('div', search.value)
      },
    })

    render(Command, {
      props: { search: 'hello' },
      slots: commandSlots([h(SearchValue)]),
    })

    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})

describe('public exports', () => {
  it('exposes all components as named exports', () => {
    expect(cmdk.Command).toBeDefined()
    expect(cmdk.CommandInput).toBeDefined()
    expect(cmdk.CommandList).toBeDefined()
    expect(cmdk.CommandItem).toBeDefined()
    expect(cmdk.CommandGroup).toBeDefined()
    expect(cmdk.CommandEmpty).toBeDefined()
    expect(cmdk.CommandLoading).toBeDefined()
    expect(cmdk.CommandSeparator).toBeDefined()
    expect(cmdk.useCommandStore).toBeDefined()
    expect(cmdk.useCommandSlice).toBeDefined()
  })
})
