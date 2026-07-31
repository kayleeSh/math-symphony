import { Canvas } from '@react-three/fiber'
import './App.css'
import { ChordTimelinePanel } from './components/ChordTimelinePanel'
import { ControlPanel } from './components/ControlPanel'
import { FeatureReadout } from './components/FeatureReadout'
import { RecordControl } from './components/RecordControl'
import { TransportBar } from './components/TransportBar'
import { UploadDropzone } from './components/UploadDropzone'
import { useAppStore } from './hooks/useAppStore'
import { EngineProvider } from './hooks/useMathSymphonyEngine'
import { Scene } from './scenes/Scene'

export default function App() {
  const status = useAppStore((state) => state.status)
  const fileName = useAppStore((state) => state.fileName)

  return (
    <EngineProvider>
      <div className="app">
        <Canvas
          className="app__canvas"
          camera={{ position: [7, 5, 10], fov: 50, near: 0.1, far: 200 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
        >
          <Scene />
        </Canvas>

        <header className="app__header">
          <h1>Math Symphony</h1>
          <p>Translate music into the language of mathematics.</p>
        </header>

        <div className="right-rail">
          <FeatureReadout />
          <ChordTimelinePanel />
        </div>

        <div className="app__dock">
          {status !== 'ready' ? (
            <div className="source-picker">
              {status !== 'recording' && (
                <>
                  <UploadDropzone />
                  <span className="source-picker__divider">or</span>
                </>
              )}
              <RecordControl />
            </div>
          ) : (
            <>
              <span className="app__filename">{fileName}</span>
              <TransportBar />
              <ControlPanel />
            </>
          )}
        </div>
      </div>
    </EngineProvider>
  )
}
