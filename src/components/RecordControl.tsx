import { useCallback, useRef, useState } from 'react'
import { MicrophoneRecorder } from '../audio/MicrophoneRecorder'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Captures ambient audio (e.g. music playing from a phone nearby) via the
 * microphone: click to start, click to stop. While recording, the same
 * MediaStream is also routed live into MathSymphonyEngine's analyser graph
 * (see AudioEngine.startLiveInput) so the visualization reacts in real time,
 * not just after you stop. On stop, the recorded clip flows through the exact
 * same load -> offline tempo -> playback pipeline as an uploaded file, and
 * starts playing automatically.
 */
export function RecordControl() {
  const engine = useMathSymphonyEngine()
  const status = useAppStore((state) => state.status)
  const setStatus = useAppStore((state) => state.setStatus)
  const setFile = useAppStore((state) => state.setFile)
  const setPlayback = useAppStore((state) => state.setPlayback)
  const recorderRef = useRef<MicrophoneRecorder | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const [elapsed, setElapsed] = useState(0)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    try {
      engine.pause()
      const recorder = new MicrophoneRecorder()
      await recorder.start()
      recorderRef.current = recorder

      if (recorder.mediaStream) {
        await engine.startLiveAnalysis(recorder.mediaStream)
      }

      startedAtRef.current = performance.now()
      setElapsed(0)
      timerRef.current = window.setInterval(() => {
        setElapsed((performance.now() - startedAtRef.current) / 1000)
      }, 200)

      setStatus('recording')
    } catch (err) {
      recorderRef.current?.cancel()
      recorderRef.current = null
      engine.stopLiveAnalysis()
      console.error(err)
      setStatus('error', err instanceof Error ? err.message : 'Microphone access was denied.')
    }
  }, [engine, setStatus])

  const stopRecording = useCallback(async () => {
    clearTimer()
    const recorder = recorderRef.current
    if (!recorder) return

    setStatus('loading')
    engine.stopLiveAnalysis()
    try {
      const clip = await recorder.stop()
      await engine.loadFile(clip)
      setFile(`Live recording · ${formatElapsed(elapsed)}`)
      setPlayback({ duration: engine.duration, currentTime: 0, isPlaying: true })
      setStatus('ready')
      engine.play()
    } catch (err) {
      console.error(err)
      setStatus('error', err instanceof Error ? err.message : 'Failed to process the recording.')
    } finally {
      recorderRef.current = null
    }
  }, [elapsed, engine, setFile, setPlayback, setStatus])

  if (status === 'recording') {
    return (
      <div className="record-control record-control--active">
        <span className="record-control__dot" />
        <span className="record-control__timer">{formatElapsed(elapsed)}</span>
        <span className="record-control__hint">Listening…</span>
        <button className="record-control__button" onClick={() => void stopRecording()}>
          Stop
        </button>
      </div>
    )
  }

  return (
    <button
      className="record-control__start"
      onClick={() => void startRecording()}
      disabled={status === 'loading'}
    >
      Record from microphone
    </button>
  )
}
