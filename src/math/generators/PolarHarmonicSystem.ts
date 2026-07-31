import type { MathParameters } from '../../types/math'
import type { Vec3 } from '../noise'
import { type MathSystem, type ParticleState, scale, sub } from './MathSystem'

const TWO_PI = Math.PI * 2
/** Spring stiffness pulling particles onto the target curve (1/s^2 per unit distance). */
const SPRING_STIFFNESS = 6

/**
 * Rose-curve-in-polar-coordinates target, with Lissajous-style oscillation on the
 * z axis. The petal count `k` and whether it's an integer is driven directly by
 * chord topology (spec: Chord -> Graph Topology):
 *  - symmetric (major):  integer k, closed rose, clean petals
 *  - organic  (minor):   non-integer k, the rose never closes -> drifting rosette
 *  - broken   (diminished): integer k plus a small odd-harmonic term that breaks symmetry
 *  - expanding (augmented): radius grows with angle -> spiraling rose
 *  - neutral: plain circle (k = 0)
 */
export function polarHarmonicTargetPosition(seed: number, t: number, params: MathParameters): Vec3 {
  const theta =
    seed * TWO_PI * 3 + params.phaseRotation + params.angularVelocity * t

  let k: number
  let radiusGrowth = 0
  let asymmetry = 0

  switch (params.topology) {
    case 'symmetric':
      k = 3
      break
    case 'organic':
      k = 3.5
      break
    case 'broken':
      k = 4
      asymmetry = 0.35 * params.shape.roughness
      break
    case 'expanding':
      k = 2
      radiusGrowth = 0.35
      break
    default:
      k = 0
  }

  const rose = Math.cos(k * theta) + asymmetry * Math.sin(5 * theta + seed * TWO_PI)
  const radius =
    params.orbitRadius * (1 + 0.5 * rose) * (1 + radiusGrowth * (theta / TWO_PI - 1.5))

  const x = radius * Math.cos(theta)
  const y = radius * Math.sin(theta)
  const z =
    params.layerHeight * Math.sin(params.oscillationFrequency * t + seed * TWO_PI)

  return { x, y, z }
}

export class PolarHarmonicSystem implements MathSystem {
  readonly type = 'polar-harmonic' as const

  computeAcceleration(particle: ParticleState, time: number, params: MathParameters): Vec3 {
    const target = polarHarmonicTargetPosition(particle.seed, time, params)
    return scale(sub(target, particle.position), SPRING_STIFFNESS)
  }
}
