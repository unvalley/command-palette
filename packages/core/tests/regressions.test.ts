import { describe, expect, it, vi } from 'vitest'
import { createCommand } from '../src/store'

describe('regression: selection auto-correct on item change', () => {
  it('selects first visible after items replaced (#280)', () => {
    const cmd = createCommand()
    const u1 = cmd.registerItem({ value: 'a' })
    const u2 = cmd.registerItem({ value: 'b' })
    cmd.selectFirst()
    expect(cmd.getState().value).toBe('a')
    // Async items arrive: replace
    u1()
    u2()
    cmd.registerItem({ value: 'x' })
    cmd.registerItem({ value: 'y' })
    expect(cmd.getState().value).toBe('x')
  })

  it('selects first visible after search filters out current (#63)', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'banana' })
    cmd.setValue('apple')
    cmd.setSearch('ban') // apple no longer visible
    expect(cmd.getState().value).toBe('banana')
  })

  it('selection preserved when current value still visible', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.registerItem({ value: 'apricot' })
    cmd.setValue('apricot')
    cmd.setSearch('ap') // both still visible
    expect(cmd.getState().value).toBe('apricot')
  })

  it('selection clears to "" when filtered list is empty', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple' })
    cmd.setValue('apple')
    cmd.setSearch('xyz')
    expect(cmd.getState().value).toBe('')
  })
})

describe('regression: triggerSelect', () => {
  it('calls onSelect for currently highlighted item', () => {
    const onSelect = vi.fn()
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple', onSelect })
    cmd.setValue('apple')
    cmd.triggerSelect()
    expect(onSelect).toHaveBeenCalledWith('apple', undefined)
  })

  it('passes event to onSelect (#156)', () => {
    const onSelect = vi.fn()
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple', onSelect })
    cmd.setValue('apple')
    const event = new Event('click')
    cmd.triggerSelect(event)
    expect(onSelect).toHaveBeenCalledWith('apple', event)
  })

  it('does nothing when no item is selected', () => {
    const cmd = createCommand()
    expect(() => cmd.triggerSelect()).not.toThrow()
  })

  it('does not fire for disabled item', () => {
    const onSelect = vi.fn()
    const cmd = createCommand()
    cmd.registerItem({ value: 'apple', disabled: true, onSelect })
    cmd.setValue('apple') // user could have set this manually
    cmd.triggerSelect()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
