import { useEffect, useRef } from "react"
import WaveSurfer from "wavesurfer.js"
import styled from "styled-components"
import { usePlayer } from "../contexts/PlayerContext"
import { useTrack } from "../queries/useTrack"

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
  onPlayPause: () => void
  trackId: number
}

function WaveformPlayer({ onPlayPause, trackId }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const { duration, track: nowPlaying, seek, getAudio, isPlaying } = usePlayer()

  const isCurrentTrack = nowPlaying?.track_id === trackId
  const { data: track } = useTrack(trackId)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize WaveSurfer with peaks directly
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#606060",
      progressColor: "oklch(71.4% 0.203 305.504)",
      cursorColor: "transparent",
      cursorWidth: 0,
      barWidth: 2,
      height: 80,
      interact: true,
      hideScrollbar: true,
      peaks: track?.waveform ? [track.waveform] : undefined,
      duration: track?.duration,
    })

    wavesurferRef.current = wavesurfer

    return () => {
      wavesurfer.destroy()
    }
  }, [track?.waveform, track?.duration])

  // Load the track URL if waveform data is not available
  // useEffect(() => {
  //   const ws = wavesurferRef.current
  //   if (!ws) return
  //   if (!track?.stream.url || track?.waveform) return
  //   ws.load(track.stream.url, undefined, track.duration)
  // }, [track?.stream.url, track?.waveform, track?.duration])

  // Update waveform progress using RAF instead of subscribing to time updates
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    // Reset to start for non-active tracks
    if (!isCurrentTrack) {
      ws.seekTo(0)
      return
    }

    // Only run RAF loop when this track is active and playing
    if (!isPlaying || duration <= 0) {
      return
    }

    const updateProgress = () => {
      const audio = getAudio()
      if (audio && ws && duration > 0) {
        const progress = audio.currentTime / duration
        ws.seekTo(progress)
      }
      rafIdRef.current = requestAnimationFrame(updateProgress)
    }

    rafIdRef.current = requestAnimationFrame(updateProgress)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isCurrentTrack, isPlaying, duration, getAudio])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickPosition = x / rect.width

    // If this is the current track, seek to the clicked position
    if (isCurrentTrack && duration > 0) {
      const newTime = clickPosition * duration
      seek(newTime)
      e.stopPropagation()
    } else {
      // If not current track, just play it
      onPlayPause()
    }
  }

  return <WaveformContainer ref={containerRef} onClick={handleClick} />
}

// React Compiler handles memoization automatically
export default WaveformPlayer
