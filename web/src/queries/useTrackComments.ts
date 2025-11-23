import { queryOptions, useQuery } from "@tanstack/react-query"

export type Comment = {
  comment_id: number
  user_id: number
  content: string
  timestamp: number
  user_name: string
  user_profile_picture?: string
  thread: Comment[]
}
const getTrackCommentsQueryFn = async (trackId: number) => {
  const response = await fetch(
    `http://localhost:8000/tracks/${trackId}/comments`,
  )
  if (!response.ok) throw new Error("failed to fetch user")
  const res = await response.json()
  return (res.data ?? []) as Comment[]
}

const getTrackCommentsQueryOptions = (trackId: number) =>
  queryOptions({
    queryKey: ["trackComments", trackId],
    enabled: typeof trackId === "number" && trackId > 0,
    queryFn: () => getTrackCommentsQueryFn(trackId),
  })

export const useTrackComments = (
  trackId: number,
  options?: Partial<ReturnType<typeof getTrackCommentsQueryOptions>>,
) => {
  return useQuery({
    ...options,
    ...getTrackCommentsQueryOptions(trackId),
  })
}

export default useTrackComments
