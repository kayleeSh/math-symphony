import { describe, expect, it } from 'vitest'
import { detectPitch } from './PitchDetector'

function sineWave(frequencyHz: number, sampleRate: number, length: number): Float32Array {
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    buffer[i] = 0.6 * Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate)
  }
  return buffer
}

describe('detectPitch (simplified YIN)', () => {
  const sampleRate = 44100

  it.each([110, 220, 440, 880])('recovers a %d Hz sine tone within 2%%', (freq) => {
    const signal = sineWave(freq, sampleRate, 2048)
    const detected = detectPitch(signal, sampleRate)
    expect(detected).toBeGreaterThan(0)
    expect(Math.abs(detected - freq) / freq).toBeLessThan(0.02)
  })

  it('returns 0 for near-silence', () => {
    const signal = new Float32Array(2048).fill(0.0001)
    expect(detectPitch(signal, sampleRate)).toBe(0)
  })
})
