import type { AttractorKind, MathParameters, Topology } from '../types/math'
import type { ChordQuality, MusicFeatures } from '../types/music'
import { spectralCentroidToTemperature } from './colorTemperature'
import { classifyEmotion } from './emotion'
import { clamp, damp, lerp, remap } from '../utils/math'

export interface TranslationSettings {
  /** UI "sensitivity" knob: multiplies raw feature magnitude before it enters any mapping. */
  sensitivity: number
  emotionModeEnabled: boolean
}

const TOPOLOGY_BY_CHORD: Record<ChordQuality, Topology> = {
  major: 'symmetric',
  minor: 'organic',
  diminished: 'broken',
  augmented: 'expanding',
  unknown: 'neutral',
}

/** Groups the 12 chord roots into three bands, one per attractor family, for harmonic variety. */
function attractorKindForRoot(root: number): AttractorKind {
  if (root < 0) return 'lorenz'
  if (root < 4) return 'lorenz'
  if (root < 8) return 'thomas'
  return 'aizawa'
}

const SHOCKWAVE_DECAY_HALF_LIFE = 0.12
const SHOCKWAVE_MAX_RADIUS = 8

export function initialMathParameters(): MathParameters {
  return {
    orbitRadius: 3,
    layerHeight: 1.8,
    spiralPosition: 0,
    angularVelocity: 0.4,
    oscillationFrequency: 1,
    phaseRotation: 0,
    particleSize: 1,
    energy: 0.2,
    brightness: 0.3,
    opacity: 0.7,
    shockwave: { active: false, strength: 0, radius: 0 },
    timeScale: 1,
    shape: { roughness: 0.2, noiseAmount: 0.2, edgeSoftness: 0.6 },
    colorTemperature: 0.3,
    topology: 'neutral',
    attractorKind: 'lorenz',
    worldBalance: 0,
    atmosphere: { fogDensity: 0.02, bloomIntensity: 1, lightIntensity: 1, density: 1, cameraSpeed: 0.4 },
  }
}

/**
 * The Math Translation Engine: the single place where every extracted music
 * feature becomes a mathematical parameter consumed by the generators and
 * renderer. Pure function of (features, previous parameters, dt, settings) —
 * no direct feature -> pixel mapping happens anywhere else in the codebase.
 */
