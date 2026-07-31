import { useCallback, useRef, useState } from 'react'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'

export function UploadDropzone() {
  const engine = useMathSymphonyEngine()
  const status = useAppStore((state) => state.status)
  const errorMessage = useAppStore((state) => state.errorMessage)
  const setStatus = useAppStore((state) => state.setStatus)
  const setFile = useAppStore((state) => state.setFile)
  const setPlayback = useAppStore((state) => state.setPlayback)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback(
    async (file: File) => {
      setStatus('loading')
      setFile(file.name)
      try {
        await engine.loadFile(file)
        setPlayback({ duration: engine.duration, currentTime: 0, isPlaying: false })
        setStatus('ready')
      } catch (err) {
        console.error(err)
        setStatus('error', err instanceof Error ? err.message : 'Failed to decode audio file.')
      }
    },
    [engine, setStatus, setFile, setPlayback],
  )

  return (
    <div
      className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) void loadFile(file)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void loadFile(file)
        }}
      />
      <div className="dropzone__content">
        <span className="dropzone__title">
          {status === 'loading' ? 'Analyzing…' : 'Drop a track, or click to choose a file'}
        </span>
        <span className="dropzone__subtitle">MP3, WAV, FLAC, or any format your browser can decode</span>
        {status === 'error' && errorMessage && <span className="dropzone__error">{errorMessage}</span>}
      </div>
    </div>
  )
}
