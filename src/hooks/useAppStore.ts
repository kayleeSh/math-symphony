import { create } from 'zustand'
import { DEFAULT_PARTICLE_CONFIG, type ParticleSystemConfig } from '../types/particles'

export type PlaybackStatus = 'idle' | 'recording' | 'loading' | 'ready' | 'error'

interface AppState {
  config: ParticleSystemConfig
  setConfig: (partial: Partial<ParticleSystemConfig>) => void

  isPlaying: boolean
  currentTime: number
  duration: number
  fileName: string | null
  status: PlaybackStatus
  errorMessage: string | null

  setPlayback: (partial: Partial<Pick<AppState, 'isPlaying' | 'currentTime' | 'duration'>>) => void
  setFile: (fileName: string | null) => void
  setStatus: (status: PlaybackStatus, errorMessage?: string | null) => void
}

/**
 * UI-facing reactive state only. The audio-rate MathParameters produced every
 * frame never touch this store (or React state at all) — they flow straight
 * from MathSymphonyEngine into Three.js uniforms via useFrame, bypassing React's
 * render cycle entirely for performance.
 */
export const useAppStore = create<AppState>((set) => ({
  config: DEFAULT_PARTICLE_CONFIG,
  setConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial } })),

  isPlaying: false,
  currentTime: 0,
  duration: 0,
  fileName: null,
  status: 'idle',
  errorMessage: null,

  setPlayback: (partial) => set(partial),
  setFile: (fileName) => set({ fileName }),
  setStatus: (status, errorMessage = null) => set({ status, errorMessage }),
}))
