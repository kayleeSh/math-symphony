import { useEffect, useRef, useState } from 'react'
import type { ChordTimelineEntry } from '../types/music'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'
import { chordSymbol } from '../utils/notes'

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function timelineAsText(entries: ChordTimelineEntry[]): string {
  return entries.map((entry) => `${formatTime(entry.time)}  ${chordSymbol(entry.root, entry.quality)}`).join('\n')
}

/**
 * The full chord progression for the loaded clip (see OfflineChordAnalyzer),
 * in standard lead-sheet notation — the same symbols ("C", "Am", "F#dim") any
 * musician or chord-chart app reads directly, listed top-to-bottom in the
 * order they occur, the way a real chord chart is read. A "Copy" button
 * exports that same timestamped text. Always visible once a track is loaded
 * (with an honest empty state if nothing confident was detected) rather than
 * silently disappearing, so it's never ambiguous whether the feature ran.
 */
export function ChordTimelinePanel() {
  const engine = useMathSymphonyEngine()
  const status = useAppStore((state) => state.status)
  const [timeline, setTimeline] = useState<ChordTimelineEntry[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [copied, setCopied] = useState(false)
  const lastUpdateRef = useRef(0)
  const activeRowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setTimeline(status === 'ready' ? engine.chordTimeline : [])
  }, [engine, status])

  useEffect(() => {
    if (status !== 'ready') return
    let frame = requestAnimationFrame(function loop(t) {
      if (t - lastUpdateRef.current > 150) {
        lastUpdateRef.current = t
        setCurrentTime(engine.currentTime)
      }
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [engine, status])

  // Only genuinely identified chords are shown in the chart — segments where
  // nothing confidently matched are real information (silence, noise, a chord
  // shape we don't model) but would just read as clutter in a chord chart.
  const namedEntries = timeline.filter((entry) => entry.quality !== 'unknown')
  const activeIndex = namedEntries.findIndex(
    (entry) => currentTime >= entry.time && currentTime < entry.endTime,
  )

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  if (status !== 'ready') return null

  const copyAsText = () => {
    navigator.clipboard
      ?.writeText(timelineAsText(namedEntries))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  return (
    <div className="chord-panel">
      <div className="chord-panel__header">
        <span>Chord Chart</span>
        {namedEntries.length > 0 && (
          <button className="chord-panel__copy" onClick={copyAsText}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <div className="chord-panel__list">
        {namedEntries.length === 0 ? (
          <p className="chord-panel__empty">
            No confident chords detected yet — try a recording with clearer, sustained harmony.
          </p>
        ) : (
          namedEntries.map((entry, index) => (
            <div
              key={`${entry.time}-${index}`}
              ref={index === activeIndex ? activeRowRef : null}
              className={`chord-panel__row${index === activeIndex ? ' chord-panel__row--active' : ''}`}
            >
              <span className="chord-panel__symbol">{chordSymbol(entry.root, entry.quality)}</span>
              <span className="chord-panel__time">{formatTime(entry.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
