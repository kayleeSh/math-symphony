import type { BeatState } from '../types/music'

function positiveMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

/**
 * Predicts beat timing from a known BPM as a simple metronome grid anchored at
 * playback time 0 (beat n lands at t = n * 60/bpm). A beat fires exactly when the
 * phase wraps between two frames — deterministic and frame-rate independent, as
 * long as dt stays well under one beat period (true for any music tempo at
 * interactive frame rates). This is intentionally separate from OnsetDetector:
 * a "beat" is the predicted rhythmic pulse, an "onset" is any detected transient
 * (including off-grid/syncopated hits).
 */
export class BeatTracker {
  private bpm: number

  constructor(initialBpm: number) {
    this.bpm = Math.max(1, initialBpm)
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(1, bpm)
  }

  track(playbackTimeSeconds: number, dt: number): BeatState {
    const period = 60 / this.bpm
    const phase = positiveMod(playbackTimeSeconds, period) / period
    const prevPhase = positiveMod(playbackTimeSeconds - dt, period) / period
    const isBeat = dt > 0 && dt < period && phase < prevPhase

    return { isBeat, phase, bpm: this.bpm }
  }
}
