import { queryOptions, useQueries, useQuery } from "@tanstack/react-query"
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
}

const getTrackFn = async (trackId: number) => {
  const response = await fetch(`http://localhost:8000/tracks?id=${trackId}`)
  if (!response.ok) throw new Error("failed to fetch track")
  const res = await response.json()
  return (res.data[0] ?? null) as Track | null
}

const getTrackQueryOptions = (trackId: number) =>
  queryOptions({
    queryKey: ["track", trackId],
    enabled: typeof trackId === "number" && trackId > 0,
    queryFn: () => getTrackFn(trackId),
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

export const useTracks = (trackIds: number[]) => {
  return useQueries({
    queries: trackIds.map((id) => getTrackQueryOptions(id)),
    combine: (results) => {
      return {
        data: results.every((r) => r.data !== undefined)
          ? results.map((r) => r.data)
          : [],
        isPending: results.some((r) => r.isPending),
        isLoading: results.some((r) => r.isLoading),
        isSuccess: results.every((r) => r.isSuccess),
        isError: results.some((r) => r.isError),
      }
    },
  })
}
