import type { MathParameters, MathSystemType } from '../../types/math'
import type { Vec3 } from '../noise'
import { AttractorSystem } from './AttractorSystem'
import { CurlNoiseFlowSystem } from './CurlNoiseFlowSystem'
import { GoldenSpiralSystem } from './GoldenSpiralSystem'
import { add, type MathSystem, type ParticleState, scale } from './MathSystem'
import { PolarHarmonicSystem } from './PolarHarmonicSystem'

const BASE_SYSTEMS: Record<MathSystemType, MathSystem> = {
  'polar-harmonic': new PolarHarmonicSystem(),
  'golden-spiral': new GoldenSpiralSystem(),
  'curl-noise': new CurlNoiseFlowSystem(),
  attractor: new AttractorSystem(),
}

/**
 * Sums weighted accelerations from multiple MathSystems. Demonstrates the spec's
 * "engine should allow combining multiple mathematical systems simultaneously":
 * the active base system supplies the dominant structure, and curl noise is always
 * available as an additive organic perturbation on top of it (weight 0 disables it).
 */
export class CompositeMathSystem {
  private activeSystem: MathSystemType
  private curlOverlayWeight: number

  constructor(activeSystem: MathSystemType, curlOverlayWeight: number) {
    this.activeSystem = activeSystem
    this.curlOverlayWeight = curlOverlayWeight
  }

  setActiveSystem(system: MathSystemType): void {
    this.activeSystem = system
  }

  setCurlOverlayWeight(weight: number): void {
    this.curlOverlayWeight = weight
  }

  computeAcceleration(particle: ParticleState, time: number, params: MathParameters): Vec3 {
    const base = BASE_SYSTEMS[this.activeSystem]
    let total = base.computeAcceleration(particle, time, params)

    if (this.activeSystem !== 'curl-noise' && this.curlOverlayWeight > 0) {
      const overlay = BASE_SYSTEMS['curl-noise'].computeAcceleration(particle, time, params)
      total = add(total, scale(overlay, this.curlOverlayWeight))
    }

    return total
  }
}
