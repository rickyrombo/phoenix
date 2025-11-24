import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import SkeletonTrackTile from "../components/SkeletonTrackTile"
import { getFeedPlayQueue, useFeed, type FeedItem } from "../queries/useFeed"
import { useTrack } from "../queries/useTrack"
import { FeedTrackContext } from "../components/TrackTileContext"
import { useCallback, useEffect } from "react"
import { usePlayer } from "../contexts/PlayerContext"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import type { InfiniteData } from "@tanstack/react-query"
import { Sentinel } from "../components/Sentinel"
import { useVirtualizer } from "@tanstack/react-virtual"

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

const VirtualList = styled.div`
  width: 100%;
  position: relative;
`

const VirtualRow = styled.div<{ $start: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  overflow-x: hidden;
  transform: translateY(${(props) => props.$start}px);
`

const LoadingIndicator = styled.div`
  width: 100%;
  height: 256px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
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
  const { data: track, isSuccess, isLoading } = useTrack(entity_id)
  if (isLoading) {
    return <SkeletonTrackTile />
  }
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

  const { isPlaying, play, togglePlay } = usePlayer()
  const queue = usePlayQueue()

  // Flatten feed items for virtualization
  const feedItems = feed?.pages.flat() ?? []

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: hasNextPage ? feedItems.length + 1 : feedItems.length,
    getScrollElement: () => document.documentElement,
    estimateSize: () => 256,
    overscan: 5,
  })

  useEffect(() => {
    if (queue.queueKey === undefined || queue.items.length === 0) {
      queue.changeQueue(
        getFeedPlayQueue(feed as InfiniteData<FeedItem[], string>),
        0,
      )
    }
  }, [queue, feed])

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
        <VirtualList style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const feedItem = feedItems[virtualItem.index] ?? {
              tx_hash: "loading",
            }
            return (
              <VirtualRow
                key={feedItem.tx_hash}
                $start={virtualItem.start}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
              >
                {feedItem.tx_hash === "loading" ? (
                  <LoadingIndicator>Loading...</LoadingIndicator>
                ) : (
                  <TrackFeedItem
                    {...feedItem}
                    onPlayToggle={() => handlePlayToggle(feedItem.tx_hash)}
                  />
                )}
              </VirtualRow>
            )
          })}
        </VirtualList>
      </TracksGrid>
      <Sentinel
        onIntersect={() => {
          if (hasNextPage) {
            fetchNextPage()
          }
        }}
      />
    </PageContainer>
  )
}
export const Route = createFileRoute("/")({
  component: FeedPage,
})
