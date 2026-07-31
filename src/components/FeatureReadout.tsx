import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'
import type { MathParameters } from '../types/math'
import type { MusicFeatures } from '../types/music'
import { chordSymbol } from '../utils/notes'

/**
 * A live readout of the translation layer itself — pitch, chord, BPM, topology,
 * emotion — so the pipeline stays legible rather than a black box. This is the
 * "show your work" panel: every number here is exactly what's driving the visuals.
 */
export function FeatureReadout() {
  const engine = useMathSymphonyEngine()
  const isPlaying = useAppStore((state) => state.isPlaying)
  const isRecording = useAppStore((state) => state.status === 'recording')
  const [features, setFeatures] = useState<MusicFeatures | null>(null)
  const [params, setParams] = useState<MathParameters | null>(null)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    let frame = requestAnimationFrame(function loop(t) {
      if (t - lastUpdateRef.current > 150) {
        lastUpdateRef.current = t
        setFeatures(engine.musicFeatures)
        setParams(engine.mathParameters)
      }
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [engine])

  if ((!isPlaying && !isRecording) || !features || !params) return null

  return (
    <div className="readout">
      <ReadoutItem label="Pitch" value={features.pitchHz > 0 ? `${features.pitchHz.toFixed(0)} Hz` : '—'} />
      <ReadoutItem label="Chord" value={chordSymbol(features.chord.root, features.chord.quality)} />
      <ReadoutItem label="Tempo" value={`${features.tempo.bpm.toFixed(0)} BPM`} />
      <ReadoutItem label="Topology" value={params.topology} />
    </div>
  )
}

function ReadoutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="readout__item">
      <span className="readout__label">{label}</span>
      <span className="readout__value">{value}</span>
    </div>
  )
}
