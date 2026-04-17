import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Command } from '../src/command'
import { useCommandSlice } from '../src/context'
import * as cmdk from '../src/index'
import { CommandInput } from '../src/input'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'

describe('<Command>', () => {
  it('renders children', () => {
    render(
      <Command>
        <div>hello</div>
      </Command>,
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders with cmdk-root data attribute', () => {
    const { container } = render(<Command label="test" />)
    expect(container.querySelector('[cmdk-root]')).toBeInTheDocument()
  })

  it('forwards label as aria-label', () => {
    const { container } = render(<Command label="My Menu" />)
    expect(container.querySelector('[cmdk-root]')?.getAttribute('aria-label')).toBe('My Menu')
  })

  it('updates filterMode after rerender', () => {
    const { rerender } = render(
      <Command search="app" filterMode="none">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )
    expect(screen.getByText('Banana')).toBeInTheDocument()

    rerender(
      <Command search="app" filterMode="contains">
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>,
    )
    expect(screen.queryByText('Banana')).not.toBeInTheDocument()
  })

  it('updates custom filter after rerender', () => {
    const startsWithApp = (value: string, search: string) => (value.startsWith(search) ? 1 : 0)
    const endsWithApp = (value: string, search: string) => (value.endsWith(search) ? 1 : 0)

    const { rerender } = render(
      <Command search="app" filter={startsWithApp}>
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="snapapp">Snapapp</CommandItem>
        </CommandList>
      </Command>,
    )
    expect(screen.queryByText('Snapapp')).not.toBeInTheDocument()

    rerender(
      <Command search="app" filter={endsWithApp}>
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="snapapp">Snapapp</CommandItem>
        </CommandList>
      </Command>,
    )
    expect(screen.getByText('Snapapp')).toBeInTheDocument()
  })
})

describe('<Command.Input>', () => {
  it('forwards typing to store search', async () => {
    const onSearchChange = vi.fn()
    render(
      <Command onSearchChange={onSearchChange}>
        <CommandInput placeholder="Search" />
      </Command>,
    )
    const input = screen.getByPlaceholderText('Search')
    await userEvent.type(input, 'app')
    expect(onSearchChange).toHaveBeenLastCalledWith('app')
  })

  it('does not fire onSearchChange while IME composing (#363)', () => {
    const onSearchChange = vi.fn()
    render(
      <Command onSearchChange={onSearchChange}>
        <CommandInput placeholder="Search" />
      </Command>,
    )
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'こ' } })
    expect(onSearchChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'こんにちは' } })
    fireEvent.compositionEnd(input)
    expect(onSearchChange).toHaveBeenCalledWith('こんにちは')
  })

  it('uses the latest onSearchChange after rerender', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <Command onSearchChange={first}>
        <CommandInput placeholder="Search" />
      </Command>,
    )

    rerender(
      <Command onSearchChange={second}>
        <CommandInput placeholder="Search" />
      </Command>,
    )

    const input = screen.getByPlaceholderText('Search')
    await userEvent.type(input, 'a')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('a')
  })

  it('uses the latest onValueChange after rerender', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <Command onValueChange={first}>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>,
    )

    rerender(
      <Command onValueChange={second}>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>,
    )

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('apple')
  })
})

describe('useCommandSlice', () => {
  it('selects from state directly', () => {
    const SearchValue = () => <div>{useCommandSlice((state) => state.search)}</div>

    render(
      <Command search="hello">
        <SearchValue />
      </Command>,
    )

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
