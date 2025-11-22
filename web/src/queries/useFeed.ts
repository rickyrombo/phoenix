import { useQuery } from "@tanstack/react-query"

export type FeedItem = {
  user_id: number
  entity_type: string
  entity_id: number
  action: string
  timestamp: string
}

export const useFeed = () => {
  return useQuery<FeedItem[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      const response = await fetch(
        "http://localhost:8000/feed?user_id=1&limit=20&offset=0",
      )
      if (!response.ok) throw new Error("failed to fetch feed")
      const res = await response.json()
      return res.data
    },
  })
}
