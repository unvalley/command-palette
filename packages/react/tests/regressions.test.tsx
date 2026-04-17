import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Command } from '../src/command'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'

describe('regression: per-item render count', () => {
  it('hovering item B does not re-render item A (#377)', () => {
    const renderCounts = { a: 0, b: 0 }

    function CountingItem({ value, label }: { value: string; label: 'a' | 'b' }) {
      // Use a ref-incremented counter so re-renders are observable.
      const count = useRef(0)
      count.current++
      renderCounts[label] = count.current
      return <CommandItem value={value}>{value}</CommandItem>
    }

    render(
      <Command>
        <CommandList>
          <CountingItem value="a" label="a" />
          <CountingItem value="b" label="b" />
        </CommandList>
      </Command>,
    )

    const aBefore = renderCounts.a
    fireEvent.pointerMove(screen.getByText('b'))
    // Item B re-renders (its isSelected slice changed). Item A must not.
    expect(renderCounts.a).toBe(aBefore)
  })
})
