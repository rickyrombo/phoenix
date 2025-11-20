import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import { FeedTrackContext } from "../components/TrackTileContext"
import { feedTracks } from "../data/tracks"
import { usePlayer } from "../contexts/PlayerContext"
import { useEffect } from "react"

const PageContainer = styled.main`
  padding: 2rem;
  padding-bottom: 2rem;
`

const PageTitle = styled.h1`
  font-family: "Fugaz One", sans-serif;
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

function FeedPage() {
  const { setQueue, queue, isPlaying, togglePlay } = usePlayer()

  useEffect(() => {
    // Reset queue when navigating to trending page
    if (queue.tracks.length === 0 && queue.source !== "trending") {
      setQueue({
        tracks: feedTracks,
        currentIndex: 0,
        name: "Feed",
        source: "feed",
      })
    }
  }, [queue.source, queue.tracks.length, setQueue])

  return (
    <PageContainer>
      <PageTitle>Feed</PageTitle>
      <TracksGrid>
        {feedTracks.map((track, i) => (
          <TrackTile
            key={track.id}
            track={track}
            context={<FeedTrackContext {...track} />}
            onPlayToggle={() => {
              setQueue({
                tracks: feedTracks,
                currentIndex: i,
                name: "Feed",
                source: "feed",
              })
              if (!isPlaying || queue.currentIndex === i) {
                togglePlay()
              }
            }}
          />
        ))}
      </TracksGrid>
    </PageContainer>
  )
}

export const Route = createFileRoute("/")({
  component: FeedPage,
})
