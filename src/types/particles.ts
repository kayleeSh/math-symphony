import type { MathSystemType } from './math'

/** User/quality-adjustable simulation settings, independent of music features. */
export interface ParticleSystemConfig {
  /** Requested particle count; the GPGPU texture is sized to the next square >= this. */
  count: number
  activeSystem: MathSystemType
  /** 0-1 weight of the always-available curl-noise perturbation layered on top of the base system. */
  curlOverlay: number
  /** Global input sensitivity multiplier applied to extracted features before translation. */
  sensitivity: number
  bloomIntensity: number
  emotionModeEnabled: boolean
}

export const DEFAULT_PARTICLE_CONFIG: ParticleSystemConfig = {
  count: 65536,
  activeSystem: 'golden-spiral',
  curlOverlay: 0.25,
  sensitivity: 1,
  bloomIntensity: 1,
  emotionModeEnabled: true,
}
