import type { ChordQuality } from '../types/music'

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  unknown: '',
}

/**
 * Standard lead-sheet chord symbol notation (the kind any musician or chord
 * chart reads directly): "C", "Am", "F#dim", "Gaug". Root -1 / quality
 * "unknown" renders as an em dash — no confident chord was detected.
 */
export function chordSymbol(root: number, quality: ChordQuality): string {
  if (root < 0 || quality === 'unknown') return '—'
  return `${NOTE_NAMES[root]}${QUALITY_SUFFIX[quality]}`
}
