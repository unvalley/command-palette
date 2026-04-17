import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Command } from '../src/command'
import { CommandItem } from '../src/item'

describe('<Command.Item>', () => {
  it('renders with cmdk-item attribute', () => {
    render(
      <Command>
        <CommandItem value="apple">Apple</CommandItem>
      </Command>,
    )
    expect(screen.getByText('Apple').closest('[cmdk-item]')).toBeInTheDocument()
  })

  it('fires onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(
      <Command>
        <CommandItem value="apple" onSelect={onSelect}>
          Apple
        </CommandItem>
      </Command>,
    )
    fireEvent.click(screen.getByText('Apple'))
    expect(onSelect).toHaveBeenCalledWith('apple', expect.any(Object))
  })

  it('passes the click event to onSelect (#156)', () => {
    const onSelect = vi.fn()
    render(
      <Command>
        <CommandItem value="apple" onSelect={onSelect}>
          Apple
        </CommandItem>
      </Command>,
    )
    fireEvent.click(screen.getByText('Apple'))
    expect(onSelect.mock.calls[0]?.[1]).toBeInstanceOf(Event)
  })

  it('sets data-selected on the highlighted item', () => {
    render(
      <Command value="apple">
        <CommandItem value="apple">Apple</CommandItem>
        <CommandItem value="banana">Banana</CommandItem>
      </Command>,
    )
    const apple = screen.getByText('Apple').closest('[cmdk-item]')
    const banana = screen.getByText('Banana').closest('[cmdk-item]')
    expect(apple?.getAttribute('data-selected')).toBe('true')
    expect(banana?.getAttribute('data-selected')).toBe(null)
  })

  it('sets data-disabled on disabled items', async () => {
    render(
      <Command>
        <CommandItem value="apple" disabled>
          Apple
        </CommandItem>
      </Command>,
    )
    await act(async () => {})
    const apple = screen.getByText('Apple').closest('[cmdk-item]')
    expect(apple?.getAttribute('data-disabled')).toBe('true')
  })

  it('hides item when filtered out', () => {
    const { container } = render(
      <Command search="xyz">
        <CommandItem value="apple">Apple</CommandItem>
      </Command>,
    )
    expect(container.querySelector('[cmdk-item]')).not.toBeInTheDocument()
  })

  it('renders item with empty-string value (#357)', () => {
    render(
      <Command>
        <CommandItem value="">All</CommandItem>
      </Command>,
    )
    expect(screen.getByText('All').closest('[cmdk-item]')).toBeInTheDocument()
  })

  it('renders item with special chars in value without crashing (#387)', () => {
    expect(() =>
      render(
        <Command>
          <CommandItem value="<script>alert(1)</script>">XSS</CommandItem>
        </Command>,
      ),
    ).not.toThrow()
  })

  it('pointerSelection="hover" updates value on pointer move (default)', () => {
    render(
      <Command>
        <CommandItem value="a">A</CommandItem>
        <CommandItem value="b">B</CommandItem>
      </Command>,
    )
    fireEvent.pointerMove(screen.getByText('B'))
    expect(screen.getByText('B').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe('true')
  })

  it('pointerSelection="click" does NOT update value on pointer move (#49)', () => {
    render(
      <Command pointerSelection="click">
        <CommandItem value="a">A</CommandItem>
        <CommandItem value="b">B</CommandItem>
      </Command>,
    )
    fireEvent.pointerMove(screen.getByText('B'))
    expect(screen.getByText('B').closest('[cmdk-item]')?.getAttribute('data-selected')).not.toBe(
      'true',
    )
  })

  it('updates pointerSelection after rerender', () => {
    const { rerender } = render(
      <Command pointerSelection="click">
        <CommandItem value="a">A</CommandItem>
        <CommandItem value="b">B</CommandItem>
      </Command>,
    )

    fireEvent.pointerMove(screen.getByText('B'))
    expect(screen.getByText('B').closest('[cmdk-item]')?.getAttribute('data-selected')).not.toBe(
      'true',
    )

    rerender(
      <Command pointerSelection="hover">
        <CommandItem value="a">A</CommandItem>
        <CommandItem value="b">B</CommandItem>
      </Command>,
    )

    fireEvent.pointerMove(screen.getByText('B'))
    expect(screen.getByText('B').closest('[cmdk-item]')?.getAttribute('data-selected')).toBe('true')
  })
})
