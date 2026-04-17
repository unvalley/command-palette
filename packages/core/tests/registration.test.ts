import { describe, expect, it, vi } from 'vitest'
import { createCommand } from '../src/store'

describe('createCommand: registration', () => {
  it('starts with empty state', () => {
    const cmd = createCommand()
    const state = cmd.getState()
    expect(state.items.size).toBe(0)
    expect(state.groups.size).toBe(0)
    expect(state.search).toBe('')
    expect(state.value).toBe('')
    expect(state.isComposing).toBe(false)
  })

  it('registers an item', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    expect(cmd.getState().items.has('apple')).toBe(true)
  })

  it('allows empty-string value (regression #357)', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: '' })
    expect(cmd.getState().items.has('')).toBe(true)
  })

  it('unregister removes the item', () => {
    const cmd = createCommand()
    const unregister = cmd.registerItem({ value: 'apple' })
    unregister()
    expect(cmd.getState().items.has('apple')).toBe(false)
  })

  it('warns on duplicate value in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'apple' })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('throws on non-string value', () => {
    const cmd = createCommand()
    // @ts-expect-error testing runtime guard
    expect(() => cmd.registerItem({ value: 123 })).toThrow()
  })

  it('registers a group', () => {
    const cmd = createCommand()
    cmd.registerGroup({ id: 'fruits' })
    expect(cmd.getState().groups.has('fruits')).toBe(true)
  })

  it('subscribe is called on state change', () => {
    const cmd = createCommand()
    const listener = vi.fn()
    cmd.subscribe(listener)
    cmd.registerItem({ value: 'a' })
    expect(listener).toHaveBeenCalled()
  })

  it('unsubscribe stops notifications', () => {
    const cmd = createCommand()
    const listener = vi.fn()
    const unsubscribe = cmd.subscribe(listener)
    unsubscribe()
    cmd.registerItem({ value: 'a' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('updateItem patches an existing item', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple', disabled: false })
    cmd.updateItem('apple', { disabled: true })
    expect(cmd.getState().items.get('apple')?.disabled).toBe(true)
  })
})
