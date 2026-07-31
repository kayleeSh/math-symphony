import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMathSymphonyEngine } from '../hooks/useMathSymphonyEngine'
import { CameraRig } from './CameraRig'
import { Particles } from './Particles'
import { PostFX } from './PostFX'

/** Fog, lighting rig, and composition of the sub-scenes. No harsh lighting: one soft warm key light, one dim cool fill, ambient fill, and exponential fog. */
export function Scene() {
  const engine = useMathSymphonyEngine()
  const { scene } = useThree()
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const keyLightRef = useRef<THREE.PointLight>(null)
  const fillLightRef = useRef<THREE.PointLight>(null)

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x05070c, 0.02)
    return () => {
      scene.fog = null
    }
  }, [scene])

  useFrame(() => {
    const atmosphere = engine.mathParameters.atmosphere
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = atmosphere.fogDensity
    }
    if (ambientRef.current) ambientRef.current.intensity = 0.25 * atmosphere.lightIntensity
    if (keyLightRef.current) keyLightRef.current.intensity = 6 * atmosphere.lightIntensity
    if (fillLightRef.current) fillLightRef.current.intensity = 1.2 * atmosphere.lightIntensity
  })

  return (
    <>
      <color attach="background" args={['#05070c']} />
      <ambientLight ref={ambientRef} intensity={0.25} />
      <pointLight
        ref={keyLightRef}
        position={[6, 8, 6]}
        intensity={6}
        color="#ffdca8"
        distance={40}
        decay={2}
      />
      <pointLight
        ref={fillLightRef}
        position={[-8, -4, -6]}
        intensity={1.2}
        color="#3a6bd6"
        distance={30}
        decay={2}
      />
      <Particles />
      <CameraRig />
      <PostFX />
    </>
  )
}
