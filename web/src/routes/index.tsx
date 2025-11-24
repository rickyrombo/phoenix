import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import { getFeedPlayQueue, useFeed, type FeedItem } from "../queries/useFeed"
import { useTrack } from "../queries/useTrack"
import { FeedTrackContext } from "../components/TrackTileContext"
import { useCallback, useEffect, useRef } from "react"
import { usePlayer } from "../contexts/PlayerContext"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import type { InfiniteData } from "@tanstack/react-query"

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
  const { data: feed, fetchNextPage, hasNextPage } = useFeed(1)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { isPlaying, play, togglePlay } = usePlayer()
  const queue = usePlayQueue()

  useEffect(() => {
    if (queue.queueKey === undefined || queue.items.length === 0) {
      queue.changeQueue(
        getFeedPlayQueue(feed as InfiniteData<FeedItem[], string>),
        0,
      )
    }
  }, [queue, feed])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const options = {
      root: null,
      rootMargin: "500px",
      threshold: 0.01,
    }

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })
    }

    const observer = new IntersectionObserver(handleIntersect, options)

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasNextPage])

  const handlePlayToggle = useCallback(
    (txHash: string) => {
      const i = queue.items.findIndex((item) => item.cursor === txHash)
      if (!isPlaying || queue.index !== i) {
        const index = feed?.pages
          .flat()
          .findIndex((item) => item.tx_hash === txHash)
        queue.changeQueue(
          // TODO: fix type assertion - why is TS not inferring correctly?
          getFeedPlayQueue(feed as InfiniteData<FeedItem[], string>),
          index,
        )
        play()
      } else {
        togglePlay()
      }
    },
    [isPlaying, queue, feed, togglePlay, play],
  )

  return (
    <PageContainer>
      <PageTitle>Feed</PageTitle>
      <TracksGrid>
        {feed?.pages.flat().map((feedItem) => (
          <TrackFeedItem
            key={feedItem.tx_hash}
            {...feedItem}
            onPlayToggle={() => handlePlayToggle(feedItem.tx_hash)}
          />
        ))}
      </TracksGrid>
      <div ref={sentinelRef} style={{ height: "1px" }} />
    </PageContainer>
  )
}
export const Route = createFileRoute("/")({
  component: FeedPage,
})
