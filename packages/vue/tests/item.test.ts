import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { Command } from '../src/command'
import { CommandItem } from '../src/item'
import { commandSlots, itemNode } from './helpers'

describe('<CommandItem>', () => {
  it('renders with cmdk-item attribute', () => {
    render(Command, {
      slots: commandSlots([itemNode('apple', 'Apple')]),
    })

    expect(screen.getByText('Apple').closest('[cmdk-item]')).toBeInTheDocument()
  })

  it('emits select when clicked', () => {
    const onSelect = vi.fn()
    render(Command, {
      slots: commandSlots([
        h(CommandItem, { value: 'apple', onSelect }, { default: () => 'Apple' }),
      ]),
    })

    fireEvent.click(screen.getByText('Apple'))
    expect(onSelect).toHaveBeenCalledWith('apple', expect.any(Object))
  })

  it('passes the click event to select', () => {
    const onSelect = vi.fn()
    render(Command, {
      slots: commandSlots([
        h(CommandItem, { value: 'apple', onSelect }, { default: () => 'Apple' }),
      ]),
    })

    fireEvent.click(screen.getByText('Apple'))
    expect(onSelect.mock.calls[0]?.[1]).toBeInstanceOf(Event)
  })

  it('sets data-selected on the highlighted item', () => {
    render(Command, {
      props: { modelValue: 'apple' },
      slots: commandSlots([itemNode('apple', 'Apple'), itemNode('banana', 'Banana')]),
    })

    expect(screen.getByText('Apple').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe(
      'true',
    )
    expect(screen.getByText('Banana').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe(
      null,
    )
  })

  it('sets data-disabled on disabled items', () => {
    render(Command, {
      slots: commandSlots([itemNode('apple', 'Apple', { disabled: true })]),
    })

    expect(screen.getByText('Apple').closest('[cmdk-item]')?.getAttribute('data-disabled')).toBe(
      'true',
    )
  })

  it('hides item when filtered out', () => {
    const { container } = render(Command, {
      props: { search: 'xyz' },
      slots: commandSlots([itemNode('apple', 'Apple')]),
    })

    expect(container.querySelector('[cmdk-item]')).not.toBeInTheDocument()
  })

  it('renders item with empty-string value', () => {
    render(Command, {
      slots: commandSlots([itemNode('', 'All')]),
    })

    expect(screen.getByText('All').closest('[cmdk-item]')).toBeInTheDocument()
  })

  it('renders item with special chars in value without crashing', () => {
    expect(() =>
      render(Command, {
        slots: commandSlots([itemNode('<script>alert(1)</script>', 'XSS')]),
      }),
    ).not.toThrow()
  })

  it('selectOnHover updates value on pointer move by default', async () => {
    render(Command, {
      slots: commandSlots([itemNode('a', 'A'), itemNode('b', 'B')]),
    })

    fireEvent.pointerMove(screen.getByText('B'))
    await nextTick()

    expect(screen.getByText('B').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe('true')
  })

  it('selectOnHover=false does not update value on pointer move', () => {
    render(Command, {
      props: { selectOnHover: false },
      slots: commandSlots([itemNode('a', 'A'), itemNode('b', 'B')]),
    })

    fireEvent.pointerMove(screen.getByText('B'))

    expect(screen.getByText('B').closest('[cmdk-item]')?.getAttribute('data-selected')).not.toBe(
      'true',
    )
  })
})
