import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useAppStore } from '../hooks/useAppStore'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'

/**
 * Bridges the R3F render loop to MathSymphonyEngine.tick(). Re-attaches the GPU
 * simulation only when particle count changes (that resizes the GPGPU texture);
 * every other config knob (active system, curl overlay, sensitivity, bloom,
 * emotion mode) is read fresh from the store each frame without re-rendering.
 */
export function Particles() {
  const engine = useMathSymphonyEngine()
  const { gl, scene } = useThree()
  const particleCount = useAppStore((state) => state.config.count)

  useEffect(() => {
    engine.updateConfig({ count: particleCount })
    const points = engine.attachRenderer(gl)
    scene.add(points)
    return () => {
      scene.remove(points)
    }
  }, [engine, gl, scene, particleCount])

  useFrame((_, delta) => {
    engine.updateConfig(useAppStore.getState().config)
    engine.tick(delta)
  })

  return null
}
