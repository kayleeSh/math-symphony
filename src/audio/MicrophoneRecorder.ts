const MIME_TYPE_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_TYPE_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

/**
 * Captures ambient audio from the device microphone (e.g. music playing out
 * loud from a phone nearby) into a single Blob. Deliberately decoupled from
 * AudioEngine/AnalyserNode — the captured clip is handed to
 * MathSymphonyEngine.loadFile() afterward and flows through the exact same
 * decode -> offline tempo -> playback pipeline as an uploaded file.
 */
export class MicrophoneRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []

  get isRecording(): boolean {
    return this.recorder?.state === 'recording'
  }

  /** The live microphone stream, so a caller can also route it into a real-time analyser. */
  get mediaStream(): MediaStream | null {
    return this.stream
  }

  async start(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support microphone capture.')
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.chunks = []

    const mimeType = pickSupportedMimeType()
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.recorder.start()
  }

  /** Stops capture and resolves with the recorded clip. */
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('Not currently recording.'))
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' })
        this.releaseStream()
        resolve(blob)
      }
      recorder.stop()
    })
  }

  /** Stops capture and discards whatever was recorded so far. */
  cancel(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop()
    }
    this.releaseStream()
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}
