import { describe, expect, it } from 'vitest'
import { analyzeChordTimeline } from './OfflineChordAnalyzer'

/** Sums sine tones at the given frequencies into one window of a buffer. */
function writeChord(data: Float32Array, start: number, end: number, sampleRate: number, freqs: number[]): void {
  for (let i = start; i < end; i++) {
    let sample = 0
    for (const freq of freqs) sample += Math.sin((2 * Math.PI * freq * i) / sampleRate)
    data[i] = (0.6 * sample) / freqs.length
  }
}

/** Builds a two-chord synthetic clip (C major, then A minor) as a minimal AudioBuffer stand-in. */
function buildTwoChordClip(sampleRate: number): AudioBuffer {
  const durationSeconds = 4
  const length = Math.floor(sampleRate * durationSeconds)
  const data = new Float32Array(length)
  const half = Math.floor(length / 2)

  // C major: C4, E4, G4
  writeChord(data, 0, half, sampleRate, [261.63, 329.63, 392.0])
  // A minor: A3, C4, E4
  writeChord(data, half, length, sampleRate, [220.0, 261.63, 329.63])

  return {
    sampleRate,
    length,
    numberOfChannels: 1,
    duration: durationSeconds,
    getChannelData: () => data,
  } as unknown as AudioBuffer
}

/**
 * Deterministic white noise (seeded linear congruential generator, not
 * Math.random — reproducible test runs) standing in for drums/vocals/reverb.
 * True time-domain noise has a flat spectrum, so — unlike summing a handful of
 * discrete sine tones — it doesn't accidentally alias onto a few specific
 * pitch classes; it spreads roughly evenly across all 12 chroma bins, which is
 * what actually stresses the "noise floor" the correlation fix addresses.
 */
function addBroadbandNoise(data: Float32Array, start: number, end: number, amplitude: number): void {
  let seed = 1234567
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff - 0.5
  }
  for (let i = start; i < end; i++) {
    data[i] += amplitude * next()
  }
}

describe('analyzeChordTimeline', () => {
  it('still recovers the progression under heavy broadband noise (drums/vocals stand-in)', () => {
    const sampleRate = 44100
    const buffer = buildTwoChordClip(sampleRate)
    const data = buffer.getChannelData(0)
    // Noise at 90% of the chord tones' own amplitude — a genuinely messy mix,
    // not a clean isolated chord. Plain cosine-similarity template matching
    // (the previous implementation) sits right at its ~0.5 noise-floor baseline
    // under conditions like this and mostly reports "unknown".
    addBroadbandNoise(data, 0, data.length, 0.9)

    const timeline = analyzeChordTimeline(buffer)
    const confidentEntries = timeline.filter((entry) => entry.quality !== 'unknown')

    // Most of the timeline should still resolve to a confident chord, not collapse to "unknown".
    const confidentDuration = confidentEntries.reduce((sum, e) => sum + (e.endTime - e.time), 0)
    expect(confidentDuration / buffer.duration).toBeGreaterThan(0.6)

    expect(timeline.some((e) => e.root === 0 && e.quality === 'major')).toBe(true)
    expect(timeline.some((e) => e.root === 9 && e.quality === 'minor')).toBe(true)
  })

  it('detects a chord change from C major to A minor at roughly the halfway point', () => {
    const sampleRate = 44100
    const buffer = buildTwoChordClip(sampleRate)
    const timeline = analyzeChordTimeline(buffer)

    expect(timeline.length).toBeGreaterThanOrEqual(2)

    const first = timeline[0]
    const last = timeline[timeline.length - 1]
    expect(first.root).toBe(0) // C
    expect(first.quality).toBe('major')
    expect(last.root).toBe(9) // A
    expect(last.quality).toBe('minor')

    // The change should land near the 2s halfway mark, not e.g. immediately or never.
    const changeTime = timeline.find((entry) => entry.root === 9 && entry.quality === 'minor')?.time
    expect(changeTime).toBeDefined()
    expect(changeTime as number).toBeGreaterThan(1.0)
    expect(changeTime as number).toBeLessThan(3.0)
  })

  it('covers the full track duration with no gaps', () => {
    const sampleRate = 44100
    const buffer = buildTwoChordClip(sampleRate)
    const timeline = analyzeChordTimeline(buffer)

    expect(timeline[0].time).toBe(0)
    expect(timeline[timeline.length - 1].endTime).toBe(buffer.duration)
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].time).toBe(timeline[i - 1].endTime)
    }
  })

  it('returns an empty timeline for a buffer shorter than one analysis frame', () => {
    const sampleRate = 44100
    const data = new Float32Array(100)
    const buffer = {
      sampleRate,
      length: data.length,
      numberOfChannels: 1,
      duration: data.length / sampleRate,
      getChannelData: () => data,
    } as unknown as AudioBuffer

    expect(analyzeChordTimeline(buffer)).toEqual([])
  })
})
