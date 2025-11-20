import { createContext, useContext, useState, ReactNode } from 'react'
import type { Track } from '../components/TrackTile'

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  setCurrentTrack: (track: Track) => void
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <PlayerContext.Provider 
      value={{ 
        currentTrack, 
        isPlaying, 
        setCurrentTrack, 
        setIsPlaying,
        togglePlay
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
