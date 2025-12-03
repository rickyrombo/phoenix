import { queryOptions, useQuery } from "@tanstack/react-query"
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
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks?id=${trackId}`,
  )
  if (!response.ok) throw new Error("failed to fetch track")
  const res = await response.json()
  const track = res.data[0]
  if (!track) return null
  return track as Track
}

const getTrackQueryOptions = (trackId: number) =>
  queryOptions({
    queryKey: ["track", trackId],
    enabled: typeof trackId === "number" && trackId > 0,
    queryFn: () => getTrackFn(trackId),
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
