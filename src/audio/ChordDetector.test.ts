import { describe, expect, it } from 'vitest'
import { detectChord } from './ChordDetector'

function chromaFor(pitchClasses: number[]): number[] {
  const chroma = new Array(12).fill(0)
  for (const pc of pitchClasses) chroma[pc] = 1
  return chroma
}

describe('detectChord', () => {
  it('identifies a C major triad (C, E, G)', () => {
    const result = detectChord(chromaFor([0, 4, 7]))
    expect(result.root).toBe(0)
    expect(result.quality).toBe('major')
  })

  it('identifies an A minor triad (A, C, E)', () => {
    const result = detectChord(chromaFor([9, 0, 4]))
    expect(result.root).toBe(9)
    expect(result.quality).toBe('minor')
  })

  it('identifies a B diminished triad (B, D, F)', () => {
    const result = detectChord(chromaFor([11, 2, 5]))
    expect(result.root).toBe(11)
    expect(result.quality).toBe('diminished')
  })

  it('identifies a C augmented triad (C, E, G#)', () => {
    const result = detectChord(chromaFor([0, 4, 8]))
    expect(result.root).toBe(0)
    expect(result.quality).toBe('augmented')
  })

  it('reports unknown for a flat/ambiguous chroma vector', () => {
    const result = detectChord(new Array(12).fill(1 / 12))
    expect(result.quality).toBe('unknown')
    expect(result.root).toBe(-1)
  })

  it('reports unknown for a chroma vector of the wrong length', () => {
    const result = detectChord([1, 0, 0])
    expect(result.quality).toBe('unknown')
  })

  it('reports unknown for near-flat noisy chroma, not a false-positive chord', () => {
    // Deterministic pseudo-random near-uniform chroma (not Math.random) —
    // regression test for a real bug: picking the best of 48 templates against
    // this kind of vector used to false-positive (order-statistics effect:
    // even non-tonal noise's *best* match among 48 comparisons scores
    // deceptively high on raw template correlation alone).
    let seed = 7
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const noisyFlat = Array.from({ length: 12 }, () => 0.5 + 0.05 * (next() - 0.5))
    const result = detectChord(noisyFlat)
    expect(result.quality).toBe('unknown')
    expect(result.root).toBe(-1)
  })

  it('still identifies a chord whose energy is concentrated but not purely binary', () => {
    // A real chroma vector is never a clean 0/1 template — the chord tones
    // dominate but low-level energy leaks into every bin (harmonics, noise).
    const chroma = chromaFor([0, 4, 7]).map((v) => (v === 1 ? 0.85 : 0.05))
    const result = detectChord(chroma)
    expect(result.root).toBe(0)
    expect(result.quality).toBe('major')
  })
})
