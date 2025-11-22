import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { useTrack } from "../queries/useTrack"

type RepeatMode = "off" | "one" | "all"

interface PlayerContextType {
  currentTrack: number | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  audioElement: HTMLAudioElement | null
  queue: Queue
  currentIndex: number
  repeatMode: RepeatMode
  shuffle: boolean
  setCurrentTrack: (track: number) => void
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setQueue: (queue: Queue) => void
  playNext: () => void
  playPrevious: () => void
  setRepeatMode: (mode: RepeatMode) => void
  toggleShuffle: () => void
}

export type Queue = {
  tracks: number[]
  currentIndex: number
  name: string
  source: string
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [queue, setQueueState] = useState<Queue>({
    tracks: [],
    currentIndex: -1,
    name: "",
    source: "",
  })
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off")
  const [shuffle, setShuffle] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const currentIndexRef = useRef(currentIndex)
  const queueRef = useRef(queue)

  const { data: track } = useTrack(currentTrack!, {
    enabled: currentTrack !== null,
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

      const q = queueRef.current
      const idx = currentIndexRef.current

      // Try to play next track
      const hasNext = idx < q.tracks.length - 1
      if (hasNext) {
        setCurrentIndex(idx + 1)
      } else if (repeatMode === "all" && q.tracks.length > 0) {
        setCurrentIndex(0)
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

  // Sync current track with queue index
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < queue.tracks.length) {
      setCurrentTrack(queue.tracks[currentIndex])
    }
    currentIndexRef.current = currentIndex
  }, [currentIndex, queue])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

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

  const setQueue = (queue: Queue) => {
    setQueueState(queue)
    setCurrentIndex(queue.currentIndex)
  }

  const playNext = useCallback(() => {
    if (currentIndex < queue.tracks.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (repeatMode === "all" && queue.tracks.length > 0) {
      setCurrentIndex(0)
    }
  }, [currentIndex, queue.tracks.length, repeatMode])

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      seek(0)
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else if (repeatMode === "all" && queue.tracks.length > 0) {
      setCurrentIndex(queue.tracks.length - 1)
    }
  }, [currentTime, currentIndex, queue.tracks.length, repeatMode, seek])

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
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        audioElement: audioRef.current,
        queue,
        currentIndex,
        repeatMode,
        shuffle,
        setCurrentTrack,
        setIsPlaying,
        togglePlay,
        seek,
        setVolume: handleSetVolume,
        setQueue,
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
