import { queryOptions, useQuery } from "@tanstack/react-query"
import { create, keyResolver, windowScheduler } from "@yornaath/batshit"

export type ImageMirrors = {
  small: string
  medium: string
  large: string
  mirrors: string[]
}

export type WideImageMirrors = {
  small: string
  large: string
  mirrors: string[]
}

export type User = {
  user_id: number
  name: string
  handle: string
  bio?: string
  location?: string
  artist_pick_track_id?: number
  instagram_handle?: string
  twitter_handle?: string
  website?: string
  donation?: string
  is_verified: boolean
  track_count: number
  playlist_count: number
  follower_count: number
  following_count: number
  repost_count: number
  track_save_count: number
  cover_art?: ImageMirrors
  profile_picture?: ImageMirrors
}

const batcher = create({
  fetcher: async (ids: number[]) => {
    if (ids.length === 0) return []
    const params = ids.map((id) => `id=${id}`).join("&")
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/users?${params}`,
    )
    if (!response.ok) throw new Error("failed to fetch track")
    const res = await response.json()
    return res.data as User[]
  },
  resolver: keyResolver("user_id"),
  scheduler: windowScheduler(10),
})

const getUserQueryOptions = (userId: number) =>
  queryOptions({
    queryKey: ["user", userId] as const,
    queryFn: ({ queryKey }) => batcher.fetch(queryKey[1]),
    enabled: typeof userId === "number" && userId > 0,
  })

export const useUser = (
  userId: number,
  options?: Partial<ReturnType<typeof getUserQueryOptions>>,
) => {
  return useQuery({
    ...options,
    ...getUserQueryOptions(userId),
  })
}

export default useUser
