import { describe, expect, it } from 'vitest'
import { createCommand } from '../src/store'

describe('createCommand: selection', () => {
  it('selectFirst sets value to first visible item', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.selectFirst()
    expect(cmd.getState().value).toBe('a')
  })

  it('selectLast sets value to last visible item', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.selectLast()
    expect(cmd.getState().value).toBe('b')
  })

  it('selectNext moves selection forward', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.registerItem({ value: 'c' })
    cmd.selectFirst()
    cmd.selectNext()
    expect(cmd.getState().value).toBe('b')
  })

  it('selectPrev moves selection backward', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.selectLast()
    cmd.selectPrev()
    expect(cmd.getState().value).toBe('a')
  })

  it('selectNext at end is a no-op when loop=false', () => {
    const cmd = createCommand({ loop: false })
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.selectLast()
    cmd.selectNext()
    expect(cmd.getState().value).toBe('b')
  })

  it('selectNext at end wraps when loop=true', () => {
    const cmd = createCommand({ loop: true })
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.selectLast()
    cmd.selectNext()
    expect(cmd.getState().value).toBe('a')
  })

  it('selectPrev at start wraps when loop=true', () => {
    const cmd = createCommand({ loop: true })
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b' })
    cmd.selectFirst()
    cmd.selectPrev()
    expect(cmd.getState().value).toBe('b')
  })

  it('setValue updates the highlighted value', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'a' })
    cmd.setValue('a')
    expect(cmd.getState().value).toBe('a')
  })

  it('onValueChange is called when value changes', () => {
    const calls: string[] = []
    const cmd = createCommand({ onValueChange: (v) => calls.push(v) })
    cmd.registerItem({ value: 'a' })
    cmd.setValue('a')
    expect(calls).toEqual(['a'])
  })

  it('onValueChange not called if value unchanged', () => {
    const calls: string[] = []
    const cmd = createCommand({
      value: 'a',
      onValueChange: (v) => calls.push(v),
    })
    cmd.registerItem({ value: 'a' })
    cmd.setValue('a')
    expect(calls).toEqual([])
  })

  it('navigation skips disabled items', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: 'a' })
    cmd.registerItem({ value: 'b', disabled: true })
    cmd.registerItem({ value: 'c' })
    cmd.selectFirst()
    cmd.selectNext()
    expect(cmd.getState().value).toBe('c')
  })

  it('empty-string value can be selected (regression #357)', () => {
    const cmd = createCommand()
    cmd.registerItem({ value: '' })
    cmd.registerItem({ value: 'a' })
    cmd.setValue('')
    expect(cmd.getState().value).toBe('')
  })
})
