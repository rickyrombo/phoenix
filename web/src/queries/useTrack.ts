import { queryOptions, useQuery } from "@tanstack/react-query"
import { create, keyResolver, windowScheduler } from "@yornaath/batshit"
import type { ImageMirrors } from "./useUser"

export type StreamMirrors = {
  url: string
  mirrors: string[]
}

export type Track = {
  track_id: number
  title: string
  description: string
  genre: string
  mood?: string
  bpm?: number
  musical_key?: string
  duration: number
  owner_id: number
  play_count: number
  comment_count: number
  save_count: number
  repost_count: number
  waveform: number[]
  stream: StreamMirrors
  cover_art?: ImageMirrors
  is_saved: boolean
  is_reposted: boolean
}

const batcher = create({
  fetcher: async (ids: number[]) => {
    if (ids.length === 0) return []
    const params = ids.map((id) => `id=${id}`).join("&")
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/tracks?${params}`,
      {
        credentials: "include",
      },
    )
    if (!response.ok) throw new Error("failed to fetch track")
    const res = await response.json()
    return res.data as Track[]
  },
  resolver: keyResolver("track_id"),
  scheduler: windowScheduler(10),
})

export const getTrackQueryKey = (trackId: number) =>
  getTrackQueryOptions(trackId).queryKey

const getTrackQueryOptions = (trackId: number) =>
  queryOptions({
    queryKey: ["track", trackId] as const,
    queryFn: ({ queryKey }) => batcher.fetch(queryKey[1]),
    enabled: typeof trackId === "number" && trackId > 0,
    staleTime: 5 * 60 * 1000,
  })

export const useTrack = (
  trackId: number,
  options?: Partial<ReturnType<typeof getTrackQueryOptions>>,
) => {
  return useQuery({
    ...options,
    ...getTrackQueryOptions(trackId),
  })
}
