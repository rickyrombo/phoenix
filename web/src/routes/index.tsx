import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import { getFeedQueryFn, useFeed, type FeedItem } from "../queries/useFeed"
import { useTrack } from "../queries/useTrack"
import { FeedTrackContext } from "../components/TrackTileContext"
import { useCallback } from "react"
import { usePlayer } from "../contexts/PlayerContext"
import { usePlayQueue, type PlayQueueItem } from "../contexts/PlayQueueContext"
import { infiniteQueryOptions } from "@tanstack/react-query"

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
  queuePosition: number
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

const feedQueueQueryOptions = infiniteQueryOptions({
  queryKey: ["playQueue", "feed"],
  queryFn: async ({ pageParam }: { pageParam?: string }) => {
    const data = await getFeedQueryFn({ before: pageParam })
    const playQueue = data.map(
      (t): PlayQueueItem => ({
        trackId: t.entity_id,
        cursor: t.tx_hash,
      }),
    )
    return playQueue
  },
  getNextPageParam: (lastPage) => {
    if (lastPage.length === 0) return undefined
    return lastPage[lastPage.length - 1].cursor
  },
  initialPageParam: "",
})

function FeedPage() {
  const { data: feed } = useFeed()

  const { isPlaying, togglePlay } = usePlayer()
  const queue = usePlayQueue()

  const handlePlayToggle = useCallback(
    (i: number) => {
      if (queue.queueKey?.[1] !== "feed") {
        console.log("Changing queue to feed")
        queue.changeQueue(feedQueueQueryOptions)
      }
      if (queue.index !== i) {
        console.log("Changing track")
        queue.set(i)
      }
      if (!isPlaying || queue.index === i) {
        console.log("Toggling play")
        togglePlay()
      }
    },
    [isPlaying, queue, togglePlay],
  )

  return (
    <PageContainer>
      <PageTitle>Feed</PageTitle>
      <TracksGrid>
        {feed?.pages.flat().map((feedItem, i) => (
          <TrackFeedItem
            key={feedItem.entity_id}
            queuePosition={i}
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
