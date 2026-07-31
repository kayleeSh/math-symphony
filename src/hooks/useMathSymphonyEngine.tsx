import { createContext, useContext, useRef, type ReactNode } from 'react'
import { MathSymphonyEngine } from '../engine/MathSymphonyEngine'
import { DEFAULT_PARTICLE_CONFIG } from '../types/particles'

const EngineContext = createContext<MathSymphonyEngine | null>(null)

export function EngineProvider({ children }: { children: ReactNode }) {
  // Guarded lazy-init so the engine (and its AudioContext) is constructed exactly
  // once per mount, even under React 18 StrictMode's double-invoked render.
  const ref = useRef<MathSymphonyEngine | null>(null)
  if (!ref.current) {
    ref.current = new MathSymphonyEngine(DEFAULT_PARTICLE_CONFIG)
  }
  return <EngineContext.Provider value={ref.current}>{children}</EngineContext.Provider>
}

export function useMathSymphonyEngine(): MathSymphonyEngine {
  const engine = useContext(EngineContext)
  if (!engine) {
    throw new Error('useMathSymphonyEngine must be used within an EngineProvider')
  }
  return engine
}
