import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Command } from '../src/command'
import * as cmdk from '../src/index'
import { CommandInput } from '../src/input'

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
