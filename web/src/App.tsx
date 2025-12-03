import { RouterProvider, createRouter } from "@tanstack/react-router"
import { PlayerProvider } from "./contexts/PlayerContext"
import { routeTree } from "./routeTree.gen"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import duration from "dayjs/plugin/duration"
import utc from "dayjs/plugin/utc"
import { PlayQueueProvider } from "./contexts/PlayQueueContext"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useMemo } from "react"
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { AuthProvider } from "./contexts/AuthContext"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const queryClient = new QueryClient()

dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.extend(utc)

function App() {
  // Configure Solana network (mainnet-beta, testnet, or devnet)
  const network = WalletAdapterNetwork.Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Initialize wallet adapters
  const wallets = useMemo(() => [new SolflareWalletAdapter()], [])

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <AuthProvider>
              <PlayQueueProvider>
                <PlayerProvider>
                  <RouterProvider router={router} />
                </PlayerProvider>
              </PlayQueueProvider>
            </AuthProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