export function translate(
  features: MusicFeatures,
  prev: MathParameters,
  dt: number,
  settings: TranslationSettings,
): MathParameters {
  const s = clamp(settings.sensitivity, 0, 3)

  // --- Pitch -> orbit radius, layer height, spiral position ---
  const pitchHz = features.pitchHz > 0 ? features.pitchHz : 220
  const pitchLog = Math.log2(clamp(pitchHz, 55, 1760) / 55) // 0 at A1, 5 at A6
  const orbitRadiusTarget = remap(pitchLog * s, 0, 5, 2, 7)
  const layerHeightTarget = remap(pitchLog * s, 0, 5, 0.3, 2.8)
  // Octave-independent pitch class angle: same note in any octave lands at the same phase.
  const c0 = 16.3516
  const pitchClassAngle =
    (Math.log2(pitchHz / c0) - Math.floor(Math.log2(pitchHz / c0))) * Math.PI * 2

  // --- Frequency -> angular velocity, oscillation frequency, phase rotation ---
  const freqHz = features.frequencyHz > 0 ? features.frequencyHz : pitchHz
  const freqLog = Math.log2(clamp(freqHz, 50, 4000) / 50)
  const angularVelocityTarget = remap(freqLog * s, 0, 6.3, 0.15, 2.5)
  const oscillationFrequencyTarget = remap(freqLog * s, 0, 6.3, 0.4, 5)
  const phaseRotationTarget = remap(freqLog, 0, 6.3, 0, Math.PI * 2)

  // --- Volume / RMS -> particle size, energy, brightness, opacity ---
  const volume = clamp(features.volume * s, 0, 1.5)
  const rms = clamp(features.rmsEnergy * s, 0, 1.5)
  const particleSizeTarget = remap(volume, 0, 1, 0.6, 2.4)
  const energyTarget = clamp(rms, 0, 1)
  const brightnessTarget = clamp(volume, 0, 1)
  const opacityTarget = remap(volume, 0, 1, 0.35, 1)

  // --- Beat / onset -> shockwave (impulse + exponential decay, like a struck bell) ---
  const decayed = damp(prev.shockwave.strength, 0, SHOCKWAVE_DECAY_HALF_LIFE, dt)
  const impulse = Math.max(
    features.tempo.isBeat ? 1 : 0,
    features.onset.isOnset ? features.onset.strength : 0,
  )
  const shockwaveStrength = clamp(Math.max(decayed, impulse), 0, 1)
  const shockwave = {
    active: shockwaveStrength > 0.02,
    strength: shockwaveStrength,
    radius: SHOCKWAVE_MAX_RADIUS * (1 - shockwaveStrength),
  }

  // --- Tempo -> global time scale / simulation & camera speed ---
  const bpm = clamp(features.tempo.bpm, 40, 220)
  const timeScaleTarget = remap(bpm, 60, 180, 0.5, 2.2)
  const tempoCameraSpeed = remap(bpm, 60, 180, 0.2, 1.2)

  // --- Timbre / MFCC -> shape roughness, noise amount, edge softness ---
  const mfccBands = features.mfcc.slice(1) // drop c0 (overall energy, already captured by volume)
  const mfccMean = mfccBands.length
    ? mfccBands.reduce((sum, v) => sum + v, 0) / mfccBands.length
    : 0
  const mfccVariance = mfccBands.length
    ? mfccBands.reduce((sum, v) => sum + (v - mfccMean) ** 2, 0) / mfccBands.length
    : 0
  const roughnessTarget = clamp(remap(Math.sqrt(mfccVariance), 0, 40, 0, 1) * s, 0, 1)
  const highBandEnergy = mfccBands.slice(6).reduce((sum, v) => sum + Math.abs(v), 0)
  const noiseAmountTarget = clamp(remap(highBandEnergy, 0, 60, 0, 1) * s, 0, 1)
  const edgeSoftnessTarget = clamp(1 - remap(features.zeroCrossingRate, 0, 0.5, 0, 1), 0.1, 1)

  // --- Spectral centroid -> color temperature (blue -> green -> gold -> white) ---
  const colorTemperatureTarget = spectralCentroidToTemperature(features.spectralCentroid)

  // --- Chord -> graph topology / attractor family ---
  const topology = TOPOLOGY_BY_CHORD[features.chord.quality]
  const attractorKind = attractorKindForRoot(features.chord.root)

  // --- Stereo -> world balance ---
  const worldBalanceTarget = clamp(features.stereoBalance, -1, 1)

  // --- Emotion -> atmosphere (fog, bloom, light, density, camera speed) ---
  const emotion = classifyEmotion(bpm, features.rmsEnergy, features.chord.quality, colorTemperatureTarget)
  const neutralAtmosphere = { fogDensity: 0.02, bloomIntensity: 1, lightIntensity: 1, density: 1 }
  const emotionAtmosphere = {
    fogDensity: remap(emotion.arousal, -1, 1, 0.045, 0.006),
    bloomIntensity: remap(emotion.valence, -1, 1, 0.8, 1.6),
    lightIntensity: remap(emotion.valence, -1, 1, 0.6, 1.3),
    density: remap(emotion.arousal, -1, 1, 0.7, 1.3),
  }
  const atmosphereMix = settings.emotionModeEnabled ? 1 : 0
  const atmosphereTarget = {
    fogDensity: lerp(neutralAtmosphere.fogDensity, emotionAtmosphere.fogDensity, atmosphereMix),
    bloomIntensity: lerp(
      neutralAtmosphere.bloomIntensity,
      emotionAtmosphere.bloomIntensity,
      atmosphereMix,
    ),
    lightIntensity: lerp(
      neutralAtmosphere.lightIntensity,
      emotionAtmosphere.lightIntensity,
      atmosphereMix,
    ),
    density: lerp(neutralAtmosphere.density, emotionAtmosphere.density, atmosphereMix),
    cameraSpeed:
      tempoCameraSpeed *
      lerp(1, remap(emotion.arousal, -1, 1, 0.7, 1.4), atmosphereMix),
  }

  // Smoothing half-lives: fast-moving/rhythmic params stay snappy, slow-context
  // params (color, shape, world balance) are damped so the piece reads as calm
  // and continuous rather than jittering with every FFT frame.
  const H_FAST = 0.06
  const H_MED = 0.25
  const H_SLOW = 0.6

  return {
    orbitRadius: damp(prev.orbitRadius, orbitRadiusTarget, H_MED, dt),
    layerHeight: damp(prev.layerHeight, layerHeightTarget, H_MED, dt),
    spiralPosition: damp(prev.spiralPosition, pitchClassAngle, H_SLOW, dt),

    angularVelocity: damp(prev.angularVelocity, angularVelocityTarget, H_MED, dt),
    oscillationFrequency: damp(prev.oscillationFrequency, oscillationFrequencyTarget, H_MED, dt),
    phaseRotation: damp(prev.phaseRotation, phaseRotationTarget, H_SLOW, dt),

    particleSize: damp(prev.particleSize, particleSizeTarget, H_FAST, dt),
    energy: damp(prev.energy, energyTarget, H_FAST, dt),
    brightness: damp(prev.brightness, brightnessTarget, H_FAST, dt),
    opacity: damp(prev.opacity, opacityTarget, H_FAST, dt),

    shockwave,

    timeScale: damp(prev.timeScale, timeScaleTarget, H_SLOW, dt),

    shape: {
      roughness: damp(prev.shape.roughness, roughnessTarget, H_SLOW, dt),
      noiseAmount: damp(prev.shape.noiseAmount, noiseAmountTarget, H_SLOW, dt),
      edgeSoftness: damp(prev.shape.edgeSoftness, edgeSoftnessTarget, H_SLOW, dt),
    },

    colorTemperature: damp(prev.colorTemperature, colorTemperatureTarget, H_SLOW, dt),

    topology,
    attractorKind,

    worldBalance: damp(prev.worldBalance, worldBalanceTarget, H_MED, dt),

    atmosphere: {
      fogDensity: damp(prev.atmosphere.fogDensity, atmosphereTarget.fogDensity, H_SLOW, dt),
      bloomIntensity: damp(
        prev.atmosphere.bloomIntensity,
        atmosphereTarget.bloomIntensity,
        H_SLOW,
        dt,
      ),
      lightIntensity: damp(
        prev.atmosphere.lightIntensity,
        atmosphereTarget.lightIntensity,
        H_SLOW,
        dt,
      ),
      density: damp(prev.atmosphere.density, atmosphereTarget.density, H_SLOW, dt),
      cameraSpeed: damp(prev.atmosphere.cameraSpeed, atmosphereTarget.cameraSpeed, H_MED, dt),
    },
  }
}
