import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useTrack, type Track } from "../queries/useTrack"
import { usePlayQueue } from "./PlayQueueContext"

type RepeatMode = "off" | "one" | "all"

interface PlayerContextType {
  track?: Track | null
  isPlaying: boolean
  duration: number
  volume: number
  repeatMode: RepeatMode
  shuffle: boolean
  subscribeToTime: (listener: () => void) => () => void
  getAudio: () => HTMLAudioElement | null
  play: () => void
  pause: () => void
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
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off")
  const [shuffle, setShuffle] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const loadSeqRef = useRef(0)
  const playPromiseRef = useRef<Promise<void> | null>(null)
  const timeListenersRef = useRef(new Set<() => void>())
  const rafRef = useRef<number | null>(null)
  const isPlayingRef = useRef(isPlaying)
  const queue = usePlayQueue()

  // Keep refs to the latest queue and its methods so audio event handlers
  // (which are created once on mount) can read/update the current queue.
  const queueRef = useRef(queue)
  const nextRef = useRef(queue.next)
  const prevRef = useRef(queue.prev)
  const setIndexRef = useRef(queue.set)

  useEffect(() => {
    queueRef.current = queue
    nextRef.current = queue.next
    prevRef.current = queue.prev
    setIndexRef.current = queue.set
  }, [queue])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const lastDir = useRef<"next" | "prev">("next")

  // Helper function to handle playback errors by skipping to next track
  const handlePlaybackError = useCallback(
    (err: unknown) => {
      const e = err as { name?: string }
      if (e?.name === "AbortError") return
      console.error("Playback error, skipping to next track:", err)

      const q = queueRef.current
      const hasNext = q && q.items && q.index < q.items.length - 1

      if (hasNext) {
        if (typeof nextRef.current === "function") {
          nextRef.current()
          lastDir.current = "next"
        }
      } else if (repeatMode === "all" && q && q.items && q.items.length > 0) {
        if (typeof setIndexRef.current === "function") {
          setIndexRef.current(0)
        }
      } else {
        setIsPlaying(false)
      }
    },
    [repeatMode],
  )

  const {
    data: track,
    isSuccess,
    isLoading,
  } = useTrack(queue.items[queue.index]?.trackId, {
    enabled: !!queue.items[queue.index]?.trackId,
  })

  useEffect(() => {
    if (isSuccess && !track && !isLoading) {
      console.error(
        "Failed to load track",
        queue.items[queue.index]?.trackId,
        queue.index,
      )
      if (lastDir.current === "next") {
        queue.next()
      } else {
        queue.prev()
      }
    }
  }, [isSuccess, isLoading, track, queue])

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audio.crossOrigin = "anonymous" // Enable CORS for Web Audio API
    audio.volume = volume
    audioRef.current = audio
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

      // Use the refs so we observe the latest queue state/methods
      const q = queueRef.current
      const hasNext = q && q.items && q.index < q.items.length - 1

      if (hasNext) {
        // call the latest next() implementation
        if (typeof nextRef.current === "function") {
          nextRef.current()
          lastDir.current = "next"
        }
      } else if (repeatMode === "all" && q && q.items && q.items.length > 0) {
        // call the latest set(index) implementation
        if (typeof setIndexRef.current === "function") {
          setIndexRef.current(0)
        }
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)

