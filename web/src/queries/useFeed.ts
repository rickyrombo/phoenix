import {
  infiniteQueryOptions,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query"
import type { PlayQueueItem } from "../contexts/PlayQueueContext"

export type FeedItem = {
  tx_hash: string
  user_id: number
  entity_type: string
  entity_id: number
  action: string
  timestamp: string
}

const getFeedPage = async ({
  before,
  userId,
}: {
  before?: string
  userId: number
}) => {
  const qp = new URLSearchParams()
  qp.append("user_id", userId.toString())
  qp.append("limit", "10")
  if (before) {
    qp.append("before", before)
  }
  const response = await fetch(`http://localhost:8000/feed?${qp.toString()}`)
  if (!response.ok) throw new Error("failed to fetch feed")
  const res = await response.json()
  const feed = res.data as FeedItem[]
  return feed
}

const getFeedQueryOptions = (userId: number) =>
  infiniteQueryOptions({
    queryKey: ["feed", userId],
    queryFn: async ({ pageParam, queryKey }) => {
      const page = await getFeedPage({
        before: pageParam,
        userId: queryKey[1] as number,
      })
      return page
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      return lastPage[lastPage.length - 1].tx_hash
    },
    initialPageParam: "",
    maxPages: 2,
  })

export const useFeed = (
  userId: number,
  options?: Partial<ReturnType<typeof getFeedQueryOptions>>,
) => {
  return useInfiniteQuery({
    ...options,
    ...getFeedQueryOptions(userId),
  })
}

export const getFeedPlayQueue = (feed?: InfiniteData<FeedItem[], string>) =>
  infiniteQueryOptions({
    queryKey: ["playQueue", "feed"],
    queryFn: async ({ pageParam }) => {
      const data = await getFeedPage({ before: pageParam, userId: 1 })
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
    initialPageParam: feed?.pageParams[0] ?? "",
    initialData: feed
      ? {
          pages: feed.pages.map((page) =>
            page.map(
              (t): PlayQueueItem => ({
                trackId: t.entity_id,
                cursor: t.tx_hash,
              }),
            ),
          ),
          pageParams: feed.pageParams,
        }
      : undefined,
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
