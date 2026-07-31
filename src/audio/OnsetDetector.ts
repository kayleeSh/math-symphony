import type { OnsetState } from '../types/music'
import { clamp } from '../utils/math'

/**
 * Adaptive spectral-flux onset detection (Dixon 2006-style): flux is the sum of
 * positive-only frame-to-frame increases across the magnitude spectrum, and a
 * frame is an onset when its flux exceeds a rolling mean + k*stddev threshold.
 * Implemented directly against AnalyserNode data rather than Meyda's spectralFlux
 * extractor, which throws under strict-mode ESM (unrelated Meyda bug, see #852).
 */
export class OnsetDetector {
  private previousSpectrum: Uint8Array | null = null
  private readonly fluxHistory: number[] = []
  private readonly historySize = 43 // ~0.7s at 60fps

  detect(magnitudeSpectrum: Uint8Array): OnsetState {
    if (!this.previousSpectrum || this.previousSpectrum.length !== magnitudeSpectrum.length) {
      this.previousSpectrum = magnitudeSpectrum.slice()
      return { isOnset: false, strength: 0 }
    }

    let flux = 0
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
      const delta = magnitudeSpectrum[i] - this.previousSpectrum[i]
      if (delta > 0) flux += delta
    }
    this.previousSpectrum.set(magnitudeSpectrum)

    this.fluxHistory.push(flux)
    if (this.fluxHistory.length > this.historySize) this.fluxHistory.shift()

    const mean = this.fluxHistory.reduce((sum, v) => sum + v, 0) / this.fluxHistory.length
    const variance =
      this.fluxHistory.reduce((sum, v) => sum + (v - mean) ** 2, 0) / this.fluxHistory.length
    const stddev = Math.sqrt(variance)

    const threshold = mean + 1.3 * stddev
    const isOnset = this.fluxHistory.length >= 8 && flux > threshold && flux > 4
    const strength = stddev > 0 ? clamp((flux - mean) / (4 * stddev), 0, 1) : 0

    return { isOnset, strength }
  }
}
