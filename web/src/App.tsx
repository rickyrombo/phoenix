import { RouterProvider, createRouter } from '@tanstack/react-router'
import { PlayerProvider } from './contexts/PlayerContext'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <PlayerProvider>
      <RouterProvider router={router} />
    </PlayerProvider>
  )
}

export default App
