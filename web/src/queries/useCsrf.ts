import { queryOptions, useQuery } from "@tanstack/react-query"

const getCsrfTokenFn = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/auth/csrf`,
    {
      credentials: "include",
    },
  )
  if (!response.ok) throw new Error("failed to fetch CSRF token")
  const data = await response.json()
  return data.csrf_token as string
}

const getCsrfTokenQueryOptions = () =>
  queryOptions({
    queryKey: ["csrf"],
    queryFn: getCsrfTokenFn,
    staleTime: Infinity, // Token is stable for the session
    gcTime: Infinity, // Keep in cache forever
    retry: 3,
  })

export const useCsrf = (
  options?: Partial<ReturnType<typeof getCsrfTokenQueryOptions>>,
) => {
  return useQuery({
    ...options,
    ...getCsrfTokenQueryOptions(),
  })
}
