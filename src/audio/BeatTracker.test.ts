import { describe, expect, it } from 'vitest'
import { BeatTracker } from './BeatTracker'

describe('BeatTracker', () => {
  it('fires exactly one beat per period at 120 BPM over a simulated 4-second playback', () => {
    const tracker = new BeatTracker(120)
    const dt = 1 / 60
    let time = 0
    let beatCount = 0
    for (let frame = 0; frame < 60 * 4; frame++) {
      const state = tracker.track(time, dt)
      if (state.isBeat) beatCount++
      time += dt
    }
    // 120 BPM = 2 beats/sec, so ~8 beats in 4 seconds (allow off-by-one for frame quantization).
    expect(beatCount).toBeGreaterThanOrEqual(7)
    expect(beatCount).toBeLessThanOrEqual(9)
  })

  it('reports phase 0 immediately on the beat and increasing phase afterward', () => {
    const tracker = new BeatTracker(60) // exactly 1 beat/sec
    const dt = 1 / 60
    const atBeat = tracker.track(1.0, dt)
    const justAfter = tracker.track(1.0 + dt, dt)
    expect(atBeat.phase).toBeLessThan(0.05)
    expect(justAfter.phase).toBeGreaterThan(atBeat.phase)
  })
})
