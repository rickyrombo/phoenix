import { useMutation } from "@tanstack/react-query"
import { useCsrf } from "./useCsrf"

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
  return useMutation({
    mutationFn: (trackId: number) =>
      saveTrackFn({ trackId, csrfToken: csrfToken }),
  })
}
