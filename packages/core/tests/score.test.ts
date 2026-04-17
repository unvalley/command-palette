import { describe, expect, it } from 'vitest'
import { commandScore } from '../src/score'

describe('commandScore', () => {
  it('returns > 0 for matching abbreviation', () => {
    expect(commandScore('hello world', 'hw', [])).toBeGreaterThan(0)
  })

  it('returns 0 for non-matching abbreviation', () => {
    expect(commandScore('hello world', 'xyz', [])).toBe(0)
  })

  it('scores exact match higher than fuzzy', () => {
    const exact = commandScore('apple', 'apple', [])
    const fuzzy = commandScore('apple', 'aple', [])
    expect(exact).toBeGreaterThan(fuzzy)
  })

  it('scores prefix higher than suffix', () => {
    const prefix = commandScore('apple banana', 'app', [])
    const suffix = commandScore('banana apple', 'app', [])
    expect(prefix).toBeGreaterThan(suffix)
  })

  it('considers aliases (keywords)', () => {
    const withAlias = commandScore('logout', 'sign', ['signout'])
    const withoutAlias = commandScore('logout', 'sign', [])
    expect(withAlias).toBeGreaterThan(0)
    expect(withoutAlias).toBe(0)
  })

  it('matches diacritics-stripped (cafe matches café)', () => {
    expect(commandScore('café', 'cafe', [])).toBeGreaterThan(0)
  })

  it('matches when search has diacritics but value does not', () => {
    expect(commandScore('cafe', 'café', [])).toBeGreaterThan(0)
  })

  it('returns 1 for empty abbreviation matching empty string', () => {
    expect(commandScore('', '', [])).toBe(1)
  })

  it('handles special regex characters in value safely', () => {
    expect(() => commandScore('<script>alert(1)</script>', 'sc', [])).not.toThrow()
    expect(commandScore('<script>alert(1)</script>', 'sc', [])).toBeGreaterThan(0)
  })
})
