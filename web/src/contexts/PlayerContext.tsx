import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { useTrack, type Track } from "../queries/useTrack"
import { usePlayQueue } from "./PlayQueueContext"

type RepeatMode = "off" | "one" | "all"

interface PlayerContextType {
  track?: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  audioElement: HTMLAudioElement | null
  repeatMode: RepeatMode
  shuffle: boolean
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  playNext: () => void
  playPrevious: () => void
  setRepeatMode: (mode: RepeatMode) => void
  toggleShuffle: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off")
  const [shuffle, setShuffle] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(new Audio())

  const queue = usePlayQueue()

  const { data: track } = useTrack(queue.items[queue.index]?.trackId, {
    enabled: !!queue.items[queue.index]?.trackId,
  })

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audio.crossOrigin = "anonymous" // Enable CORS for Web Audio API
    audio.volume = volume
    audioRef.current = audio

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleDurationChange = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      // Handle repeat one mode
      if (repeatMode === "one") {
        audio.currentTime = 0
        audio.play().catch((err) => console.error("Playback error:", err))
        return
      }

      // Try to play next track
      const hasNext = queue.index < queue.items.length - 1
      if (hasNext) {
        queue.next()
      } else if (repeatMode === "all" && queue.items.length > 0) {
        queue.set(0)
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
      audio.pause()
      audio.src = ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Load new track
  useEffect(() => {
    if (track?.stream.url && audioRef.current) {
      const wasPlaying = isPlaying
      audioRef.current.src = track.stream.url
      audioRef.current.load()

      // If was playing, auto-play the new track
      if (wasPlaying) {
        audioRef.current.play().catch((err) => {
          console.error("Playback error:", err)
          setIsPlaying(false)
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track])

  // Handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error("Playback error:", err)
          setIsPlaying(false)
        })
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleSetVolume = (newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }

  const playNext = useCallback(() => {
    if (queue.index < queue.items.length - 1) {
      queue.next()
    } else if (repeatMode === "all" && queue.items.length > 0) {
      queue.set(0)
    }
  }, [queue, repeatMode])

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      seek(0)
    } else if (queue.index > 0) {
      queue.prev()
    } else if (repeatMode === "all" && queue.items.length > 0) {
      queue.set(0)
    }
  }, [currentTime, queue, repeatMode, seek])

  const toggleShuffle = () => {
    setShuffle(!shuffle)
  }

  // Keyboard shortcuts: Shift+Left = prev, Shift+Right = next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          playPrevious()
        } else if (e.key === "ArrowRight") {
          e.preventDefault()
          playNext()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [playNext, playPrevious])

  return (
    <PlayerContext.Provider
      value={{
        track,
        isPlaying,
        currentTime,
        duration,
        volume,
        audioElement: audioRef.current,
        repeatMode,
        shuffle,
        setIsPlaying,
        togglePlay,
        seek,
        setVolume: handleSetVolume,
        playNext,
        playPrevious,
        setRepeatMode,
        toggleShuffle,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}
