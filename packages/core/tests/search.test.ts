import { describe, expect, it, vi } from 'vitest'
import { createCommand } from '../src/store'

describe('createCommand: search + filter', () => {
  it('all items visible when search is empty', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'banana' })
    expect(cmd.getState().filteredOrder).toEqual(['apple', 'banana'])
  })

  it('filters items by search', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'banana' })
    cmd.setSearch('app')
    expect(cmd.getState().filteredOrder).toEqual(['apple'])
  })

  it('sorts by score desc', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'banana apple' })
    cmd.registerItem({ value: 'apple banana' })
    cmd.setSearch('app')
    expect(cmd.getState().filteredOrder[0]).toBe('apple banana')
  })

  it('respects shouldFilter: false', () => {
    const cmd = createCommand({ shouldFilter: false })
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'xyz' })
    cmd.setSearch('app')
    expect(cmd.getState().filteredOrder).toEqual(['apple', 'xyz'])
  })

  it('uses custom filter function', () => {
    const cmd = createCommand({
      filter: (value, search) => (value.startsWith(search) ? 1 : 0),
    })
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'banana' })
    cmd.setSearch('app')
    expect(cmd.getState().filteredOrder).toEqual(['apple'])
  })

  it('forceMount keeps item visible even with non-matching search', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'banana', forceMount: true })
    cmd.setSearch('app')
    const order = cmd.getState().filteredOrder
    expect(order).toContain('apple')
    expect(order).toContain('banana')
  })

  it('disabled item is in filteredOrder but not navigableOrder', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple', disabled: true })
    cmd.registerItem({ value: 'banana' })
    expect(cmd.getState().filteredOrder).toEqual(['apple', 'banana'])
    expect(cmd.getState().navigableOrder).toEqual(['banana'])
  })

  it('custom filter that throws is handled gracefully', () => {
    const cmd = createCommand({
      filter: () => {
        throw new Error('boom')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    cmd.registerItem({ value: 'a' })
    expect(() => cmd.setSearch('x')).not.toThrow()
    expect(cmd.getState().filteredOrder).toEqual([])
    warn.mockRestore()
  })

  it('matches diacritics via default filter (regression #386)', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'café' })
    cmd.setSearch('cafe')
    expect(cmd.getState().filteredOrder).toEqual(['café'])
  })

  it('keywords affect filter (#74)', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'logout', keywords: ['signout'] })
    cmd.setSearch('sign')
    expect(cmd.getState().filteredOrder).toEqual(['logout'])
  })

  it('visibleGroups reflects which groups have visible items', () => {
    const cmd = createCommand()
    cmd.registerGroup({ id: 'fruits' })
    cmd.registerGroup({ id: 'colors' })
    cmd.registerItem({ value: 'apple', groupId: 'fruits' })
    cmd.registerItem({ value: 'red', groupId: 'colors' })
    cmd.setSearch('app')
    expect(cmd.getState().visibleGroups.has('fruits')).toBe(true)
    expect(cmd.getState().visibleGroups.has('colors')).toBe(false)
  })

  it('group with forceMount stays in visibleGroups', () => {
    const cmd = createCommand()
    cmd.registerGroup({ id: 'fruits', forceMount: true })
    cmd.registerItem({ value: 'apple', groupId: 'fruits' })
    cmd.setSearch('xyz')
    expect(cmd.getState().visibleGroups.has('fruits')).toBe(true)
  })

  it('special characters in value do not crash (regression #387)', () => {
    const cmd = createCommand()
    expect(() => cmd.registerItem({ value: '<script>alert(1)</script>' })).not.toThrow()
    expect(() => cmd.setSearch('script')).not.toThrow()
    expect(cmd.getState().filteredOrder).toContain('<script>alert(1)</script>')
  })

  it('onSearchChange is called when search changes', () => {
    const calls: string[] = []
    const cmd = createCommand({ onSearchChange: (s) => calls.push(s) })
    cmd.setSearch('hello')
    expect(calls).toEqual(['hello'])
  })
})
