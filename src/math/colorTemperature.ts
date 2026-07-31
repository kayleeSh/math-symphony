import { clamp, lerp } from '../utils/math'

export interface RGB {
  r: number
  g: number
  b: number
}

/**
 * The spec's stylized "color temperature" ramp: Blue -> Green -> Gold -> White.
 * Not a physical blackbody curve — an artistic gradient over four anchor colors,
 * chosen to read as "cool/dark" -> "warm/brilliant" as spectral brightness rises.
 */
const STOPS: RGB[] = [
  { r: 0.13, g: 0.32, b: 0.75 }, // blue
  { r: 0.16, g: 0.62, b: 0.45 }, // green
  { r: 0.85, g: 0.65, b: 0.2 }, // gold
  { r: 1.0, g: 0.98, b: 0.92 }, // white
]

/** t in [0,1] across the blue -> green -> gold -> white ramp. */
export function colorTemperatureRamp(t: number): RGB {
  const clamped = clamp(t, 0, 1)
  const segments = STOPS.length - 1
  const scaled = clamped * segments
  const i = Math.min(Math.floor(scaled), segments - 1)
  const localT = scaled - i
  const a = STOPS[i]
  const b = STOPS[i + 1]
  return {
    r: lerp(a.r, b.r, localT),
    g: lerp(a.g, b.g, localT),
    b: lerp(a.b, b.b, localT),
  }
}

/**
 * Maps spectral centroid (Hz) to a 0-1 temperature value on a log scale, since
 * perceived brightness scales roughly logarithmically with frequency across the
 * audible range we care about (~80Hz dull hum -> ~6kHz brilliant/airy).
 */
export function spectralCentroidToTemperature(spectralCentroidHz: number): number {
  const minHz = 80
  const maxHz = 6000
  const clampedHz = clamp(spectralCentroidHz, minHz, maxHz)
  return Math.log2(clampedHz / minHz) / Math.log2(maxHz / minHz)
}
