import { describe, expect, it } from 'vitest'
import { initialMathParameters, translate } from './MathTranslationEngine'
import type { MusicFeatures } from '../types/music'

function baseFeatures(overrides: Partial<MusicFeatures> = {}): MusicFeatures {
  return {
    time: 0,
    pitchHz: 220,
    frequencyHz: 220,
    volume: 0.4,
    rmsEnergy: 0.4,
    tempo: { isBeat: false, phase: 0.5, bpm: 120 },
    onset: { isOnset: false, strength: 0 },
    mfcc: new Array(13).fill(0),
    spectralCentroid: 1000,
    zeroCrossingRate: 0.1,
    stereoBalance: 0,
    chord: { root: 0, quality: 'major', confidence: 0.9 },
    harmonicEnergy: new Array(12).fill(0),
    ...overrides,
  }
}

const SETTINGS = { sensitivity: 1, emotionModeEnabled: true }
// Large dt lets exponential damping converge close enough to target for assertions.
const CONVERGE_DT = 5

describe('MathTranslationEngine.translate', () => {
  it('increases orbitRadius and layerHeight as pitch rises', () => {
    const params = initialMathParameters()
    const low = translate(baseFeatures({ pitchHz: 80 }), params, CONVERGE_DT, SETTINGS)
    const high = translate(baseFeatures({ pitchHz: 1200 }), params, CONVERGE_DT, SETTINGS)

    expect(high.orbitRadius).toBeGreaterThan(low.orbitRadius)
    expect(high.layerHeight).toBeGreaterThan(low.layerHeight)
  })

  it('increases angularVelocity and oscillationFrequency as dominant frequency rises', () => {
    const params = initialMathParameters()
    const low = translate(baseFeatures({ frequencyHz: 100 }), params, CONVERGE_DT, SETTINGS)
    const high = translate(baseFeatures({ frequencyHz: 3000 }), params, CONVERGE_DT, SETTINGS)

    expect(high.angularVelocity).toBeGreaterThan(low.angularVelocity)
    expect(high.oscillationFrequency).toBeGreaterThan(low.oscillationFrequency)
  })

  it('increases particleSize, energy, brightness and opacity with volume', () => {
    const params = initialMathParameters()
    const quiet = translate(baseFeatures({ volume: 0.05, rmsEnergy: 0.05 }), params, CONVERGE_DT, SETTINGS)
    const loud = translate(baseFeatures({ volume: 0.95, rmsEnergy: 0.95 }), params, CONVERGE_DT, SETTINGS)

    expect(loud.particleSize).toBeGreaterThan(quiet.particleSize)
    expect(loud.energy).toBeGreaterThan(quiet.energy)
    expect(loud.brightness).toBeGreaterThan(quiet.brightness)
    expect(loud.opacity).toBeGreaterThan(quiet.opacity)
  })

  it('fires a shockwave impulse on a beat and lets it decay afterward', () => {
    const params = initialMathParameters()
    const onBeat = translate(baseFeatures({ tempo: { isBeat: true, phase: 0, bpm: 120 } }), params, 0.016, SETTINGS)
    expect(onBeat.shockwave.strength).toBeCloseTo(1, 5)
    expect(onBeat.shockwave.active).toBe(true)

    const decayed = translate(baseFeatures({ tempo: { isBeat: false, phase: 0.1, bpm: 120 } }), onBeat, 0.5, SETTINGS)
    expect(decayed.shockwave.strength).toBeLessThan(onBeat.shockwave.strength)
  })

  it('maps chord quality to the documented topology', () => {
    const params = initialMathParameters()
    const cases: [MusicFeatures['chord']['quality'], string][] = [
      ['major', 'symmetric'],
      ['minor', 'organic'],
      ['diminished', 'broken'],
      ['augmented', 'expanding'],
      ['unknown', 'neutral'],
    ]
    for (const [quality, topology] of cases) {
      const result = translate(
        baseFeatures({ chord: { root: 0, quality, confidence: 1 } }),
        params,
        CONVERGE_DT,
        SETTINGS,
      )
      expect(result.topology).toBe(topology)
    }
  })

  it('raises colorTemperature as spectral centroid rises', () => {
    const params = initialMathParameters()
    const dark = translate(baseFeatures({ spectralCentroid: 150 }), params, CONVERGE_DT, SETTINGS)
    const bright = translate(baseFeatures({ spectralCentroid: 5000 }), params, CONVERGE_DT, SETTINGS)
    expect(bright.colorTemperature).toBeGreaterThan(dark.colorTemperature)
  })

  it('keeps every output within its documented 0-1 (or -1..1) range', () => {
    const params = initialMathParameters()
    const result = translate(baseFeatures({ volume: 2, rmsEnergy: 2, stereoBalance: 3 }), params, CONVERGE_DT, {
      sensitivity: 3,
      emotionModeEnabled: true,
    })
    expect(result.opacity).toBeGreaterThanOrEqual(0)
    expect(result.opacity).toBeLessThanOrEqual(1)
    expect(result.shape.roughness).toBeGreaterThanOrEqual(0)
    expect(result.shape.roughness).toBeLessThanOrEqual(1)
    expect(result.worldBalance).toBeGreaterThanOrEqual(-1)
    expect(result.worldBalance).toBeLessThanOrEqual(1)
    expect(result.colorTemperature).toBeGreaterThanOrEqual(0)
    expect(result.colorTemperature).toBeLessThanOrEqual(1)
  })
})
