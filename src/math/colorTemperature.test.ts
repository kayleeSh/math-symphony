import { describe, expect, it } from 'vitest'
import { colorTemperatureRamp, spectralCentroidToTemperature } from './colorTemperature'

describe('colorTemperatureRamp', () => {
  it('starts at blue and ends at white', () => {
    const blue = colorTemperatureRamp(0)
    const white = colorTemperatureRamp(1)
    expect(blue.b).toBeGreaterThan(blue.r)
    // Warm-white anchor (1, 0.98, 0.92), not pure (1,1,1) — a soft glow reads
    // more "brilliant instrument" than a clinical white per the design brief.
    expect(white.r).toBeGreaterThan(0.95)
    expect(white.g).toBeGreaterThan(0.9)
    expect(white.b).toBeGreaterThan(0.85)
  })

  it('clamps out-of-range input', () => {
    expect(colorTemperatureRamp(-1)).toEqual(colorTemperatureRamp(0))
    expect(colorTemperatureRamp(2)).toEqual(colorTemperatureRamp(1))
  })
})

describe('spectralCentroidToTemperature', () => {
  it('increases monotonically with frequency', () => {
    const low = spectralCentroidToTemperature(100)
    const mid = spectralCentroidToTemperature(1000)
    const high = spectralCentroidToTemperature(5000)
    expect(mid).toBeGreaterThan(low)
    expect(high).toBeGreaterThan(mid)
  })

  it('stays within 0-1', () => {
    expect(spectralCentroidToTemperature(1)).toBeGreaterThanOrEqual(0)
    expect(spectralCentroidToTemperature(50000)).toBeLessThanOrEqual(1)
  })
})
