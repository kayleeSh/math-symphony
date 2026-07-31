import type * as THREE from 'three'
import { AudioEngine } from '../audio/AudioEngine'
import { analyzeChordTimeline } from '../audio/OfflineChordAnalyzer'
import { estimateTempo } from '../audio/OfflineTempoAnalyzer'
import { FeatureExtractor } from '../audio/FeatureExtractor'
import { initialMathParameters, translate } from '../math/MathTranslationEngine'
import type { MathParameters } from '../types/math'
import type { ChordTimelineEntry, MusicFeatures } from '../types/music'
import { DEFAULT_PARTICLE_CONFIG, type ParticleSystemConfig } from '../types/particles'
import { ParticleSimulation } from '../systems/ParticleSimulation'

/**
 * The top-level orchestrator described in the architecture doc:
 * Audio -> FeatureExtractor -> MathTranslationEngine -> ParticleSimulation.
 * Owns the Web Audio graph (works without a renderer) and, once a renderer is
 * attached, the GPU particle simulation. `tick(dt)` is the entire per-frame
 * pipeline; nothing else in the app reads raw audio or writes particle uniforms.
 */
export class MathSymphonyEngine {
  readonly audio = new AudioEngine()

  private simulation: ParticleSimulation | null = null
  private featureExtractor: FeatureExtractor | null = null
  private config: ParticleSystemConfig
  private mathParams: MathParameters = initialMathParameters()
  private lastFeatures: MusicFeatures | null = null
  private chordTimelineData: ChordTimelineEntry[] = []

  constructor(initialConfig: ParticleSystemConfig = DEFAULT_PARTICLE_CONFIG) {
    this.config = initialConfig
  }

  /** Creates the GPU particle simulation once the R3F renderer is available; returns its Points object. */
  attachRenderer(renderer: THREE.WebGLRenderer): THREE.Points {
    this.simulation?.dispose()
    this.simulation = new ParticleSimulation(renderer, this.config.count)
    return this.simulation.points
  }

  /** Accepts a File (upload) or a raw Blob (e.g. a MicrophoneRecorder capture). */
  async loadFile(file: Blob): Promise<void> {
    const buffer = await this.audio.loadFile(file)
    const bpm = estimateTempo(buffer)
    this.chordTimelineData = analyzeChordTimeline(buffer)
    this.featureExtractor = new FeatureExtractor(this.audio, bpm)
    this.mathParams = initialMathParameters()
  }

  /**
   * Starts real-time analysis of a live input (microphone) so the visualization
   * reacts while recording, not just on playback afterward. Tempo isn't known
   * yet (that requires the full clip, see OfflineTempoAnalyzer) so beat tracking
   * runs against a neutral default BPM until loadFile() replaces it post-recording.
   */
  async startLiveAnalysis(stream: MediaStream): Promise<void> {
    await this.audio.startLiveInput(stream)
    this.featureExtractor = new FeatureExtractor(this.audio, 120)
    this.mathParams = initialMathParameters()
    this.chordTimelineData = []
  }

  stopLiveAnalysis(): void {
    this.audio.stopLiveInput()
    this.featureExtractor = null
  }

  play(): void {
    void this.audio.play()
  }

  pause(): void {
    this.audio.pause()
  }

  seek(seconds: number): void {
    this.audio.seek(seconds)
  }

  updateConfig(partial: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...partial }
  }

  get particleConfig(): ParticleSystemConfig {
    return this.config
  }

  get currentTime(): number {
    return this.audio.currentTime
  }

  get duration(): number {
    return this.audio.duration
  }

  get isPlaying(): boolean {
    return this.audio.isPlaying
  }

  get isLoaded(): boolean {
    return this.featureExtractor !== null
  }

  get mathParameters(): MathParameters {
    return this.mathParams
  }

  get musicFeatures(): MusicFeatures | null {
    return this.lastFeatures
  }

  /** The full-track chord progression, computed once when a clip finishes loading. */
  get chordTimeline(): ChordTimelineEntry[] {
    return this.chordTimelineData
  }

  /**
   * The entire per-frame pipeline: audio features -> math parameters -> GPU uniforms.
   * Runs even before a track is loaded (using the last/default MathParameters) so the
   * simulation is always live — an idle golden-spiral breathing gently rather than a
   * frozen or uninitialized particle cloud.
   */
  tick(dt: number): void {
    if (!this.simulation) return

    if (this.featureExtractor) {
      const features = this.featureExtractor.extract(dt)
      this.lastFeatures = features
      this.mathParams = translate(features, this.mathParams, dt, {
        sensitivity: this.config.sensitivity,
        emotionModeEnabled: this.config.emotionModeEnabled,
      })
    }

    this.simulation.update(this.mathParams, this.config, dt)
  }

  dispose(): void {
    this.simulation?.dispose()
    this.audio.dispose()
  }
}
