import styled from "styled-components"
import TrackTile from "./TrackTile"
import SkeletonTrackTile from "./SkeletonTrackTile"
import {
  getFeedPlayQueue,
  useFeed,
  type Actions,
  type FeedItem,
} from "../queries/useFeed"
import { useTrack } from "../queries/useTrack"
import { FeedTrackContext } from "./TrackTileContext"
import { useCallback, useEffect, useMemo } from "react"
import { usePlayer } from "../contexts/PlayerContext"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import type { InfiniteData } from "@tanstack/react-query"
import { Sentinel } from "./Sentinel"

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
type ActivityFeedProps = {
  followedByUserId?: number
  userIds?: number[]
  originalsOnly?: boolean
}

export function ActivityFeed({
  followedByUserId,
  userIds,
  originalsOnly,
}: ActivityFeedProps) {
  const actions: Actions[] = useMemo(
    () => (originalsOnly ? ["Create"] : ["Create", "Repost"]),
    [originalsOnly],
  )

  const feedParams = useMemo(
    () => ({ userIds, followedByUserId, actions }),
    [userIds, followedByUserId, actions],
  )
  const {
    data: feed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed(feedParams)

  const { isPlaying, play, togglePlay } = usePlayer()
  const queue = usePlayQueue()

  const feedItems = feed?.pages.flat() ?? []

  useEffect(() => {
    if (queue.queueKey === undefined || queue.items.length === 0) {
      queue.changeQueue(
        getFeedPlayQueue(feedParams, feed as InfiniteData<FeedItem[], string>),
        0,
      )
    }
  }, [queue, feedParams, feed])
  const handlePlayToggle = useCallback(
    (txHash: string, index: number) => {
      const i = queue.items.findIndex((item) => item.cursor === txHash)
      if (!isPlaying || queue.index !== i) {
        queue.changeQueue(
          // TODO: fix type assertion - why is TS not inferring correctly?
          getFeedPlayQueue(
            feedParams,
            feed as InfiniteData<FeedItem[], string>,
          ),
          index,
        )
        play()
      } else {
        togglePlay()
      }
    },
    [isPlaying, queue, feed, feedParams, togglePlay, play],
  )

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
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
      <Sentinel onIntersect={loadMore} />
    </TracksGrid>
  )
}
