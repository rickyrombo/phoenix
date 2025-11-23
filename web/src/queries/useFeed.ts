import {
  infiniteQueryOptions,
  QueryClient,
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

const syncFeedPageToPlayQueue = (
  client: QueryClient,
  pageParam: string,
  page: FeedItem[],
) => {
  console.log("Syncing feed page to play queue", { page, pageParam })
  client.setQueryData(getFeedPlayQueue().queryKey, (data) => {
    const queuePage = page.map(
      (t): PlayQueueItem => ({
        trackId: t.entity_id,
        cursor: t.tx_hash,
      }),
    )
    if (!data)
      return {
        pageParams: [pageParam],
        pages: [queuePage],
      }
    const feedData = client.getQueryData(getFeedQueryOptions().queryKey)
    const feedDataPageCount = feedData ? feedData.pages.length : 0
    if (data.pages.length <= feedDataPageCount) {
      return {
        ...data,
        pageParams: [...data.pageParams, pageParam],
        pages: [...data.pages, queuePage],
      }
    }
  })
}

const getFeedPage = async ({ before }: { before?: string }) => {
  const qp = new URLSearchParams()
  qp.append("user_id", "1")
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

const getFeedQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ["feed"],
    queryFn: async ({ pageParam, client }) => {
      const page = await getFeedPage({ before: pageParam })
      syncFeedPageToPlayQueue(client, pageParam, page)
      return page
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      return lastPage[lastPage.length - 1].tx_hash
    },
    initialPageParam: "",
  })

export const useFeed = (
  options?: Partial<ReturnType<typeof getFeedQueryOptions>>,
) => {
  return useInfiniteQuery({
    ...options,
    ...getFeedQueryOptions(),
  })
}

export const getFeedPlayQueue = (feed?: InfiniteData<FeedItem[], string>) =>
  infiniteQueryOptions({
    queryKey: ["playQueue", "feed"],
    queryFn: async ({ pageParam }) => {
      const data = await getFeedPage({ before: pageParam })
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
