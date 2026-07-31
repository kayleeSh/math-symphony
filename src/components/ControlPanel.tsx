import { useAppStore } from '../hooks/useAppStore'
import type { MathSystemType } from '../types/math'

const SYSTEM_LABELS: Record<MathSystemType, string> = {
  'polar-harmonic': 'Polar · Lissajous · Rose',
  'golden-spiral': 'Golden Spiral',
  'curl-noise': 'Curl Noise Flow',
  attractor: 'Strange Attractor',
}

const PARTICLE_COUNT_OPTIONS = [16384, 65536, 131072, 262144]

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="panel__group">
      <label className="panel__label">
        {label} <span className="panel__value">{value.toFixed(2)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void document.documentElement.requestFullscreen()
  }
}

export function ControlPanel() {
  const config = useAppStore((state) => state.config)
  const setConfig = useAppStore((state) => state.setConfig)

  return (
    <div className="panel">
      <div className="panel__group">
        <label className="panel__label">Mathematical system</label>
        <select
          value={config.activeSystem}
          onChange={(e) => setConfig({ activeSystem: e.target.value as MathSystemType })}
        >
          {(Object.keys(SYSTEM_LABELS) as MathSystemType[]).map((system) => (
            <option key={system} value={system}>
              {SYSTEM_LABELS[system]}
            </option>
          ))}
        </select>
      </div>

      <SliderRow
        label="Curl overlay"
        value={config.curlOverlay}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => setConfig({ curlOverlay: value })}
      />
      <SliderRow
        label="Sensitivity"
        value={config.sensitivity}
        min={0.2}
        max={2}
        step={0.01}
        onChange={(value) => setConfig({ sensitivity: value })}
      />
      <SliderRow
        label="Bloom"
        value={config.bloomIntensity}
        min={0}
        max={2}
        step={0.01}
        onChange={(value) => setConfig({ bloomIntensity: value })}
      />

      <div className="panel__group">
        <label className="panel__label">Particle count</label>
        <select value={config.count} onChange={(e) => setConfig({ count: Number(e.target.value) })}>
          {PARTICLE_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div className="panel__group panel__group--row">
        <label className="panel__label">Emotion mode</label>
        <input
          type="checkbox"
          checked={config.emotionModeEnabled}
          onChange={(e) => setConfig({ emotionModeEnabled: e.target.checked })}
        />
      </div>

      <div className="panel__group panel__group--row">
        <button className="panel__button" onClick={toggleFullscreen}>
          Fullscreen
        </button>
      </div>

      <div className="panel__group panel__group--row panel__export">
        <button className="panel__button" disabled title="Coming soon">
          Export PNG
        </button>
        <button className="panel__button" disabled title="Coming soon">
          Export MP4
        </button>
      </div>
    </div>
  )
}
