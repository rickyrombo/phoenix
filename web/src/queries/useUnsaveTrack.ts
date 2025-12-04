import { useMutation } from "@tanstack/react-query"
import useCsrf from "./useCsrf"

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
  return useMutation({
    mutationFn: (trackId: number) =>
      unsaveTrackFn({ trackId, csrfToken: csrfToken }),
  })
}
