import { createFileRoute } from '@tanstack/react-router'
import styled from 'styled-components'
import TrackTile from '../components/TrackTile'
import { trendingTracks } from '../data/tracks'
import { usePlayer } from '../contexts/PlayerContext'
import { useEffect } from 'react'

const PageContainer = styled.main`
  padding: 2rem;
  padding-bottom: 2rem;
`

const PageTitle = styled.h1`
  font-family: 'Fugaz One', sans-serif;
  font-size: 2rem;
  margin: 0 0 2rem 0;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: oklch(71.4% 0.203 305.504);
`

const TracksGrid = styled.div`
  display: flex;
  flex-direction: column;
`

function TrendingPage() {
  const { setQueue, queue, isPlaying } = usePlayer()

  // Set queue when component mounts only if queue is empty or different AND not playing
  useEffect(() => {
    const trendingTrackIds = trendingTracks.map(t => t.id).join(',')
    const currentQueueIds = queue.map(t => t.id).join(',')
    
    // Only update queue if it's different AND we're not currently playing
    if (trendingTrackIds !== currentQueueIds && !isPlaying) {
      setQueue(trendingTracks)
    }
  }, [setQueue, queue, isPlaying])

  return (
    <PageContainer>
      <PageTitle>Trending</PageTitle>
      <TracksGrid>
        {trendingTracks.map((track) => (
          <TrackTile
            key={track.id}
            track={track}
          />
        ))}
      </TracksGrid>
    </PageContainer>
  )
}

export const Route = createFileRoute('/trending')({
  component: TrendingPage
})
