import type { MathParameters } from '../../types/math'
import type { Vec3 } from '../noise'
import { type MathSystem, type ParticleState, scale, sub } from './MathSystem'

/** The golden angle: 2*pi*(1 - 1/phi), the divergence angle of Vogel's phyllotaxis model. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const SPRING_STIFFNESS = 5
/** How many "turns" worth of index-space the seed range spans; higher = denser spiral arms. */
const TURN_DENSITY = 4000

/**
 * Vogel's model for phyllotaxis (sunflower seed / pinecone spiral arrangement):
 * angle_i = i * goldenAngle, radius_i = c * sqrt(i). Continuous in `seed` rather
 * than integer `i` (seed is a stable per-particle identity in [0,1)), which is a
 * valid generalization of the same formula and keeps particle identity independent
 * of particle count.
 */
export function goldenSpiralTargetPosition(seed: number, t: number, params: MathParameters): Vec3 {
  const index = seed * TURN_DENSITY
  const angle = index * GOLDEN_ANGLE + params.phaseRotation + params.angularVelocity * t * 0.15
  const radius =
    params.orbitRadius * Math.sqrt(seed) * (1 + 0.12 * Math.sin(params.oscillationFrequency * t))

  const x = radius * Math.cos(angle)
  const y = radius * Math.sin(angle)
  const z =
    params.layerHeight *
    Math.sin(seed * Math.PI * 2 + params.spiralPosition + params.angularVelocity * t * 0.2)

  return { x, y, z }
}

export class GoldenSpiralSystem implements MathSystem {
  readonly type = 'golden-spiral' as const

  computeAcceleration(particle: ParticleState, time: number, params: MathParameters): Vec3 {
    const target = goldenSpiralTargetPosition(particle.seed, time, params)
    return scale(sub(target, particle.position), SPRING_STIFFNESS)
  }
}
