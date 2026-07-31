export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Sanitizes a value that may be NaN/Infinity (e.g. a DSP division-by-zero on a
 * silent audio frame) back to a safe fallback. Unlike `?? fallback`, this also
 * catches NaN — `NaN ?? fallback` evaluates to NaN, since NaN is not nullish.
 */
export function finite(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Remaps value from [inMin, inMax] to [outMin, outMax], clamped to the output range. */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1)
  return lerp(outMin, outMax, t)
}

/**
 * Frame-rate independent exponential damping (Freya Holmer's "lerp smoothing" fix).
 * `halfLife` is the time in seconds for the value to close half the distance to `target`.
 */
export function damp(current: number, target: number, halfLife: number, dt: number): number {
  if (halfLife <= 0) return target
  const t = 1 - Math.pow(2, -dt / halfLife)
  return lerp(current, target, t)
}

export function nextPowerOfTwo(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(1, n))))
}

/** Smallest square texture side length whose area is >= count. */
export function squareTextureSize(count: number): number {
  return Math.ceil(Math.sqrt(count))
}
