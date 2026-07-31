/** Chord quality, determined by triad template matching against the live chroma vector. */
export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented' | 'unknown'

export interface ChordEstimate {
  /** Pitch class 0-11 (0 = C), or -1 if no confident root was found. */
  root: number
  quality: ChordQuality
  /** Cosine-similarity confidence of the best-matching template, 0-1. */
  confidence: number
}

/** One segment of a whole-track chord progression, produced by OfflineChordAnalyzer. */
export interface ChordTimelineEntry {
  /** Seconds from the start of the track this chord begins at. */
  time: number
  /** Seconds this chord's segment ends at (the next entry's `time`, or track duration for the last). */
  endTime: number
  root: number
  quality: ChordQuality
  confidence: number
}

export interface BeatState {
  /** True on the animation frame a beat is predicted to land on. */
  isBeat: boolean
  /** 0-1 phase within the current beat interval (0 = on the beat). */
  phase: number
  /** Estimated tempo in beats per minute, from the one-shot offline analysis. */
  bpm: number
}

export interface OnsetState {
  isOnset: boolean
  /** Spectral-flux based onset strength, roughly 0-1 after normalization. */
  strength: number
}

/**
 * The complete set of extracted musical features for a single audio frame.
 * This is the sole input to the Math Translation Engine — nothing downstream
 * of this type may read raw audio data directly.
 */
export interface MusicFeatures {
  /** Seconds since playback started. */
  time: number

  /** Estimated fundamental frequency in Hz (0 if unvoiced/no pitch detected). */
  pitchHz: number
  /** Dominant frequency bin in Hz, from the magnitude spectrum. */
  frequencyHz: number

  /** Linear amplitude 0-1 (peak-normalized time-domain magnitude). */
  volume: number
  /** Root-mean-square energy of the current frame, 0-1. */
  rmsEnergy: number

  tempo: BeatState
  onset: OnsetState

  /** Mel-frequency cepstral coefficients (timbre fingerprint), first 13 bands. */
  mfcc: number[]
  /** Spectral centroid in Hz — the "brightness" of the sound. */
  spectralCentroid: number
  /** Zero crossing rate, 0-1 (fraction of samples that cross zero per frame). */
  zeroCrossingRate: number

  /** -1 (full left) to +1 (full right). */
  stereoBalance: number

  chord: ChordEstimate
  /** 12-bin chroma / pitch-class energy vector, each 0-1. */
  harmonicEnergy: number[]
}
