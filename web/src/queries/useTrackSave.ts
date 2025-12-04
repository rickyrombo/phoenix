import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCsrf } from "./useCsrf"
import { getTrackQueryKey } from "./useTrack"

const saveTrackFn = async ({
  trackId,
  csrfToken,
}: {
  trackId: number
  csrfToken?: string
}) => {
  if (!csrfToken) {
    throw new Error("CSRF token is required to save track")
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks/${trackId}/save`,
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
    throw new Error(error.error || "Failed to save track")
  }

  return response.json()
}

export const useSaveTrack = () => {
  const { data: csrfToken } = useCsrf()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trackId: number) =>
      saveTrackFn({ trackId, csrfToken: csrfToken }),
    onMutate: async (trackId: number) => {
      await queryClient.cancelQueries({ queryKey: getTrackQueryKey(trackId) })
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      queryClient.setQueryData(getTrackQueryKey(trackId), (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          is_saved: true,
          save_count: oldData.save_count + 1,
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

const unsaveTrackFn = async ({
  trackId,
  csrfToken,
}: {
  trackId: number
  csrfToken?: string
}) => {
  if (!csrfToken) {
    throw new Error("CSRF token is required to unsave track")
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tracks/${trackId}/save`,
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
    throw new Error(error.error || "Failed to unsave track")
  }

  return response.json()
}

export const useUnsaveTrack = () => {
  const { data: csrfToken } = useCsrf()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trackId: number) =>
      unsaveTrackFn({ trackId, csrfToken: csrfToken }),
    onMutate: async (trackId: number) => {
      await queryClient.cancelQueries({ queryKey: getTrackQueryKey(trackId) })
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      queryClient.setQueryData(getTrackQueryKey(trackId), (oldData) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          is_saved: false,
          save_count: oldData.save_count - 1,
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
