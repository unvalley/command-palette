import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { Command } from '../src/command'
import { CommandInput } from '../src/input'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'
import { baseMenuSlots } from './helpers'

function selected(): string | null {
  return document.querySelector('[data-selected="true"]')?.textContent ?? null
}

describe('keyboard navigation', () => {
  it('ArrowDown moves selection forward', async () => {
    render(Command, {
      slots: baseMenuSlots(),
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    await nextTick()
    expect(selected()).toBe('A')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    await nextTick()
    expect(selected()).toBe('B')
  })

  it('ArrowUp moves selection backward', async () => {
    render(Command, {
      slots: baseMenuSlots(),
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    await nextTick()
    expect(selected()).toBe('A')
  })

  it('Home selects first', async () => {
    render(Command, {
      slots: baseMenuSlots(),
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Home' })
    await nextTick()
    expect(selected()).toBe('A')
  })

  it('End selects last', async () => {
    render(Command, {
      slots: baseMenuSlots(),
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'End' })
    await nextTick()
    expect(selected()).toBe('C')
  })

  it('Enter triggers select for current item', () => {
    const onSelect = vi.fn()
    render(Command, {
      slots: {
        default: () => [
          h(CommandInput, { placeholder: 'Search' }),
          h(
            CommandList,
            {},
            {
              default: () => [h(CommandItem, { value: 'a', onSelect }, { default: () => 'A' })],
            },
          ),
        ],
      },
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('a', expect.any(Object))
  })

  it('loop wraps ArrowDown past end', async () => {
    render(Command, {
      props: { loop: true },
      slots: baseMenuSlots(),
    })

    const input = screen.getByPlaceholderText('Search')
    fireEvent.keyDown(input, { key: 'End' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    await nextTick()
    expect(selected()).toBe('A')
  })
})
