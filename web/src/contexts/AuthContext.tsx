import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import bs58 from "bs58"

type AuthContextType = {
  isAuthenticated: boolean
  isAuthenticating: boolean
  user: { walletAddress: string } | null
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { publicKey, signIn, disconnect } = useWallet()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [user, setUser] = useState<{ walletAddress: string } | null>(null)

  const login = useCallback(async () => {
    if (!publicKey || !signIn) {
      console.error("Wallet not connected")
      return
    }

    setIsAuthenticating(true)
    try {
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : undefined
      const message = {
        domain: `phoenix.rickyrombo.com`,
        issuedAt: new Date().toISOString(),
        statement: `Sign this message to authenticate with Phoenix`,
        address: publicKey.toBase58(),
        nonce: Math.random().toString(36).substring(2, 15),
        requestId,
      }
      const { signedMessage, signature } = await signIn(message)

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            message,
            signed_message: bs58.encode(signedMessage),
            signature: bs58.encode(signature),
          }),
        },
      )

      const data = await response.json()

      if (response.ok) {
        // User exists and is authenticated
        setIsAuthenticated(true)
        setUser({ walletAddress: publicKey.toBase58() })
      } else {
        if (data.error === "not_linked") {
          // Redirect to signup page
          window.location.href = "/signup"
        } else if (data.error === "not_granted") {
          // Redirect to grant access page
          window.location.href = "/grant-access"
        } else {
          console.error("Authentication failed:", data.error)
          // Optionally disconnect wallet on auth failure
          await disconnect()
        }
      }
    } catch (error) {
      console.error("Error during authentication:", error)
      // Optionally disconnect wallet on error
      await disconnect()
    } finally {
      setIsAuthenticating(false)
    }
  }, [publicKey, signIn, disconnect])

  const logout = useCallback(async () => {
    try {
      // Call backend to clear session cookie
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Error during logout:", error)
    }

    setIsAuthenticated(false)
    setUser(null)
    await disconnect()
  }, [disconnect])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAuthenticating,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
