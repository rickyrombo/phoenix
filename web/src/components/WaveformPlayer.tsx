import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import styled from 'styled-components'

const WaveformContainer = styled.div`
  width: 100%;
  height: 100%;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`

interface WaveformPlayerProps {
  audioData?: Float32Array
  isPlaying: boolean
  onPlayPause: () => void
}

export default function WaveformPlayer({ onPlayPause }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Generate placeholder waveform data
    const length = 500
    const peaks = new Float32Array(length)
    for (let i = 0; i < length; i++) {
      peaks[i] = Math.random() * 2 - 1
    }

    // Initialize WaveSurfer with peaks directly
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#606060',
      progressColor: 'oklch(71.4% 0.203 305.504)',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      interact: false,
      hideScrollbar: true,
      peaks: [peaks],
      duration: 180,
    })

    wavesurferRef.current = wavesurfer

    return () => {
      wavesurfer.destroy()
    }
  }, [])

  const handleClick = () => {
    onPlayPause()
  }

  return <WaveformContainer ref={containerRef} onClick={handleClick} />
}
