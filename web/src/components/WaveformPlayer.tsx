import { useEffect, useRef, useSyncExternalStore } from "react"
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
  isPlaying: boolean
  onPlayPause: () => void
  trackId: number
}

const useCurrentTime = () => {
  const { subscribeToTime, getAudio } = usePlayer()
  const subscribe = (listener: () => void) => subscribeToTime(listener)
  const getSnapshot = () => getAudio()?.currentTime ?? 0
  return useSyncExternalStore(subscribe, getSnapshot, () => 0)
}

export default function WaveformPlayer({
  onPlayPause,
  trackId,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const { duration, track: nowPlaying, seek } = usePlayer()
  const currentTime = useCurrentTime()

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
    })

    wavesurferRef.current = wavesurfer

    return () => {
      wavesurfer.destroy()
    }
  }, [])

  // disable while testing to prevent obnoxious downloads
  // useEffect(() => {
  //   const ws = wavesurferRef.current
  //   if (!ws) return
  //   if (!track?.stream.url) return

  //   if (track?.waveform) {
  //     ws.load(track.stream.url, [track.waveform], track.duration)
  //   } else {
  //     ws.load(track.stream.url, undefined, track.duration)
  //   }
  // }, [track?.stream.url, track?.waveform, track?.duration])

  // Update waveform progress based on actual playback position
  useEffect(() => {
    if (wavesurferRef.current) {
      if (isCurrentTrack && duration > 0) {
        const progress = currentTime / duration
        wavesurferRef.current.seekTo(progress)
      } else {
        // Reset to start for non-active tracks
        wavesurferRef.current.seekTo(0)
      }
    }
  }, [currentTime, duration, isCurrentTrack])

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
