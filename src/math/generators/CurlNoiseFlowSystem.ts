import type { MathParameters } from '../../types/math'
import type { Vec3 } from '../noise'
import { curlNoise3 } from '../noise'
import { type MathSystem, type ParticleState, scale } from './MathSystem'

/**
 * Organic, divergence-free flow field. Because it's the curl of a potential
 * field (see math/noise.ts), the resulting velocity field has zero divergence
 * everywhere: particles get carried around like smoke/dye in a fluid rather
 * than clumping into sinks or being ejected from sources.
 */
export class CurlNoiseFlowSystem implements MathSystem {
  readonly type = 'curl-noise' as const

  computeAcceleration(particle: ParticleState, time: number, params: MathParameters): Vec3 {
    const noiseScale = 0.15 + 0.35 * params.shape.noiseAmount
    const advection = time * (0.05 + 0.1 * params.timeScale)
    const sample = curlNoise3({
      x: particle.position.x * noiseScale + advection,
      y: particle.position.y * noiseScale,
      z: particle.position.z * noiseScale + advection,
    })
    const strength = 4 * (0.4 + params.energy)
    return scale(sample, strength)
  }
}
