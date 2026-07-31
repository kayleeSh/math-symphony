import type { AttractorKind, MathParameters } from '../../types/math'
import type { Vec3 } from '../noise'
import { type MathSystem, type ParticleState, add, scale } from './MathSystem'

interface AttractorSpec {
  /** World-units-per-attractor-unit; maps our particle cloud into the attractor's natural range. */
  worldScale: number
  derivative(p: Vec3): Vec3
}

const LORENZ: AttractorSpec = {
  worldScale: 0.22,
  derivative: ({ x, y, z }) => {
    const sigma = 10
    const rho = 28
    const beta = 8 / 3
    return { x: sigma * (y - x), y: x * (rho - z) - y, z: x * y - beta * z }
  },
}

const THOMAS: AttractorSpec = {
  worldScale: 1.6,
  derivative: ({ x, y, z }) => {
    const b = 0.19
    return { x: Math.sin(y) - b * x, y: Math.sin(z) - b * y, z: Math.sin(x) - b * z }
  },
}

const AIZAWA: AttractorSpec = {
  worldScale: 4.5,
  derivative: ({ x, y, z }) => {
    const a = 0.95
    const b = 0.7
    const c = 0.6
    const d = 3.5
    const e = 0.25
    const f = 0.1
    return {
      x: (z - b) * x - d * y,
      y: d * x + (z - b) * y,
      z:
        c +
        a * z -
        (z * z * z) / 3 -
        (x * x + y * y) * (1 + e * z) +
        f * z * x * x * x,
    }
  },
}

const SPECS: Record<AttractorKind, AttractorSpec> = {
  lorenz: LORENZ,
  thomas: THOMAS,
  aizawa: AIZAWA,
}

/** Chaotic derivatives can spike in magnitude; clamp so a single integration step stays stable. */
const MAX_ACCEL = 40

function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

export class AttractorSystem implements MathSystem {
  readonly type = 'attractor' as const

  computeAcceleration(particle: ParticleState, _time: number, params: MathParameters): Vec3 {
    const spec = SPECS[params.attractorKind]
    const attractorSpace = scale(particle.position, 1 / (params.orbitRadius * spec.worldScale))
    const derivative = spec.derivative(attractorSpace)
    let accel = scale(derivative, spec.worldScale * params.orbitRadius * 0.3)

    const mag = magnitude(accel)
    if (mag > MAX_ACCEL) accel = scale(accel, MAX_ACCEL / mag)

    // Gentle centering pull keeps the swarm anchored near the origin instead of
    // drifting away on the attractor's unbounded axes (Thomas/Aizawa in particular).
    const centering = scale(particle.position, -0.15)

    return add(accel, centering)
  }
}
