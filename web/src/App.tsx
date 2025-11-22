import { RouterProvider, createRouter } from "@tanstack/react-router"
import { PlayerProvider } from "./contexts/PlayerContext"
import { routeTree } from "./routeTree.gen"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import duration from "dayjs/plugin/duration"

const router = createRouter({ routeTree })

const queryClient = new QueryClient()

dayjs.extend(relativeTime)
dayjs.extend(duration)

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <RouterProvider router={router} />
      </PlayerProvider>
    </QueryClientProvider>
  )
}

export default App
