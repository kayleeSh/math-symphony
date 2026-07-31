import Meyda from 'meyda'
import type { ChordQuality, ChordTimelineEntry } from '../types/music'
import { finite } from '../utils/math'
import { detectChord } from './ChordDetector'
import { downmixToMono } from './downmix'

// 8192 samples (~0.19s @ 44.1kHz) gives ~5.4Hz FFT bins — enough to resolve
// adjacent semitones down in the bass register, where chord roots usually
// live and a smaller window would blur neighboring pitch classes together.
// 50% overlap (half-size hop) keeps time resolution reasonable despite the
// larger window.
const FRAME_SIZE = 8192
const HOP_SIZE = 4096
/** Rolling average over this many raw chroma frames, smoothing out single-frame transients (drum hits, etc). */
const SMOOTHING_FRAMES = 3
/** Segments shorter than this are almost always chroma noise/transients, not a real chord change. */
const MIN_SEGMENT_SECONDS = 0.35

interface RawFrame {
  time: number
  root: number
  quality: ChordQuality
  confidence: number
}

/**
 * One-shot whole-track chord progression, run once on load (upload or a
 * finished recording) alongside OfflineTempoAnalyzer — same rationale: a chord
 * progression is a property of the whole clip, not something to re-derive
 * from a single noisy frame. Slides a window across the full decoded buffer,
 * computes a chroma vector per window (Meyda, run offline rather than live),
 * smooths across a few neighboring frames, runs each through the same
 * ChordDetector template matching FeatureExtractor uses live, then collapses
 * consecutive identical detections into segments.
 */
export function analyzeChordTimeline(buffer: AudioBuffer): ChordTimelineEntry[] {
  const mono = downmixToMono(buffer)
  const sampleRate = buffer.sampleRate

  Meyda.sampleRate = sampleRate
  Meyda.bufferSize = FRAME_SIZE
  Meyda.chromaBands = 12

  const times: number[] = []
  const rawChroma: number[][] = []
  for (let start = 0; start + FRAME_SIZE <= mono.length; start += HOP_SIZE) {
    const window = mono.subarray(start, start + FRAME_SIZE)
    const extracted = Meyda.extract('chroma', window) as number[] | null
    rawChroma.push((extracted ?? new Array(12).fill(0)).map((v) => finite(v)))
    times.push(start / sampleRate)
  }

  const frames: RawFrame[] = rawChroma.map((_, i) => {
    const chroma = smoothChroma(rawChroma, i, SMOOTHING_FRAMES)
    const chord = detectChord(chroma)
    return { time: times[i], root: chord.root, quality: chord.quality, confidence: chord.confidence }
  })

  return segmentTimeline(frames, buffer.duration)
}

/** Averages chroma[index] with up to `radius` neighboring frames on each side. */
function smoothChroma(chroma: number[][], index: number, radius: number): number[] {
  const start = Math.max(0, index - radius)
  const end = Math.min(chroma.length - 1, index + radius)
  const averaged = new Array(12).fill(0)
  let count = 0
  for (let i = start; i <= end; i++) {
    for (let bin = 0; bin < 12; bin++) averaged[bin] += chroma[i][bin]
    count++
  }
  return averaged.map((v) => v / count)
}

function segmentTimeline(frames: RawFrame[], totalDuration: number): ChordTimelineEntry[] {
  if (frames.length === 0) return []

  const spans: ChordTimelineEntry[] = []
  for (const frame of frames) {
    const last = spans[spans.length - 1]
    if (last && last.root === frame.root && last.quality === frame.quality) {
      last.confidence = Math.max(last.confidence, frame.confidence)
    } else {
      // Close the previous span exactly where this one starts — otherwise it's
      // left ending at the last same-chord frame's own start time, one hop
      // short of the actual boundary, leaving a gap in the timeline.
      if (last) last.endTime = frame.time
      spans.push({
        time: frame.time,
        endTime: frame.time,
        root: frame.root,
        quality: frame.quality,
        confidence: frame.confidence,
      })
    }
  }
  spans[spans.length - 1].endTime = totalDuration

  // Merge flicker-short segments into the previous one so the progression reads
  // as real chord changes rather than every noisy per-frame reclassification.
  const merged: ChordTimelineEntry[] = []
  for (const span of spans) {
    const duration = span.endTime - span.time
    const previous = merged[merged.length - 1]
    if (duration < MIN_SEGMENT_SECONDS && previous) {
      previous.endTime = span.endTime
    } else {
      merged.push(span)
    }
  }

  return merged
}
