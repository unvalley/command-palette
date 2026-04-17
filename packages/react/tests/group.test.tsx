import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Command } from '../src/command'
import { CommandGroup } from '../src/group'
import { CommandItem } from '../src/item'
import { CommandList } from '../src/list'

describe('<CommandGroup> + <CommandItem>', () => {
  it('items inherit groupId from context so the group becomes visible', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandGroup heading="Navigation">
            <CommandItem value="home">Home</CommandItem>
            <CommandItem value="settings">Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    )

    const group = container.querySelector('[cmdk-group]')
    expect(group).toBeInTheDocument()
    expect(group?.hasAttribute('hidden')).toBe(false)
  })

  it('hides group when none of its items match the search', () => {
    const { container } = render(
      <Command search="xyz">
        <CommandList>
          <CommandGroup heading="Navigation">
            <CommandItem value="home">Home</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    )
    const group = container.querySelector('[cmdk-group]')
    expect(group?.hasAttribute('hidden')).toBe(true)
  })

  it('keeps a forceMount group visible even with non-matching search', () => {
    const { container } = render(
      <Command search="xyz">
        <CommandList>
          <CommandGroup heading="Pinned" forceMount>
            <CommandItem value="home">Home</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    )
    const group = container.querySelector('[cmdk-group]')
    expect(group?.hasAttribute('hidden')).toBe(false)
  })

  it('explicit groupId prop overrides inherited context', () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandGroup heading="Navigation">
            <CommandItem value="home" groupId="explicit">
              Home
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    )
    // Group exists but is hidden because its auto-id has no matching items.
    const group = container.querySelector('[cmdk-group]')
    expect(group?.hasAttribute('hidden')).toBe(true)
  })
})
