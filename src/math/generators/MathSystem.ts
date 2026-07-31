import type { MathParameters, MathSystemType } from '../../types/math'
import type { Vec3 } from '../noise'

export interface ParticleState {
  position: Vec3
  velocity: Vec3
  /**
   * Stable per-particle identity in [0, 1), independent of simulation history.
   * Generators use this (not array index) so particle identity survives a
   * texture-size change and stays deterministic — e.g. "this is the particle
   * at 137.5deg * 4231 turns of the golden spiral."
   */
  seed: number
}

/**
 * A MathSystem never returns a position directly. It returns an acceleration:
 * curve-based generators (polar/harmonic, golden spiral) act as a spring pulling
 * the particle toward a closed-form target curve; field-based generators (curl
 * noise, attractors) return the field's value at the particle's current position
 * directly. Unifying on "acceleration" is what lets CompositeMathSystem sum
 * multiple systems by weight — see CompositeMathSystem.ts.
 */
export interface MathSystem {
  readonly type: MathSystemType
  computeAcceleration(particle: ParticleState, time: number, params: MathParameters): Vec3
}

export function zero(): Vec3 {
  return { x: 0, y: 0, z: 0 }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}
