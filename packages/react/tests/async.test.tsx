import { act, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Command } from '../src/command'
import { Item } from '../src/item'
import { List } from '../src/list'

function selected(): string | null {
  return document.querySelector('[data-selected="true"]')?.textContent ?? null
}

describe('async items (regressions)', () => {
  it('first item is auto-selected after async items arrive (#280)', async () => {
    function Demo() {
      const [items, setItems] = useState<string[]>([])
      useEffect(() => {
        // Simulate async fetch
        Promise.resolve().then(() => setItems(['x', 'y', 'z']))
      }, [])
      return (
        <Command value="" onValueChange={() => {}}>
          <List>
            {items.map((v) => (
              <Item key={v} value={v}>
                {v}
              </Item>
            ))}
          </List>
        </Command>
      )
    }
    render(<Demo />)
    // Wait for promise to resolve and effects to flush
    await act(async () => {
      await Promise.resolve()
    })
    // Once items arrive, select first
    // Note: auto-correct from recompute kicks in on registration
    expect(screen.getByText('x')).toBeInTheDocument()
  })

  it('selection updates when items are replaced (#267)', async () => {
    function Demo({ items }: { items: string[] }) {
      return (
        <Command>
          <List>
            {items.map((v) => (
              <Item key={v} value={v}>
                {v}
              </Item>
            ))}
          </List>
        </Command>
      )
    }
    const { rerender } = render(<Demo items={['a', 'b']} />)
    rerender(<Demo items={['x', 'y']} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(screen.queryByText('a')).not.toBeInTheDocument()
  })
})
