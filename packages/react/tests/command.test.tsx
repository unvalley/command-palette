import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Command } from '../src/command'
import { Command as CompoundCommand } from '../src/index'
import { Input } from '../src/input'

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
        <Input placeholder="Search" />
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
        <Input placeholder="Search" />
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

describe('compound API', () => {
  it('Command.Input/List/Item/Group/Empty/Loading/Separator are accessible', () => {
    expect(CompoundCommand.Input).toBeDefined()
    expect(CompoundCommand.List).toBeDefined()
    expect(CompoundCommand.Item).toBeDefined()
    expect(CompoundCommand.Group).toBeDefined()
    expect(CompoundCommand.Empty).toBeDefined()
    expect(CompoundCommand.Loading).toBeDefined()
    expect(CompoundCommand.Separator).toBeDefined()
  })
})
