import { queryOptions, useQuery } from "@tanstack/react-query"

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

const getUserFn = async (userId: number) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/users?id=${userId}`,
  )
  if (!response.ok) throw new Error("failed to fetch user")
  const res = await response.json()
  return (res.data[0] ?? null) as User | null
}

const getUserQueryOptions = (userId: number) =>
  queryOptions({
    queryKey: ["user", userId],
    enabled: typeof userId === "number" && userId > 0,
    queryFn: () => getUserFn(userId),
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
