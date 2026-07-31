import { describe, expect, it } from 'vitest'
import { estimateTempo } from './OfflineTempoAnalyzer'

/** Builds a synthetic click track (short tone bursts at a fixed BPM) as a minimal AudioBuffer stand-in. */
function buildClickTrack(bpm: number, sampleRate: number, durationSeconds: number): AudioBuffer {
  const length = Math.floor(sampleRate * durationSeconds)
  const data = new Float32Array(length)
  const period = Math.round((60 / bpm) * sampleRate)
  const burstLength = 400

  for (let start = 0; start < length; start += period) {
    for (let i = 0; i < burstLength && start + i < length; i++) {
      const envelope = 1 - i / burstLength
      data[start + i] = 0.9 * envelope * Math.sin((2 * Math.PI * 1200 * i) / sampleRate)
    }
  }

  return {
    sampleRate,
    length,
    numberOfChannels: 1,
    duration: durationSeconds,
    getChannelData: () => data,
  } as unknown as AudioBuffer
}

describe('estimateTempo', () => {
  it.each([90, 120, 140])('recovers a %d BPM click track within 3 BPM', (bpm) => {
    const buffer = buildClickTrack(bpm, 44100, 6)
    const estimated = estimateTempo(buffer)
    expect(Math.abs(estimated - bpm)).toBeLessThan(3)
  })
})
