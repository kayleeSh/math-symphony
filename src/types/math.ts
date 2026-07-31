/** The active particle-motion generator. See src/math/generators. */
export type MathSystemType = 'polar-harmonic' | 'golden-spiral' | 'curl-noise' | 'attractor'

export type AttractorKind = 'lorenz' | 'thomas' | 'aizawa'

/**
 * Graph/topology character driven by chord quality (spec: Chord -> Graph Topology).
 * Consumed by generators to bias symmetry, coupling and jitter, not just color.
 */
export type Topology = 'symmetric' | 'organic' | 'broken' | 'expanding' | 'neutral'

export interface ShockwaveState {
  active: boolean
  /** 0-1, decays after a beat. */
  strength: number
  /** Current expansion radius in world units. */
  radius: number
}

export interface ShapeParameters {
  /** Surface roughness driven by high-order MFCC variance, 0-1. */
  roughness: number
  /** Domain-warp noise amount applied to particle motion, 0-1. */
  noiseAmount: number
  /** Sprite edge softness, 0 (hard disc) - 1 (soft glow). */
  edgeSoftness: number
}

export interface AtmosphereParameters {
  fogDensity: number
  bloomIntensity: number
  lightIntensity: number
  /** Multiplier on active particle count / visual density. */
  density: number
  cameraSpeed: number
}

/**
 * Every field here must be traceable to a specific music feature via
 * MathTranslationEngine — see the plan's mapping table. Nothing here is
 * ever set from Math.random(); it is always a deterministic function of
 * MusicFeatures.
 */
export interface MathParameters {
  // Pitch
  orbitRadius: number
  layerHeight: number
  spiralPosition: number

  // Frequency
  angularVelocity: number
  oscillationFrequency: number
  phaseRotation: number

  // Volume
  particleSize: number
  energy: number
  brightness: number
  opacity: number

  // Beat
  shockwave: ShockwaveState

  // Tempo
  timeScale: number

  // Timbre / MFCC
  shape: ShapeParameters

  // Spectral centroid
  /** 0 (blue, dark) -> 1 (white, brilliant), see math/colorTemperature.ts */
  colorTemperature: number

  // Chord
  topology: Topology
  attractorKind: AttractorKind

  // Stereo
  /** -1 (left-biased) to +1 (right-biased) world offset. */
  worldBalance: number

  // Emotion (derived from tempo + energy + brightness + chord quality)
  atmosphere: AtmosphereParameters
}
