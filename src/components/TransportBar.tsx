import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/** Polls the engine's audio-rate clock at ~5fps — plenty for a scrubber, cheap enough to live in React state. */
export function TransportBar() {
  const engine = useMathSymphonyEngine()
  const duration = useAppStore((state) => state.duration)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const setPlayback = useAppStore((state) => state.setPlayback)
  const [displayTime, setDisplayTime] = useState(0)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    let frame = requestAnimationFrame(function loop(t) {
      if (t - lastUpdateRef.current > 200) {
        lastUpdateRef.current = t
        setDisplayTime(engine.currentTime)
        setPlayback({ isPlaying: engine.isPlaying })
      }
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [engine, setPlayback])

  const togglePlay = () => {
    if (engine.isPlaying) {
      engine.pause()
    } else {
      engine.play()
    }
    setPlayback({ isPlaying: engine.isPlaying })
  }

  return (
    <div className="transport">
      <button className="transport__play" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? '❚❚' : '►'}
      </button>
      <span className="transport__time">{formatTime(displayTime)}</span>
      <input
        className="transport__scrubber"
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(displayTime, duration || 0)}
        onChange={(e) => {
          const t = Number(e.target.value)
          engine.seek(t)
          setDisplayTime(t)
        }}
      />
      <span className="transport__time">{formatTime(duration)}</span>
    </div>
  )
}
