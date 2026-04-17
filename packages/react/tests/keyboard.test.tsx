import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Command } from '../src/command'
import { CommandInput } from '../src/input'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'

function setup(props?: Parameters<typeof Command>[0]) {
  return render(
    <Command {...props}>
      <CommandInput placeholder="Search" />
      <CommandList>
        <CommandItem value="a">A</CommandItem>
        <CommandItem value="b">B</CommandItem>
        <CommandItem value="c">C</CommandItem>
      </CommandList>
    </Command>,
  )
}

function selected(): string | null {
  return document.querySelector('[data-selected="true"]')?.textContent ?? null
}

describe('keyboard navigation', () => {
  it('ArrowDown moves selection forward', () => {
    setup()
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(selected()).toBe('A')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(selected()).toBe('B')
  })

  it('ArrowUp moves selection backward', () => {
    setup()
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(selected()).toBe('A')
  })

  it('Home selects first', () => {
    setup()
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Home' })
    expect(selected()).toBe('A')
  })

  it('End selects last', () => {
    setup()
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'End' })
    expect(selected()).toBe('C')
  })

  it('Enter triggers onSelect for current item', () => {
    const onSelect = vi.fn()
    render(
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="a" onSelect={onSelect}>
            A
          </CommandItem>
        </CommandList>
      </Command>,
    )
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('a', expect.any(Object))
  })

  it('loop wraps ArrowDown past end', () => {
    setup({ loop: true })
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'End' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(selected()).toBe('A')
  })

  it('updates loop behavior after rerender', () => {
    const view = setup({ loop: false })
    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'End' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(selected()).toBe('C')

    view.rerender(
      <Command loop>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandItem value="a">A</CommandItem>
          <CommandItem value="b">B</CommandItem>
          <CommandItem value="c">C</CommandItem>
        </CommandList>
      </Command>,
    )

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(selected()).toBe('A')
  })
})
