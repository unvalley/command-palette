import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Command } from '../src/command'
import { Input } from '../src/input'
import { Item } from '../src/item'
import { List } from '../src/list'

function setup(props?: Parameters<typeof Command>[0]) {
  return render(
    <Command {...props}>
      <Input placeholder="Search" />
      <List>
        <Item value="a">A</Item>
        <Item value="b">B</Item>
        <Item value="c">C</Item>
      </List>
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
        <Input placeholder="Search" />
        <List>
          <Item value="a" onSelect={onSelect}>
            A
          </Item>
        </List>
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
})
