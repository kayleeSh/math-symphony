import type { Emotion, EmotionState } from '../types/emotion'
import type { ChordQuality } from '../types/music'
import { clamp, remap } from '../utils/math'

/**
 * Rule-based placement on Russell's circumplex model of affect (arousal x valence),
 * built entirely from features already extracted elsewhere in the pipeline. This is
 * deliberately NOT a machine-learning classifier — it's one more deterministic
 * mathematical mapping, consistent with the rest of the translation engine. A real
 * model could replace `classifyEmotion` without changing its signature.
 */
const ANCHORS: Record<Emotion, { arousal: number; valence: number }> = {
  peaceful: { arousal: -0.6, valence: 0.5 },
  dreamy: { arousal: -0.5, valence: 0.15 },
  happy: { arousal: 0.5, valence: 0.7 },
  energetic: { arousal: 0.8, valence: 0.1 },
  aggressive: { arousal: 0.7, valence: -0.6 },
  melancholic: { arousal: -0.3, valence: -0.4 },
  sad: { arousal: -0.7, valence: -0.7 },
}

const CHORD_VALENCE: Record<ChordQuality, number> = {
  major: 0.6,
  augmented: 0.5,
  minor: -0.5,
  diminished: -0.8,
  unknown: 0,
}

export function computeArousal(bpm: number, rmsEnergy: number): number {
  const tempoArousal = remap(bpm, 60, 180, -1, 1)
  const energyArousal = clamp(rmsEnergy * 2 - 1, -1, 1)
  return clamp(0.5 * tempoArousal + 0.5 * energyArousal, -1, 1)
}

export function computeValence(chordQuality: ChordQuality, brightness01: number): number {
  const chordValence = CHORD_VALENCE[chordQuality]
  const brightnessValence = brightness01 * 2 - 1
  return clamp(0.6 * chordValence + 0.4 * brightnessValence, -1, 1)
}

export function classifyEmotion(
  bpm: number,
  rmsEnergy: number,
  chordQuality: ChordQuality,
  brightness01: number,
): EmotionState {
  const arousal = computeArousal(bpm, rmsEnergy)
  const valence = computeValence(chordQuality, brightness01)

  let best: Emotion = 'peaceful'
  let bestDist = Infinity
  for (const [emotion, anchor] of Object.entries(ANCHORS) as [
    Emotion,
    { arousal: number; valence: number },
  ][]) {
    const dArousal = arousal - anchor.arousal
    const dValence = valence - anchor.valence
    const dist = dArousal * dArousal + dValence * dValence
    if (dist < bestDist) {
      bestDist = dist
      best = emotion
    }
  }

  return { emotion: best, arousal, valence }
}