    return () => {
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

  // Load new track safely: use a load sequence to ignore stale loads
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const url = track?.stream?.url
    // bump sequence for this load
    const mySeq = ++loadSeqRef.current

    if (!url) {
      // no track: stop and clear src
      try {
        audio.pause()
      } catch (e: unknown) {
        console.error("Playback error:", e)
      }
      audio.src = ""
      playPromiseRef.current = null
      return
    }

    // Sometimes, when tracks are invalidated, they come back with a new signature.
    // Don't restart the track if the path is the same
    const currentUrl = audio.src
    if (new URL(currentUrl).pathname === new URL(url).pathname) {
      return
    }

    // Pause before changing src to reduce AbortError races
    try {
      audio.pause()
    } catch (err: unknown) {
      console.error("Playback error:", err)
    }

    audio.src = url
    audio.load()

    let didStart = false

    const onCanPlay = () => {
      if (mySeq !== loadSeqRef.current) return
      didStart = true
      // Only auto-play if isPlaying is true
      if (!isPlayingRef.current) return
      try {
        const p = audio.play()
        playPromiseRef.current =
          p instanceof Promise ? (p as Promise<void>) : null
        if (p && typeof (p as Promise<void>).catch === "function") {
          ;(p as Promise<void>).catch(handlePlaybackError).finally(() => {
            playPromiseRef.current = null
          })
        }
      } catch (err: unknown) {
        handlePlaybackError(err)
      }
    }

    audio.addEventListener("canplay", onCanPlay)

    // Fallback: try to play shortly after load if canplay doesn't fire
    const fallback = setTimeout(() => {
      if (mySeq !== loadSeqRef.current) return
      if (didStart || !isPlayingRef.current) return
      try {
        const p = audio.play()
        playPromiseRef.current =
          p instanceof Promise ? (p as Promise<void>) : null
        if (p && typeof (p as Promise<void>).catch === "function") {
          ;(p as Promise<void>).catch(handlePlaybackError).finally(() => {
            playPromiseRef.current = null
          })
        }
      } catch (err: unknown) {
        handlePlaybackError(err)
      }
    }, 500)

    return () => {
      audio.removeEventListener("canplay", onCanPlay)
      clearTimeout(fallback)
    }
    // only re-run when track url changes
  }, [track?.stream?.url, handlePlaybackError])

  // Handle play/pause safely and avoid racing play() calls
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      // If a play is already in-flight, leave it
      if (!playPromiseRef.current) {
        try {
          const p = audio.play()
          playPromiseRef.current =
            p instanceof Promise ? (p as Promise<void>) : null
          if (p && typeof (p as Promise<void>).catch === "function") {
            ;(p as Promise<void>).catch(handlePlaybackError).finally(() => {
              playPromiseRef.current = null
            })
          }
        } catch (err: unknown) {
          handlePlaybackError(err)
        }
      }
    } else {
      try {
        audio.pause()
      } catch {
        void 0
      }
      playPromiseRef.current = null
    }
  }, [isPlaying, handlePlaybackError])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const handleSetVolume = (newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }

  const playNext = useCallback(() => {
    if (queue.index < queue.items.length - 1) {
      queue.next()
      lastDir.current = "next"
    } else if (repeatMode === "all" && queue.items.length > 0) {
      queue.set(0)
    }
  }, [queue, repeatMode])

  const playPrevious = useCallback(() => {
    const now = audioRef.current?.currentTime ?? 0
    if (now > 3) {
      seek(0)
    } else if (queue.index > 0) {
      queue.prev()
      lastDir.current = "prev"
    } else if (repeatMode === "all" && queue.items.length > 0) {
      queue.set(0)
    }
  }, [queue, repeatMode, seek])

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

  const subscribeToTime = useCallback((listener: () => void) => {
    timeListenersRef.current.add(listener)
    // start RAF loop when first listener is added
    if (rafRef.current == null) {
      const loop = () => {
        const audio = audioRef.current
        if (!audio) return
        timeListenersRef.current.forEach((l) => l())
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      timeListenersRef.current.delete(listener)
      if (timeListenersRef.current.size === 0 && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  const getAudio = useCallback(() => audioRef.current ?? null, [])

  return (
    <PlayerContext.Provider
      value={{
        track,
        isPlaying,
        duration,
        volume,
        repeatMode,
        shuffle,
        subscribeToTime,
        getAudio,
        play: () => setIsPlaying(true),
        pause: () => setIsPlaying(false),
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

// Hook for components that need high-frequency currentTime updates
// Uses React's useSyncExternalStore so only subscribing components re-render
// eslint-disable-next-line react-refresh/only-export-components
export function useAudioTime(): number {
  const { subscribeToTime, getAudio } = usePlayer()
  return useSyncExternalStore(
    subscribeToTime,
    () => getAudio()?.currentTime ?? 0,
    () => 0,
  )
}
