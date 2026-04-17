import { normalize } from './normalize'
import type { FilterMode } from './types'

const SCORE_CONTINUE_MATCH = 1
const SCORE_SPACE_WORD_JUMP = 0.9
const SCORE_NON_SPACE_WORD_JUMP = 0.8
const SCORE_CHARACTER_JUMP = 0.17
const SCORE_TRANSPOSITION = 0.1
const PENALTY_SKIPPED = 0.999
const PENALTY_CASE_MISMATCH = 0.9999
const PENALTY_NOT_COMPLETE = 0.99

const IS_GAP_REGEXP = /[\\/_+.#"@[({&]/
const COUNT_GAPS_REGEXP = /[\\/_+.#"@[({&]/g
const IS_SPACE_REGEXP = /[\s-]/

export type PreparedCommandScoreHaystack = {
  haystack: string
  normalizedHaystack: string
}

const commandScoreInner = (
  string: string,
  abbreviation: string,
  lowerString: string,
  lowerAbbreviation: string,
  stringIndex: number,
  abbreviationIndex: number,
  memoizedResults: Record<string, number>,
): number => {
  if (abbreviationIndex === abbreviation.length) {
    if (stringIndex === string.length) return SCORE_CONTINUE_MATCH
    return PENALTY_NOT_COMPLETE
  }

  const memoizeKey = `${stringIndex},${abbreviationIndex}`
  if (memoizedResults[memoizeKey] !== undefined) return memoizedResults[memoizeKey]

  const abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex)
  let index = lowerString.indexOf(abbreviationChar, stringIndex)
  let highScore = 0
  let score: number
  let transposedScore: number
  let wordBreaks: RegExpMatchArray | null
  let spaceBreaks: RegExpMatchArray | null

  while (index >= 0) {
    score = commandScoreInner(
      string,
      abbreviation,
      lowerString,
      lowerAbbreviation,
      index + 1,
      abbreviationIndex + 1,
      memoizedResults,
    )

    if (score > highScore) {
      if (index === stringIndex) {
        score *= SCORE_CONTINUE_MATCH
      } else if (IS_GAP_REGEXP.test(string.charAt(index - 1))) {
        score *= SCORE_NON_SPACE_WORD_JUMP
        wordBreaks = string.slice(stringIndex, index - 1).match(COUNT_GAPS_REGEXP)
        if (wordBreaks && stringIndex > 0) {
          score *= PENALTY_SKIPPED ** wordBreaks.length
        }
      } else if (IS_SPACE_REGEXP.test(string.charAt(index - 1))) {
        score *= SCORE_SPACE_WORD_JUMP
        spaceBreaks = string.slice(stringIndex, index - 1).match(/[\s-]/g)
        if (spaceBreaks && stringIndex > 0) {
          score *= PENALTY_SKIPPED ** spaceBreaks.length
        }
      } else {
        score *= SCORE_CHARACTER_JUMP
        if (stringIndex > 0) {
          score *= PENALTY_SKIPPED ** (index - stringIndex)
        }
      }

      if (string.charAt(index) !== abbreviation.charAt(abbreviationIndex)) {
        score *= PENALTY_CASE_MISMATCH
      }
    }

    if (
      (score < SCORE_TRANSPOSITION &&
        lowerString.charAt(index - 1) === lowerAbbreviation.charAt(abbreviationIndex + 1)) ||
      (lowerAbbreviation.charAt(abbreviationIndex + 1) ===
        lowerAbbreviation.charAt(abbreviationIndex) &&
        lowerString.charAt(index - 1) !== lowerAbbreviation.charAt(abbreviationIndex))
    ) {
      transposedScore = commandScoreInner(
        string,
        abbreviation,
        lowerString,
        lowerAbbreviation,
        index + 1,
        abbreviationIndex + 2,
        memoizedResults,
      )

      if (transposedScore * SCORE_TRANSPOSITION > score) {
        score = transposedScore * SCORE_TRANSPOSITION
      }
    }

    if (score > highScore) highScore = score

    index = lowerString.indexOf(abbreviationChar, index + 1)
  }

  memoizedResults[memoizeKey] = highScore
  return highScore
}

/**
 * Score how well `abbreviation` matches `string`. Returns 0..1.
 * Aliases (keywords) are appended to the string before scoring.
 *
 * Both inputs are passed through normalize() for the lowercase form,
 * which strips diacritics so `cafe` matches `café`.
 *
 * Ported from pacocoursey/cmdk (MIT).
 */
export const commandScore = (
  string: string,
  abbreviation: string,
  aliases: readonly string[],
): number => {
  return commandScorePrepared(
    prepareCommandScoreHaystack(string, aliases),
    abbreviation,
    normalize(abbreviation),
  )
}

export const prepareCommandScoreHaystack = (
  string: string,
  aliases: readonly string[],
): PreparedCommandScoreHaystack => {
  const haystack = aliases.length > 0 ? `${string} ${aliases.join(' ')}` : string
  return {
    haystack,
    normalizedHaystack: normalize(haystack),
  }
}

export const commandScorePrepared = (
  prepared: PreparedCommandScoreHaystack,
  abbreviation: string,
  normalizedAbbreviation: string,
): number =>
  commandScoreInner(
    prepared.haystack,
    abbreviation,
    prepared.normalizedHaystack,
    normalizedAbbreviation,
    0,
    0,
    {},
  )

const hasWordBoundaryMatch = (haystack: string, needle: string): boolean => {
  let index = haystack.indexOf(needle)
  while (index >= 0) {
    if (index === 0) return true
    const previousChar = haystack.charAt(index - 1)
    if (IS_SPACE_REGEXP.test(previousChar) || IS_GAP_REGEXP.test(previousChar)) return true
    index = haystack.indexOf(needle, index + 1)
  }
  return false
}

export const commandContainsScorePrepared = (
  prepared: PreparedCommandScoreHaystack,
  normalizedAbbreviation: string,
): number => {
  if (normalizedAbbreviation === '') return 1
  if (prepared.normalizedHaystack.startsWith(normalizedAbbreviation)) return 1
  if (hasWordBoundaryMatch(prepared.normalizedHaystack, normalizedAbbreviation)) return 0.95
  if (prepared.normalizedHaystack.includes(normalizedAbbreviation)) return 0.9
  return 0
}

export const commandBuiltInScorePrepared = (
  prepared: PreparedCommandScoreHaystack,
  abbreviation: string,
  normalizedAbbreviation: string,
  mode: Exclude<FilterMode, 'none'>,
): number => {
  switch (mode) {
    case 'fuzzy':
      return commandScorePrepared(prepared, abbreviation, normalizedAbbreviation)
    case 'contains':
      return commandContainsScorePrepared(prepared, normalizedAbbreviation)
  }
}
