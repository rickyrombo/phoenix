import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import styled from "styled-components"
import butterchurnModule, { type Visualizer } from "butterchurn"
import butterchurnPresets from "butterchurn-presets"
import { usePlayer } from "../contexts/PlayerContext"

const butterchurn = butterchurnModule.default

const VisualizerOverlay = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isVisible",
})<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  z-index: 9999;
  display: ${(props) => (props.isVisible ? "flex" : "none")};
  align-items: center;
  justify-content: center;
`

const VisualizerCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

const PresetInfo = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  color: #fff;
  font-family: "Kode Mono", monospace;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 15px;
  border-radius: 5px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.show {
    opacity: 1;
  }
`

const Instructions = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isVisible",
})<{ isVisible: boolean }>`
  position: absolute;
  bottom: 20px;
  right: 20px;
  color: #fff;
  font-family: "Kode Mono", monospace;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 15px;
  border-radius: 5px;
  pointer-events: none;
  text-align: right;
  line-height: 1.4;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  transition: opacity 0.3s ease;
`

const TrackOverlay = styled.div`
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
  border-radius: 8px;
  color: #fff;
  pointer-events: none;
  max-width: 50%;
  backdrop-filter: blur(6px);
`

const TrackAvatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex: 0 0 48px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
`

const TrackText = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const TrackTitleText = styled.div`
  font-family: "Fugaz One", sans-serif;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TrackArtistText = styled.div`
  font-size: 0.85rem;
  color: #cfcfcf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

interface VisualizerProps {
  isVisible: boolean
  onClose: () => void
}

export default function Visualizer({ isVisible, onClose }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visualizerRef = useRef<Visualizer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number>(0)

  const [currentPresetIndex, setCurrentPresetIndex] = useState(0)
  const [showPresetInfo, setShowPresetInfo] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  // Initialize presets list - use useMemo to avoid re-computation
  const presetNames = useMemo(() => {
    const presets = butterchurnPresets.getPresets()
    return Object.keys(presets)
  }, [])

  const { audioElement, currentTrack } = usePlayer()

  // Initialize visualizer
  useEffect(() => {
    if (!isVisible || !canvasRef.current || !audioElement) return

    const canvas = canvasRef.current

    // Set canvas size to full screen
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      if (visualizerRef.current) {
        visualizerRef.current.setRendererSize(canvas.width, canvas.height)
      }
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    // Initialize audio context and source node
    if (!audioContextRef.current) {
      // @ts-expect-error - webkit fallback for older browsers
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioCtx()
    }

    // Create a media element source if not already created
    if (!sourceRef.current) {
      sourceRef.current =
        audioContextRef.current.createMediaElementSource(audioElement)
      // Connect to destination so audio still plays
      sourceRef.current.connect(audioContextRef.current.destination)
    }

    // Initialize Butterchurn visualizer
    visualizerRef.current = butterchurn.createVisualizer(
      audioContextRef.current,
      canvas,
      {
        width: canvas.width,
        height: canvas.height,
        meshWidth: 32,
        meshHeight: 24,
        pixelRatio: window.devicePixelRatio || 1,
      },
    )

    // Create a splitter to clone the audio signal for the visualizer
    const splitter = audioContextRef.current.createChannelSplitter(2)
    const merger = audioContextRef.current.createChannelMerger(2)

    // Connect source to splitter, then merge back for visualizer
    sourceRef.current.connect(splitter)
    splitter.connect(merger, 0, 0)
    splitter.connect(merger, 1, 1)

    // Connect the merged clone to visualizer
    if (visualizerRef.current) {
      visualizerRef.current.connectAudio(merger)
    }

    // Load initial preset
    if (presetNames.length > 0 && visualizerRef.current) {
      const presets = butterchurnPresets.getPresets()
      const presetName = presetNames[currentPresetIndex]
      visualizerRef.current.loadPreset(presets[presetName], 0)
    }

    // Animation loop
    const animate = () => {
      if (visualizerRef.current && isVisible) {
        visualizerRef.current.render()
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    animate()

    return () => {
      window.removeEventListener("resize", updateCanvasSize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, audioElement, currentPresetIndex, presetNames])

  // Handle preset changes
  const changePreset = useCallback(
    (direction: "next" | "prev") => {
      if (!visualizerRef.current || presetNames.length === 0) return

      const newIndex =
        direction === "next"
          ? (currentPresetIndex + 1) % presetNames.length
          : (currentPresetIndex - 1 + presetNames.length) % presetNames.length

      setCurrentPresetIndex(newIndex)

      const presets = butterchurnPresets.getPresets()
      const presetName = presetNames[newIndex]
      visualizerRef.current.loadPreset(presets[presetName], 1.7) // 1.7 second transition

      // Show preset info
      setShowPresetInfo(true)
      setTimeout(() => setShowPresetInfo(false), 2000)
    },
    [currentPresetIndex, presetNames],
  )

  // Keyboard controls
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyV":
        case "Escape":
          onClose()
          break
        case "KeyH":
          setShowInstructions(!showInstructions)
          break
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown":
          // Only handle arrow keys if NO modifiers are pressed
          if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault()
            if (e.code === "ArrowLeft" || e.code === "ArrowDown") {
              changePreset("prev")
            } else {
              changePreset("next")
            }
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, onClose, changePreset, showInstructions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visualizerRef.current) {
        visualizerRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  if (!isVisible) return null

  const currentPresetName = presetNames[currentPresetIndex] || "Loading..."

  return (
    <VisualizerOverlay isVisible={isVisible}>
      <VisualizerCanvas ref={canvasRef} />

      <PresetInfo className={showPresetInfo ? "show" : ""}>
        {currentPresetName}
        <br />
        <small>
          {currentPresetIndex + 1} / {presetNames.length}
        </small>
      </PresetInfo>

      <Instructions isVisible={showInstructions}>
        H - Toggle help
        <br />
        V or ESC - Exit visualizer
        <br />
        ← → ↑ ↓ - Change presets
        <br />
        {presetNames.length} presets available
      </Instructions>

      {currentTrack && (
        <TrackOverlay>
          <TrackAvatar src={currentTrack.coverArt} alt={currentTrack.artist} />
          <TrackText>
            <TrackTitleText>{currentTrack.title}</TrackTitleText>
            <TrackArtistText>{currentTrack.artist}</TrackArtistText>
          </TrackText>
        </TrackOverlay>
      )}
    </VisualizerOverlay>
  )
}
