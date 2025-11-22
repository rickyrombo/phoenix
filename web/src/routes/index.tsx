import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import { useFeed, type FeedItem } from "../queries/useFeed"
import { useTrack } from "../queries/useTrack"
import { FeedTrackContext } from "../components/TrackTileContext"
import { useCallback } from "react"
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

type FeedItemProps = FeedItem & {
  onPlayToggle: () => void
}

const TrackFeedItem = ({
  user_id,
  action,
  timestamp,
  entity_id,
  onPlayToggle,
}: FeedItemProps) => {
  const { data: track, isSuccess } = useTrack(entity_id)
  return isSuccess && track ? (
    <TrackTile
      track={track!}
      context={
        <FeedTrackContext
          contextUserId={user_id}
          contextType={action as "Repost" | "Create"}
          contextTime={timestamp}
        />
      }
      onPlayToggle={onPlayToggle}
    />
  ) : null
}

function FeedPage() {
  const { data: feed } = useFeed()

  const { setQueue, queue, isPlaying, togglePlay } = usePlayer()

  const handlePlayToggle = useCallback(
    (i: number) => {
      setQueue({
        tracks: feed?.map((item) => item.entity_id) ?? [],
        currentIndex: i,
        name: "Feed",
        source: "feed",
      })
      if (!isPlaying || queue.currentIndex === i) {
        togglePlay()
      }
    },
    [feed, isPlaying, queue.currentIndex, setQueue, togglePlay],
  )

  return (
    <PageContainer>
      <PageTitle>Feed</PageTitle>
      <TracksGrid>
        {feed?.map((feedItem, i) => (
          <TrackFeedItem
            key={feedItem.entity_id}
            {...feedItem}
            onPlayToggle={() => handlePlayToggle(i)}
          />
        ))}
      </TracksGrid>
    </PageContainer>
  )
}
export const Route = createFileRoute("/")({
  component: FeedPage,
})
