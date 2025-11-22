import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query"

export type FeedItem = {
  tx_hash: string
  user_id: number
  entity_type: string
  entity_id: number
  action: string
  timestamp: string
}

export const getFeedQueryFn = async ({ before }: { before?: string }) => {
  const qp = new URLSearchParams()
  qp.append("user_id", "1")
  qp.append("limit", "20")
  if (before) {
    qp.append("before", before)
  }
  const response = await fetch(`http://localhost:8000/feed?${qp.toString()}`)
  if (!response.ok) throw new Error("failed to fetch feed")
  const res = await response.json()
  return res.data as FeedItem[]
}

export const getFeedQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => getFeedQueryFn({ before: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      return lastPage[lastPage.length - 1].tx_hash
    },
    initialPageParam: "",
    initialData: { pages: [[]], pageParams: [""] },
  })

export const useFeed = (
  options?: Partial<ReturnType<typeof getFeedQueryOptions>>,
) => {
  return useInfiniteQuery({
    ...options,
    ...getFeedQueryOptions(),
  })
}
