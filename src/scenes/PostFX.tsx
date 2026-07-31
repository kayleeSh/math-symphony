import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'

/**
 * Physically-plausible post stack: mipmap bloom (no harsh glow), a light depth
 * of field for scientific-instrument focus falloff, a soft vignette, and ACES
 * filmic tone mapping. Bloom intensity is content-driven (emotion atmosphere)
 * scaled by the user's bloom slider — never a fixed constant.
 *
 * Intensity is pushed through throttled React state rather than an imperative
 * ref: @react-three/postprocessing's effect wrapper JSON.stringifies its props
 * on every render, and under React 19 a ref prop resolves into that same props
 * object once attached — stringifying the live (circular) effect instance
 * crashes the WebGL context. Bloom is already slow-moving (damped in
 * MathTranslationEngine), so a ~12fps state update is visually seamless.
 */
export function PostFX() {
  const engine = useMathSymphonyEngine()
  const bloomSlider = useAppStore((state) => state.config.bloomIntensity)
  const [bloomIntensity, setBloomIntensity] = useState(1)
  const lastUpdateRef = useRef(0)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t - lastUpdateRef.current > 0.08) {
      lastUpdateRef.current = t
      setBloomIntensity(engine.mathParameters.atmosphere.bloomIntensity * bloomSlider)
    }
  })

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.55}
        luminanceSmoothing={0.2}
        intensity={bloomIntensity}
        radius={0.6}
      />
      <DepthOfField focusDistance={0.015} focalLength={0.06} bokehScale={2} />
      <Vignette eskil={false} offset={0.15} darkness={0.6} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
