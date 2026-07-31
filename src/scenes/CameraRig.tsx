import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'

const IDLE_RESUME_SECONDS = 4
const BASE_FOV = 50

/**
 * Never-static camera: damped auto-orbit (speed from tempo -> atmosphere.cameraSpeed)
 * that pauses while the user drags and resumes after an idle period, plus a subtle
 * FOV "breathing" oscillation whose rate also tracks tempo.
 */
export function CameraRig() {
  const engine = useMathSymphonyEngine()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const idleSeconds = useRef(0)
  const [interacting, setInteracting] = useState(false)

  useFrame((state, dt) => {
    const cameraSpeed = engine.mathParameters.atmosphere.cameraSpeed

    idleSeconds.current = interacting ? 0 : idleSeconds.current + dt

    const controls = controlsRef.current
    if (controls) {
      controls.autoRotate = idleSeconds.current > IDLE_RESUME_SECONDS
      controls.autoRotateSpeed = 0.4 + cameraSpeed * 0.6
    }

    const camera = state.camera as THREE.PerspectiveCamera
    const breathe =
      Math.sin(state.clock.elapsedTime * (0.3 + cameraSpeed * 0.25)) * (1.5 + cameraSpeed)
    camera.fov = BASE_FOV + breathe
    camera.updateProjectionMatrix()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={40}
      onStart={() => setInteracting(true)}
      onEnd={() => setInteracting(false)}
    />
  )
}
