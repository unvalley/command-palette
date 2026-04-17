import { act, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Command } from '../src/command'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'

describe('async items (regressions)', () => {
  it('async items render correctly when added after mount (#280)', async () => {
    function Demo() {
      const [items, setItems] = useState<string[]>([])
      useEffect(() => {
        Promise.resolve().then(() => setItems(['x', 'y', 'z']))
      }, [])
      return (
        <Command>
          <CommandList>
            {items.map((v) => (
              <CommandItem key={v} value={v}>
                {v}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      )
    }
    render(<Demo />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(screen.getByText('y')).toBeInTheDocument()
    expect(screen.getByText('z')).toBeInTheDocument()
  })

  it('selection updates when items are replaced (#267)', async () => {
    function Demo({ items }: { items: string[] }) {
      return (
        <Command>
          <CommandList>
            {items.map((v) => (
              <CommandItem key={v} value={v}>
                {v}
              </CommandItem>
            ))}
          </CommandList>
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
