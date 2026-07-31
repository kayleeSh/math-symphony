import Meyda from 'meyda'
import type { MusicFeatures } from '../types/music'
import { clamp, finite } from '../utils/math'
import type { AudioEngine } from './AudioEngine'
import { BeatTracker } from './BeatTracker'
import { detectChord } from './ChordDetector'
import { OnsetDetector } from './OnsetDetector'
import { detectPitch } from './PitchDetector'

/**
 * Combines Meyda (rms, spectral centroid, zcr, mfcc, chroma — low-level DSP
 * primitives) with original code for the features Meyda doesn't cover: pitch
 * (PitchDetector), onsets (OnsetDetector — Meyda's built-in spectralFlux
 * extractor throws under strict-mode ESM), beat phase (BeatTracker, seeded by
 * OfflineTempoAnalyzer's one-shot BPM), and chord quality (ChordDetector, built
 * on Meyda's chroma output). Produces one MusicFeatures object per call.
 */
export class FeatureExtractor {
  private readonly audio: AudioEngine
  private readonly onsetDetector = new OnsetDetector()
  private readonly beatTracker: BeatTracker
  private readonly timeDomain: Float32Array<ArrayBuffer>
  private readonly byteFrequency: Uint8Array<ArrayBuffer>
  private readonly stereoScratchLeft: Float32Array<ArrayBuffer>
  private readonly stereoScratchRight: Float32Array<ArrayBuffer>

  constructor(audio: AudioEngine, initialBpm: number) {
    this.audio = audio
    Meyda.sampleRate = audio.sampleRate
    Meyda.bufferSize = audio.analyserMono.fftSize
    Meyda.numberOfMFCCCoefficients = 13
    Meyda.chromaBands = 12

    this.beatTracker = new BeatTracker(initialBpm)
    this.timeDomain = new Float32Array(audio.analyserMono.fftSize)
    this.byteFrequency = new Uint8Array(audio.analyserMono.frequencyBinCount)
    this.stereoScratchLeft = new Float32Array(audio.analyserLeft.fftSize)
    this.stereoScratchRight = new Float32Array(audio.analyserRight.fftSize)
  }

  setBpm(bpm: number): void {
    this.beatTracker.setBpm(bpm)
  }

  extract(dt: number): MusicFeatures {
    const time = this.audio.currentTime
    this.audio.getTimeDomainData(this.timeDomain)
    this.audio.analyserMono.getByteFrequencyData(this.byteFrequency)

    const meyda = Meyda.extract(['rms', 'spectralCentroid', 'zcr', 'mfcc', 'chroma'], this.timeDomain)

    // Meyda's DSP math (division by total spectral magnitude, log of mel bands, etc.)
    // produces NaN on silent/near-silent frames rather than 0 — `finite()` catches
    // that (plain `?? 0` would not, since NaN isn't nullish) so it can never leak
    // into MathParameters and permanently corrupt a damped value.
    const rmsEnergy = clamp(finite(meyda?.rms), 0, 1)
    const spectralCentroid = finite(meyda?.spectralCentroid)
    const zeroCrossingRate = clamp(finite(meyda?.zcr) / this.timeDomain.length, 0, 1)
    const mfcc = (meyda?.mfcc ?? new Array(13).fill(0)).map((v) => finite(v))
    const chroma = (meyda?.chroma ?? new Array(12).fill(0)).map((v) => finite(v))

    let peak = 0
    for (let i = 0; i < this.timeDomain.length; i++) {
      const abs = Math.abs(this.timeDomain[i])
      if (abs > peak) peak = abs
    }
    const volume = clamp(peak, 0, 1)

    const pitchHz = detectPitch(this.timeDomain, this.audio.sampleRate)

    let dominantBin = 0
    let dominantMagnitude = -1
    for (let i = 0; i < this.byteFrequency.length; i++) {
      if (this.byteFrequency[i] > dominantMagnitude) {
        dominantMagnitude = this.byteFrequency[i]
        dominantBin = i
      }
    }
    const frequencyHz = (dominantBin * this.audio.sampleRate) / (2 * this.byteFrequency.length)

    const onset = this.onsetDetector.detect(this.byteFrequency)
    const tempo = this.beatTracker.track(time, dt)

    const stereo = this.audio.getStereoRms(this.stereoScratchLeft, this.stereoScratchRight)
    const stereoSum = stereo.left + stereo.right
    const stereoBalance = stereoSum > 1e-6 ? (stereo.right - stereo.left) / stereoSum : 0

    const chord = detectChord(chroma)

    return {
      time,
      pitchHz,
      frequencyHz,
      volume,
      rmsEnergy,
      tempo,
      onset,
      mfcc,
      spectralCentroid,
      zeroCrossingRate,
      stereoBalance,
      chord,
      harmonicEnergy: chroma,
    }
  }
}
