import { downmixToMono } from './downmix'

/**
 * One-shot global tempo (BPM) estimate over a fully decoded AudioBuffer, run once
 * on upload. Tempo is a slowly-changing, whole-track property, so estimating it
 * offline (rather than re-guessing every animation frame) is both cheaper and
 * more stable — live playback only needs to track *phase* within that tempo,
 * which is BeatTracker's job.
 *
 * Method: energy-flux onset envelope (frame-wise RMS, positive-rectified
 * difference between consecutive frames) followed by autocorrelation over the
 * lag range corresponding to 40-220 BPM. The lag with the strongest periodic
 * correlation is taken as the beat period.
 */
export function estimateTempo(buffer: AudioBuffer): number {
  const frameSize = 1024
  const hopSize = 512
  const sampleRate = buffer.sampleRate

  const mono = downmixToMono(buffer)
  const rms = frameWiseRms(mono, frameSize, hopSize)
  const onsetEnvelope = onsetFlux(rms)

  const hopRate = sampleRate / hopSize
  const minBpm = 60
  const maxBpm = 200
  const minLag = Math.round((60 / maxBpm) * hopRate)
  const maxLag = Math.round((60 / minBpm) * hopRate)

  let bestLag = minLag
  let bestScore = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    const score = autocorrelationAtLag(onsetEnvelope, lag)
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }

  const bpm = (60 * hopRate) / bestLag
  return Math.min(Math.max(bpm, 40), 220)
}

function frameWiseRms(mono: Float32Array, frameSize: number, hopSize: number): Float32Array {
  const frameCount = Math.max(1, Math.floor((mono.length - frameSize) / hopSize))
  const rms = new Float32Array(frameCount)
  for (let i = 0; i < frameCount; i++) {
    const start = i * hopSize
    let sum = 0
    for (let j = 0; j < frameSize; j++) {
      const sample = mono[start + j] ?? 0
      sum += sample * sample
    }
    rms[i] = Math.sqrt(sum / frameSize)
  }
  return rms
}

function onsetFlux(rms: Float32Array): Float32Array {
  const flux = new Float32Array(rms.length)
  for (let i = 1; i < rms.length; i++) {
    flux[i] = Math.max(0, rms[i] - rms[i - 1])
  }
  return flux
}

function autocorrelationAtLag(signal: Float32Array, lag: number): number {
  let sum = 0
  for (let i = 0; i + lag < signal.length; i++) {
    sum += signal[i] * signal[i + lag]
  }
  return sum
}
