import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import { TrendingTrackContext } from "../components/TrackTileContext"
import { trendingTracks } from "../data/tracks"
import { usePlayer } from "../contexts/PlayerContext"

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

function TrendingPage() {
  const { setQueue, queue, isPlaying, togglePlay } = usePlayer()

  return (
    <PageContainer>
      <PageTitle>Trending</PageTitle>
      <TracksGrid>
        {trendingTracks.map((track, i) => (
          <TrackTile
            key={track.id}
            track={track}
            context={<TrendingTrackContext ranking={i + 1} />}
            onPlayToggle={() => {
              setQueue({
                tracks: trendingTracks,
                currentIndex: i,
                name: "Trending",
                source: "trending",
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

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
})
