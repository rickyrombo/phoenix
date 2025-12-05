import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useAuth } from "../contexts/AuthContext"
import { useCsrf } from "./useCsrf"
import { useUser, type ImageMirrors } from "./useUser"

export type Comment = {
  comment_id: number
  user_id: number
  content: string
  track_timestamp_s?: number
  user_name: string
  user_profile_picture?: ImageMirrors
  thread: Comment[]
}
const getTrackCommentsQueryFn = async (trackId: number) => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks/${trackId}/comments`,
  )
  if (!response.ok) throw new Error("failed to fetch user")
  const res = await response.json()
  return (res.data ?? []) as Comment[]
}

const getTrackCommentsQueryOptions = (trackId: number) =>
  queryOptions({
    queryKey: ["trackComments", trackId] as const,
    enabled: typeof trackId === "number" && trackId > 0,
    queryFn: ({ queryKey }) => getTrackCommentsQueryFn(queryKey[1]),
  })

const getTrackCommentsQueryKey = (trackId: number) =>
  getTrackCommentsQueryOptions(trackId).queryKey

export const useTrackComments = (
  trackId: number,
  options?: Partial<ReturnType<typeof getTrackCommentsQueryOptions>>,
) => {
  return useQuery({
    ...options,
    ...getTrackCommentsQueryOptions(trackId),
  })
}

type PostTrackCommentParams = {
  trackId: number
  content: string
  parentCommentId?: number
  trackTimestampS?: number
  csrfToken?: string
}

const postTrackComment = async (params: PostTrackCommentParams) => {
  if (!params.csrfToken) {
    throw new Error("CSRF token is required to post comment")
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks/${params.trackId}/comments`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": params.csrfToken,
      },
      body: JSON.stringify({
        content: params.content,
        parent_comment_id: params.parentCommentId,
        track_timestamp_s: params.trackTimestampS,
      }),
    },
  )
  if (!response.ok) throw new Error("failed to post comment")
  return await response.json()
}

type UsePostTrackCommentParams = {
  trackId: number
  content: string
  parentCommentId?: number
  trackTimestampS?: number
}

export const usePostTrackComment = () => {
  const { data: csrfToken } = useCsrf()
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const { data: user } = useUser(userId!, { enabled: !!userId })

  return useMutation({
    mutationFn: (params: UsePostTrackCommentParams) =>
      postTrackComment({ ...params, csrfToken }),
    onMutate: async (params: UsePostTrackCommentParams) => {
      await queryClient.cancelQueries({
        queryKey: getTrackCommentsQueryKey(params.trackId),
      })
      const previousComments = queryClient.getQueryData<Comment[]>(
        getTrackCommentsQueryKey(params.trackId),
      )
      const id = Date.now() // Temporary ID
      queryClient.setQueryData(
        getTrackCommentsQueryKey(params.trackId),
        (oldData) => {
          if (!oldData) return oldData
          const newComment: Comment = {
            comment_id: id,
            user_id: user?.user_id || 0,
            content: params.content,
            track_timestamp_s: params.trackTimestampS || 0,
            user_name: "You",
            user_profile_picture: user?.profile_picture,
            thread: [],
          }
          return [newComment, ...oldData]
        },
      )
      return { previousComments }
    },
    onError: (_data, params, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          getTrackCommentsQueryKey(params.trackId),
          context.previousComments,
        )
      }
    },
    onSettled: (_data, _err, params) => {
      queryClient.invalidateQueries({
        queryKey: getTrackCommentsQueryKey(params.trackId),
      })
    },
  })
}
