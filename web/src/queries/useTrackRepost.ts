import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCsrf } from "./useCsrf"
import { getTrackQueryKey } from "./useTrack"

const repostTrackFn = async ({
  trackId,
  csrfToken,
}: {
  trackId: number
  csrfToken?: string
}) => {
  if (!csrfToken) {
    throw new Error("CSRF token is required to repost track")
  }
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks/${trackId}/repost`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to repost track")
  }

  return response.json()
}

export const useRepostTrack = () => {
  const { data: csrfToken } = useCsrf()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trackId: number) =>
      repostTrackFn({ trackId, csrfToken: csrfToken }),
    onMutate: async (trackId: number) => {
      await queryClient.cancelQueries({ queryKey: getTrackQueryKey(trackId) })
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      queryClient.setQueryData(getTrackQueryKey(trackId), (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          is_reposted: true,
          repost_count: oldData.repost_count + 1,
        }
      })
      return { previousTrack }
    },
    onError: (_data, trackId, context) => {
      if (context?.previousTrack) {
        queryClient.setQueryData(
          getTrackQueryKey(trackId),
          context.previousTrack,
        )
      }
    },
  })
}

const unrepostTrackFn = async ({
  trackId,
  csrfToken,
}: {
  trackId: number
  csrfToken?: string
}) => {
  if (!csrfToken) {
    throw new Error("CSRF token is required to unrepost track")
  }
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks/${trackId}/repost`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to unrepost track")
  }

  return response.json()
}

export const useUnrepostTrack = () => {
  const { data: csrfToken } = useCsrf()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trackId: number) =>
      unrepostTrackFn({ trackId, csrfToken: csrfToken }),
    onMutate: async (trackId: number) => {
      await queryClient.cancelQueries({ queryKey: getTrackQueryKey(trackId) })
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      queryClient.setQueryData(getTrackQueryKey(trackId), (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          is_reposted: false,
          repost_count: oldData.repost_count - 1,
        }
      })
      return { previousTrack }
    },
    onError: (_data, trackId, context) => {
      if (context?.previousTrack) {
        queryClient.setQueryData(
          getTrackQueryKey(trackId),
          context.previousTrack,
        )
      }
    },
  })
}
