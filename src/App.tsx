import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import './App.css'

type PlaybackDirection = 'clockwise' | 'counterclockwise'

const IDLE_PAUSE_DELAY = 140
const PLAYBACK_START_SECONDS = 20
const RECORDS = [
  {
    id: 'amber',
    title: 'Perfect',
    source: '/audio/record-track-1.mp3',
    label: '#c96d2e',
    labelLight: '#f3d5b2',
    glow: '#ff8b4f',
  },
  {
    id: 'blue',
    title: 'Photograph',
    source: '/audio/record-track-2.mp3',
    label: '#3f79d8',
    labelLight: '#b9d6ff',
    glow: '#59d3ff',
  },
  {
    id: 'jade',
    title: 'Fly Me to the Moon',
    source: '/audio/record-track-3.mp3',
    label: '#2b9a7f',
    labelLight: '#c7f7df',
    glow: '#5ee5b4',
  },
  {
    id: 'sunshine',
    title: 'Sunshine',
    source: '/audio/record-track-4.mp3',
    label: '#d98c10',
    labelLight: '#fff3c4',
    glow: '#ffb347',
  },
] as const
type RecordId = (typeof RECORDS)[number]['id']

function clampDelta(delta: number) {
  if (delta > 180) {
    return delta - 360
  }

  if (delta < -180) {
    return delta + 360
  }

  return delta
}

function cueAudioToStart(audio: HTMLAudioElement) {
  if (
    Number.isFinite(audio.duration) &&
    audio.duration > PLAYBACK_START_SECONDS &&
    audio.currentTime < PLAYBACK_START_SECONDS
  ) {
    audio.currentTime = PLAYBACK_START_SECONDS
  }
}

