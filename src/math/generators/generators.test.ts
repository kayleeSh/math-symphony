import { describe, expect, it } from 'vitest'
import { initialMathParameters } from '../MathTranslationEngine'
import { AttractorSystem } from './AttractorSystem'
import { goldenSpiralTargetPosition, GoldenSpiralSystem } from './GoldenSpiralSystem'
import { polarHarmonicTargetPosition, PolarHarmonicSystem } from './PolarHarmonicSystem'
import type { AttractorKind } from '../../types/math'

describe('GoldenSpiralSystem', () => {
  it('scales target radius with sqrt(seed), the Vogel phyllotaxis formula', () => {
    const params = { ...initialMathParameters(), orbitRadius: 4, oscillationFrequency: 0 }
    // At t=0 the oscillation term sin(0)=0, so radius = orbitRadius * sqrt(seed) exactly.
    const p1 = goldenSpiralTargetPosition(1, 0, params)
    const p025 = goldenSpiralTargetPosition(0.25, 0, params)
    const radius1 = Math.hypot(p1.x, p1.y)
    const radius025 = Math.hypot(p025.x, p025.y)
    expect(radius1 / radius025).toBeCloseTo(2, 5) // sqrt(1)/sqrt(0.25) = 2
  })

  it('produces zero spring acceleration when the particle already sits on its target', () => {
    const params = initialMathParameters()
    const system = new GoldenSpiralSystem()
    const seed = 0.42
    const time = 3.7
    const target = goldenSpiralTargetPosition(seed, time, params)
    const accel = system.computeAcceleration({ position: target, velocity: { x: 0, y: 0, z: 0 }, seed }, time, params)
    expect(accel.x).toBeCloseTo(0, 8)
    expect(accel.y).toBeCloseTo(0, 8)
    expect(accel.z).toBeCloseTo(0, 8)
  })
})

describe('PolarHarmonicSystem', () => {
  it('produces zero spring acceleration when the particle already sits on its target', () => {
    const params = { ...initialMathParameters(), topology: 'symmetric' as const }
    const system = new PolarHarmonicSystem()
    const seed = 0.17
    const time = 1.2
    const target = polarHarmonicTargetPosition(seed, time, params)
    const accel = system.computeAcceleration({ position: target, velocity: { x: 0, y: 0, z: 0 }, seed }, time, params)
    expect(accel.x).toBeCloseTo(0, 8)
    expect(accel.y).toBeCloseTo(0, 8)
    expect(accel.z).toBeCloseTo(0, 8)
  })

  it('closes into an exact-period rose for symmetric topology but not for organic', () => {
    const seed = 0.3
    const time = 0
    const paramsSymmetric = { ...initialMathParameters(), topology: 'symmetric' as const, angularVelocity: 0 }
    const paramsOrganic = { ...initialMathParameters(), topology: 'organic' as const, angularVelocity: 0 }

    // One full turn later (seed shifted by exactly 1/3, since theta uses seed*2pi*3),
    // an integer-k rose (symmetric) returns to the same point; a non-integer-k rose
    // (organic) does not.
    const a1 = polarHarmonicTargetPosition(seed, time, paramsSymmetric)
    const a2 = polarHarmonicTargetPosition(seed + 1 / 3, time, paramsSymmetric)
    const b1 = polarHarmonicTargetPosition(seed, time, paramsOrganic)
    const b2 = polarHarmonicTargetPosition(seed + 1 / 3, time, paramsOrganic)

    expect(Math.hypot(a2.x - a1.x, a2.y - a1.y)).toBeCloseTo(0, 5)
    expect(Math.hypot(b2.x - b1.x, b2.y - b1.y)).toBeGreaterThan(0.1)
  })
})

describe('AttractorSystem', () => {
  const kinds: AttractorKind[] = ['lorenz', 'thomas', 'aizawa']

  it.each(kinds)('keeps acceleration bounded for %s even from far-out positions', (attractorKind) => {
    const params = { ...initialMathParameters(), attractorKind, orbitRadius: 3 }
    const system = new AttractorSystem()
    const farPositions = [
      { x: 50, y: 0, z: 0 },
      { x: 0, y: -80, z: 20 },
      { x: 200, y: 200, z: -200 },
    ]
    for (const position of farPositions) {
      const accel = system.computeAcceleration({ position, velocity: { x: 0, y: 0, z: 0 }, seed: 0.5 }, 0, params)
      const magnitude = Math.hypot(accel.x, accel.y, accel.z)
      expect(Number.isFinite(magnitude)).toBe(true)
      // MAX_ACCEL clamp (40) plus the centering term's contribution at this distance.
      expect(magnitude).toBeLessThan(40 + 0.15 * Math.hypot(position.x, position.y, position.z) + 1)
    }
  })
})
