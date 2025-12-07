import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import TrackTile from "../components/TrackTile"
import SkeletonTrackTile from "../components/SkeletonTrackTile"
import {
  getFeedPlayQueue,
  useFeed,
  type Actions,
  type FeedItem,
} from "../queries/useFeed"
import { useTrack } from "../queries/useTrack"
import { FeedTrackContext } from "../components/TrackTileContext"
import { useCallback, useEffect, useState } from "react"
import { usePlayer } from "../contexts/PlayerContext"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import type { InfiniteData } from "@tanstack/react-query"
import { Sentinel } from "../components/Sentinel"
import { useAuth } from "../contexts/AuthContext"
import { Toggle } from "../components/core/Toggle"

const PageContainer = styled.main`
  padding: 2rem;
  padding-bottom: 2rem;
`

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const PageTitle = styled.h1`
  font-family: "Fugaz One", sans-serif;
  font-size: 2rem;
  margin: 0;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent-color);
`

const FilterControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const FilterLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
`

const TracksGrid = styled.div`
  display: flex;
  flex-direction: column;
`

type FeedItemProps = FeedItem & {
  index: number
  onPlayToggle: (tx_hash: string, index: number) => void
}

const TrackFeedItem = ({
  index,
  tx_hash,
  user_id,
  action,
  timestamp,
  entity_id,
  onPlayToggle,
}: FeedItemProps) => {
  const { data: track, isSuccess, isLoading } = useTrack(entity_id)

  const onPlayToggleBound = useCallback(() => {
    onPlayToggle(tx_hash, index)
  }, [onPlayToggle, tx_hash, index])

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
      onPlayToggle={onPlayToggleBound}
    />
  ) : null
}

function FeedPage() {
  const { userId } = useAuth()
  const [originalsOnly, setOriginalsOnly] = useState(false)

  const actions: Actions[] = originalsOnly ? ["Create"] : ["Create", "Repost"]

  const {
    data: feed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed({ userId: userId ?? undefined, actions })

  const { isPlaying, play, togglePlay } = usePlayer()
  const queue = usePlayQueue()

  const feedItems = feed?.pages.flat() ?? []

  useEffect(() => {
    if (queue.queueKey === undefined || queue.items.length === 0) {
      queue.changeQueue(
        getFeedPlayQueue(feed as InfiniteData<FeedItem[], string>),
        0,
      )
    }
  }, [queue, feed])

  const handlePlayToggle = useCallback(
    (txHash: string, index: number) => {
      const i = queue.items.findIndex((item) => item.cursor === txHash)
      if (!isPlaying || queue.index !== i) {
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

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Feed</PageTitle>
        <FilterControls>
          <FilterLabel>
            Originals only
            <Toggle checked={originalsOnly} onChange={setOriginalsOnly} />
          </FilterLabel>
        </FilterControls>
      </PageHeader>
      <TracksGrid>
        {feedItems.map((feedItem, i) => (
          <TrackFeedItem
            key={feedItem.tx_hash}
            index={i}
            {...feedItem}
            onPlayToggle={handlePlayToggle}
          />
        ))}
        {isFetchingNextPage && <SkeletonTrackTile />}
      </TracksGrid>
      <Sentinel onIntersect={loadMore} />
    </PageContainer>
  )
}
export const Route = createFileRoute("/")({
  component: FeedPage,
})
