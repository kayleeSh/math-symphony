import * as THREE from 'three'
import {
  GPUComputationRenderer,
  type Variable,
} from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import { colorTemperatureRamp } from '../math/colorTemperature'
import { goldenSpiralTargetPosition } from '../math/generators/GoldenSpiralSystem'
import { initialMathParameters } from '../math/MathTranslationEngine'
import type { AttractorKind, MathParameters, MathSystemType, Topology } from '../types/math'
import type { ParticleSystemConfig } from '../types/particles'
import { clamp, squareTextureSize } from '../utils/math'

import noiseGlsl from '../shaders/common/noise.glsl?raw'
import mathSystemsGlsl from '../shaders/common/mathSystems.glsl?raw'
import velocityFragGlsl from '../shaders/gpgpu/velocity.frag.glsl?raw'
import positionFragGlsl from '../shaders/gpgpu/position.frag.glsl?raw'
import particleVertexGlsl from '../shaders/particles/vertex.glsl?raw'
import particleFragmentGlsl from '../shaders/particles/fragment.glsl?raw'

const SYSTEM_TO_INDEX: Record<MathSystemType, number> = {
  'polar-harmonic': 0,
  'golden-spiral': 1,
  'curl-noise': 2,
  attractor: 3,
}

const TOPOLOGY_TO_INDEX: Record<Topology, number> = {
  symmetric: 0,
  organic: 1,
  broken: 2,
  expanding: 3,
  neutral: 4,
}

const ATTRACTOR_TO_INDEX: Record<AttractorKind, number> = {
  lorenz: 0,
  thomas: 1,
  aizawa: 2,
}

/** Deterministic Vogel-spiral scatter for the initial GPGPU texture state (no Math.random). */
function fillInitialTextures(
  positionTexture: THREE.DataTexture,
  velocityTexture: THREE.DataTexture,
  size: number,
): void {
  const posData = positionTexture.image.data as unknown as Float32Array
  const velData = velocityTexture.image.data as unknown as Float32Array
  const count = size * size
  const defaultParams = initialMathParameters()

  for (let i = 0; i < count; i++) {
    const seed = (i + 0.5) / count
    const pos = goldenSpiralTargetPosition(seed, 0, defaultParams)
    const offset = i * 4
    posData[offset] = pos.x
    posData[offset + 1] = pos.y
    posData[offset + 2] = pos.z
    posData[offset + 3] = seed

    velData[offset] = 0
    velData[offset + 1] = 0
    velData[offset + 2] = 0
    velData[offset + 3] = 0
  }

  positionTexture.needsUpdate = true
  velocityTexture.needsUpdate = true
}

/**
 * Owns the GPGPU position/velocity simulation (three.js GPUComputationRenderer)
 * and the THREE.Points object that renders it. All per-particle physics runs
 * entirely on the GPU via velocity.frag.glsl / position.frag.glsl; the CPU side
 * only pushes MathParameters in as uniforms once per frame.
 */
export class ParticleSimulation {
  readonly points: THREE.Points
  readonly particleCount: number

  private readonly gpuCompute: GPUComputationRenderer
  private readonly positionVariable: Variable
  private readonly velocityVariable: Variable
  private readonly material: THREE.ShaderMaterial
  private elapsed = 0

