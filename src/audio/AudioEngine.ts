/**
 * Thin wrapper around the Web Audio API graph: decodes an uploaded file once,
 * plays it back through an AudioBufferSourceNode (recreated on each play() since
 * these nodes are single-use), and exposes mono + stereo AnalyserNodes for the
 * FeatureExtractor to pull frame data from every animation frame.
 */
export class AudioEngine {
  private readonly context: AudioContext
  private readonly gainNode: GainNode
  private readonly splitter: ChannelSplitterNode
  readonly analyserMono: AnalyserNode
  readonly analyserLeft: AnalyserNode
  readonly analyserRight: AnalyserNode

  private buffer: AudioBuffer | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private startedAtContextTime = 0
  private startOffsetSeconds = 0
  private playing = false

  private liveSourceNode: MediaStreamAudioSourceNode | null = null
  private liveStartedAtContextTime = 0
  private live = false

  constructor() {
    this.context = new AudioContext()
    this.gainNode = this.context.createGain()
    this.gainNode.connect(this.context.destination)

    this.analyserMono = this.context.createAnalyser()
    this.analyserMono.fftSize = 2048
    this.analyserMono.smoothingTimeConstant = 0

    this.splitter = this.context.createChannelSplitter(2)
    this.analyserLeft = this.context.createAnalyser()
    this.analyserRight = this.context.createAnalyser()
    this.analyserLeft.fftSize = 1024
    this.analyserRight.fftSize = 1024
    this.splitter.connect(this.analyserLeft, 0)
    this.splitter.connect(this.analyserRight, 1)
  }

  /** Accepts a File (from upload) or a raw Blob (e.g. a MicrophoneRecorder capture) — both decode the same way. */
  async loadFile(file: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = await this.context.decodeAudioData(arrayBuffer)
    this.stop()
    this.buffer = buffer
    this.startOffsetSeconds = 0
    return buffer
  }

  get duration(): number {
    return this.buffer?.duration ?? 0
  }

  get isPlaying(): boolean {
    return this.playing
  }

  get currentTime(): number {
    if (this.live) return this.context.currentTime - this.liveStartedAtContextTime
    if (!this.playing) return this.startOffsetSeconds
    return this.startOffsetSeconds + (this.context.currentTime - this.startedAtContextTime)
  }

  get sampleRate(): number {
    return this.context.sampleRate
  }

  async play(): Promise<void> {
    if (!this.buffer || this.playing) return
    if (this.context.state === 'suspended') await this.context.resume()

    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    source.connect(this.gainNode)
    source.connect(this.analyserMono)
    source.connect(this.splitter)
    source.onended = () => {
      if (this.sourceNode === source) this.playing = false
    }
    source.start(0, this.startOffsetSeconds)

    this.sourceNode = source
    this.startedAtContextTime = this.context.currentTime
    this.playing = true
  }

  pause(): void {
    if (!this.playing || !this.sourceNode) return
    this.startOffsetSeconds = this.currentTime
    this.sourceNode.onended = null
    this.sourceNode.stop()
    this.sourceNode = null
    this.playing = false
  }

  seek(seconds: number): void {
    const wasPlaying = this.playing
    if (this.playing && this.sourceNode) {
      this.sourceNode.onended = null
      this.sourceNode.stop()
      this.sourceNode = null
      this.playing = false
    }
    this.startOffsetSeconds = Math.min(Math.max(seconds, 0), this.duration)
    if (wasPlaying) void this.play()
  }

  /**
   * Routes a live MediaStream (e.g. the microphone) into the same analyser
   * graph FeatureExtractor already reads from, so recording can be visualized
   * in real time — not connected to the destination/gainNode, so it's never
   * audible (no mic feedback through the speakers).
   */
  async startLiveInput(stream: MediaStream): Promise<void> {
    if (this.context.state === 'suspended') await this.context.resume()
    this.stopLiveInput()

    const source = this.context.createMediaStreamSource(stream)
    source.connect(this.analyserMono)
    source.connect(this.splitter)

    this.liveSourceNode = source
    this.liveStartedAtContextTime = this.context.currentTime
    this.live = true
  }

  stopLiveInput(): void {
    if (this.liveSourceNode) {
      this.liveSourceNode.disconnect()
      this.liveSourceNode = null
    }
    this.live = false
  }

  private stop(): void {
    if (this.sourceNode) {
      this.sourceNode.onended = null
      this.sourceNode.stop()
      this.sourceNode = null
    }
    this.playing = false
  }

  /** Mono time-domain samples in [-1, 1], length === analyserMono.fftSize. */
  getTimeDomainData(target: Float32Array<ArrayBuffer>): void {
    this.analyserMono.getFloatTimeDomainData(target)
  }

  /** Mono frequency-domain magnitudes in dB, length === analyserMono.frequencyBinCount. */
  getFrequencyData(target: Float32Array<ArrayBuffer>): void {
    this.analyserMono.getFloatFrequencyData(target)
  }

  getStereoRms(
    scratchLeft: Float32Array<ArrayBuffer>,
    scratchRight: Float32Array<ArrayBuffer>,
  ): { left: number; right: number } {
    this.analyserLeft.getFloatTimeDomainData(scratchLeft)
    this.analyserRight.getFloatTimeDomainData(scratchRight)
    const rms = (data: Float32Array<ArrayBuffer>) => {
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
      return Math.sqrt(sum / data.length)
    }
    return { left: rms(scratchLeft), right: rms(scratchRight) }
  }

  dispose(): void {
    this.stop()
    this.stopLiveInput()
    void this.context.close()
  }
}
