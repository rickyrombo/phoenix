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

type EntityTypes = "Track"
type Actions = "Create" | "Repost"

type UseFeedParams = {
  userId?: number
  entityTypes?: EntityTypes[]
  actions?: Actions[]
}

type GetFeedParams = {
  before?: string
  userId?: number
  entityTypes?: EntityTypes[]
  actions?: Actions[]
}

const getFeedPage = async ({
  before,
  userId,
  entityTypes,
  actions,
}: GetFeedParams) => {
  const qp = new URLSearchParams()
  if (userId) {
    qp.append("user_id", userId.toString())
  }
  qp.append("limit", "20")
  if (before) {
    qp.append("before", before)
  }
  if (entityTypes && entityTypes.length > 0) {
    for (const et of entityTypes) {
      qp.append("entity_type", et)
    }
  }
  if (actions && actions.length > 0) {
    for (const action of actions) {
      qp.append("action", action)
    }
  }
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/feed?${qp.toString()}`,
  )
  if (!response.ok) throw new Error("failed to fetch feed")
  const res = await response.json()
  const feed = res.data as FeedItem[]
  return feed
}

const dedupe = (pages: FeedItem[][]) => {
  const seen = new Set<number>()
  const dedupedPages: FeedItem[][] = []
  for (const page of pages) {
    const dedupedPage: FeedItem[] = []
    for (const item of page) {
      if (!seen.has(item.entity_id)) {
        seen.add(item.entity_id)
        dedupedPage.push(item)
      }
    }
    dedupedPages.push(dedupedPage)
  }
  return dedupedPages
}

const getFeedQueryOptions = (params?: UseFeedParams) =>
  infiniteQueryOptions({
    queryKey: ["feed", params] as const,
    queryFn: ({ pageParam, queryKey }) =>
      getFeedPage({
        ...queryKey[1],
        before: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      return lastPage[lastPage.length - 1].tx_hash
    },
    initialPageParam: "",
    select: (data) => {
      return {
        ...data,
        pages: dedupe(data.pages),
      }
    },
  })

export const useFeed = (
  params?: UseFeedParams,
  options?: Partial<ReturnType<typeof getFeedQueryOptions>>,
) => {
  return useInfiniteQuery({
    ...options,
    ...getFeedQueryOptions(params),
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