function App() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dragActiveRef = useRef(false)
  const lastAngleRef = useRef(0)
  const idleTimerRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const [recordAngle, setRecordAngle] = useState(0)
  const [direction, setDirection] = useState<PlaybackDirection>('clockwise')
  const [movement, setMovement] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<RecordId>(RECORDS[0].id)

  const selectedRecord =
    RECORDS.find((record) => record.id === selectedRecordId) ?? RECORDS[0]
  useEffect(() => {
    const audio = audioRef.current

    const clearIdleTimer = () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
    }

    const handlePointerUp = () => {
      dragActiveRef.current = false
      pointerIdRef.current = null
      setMovement(0)
      clearIdleTimer()
      idleTimerRef.current = window.setTimeout(() => {
        audioRef.current?.pause()
        setIsPlaying(false)
      }, IDLE_PAUSE_DELAY)
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      clearIdleTimer()
      audio?.pause()
      setIsPlaying(false)
    }
  }, [])

  const orbitPathData = useMemo(() => {
    const cx = 50
    const cy = 50
    const baseR = 54
    const segments = 24
    let d = ''

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const wobble =
        Math.sin(i * 2.1 + 0.3) * 2.8 +
        Math.cos(i * 3.7) * 1.6 +
        Math.sin(i * 7.1 + 1.2) * 0.8 +
        Math.cos(i * 11.4) * 0.5
      const r = baseR + wobble
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r

      if (i === 0) {
        d += `M ${x.toFixed(2)} ${y.toFixed(2)} `
      } else {
        d += `L ${x.toFixed(2)} ${y.toFixed(2)} `
      }
    }

    return d + 'Z'
  }, [])

  const auraStops = useMemo(() => {
    const intensity = Math.min(Math.abs(movement) * 16, 22)
    return {
      primary:
        direction === 'clockwise'
          ? `color-mix(in srgb, ${selectedRecord.glow} ${44 + intensity}%, transparent)`
          : `rgba(89, 211, 255, ${0.18 + intensity / 100})`,
      secondary:
        direction === 'clockwise'
          ? `color-mix(in srgb, ${selectedRecord.labelLight} 20%, transparent)`
          : 'rgba(157, 141, 255, 0.18)',
    }
  }, [direction, movement, selectedRecord])

  function getAngle(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) {
      return 0
    }

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const radians = Math.atan2(clientY - centerY, clientX - centerX)
    return (radians * 180) / Math.PI
  }

  function applyRotation(delta: number) {
    if (!delta) {
      return
    }

    const normalizedDelta = clampDelta(delta)
    const nextDirection: PlaybackDirection =
      normalizedDelta >= 0 ? 'clockwise' : 'counterclockwise'
    const audio = audioRef.current

    setDirection(nextDirection)
    setMovement(Math.abs(normalizedDelta) / 10)
    setRecordAngle((current) => current + normalizedDelta)

    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    if (!audio) {
      return
    }

    if (audio.paused) {
      cueAudioToStart(audio)
    }

    audio.playbackRate = Math.min(2, Math.max(1, Math.abs(normalizedDelta) / 22))
    setIsPlaying(true)
    void audio.play().catch(() => {})
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragActiveRef.current = true
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    lastAngleRef.current = getAngle(event.clientX, event.clientY)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragActiveRef.current) {
      return
    }

    const nextAngle = getAngle(event.clientX, event.clientY)
    applyRotation(nextAngle - lastAngleRef.current)
    lastAngleRef.current = nextAngle
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    applyRotation(event.deltaY * -0.12)
  }

  function selectRecord(recordId: RecordId) {
    setSelectedRecordId(recordId)
    setIsPlaying(false)
    setMovement(0)
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    audioRef.current?.pause()
  }

  return (
    <main className="app-shell">
      <div
        ref={stageRef}
        className="record-stage"
        data-playing={isPlaying ? 'true' : 'false'}
        data-record={selectedRecord.id}
        style={
          {
            '--record-angle': `${recordAngle}deg`,
            '--aura-primary': auraStops.primary,
            '--aura-secondary': auraStops.secondary,
            '--label-color': selectedRecord.label,
            '--label-light': selectedRecord.labelLight,
            '--record-glow': selectedRecord.glow,
          } as CSSProperties
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          dragActiveRef.current = false
          if (
            pointerIdRef.current !== null &&
            stageRef.current?.hasPointerCapture(pointerIdRef.current)
          ) {
            stageRef.current.releasePointerCapture(pointerIdRef.current)
          }
          pointerIdRef.current = null
          setMovement(0)
          if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current)
          }
          idleTimerRef.current = window.setTimeout(() => {
            audioRef.current?.pause()
            setIsPlaying(false)
          }, IDLE_PAUSE_DELAY)
        }}
        onPointerCancel={() => {
          dragActiveRef.current = false
          pointerIdRef.current = null
          setMovement(0)
          audioRef.current?.pause()
          setIsPlaying(false)
        }}
        onWheel={handleWheel}
      >
        <div className="perfect-scene" aria-hidden="true">
          {Array.from({ length: 20 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="orbit-route" aria-hidden="true">
          <svg className="orbit-path-svg" viewBox="0 0 100 100" aria-hidden="true">
            <path d={orbitPathData} className="orbit-path" />
          </svg>
          <div className="orbit-track">
            <div className="orbit-circle-wrap">
              <img src="/img/img1.png" alt="" className="orbit-circle" />
            </div>
          </div>
        </div>
        <div className="moon-scene" aria-hidden="true">
          <span className="moon-crescent" />
          <span className="moon-cloud cloud-a" />
          <span className="moon-cloud cloud-b" />
          <span className="moon-cloud cloud-c" />
          <span className="moon-star star-a" />
          <span className="moon-star star-b" />
          <span className="moon-star star-c" />
          <span className="moon-star star-d" />
          <span className="moon-star star-e" />
          <span className="moon-star star-f" />
        </div>
        <div className="sunshine-scene" aria-hidden="true">
          <span className="sun-glow" />
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="sun-ray" style={{ '--ray-i': index } as CSSProperties} />
          ))}
        </div>
        <div className="blue-scene" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="blue-bokeh" />
          ))}
        </div>
        <div className="player-area">
          <div className="now-playing-title">{selectedRecord.title}</div>
          <div className="turntable" aria-hidden="true">
            <div className="deck-shadow" />
            <div className="deck-surface" />
            <div className="deck-panel">
              <div className="power-knob" />
              <div className="pitch-track">
                <span />
              </div>
              <div className="start-button" />
            </div>
            <div className="platter-assembly">
              <div className="plate-shadow" />
              <div className="plate-rim" />
              <div className="plate-surface" />
              <div className="record-surface">
                <div className="record-rotor">
                  <div className="record-core" />
                  <div className="groove groove-a" />
                  <div className="groove groove-b" />
                  <div className="groove groove-c" />
                </div>
              </div>
            </div>
            <div className="tonearm-base" />
            <div className="tonearm-pivot" />
            <div className="tonearm">
              <div className="tonearm-head" />
            </div>
            <div className="tonearm-rest" />
          </div>
          <div className="record-options" aria-label="Choose a vinyl record">
            {RECORDS.map((record) =>
              record.id === selectedRecord.id ? (
                <div
                  className="record-slot"
                  key={record.id}
                  data-option={record.id}
                  aria-label={`${record.title} — now playing`}
                  style={
                    {
                      '--option-label': record.label,
                      '--option-light': record.labelLight,
                      '--option-glow': record.glow,
                    } as CSSProperties
                  }
                >
                  <span className="record-slot-hole" aria-hidden="true" />
                </div>
              ) : (
                <button
                  aria-label={`Switch to ${record.title}`}
                  className="record-option"
                  key={record.id}
                  data-option={record.id}
                  onClick={() => selectRecord(record.id)}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={
                    {
                      '--option-label': record.label,
                      '--option-light': record.labelLight,
                      '--option-glow': record.glow,
                    } as CSSProperties
                  }
                  title={record.title}
                  type="button"
                >
                  <span className="record-option-disc" aria-hidden="true">
                    <span />
                  </span>
                  <span className="record-option-copy">
                    <span>{record.title}</span>
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
        <audio
          ref={audioRef}
          src={selectedRecord.source}
          preload="auto"
          onLoadedMetadata={(event) => cueAudioToStart(event.currentTarget)}
        />
      </div>
    </main>
  )
}

export default App
