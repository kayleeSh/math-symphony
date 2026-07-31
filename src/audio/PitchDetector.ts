/**
 * Simplified YIN pitch detection (de Cheveigne & Kawahara, 2002) on a time-domain
 * buffer. Returns the estimated fundamental frequency in Hz, or 0 if the signal
 * is too quiet or no confident periodicity is found (percussive/unpitched frame).
 */
export function detectPitch(
  timeDomain: Float32Array,
  sampleRate: number,
  minHz = 60,
  maxHz = 1000,
): number {
  const size = timeDomain.length

  let rms = 0
  for (let i = 0; i < size; i++) rms += timeDomain[i] * timeDomain[i]
  rms = Math.sqrt(rms / size)
  if (rms < 0.01) return 0

  const minLag = Math.floor(sampleRate / maxHz)
  const maxLag = Math.min(Math.floor(sampleRate / minHz), size - 1)
  if (maxLag <= minLag) return 0

  // Step 1-2: difference function d(lag) = sum((x[i] - x[i+lag])^2)
  const diff = new Float32Array(maxLag + 1)
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    const limit = size - maxLag
    for (let i = 0; i < limit; i++) {
      const d = timeDomain[i] - timeDomain[i + lag]
      sum += d * d
    }
    diff[lag] = sum
  }

  // Step 3: cumulative mean normalized difference function
  const cmnd = new Float32Array(maxLag + 1)
  cmnd[minLag] = 1
  let runningSum = 0
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    runningSum += diff[lag]
    cmnd[lag] = runningSum > 0 ? (diff[lag] * (lag - minLag + 1)) / runningSum : 1
  }

  // Step 4: absolute threshold — first dip below threshold, refined to its local minimum
  const threshold = 0.15
  let bestLag = -1
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (cmnd[lag] < threshold) {
      let refined = lag
      while (refined + 1 <= maxLag && cmnd[refined + 1] < cmnd[refined]) refined++
      bestLag = refined
      break
    }
  }

  // Fallback: global minimum of the CMND if nothing crossed the threshold.
  if (bestLag === -1) {
    let minVal = Infinity
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (cmnd[lag] < minVal) {
        minVal = cmnd[lag]
        bestLag = lag
      }
    }
  }

  if (bestLag <= 0) return 0
  return sampleRate / bestLag
}
