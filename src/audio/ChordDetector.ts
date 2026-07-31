import type { ChordEstimate, ChordQuality } from '../types/music'

/** Pitch-class offsets (0-11) present in each triad quality, rooted at 0. */
const TRIAD_INTERVALS: Record<Exclude<ChordQuality, 'unknown'>, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
}

const QUALITIES = Object.keys(TRIAD_INTERVALS) as Exclude<ChordQuality, 'unknown'>[]

/** All 12 root x 4 quality template vectors, precomputed once. */
const TEMPLATES: { root: number; quality: ChordQuality; vector: number[] }[] = []
for (let root = 0; root < 12; root++) {
  for (const quality of QUALITIES) {
    const vector = new Array(12).fill(0)
    for (const interval of TRIAD_INTERVALS[quality]) {
      vector[(root + interval) % 12] = 1
    }
    TEMPLATES.push({ root, quality, vector })
  }
}

/**
 * Pearson correlation between chroma and template, i.e. mean-centered cosine
 * similarity. Plain cosine similarity against a sparse 3-of-12 binary template
 * has a hidden ~0.5 "chance level" floor — a perfectly flat/noisy chroma vector
 * (broadband drums, vocals, reverb — anything real-world, as opposed to a clean
 * synthesized tone) already scores 0.5 against *every* template, since cosine
 * only measures raw magnitude alignment, not which bins are relatively louder
 * than the noise floor. Mean-centering both vectors first (the same trick the
 * Krumhansl-Schmuckler key-finding algorithm uses) removes that shared DC
 * component, so a uniform/noisy vector correlates ~0 with everything and only
 * genuine above-average energy at the chord tones drives the score up.
 */
function correlation(a: number[], b: number[]): number {
  const meanA = a.reduce((sum, v) => sum + v, 0) / a.length
  const meanB = b.reduce((sum, v) => sum + v, 0) / b.length
  let num = 0
  let denomA = 0
  let denomB = 0
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    num += da * db
    denomA += da * da
    denomB += db * db
  }
  if (denomA === 0 || denomB === 0) return 0
  return num / Math.sqrt(denomA * denomB)
}

const CONFIDENCE_THRESHOLD = 0.3

/**
 * Fraction of total chroma energy sitting in the 3 loudest bins. This is the
 * "is there even a chord here at all" gate, and it has to run *before*
 * template correlation: with 48 templates in play, picking the single best
 * correlation is a max-of-48-samples statistic, and even pure noise's chroma
 * (only 12 bins, never perfectly flat in any single window) will land a
 * spuriously high correlation against *some* template by chance alone —
 * empirically 0.47-0.77 for plain white noise, overlapping the range real
 * quiet/noisy chords score. Energy concentration doesn't have that problem:
 * pure noise sits in a tight ~0.26-0.29 band (barely above the 0.25 "flat"
 * baseline for 3-of-12 bins), while any genuine chord — even one buried under
 * heavy noise — concentrates well above that, empirically >=0.35 even at 90%
 * broadband noise by amplitude. Gating on this first means the correlation
 * step only ever runs on chroma that's actually chord-shaped.
 */
const TONALITY_THRESHOLD = 0.32

function top3EnergyFraction(chroma: number[]): number {
  const total = chroma.reduce((sum, v) => sum + v, 0)
  if (total <= 0) return 0
  const top3 = [...chroma].sort((a, b) => b - a).slice(0, 3)
  return (top3[0] + top3[1] + top3[2]) / total
}

/**
 * Matches a 12-bin chroma vector against major/minor/diminished/augmented triad
 * templates for every root via template correlation — a standard, well-established
 * chord-recognition technique (Fujishima 1999-style chromagram template matching,
 * Krumhansl-Schmuckler-style correlation scoring for real-world robustness).
 */
export function detectChord(chroma: number[]): ChordEstimate {
  if (chroma.length !== 12 || top3EnergyFraction(chroma) < TONALITY_THRESHOLD) {
    return { root: -1, quality: 'unknown', confidence: 0 }
  }

  let best: { root: number; quality: ChordQuality; confidence: number } = {
    root: -1,
    quality: 'unknown',
    confidence: 0,
  }

  for (const template of TEMPLATES) {
    const confidence = correlation(chroma, template.vector)
    if (confidence > best.confidence) {
      best = { root: template.root, quality: template.quality, confidence }
    }
  }

  if (best.confidence < CONFIDENCE_THRESHOLD) {
    return { root: -1, quality: 'unknown', confidence: best.confidence }
  }

  return best
}
