import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { Command } from '../src/command'
import { CommandList } from '../src/list'
import { commandSlots, groupNode, itemNode } from './helpers'

describe('<CommandGroup> + <CommandItem>', () => {
  it('items inherit groupId from context so the group becomes visible', async () => {
    const { container } = render(Command, {
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [
              groupNode('Navigation', [itemNode('home', 'Home'), itemNode('settings', 'Settings')]),
            ],
          },
        ),
      ]),
    })

    await nextTick()

    const group = container.querySelector('[command-palette-group]')
    expect(group).toBeInTheDocument()
    expect(group?.hasAttribute('hidden')).toBe(false)
  })

  it('hides group when none of its items match the search', () => {
    const { container } = render(Command, {
      props: { search: 'xyz' },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [groupNode('Navigation', [itemNode('home', 'Home')])],
          },
        ),
      ]),
    })

    expect(container.querySelector('[command-palette-group]')?.hasAttribute('hidden')).toBe(true)
  })

  it('keeps a forceMount group visible even with non-matching search', () => {
    const { container } = render(Command, {
      props: { search: 'xyz' },
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [groupNode('Pinned', [itemNode('home', 'Home')], { forceMount: true })],
          },
        ),
      ]),
    })

    expect(container.querySelector('[command-palette-group]')?.hasAttribute('hidden')).toBe(false)
  })

  it('explicit groupId prop overrides inherited context', () => {
    const { container } = render(Command, {
      slots: commandSlots([
        h(
          CommandList,
          {},
          {
            default: () => [
              groupNode('Navigation', [itemNode('home', 'Home', { groupId: 'explicit' })]),
            ],
          },
        ),
      ]),
    })

    expect(container.querySelector('[command-palette-group]')?.hasAttribute('hidden')).toBe(true)
  })
})