  constructor(renderer: THREE.WebGLRenderer, requestedCount: number) {
    const size = squareTextureSize(requestedCount)
    this.particleCount = size * size

    this.gpuCompute = new GPUComputationRenderer(size, size, renderer)

    const positionTexture = this.gpuCompute.createTexture()
    const velocityTexture = this.gpuCompute.createTexture()
    fillInitialTextures(positionTexture, velocityTexture, size)

    const velocityShader = `${noiseGlsl}\n${mathSystemsGlsl}\n${velocityFragGlsl}`

    this.velocityVariable = this.gpuCompute.addVariable(
      'textureVelocity',
      velocityShader,
      velocityTexture,
    )
    this.positionVariable = this.gpuCompute.addVariable(
      'texturePosition',
      positionFragGlsl,
      positionTexture,
    )

    this.gpuCompute.setVariableDependencies(this.velocityVariable, [
      this.velocityVariable,
      this.positionVariable,
    ])
    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.velocityVariable,
      this.positionVariable,
    ])

    this.initUniforms()

    const error = this.gpuCompute.init()
    if (error) console.error('[ParticleSimulation] GPUComputationRenderer init failed:', error)

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexGlsl,
      fragmentShader: particleFragmentGlsl,
      uniforms: {
        texturePosition: { value: null },
        uParticleSize: { value: 1 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColor: { value: new THREE.Color(0x3a6bd6) },
        uBrightness: { value: 0.5 },
        uOpacity: { value: 0.8 },
        uEdgeSoftness: { value: 0.6 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.particleCount * 3)
    const particleUv = new Float32Array(this.particleCount * 2)
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const idx = j * size + i
        particleUv[idx * 2] = (i + 0.5) / size
        particleUv[idx * 2 + 1] = (j + 0.5) / size
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('particleUv', new THREE.BufferAttribute(particleUv, 2))

    this.points = new THREE.Points(geometry, this.material)
    // Real bounds live entirely in the position texture, invisible to the CPU-side
    // dummy `position` attribute, so frustum culling against it would be wrong.
    this.points.frustumCulled = false
  }

  private initUniforms(): void {
    Object.assign(this.velocityVariable.material.uniforms, {
      uDt: { value: 0 },
      uTime: { value: 0 },
      uActiveSystem: { value: SYSTEM_TO_INDEX['golden-spiral'] },
      uCurlOverlayWeight: { value: 0.25 },
      uEnergy: { value: 0.2 },
      uNoiseAmount: { value: 0.2 },
      uTimeScale: { value: 1 },
      uOrbitRadius: { value: 3 },
      uLayerHeight: { value: 1 },
      uSpiralPosition: { value: 0 },
      uAngularVelocity: { value: 0.4 },
      uOscillationFrequency: { value: 1 },
      uPhaseRotation: { value: 0 },
      uTopology: { value: TOPOLOGY_TO_INDEX.neutral },
      uRoughness: { value: 0.2 },
      uAttractorKind: { value: ATTRACTOR_TO_INDEX.lorenz },
    })

    Object.assign(this.positionVariable.material.uniforms, {
      uDt: { value: 0 },
      uTimeScale: { value: 1 },
      uShockwaveStrength: { value: 0 },
      uShockwaveRadius: { value: 0 },
    })
  }

  update(params: MathParameters, config: ParticleSystemConfig, dt: number): void {
    const clampedDt = Math.min(Math.max(dt, 0), 1 / 20)
    this.elapsed += clampedDt

    const velUniforms = this.velocityVariable.material.uniforms
    velUniforms.uDt.value = clampedDt
    velUniforms.uTime.value = this.elapsed
    velUniforms.uActiveSystem.value = SYSTEM_TO_INDEX[config.activeSystem]
    velUniforms.uCurlOverlayWeight.value = config.curlOverlay
    velUniforms.uEnergy.value = params.energy
    velUniforms.uNoiseAmount.value = params.shape.noiseAmount
    velUniforms.uTimeScale.value = params.timeScale
    velUniforms.uOrbitRadius.value = params.orbitRadius
    velUniforms.uLayerHeight.value = params.layerHeight
    velUniforms.uSpiralPosition.value = params.spiralPosition
    velUniforms.uAngularVelocity.value = params.angularVelocity
    velUniforms.uOscillationFrequency.value = params.oscillationFrequency
    velUniforms.uPhaseRotation.value = params.phaseRotation
    velUniforms.uTopology.value = TOPOLOGY_TO_INDEX[params.topology]
    velUniforms.uRoughness.value = params.shape.roughness
    velUniforms.uAttractorKind.value = ATTRACTOR_TO_INDEX[params.attractorKind]

    const posUniforms = this.positionVariable.material.uniforms
    posUniforms.uDt.value = clampedDt
    posUniforms.uTimeScale.value = params.timeScale
    posUniforms.uShockwaveStrength.value = params.shockwave.strength
    posUniforms.uShockwaveRadius.value = params.shockwave.radius

    this.gpuCompute.compute()

    this.material.uniforms.texturePosition.value = this.gpuCompute.getCurrentRenderTarget(
      this.positionVariable,
    ).texture
    this.material.uniforms.uParticleSize.value = params.particleSize
    this.material.uniforms.uBrightness.value = params.brightness
    // "Density" can't resize a live GPU texture, so it's expressed as opacity —
    // a fuller/sparser-reading swarm without reallocating simulation state.
    this.material.uniforms.uOpacity.value = clamp(
      params.opacity * params.atmosphere.density,
      0,
      1,
    )
    this.material.uniforms.uEdgeSoftness.value = params.shape.edgeSoftness
    const color = colorTemperatureRamp(params.colorTemperature)
    ;(this.material.uniforms.uColor.value as THREE.Color).setRGB(color.r, color.g, color.b)
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio
  }

  dispose(): void {
    this.points.geometry.dispose()
    this.material.dispose()
    this.gpuCompute.dispose()
  }
}
