import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import bs58 from "bs58"
import { Modal } from "../components/Modal"
import { AccountNeedsLink } from "../components/AccountNeedsLink"
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
} from "@solana/wallet-standard-features"
import dayjs from "dayjs"
import { AccountNeedsGrant } from "../components/AccountNeedsGrant"

type AuthState =
  | "unauthenticated"
  | "siws_in_progress"
  | "needs_link"
  | "needs_grant"
  | "authenticated"

type AuthContextType = {
  authState: AuthState
  userId: number | null
  login: (token?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

type SiwsPayload = SolanaSignInOutput & {
  message: SolanaSignInInput
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { connected, connecting, publicKey, signIn, disconnect } = useWallet()
  const [authState, setAuthState] = useState<AuthState>("unauthenticated")
  const [userId, setUserId] = useState<number | null>(null)
  const [siwsPayload, setSiwsPayload] = useState<SiwsPayload | null>(null)
  const [checkedSession, setCheckedSession] = useState(false)

  const signInWithSolana = useCallback(
    async (token?: string) => {
      if (!publicKey || !signIn) {
        return
      }

      setAuthState("siws_in_progress")

      let siwsOutput = siwsPayload

      if (
        !siwsOutput ||
        siwsOutput.message.address !== publicKey.toBase58() ||
        dayjs(siwsOutput.message.issuedAt).isBefore(
          dayjs().subtract(5, "minutes"),
        )
      ) {
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
          const p = await signIn(message)
          siwsOutput = { ...p, message }
          setSiwsPayload(siwsOutput)
        } catch (error) {
          console.error("Error during SIWS:", error)
          await disconnect()
          return
        }
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              message: siwsOutput.message,
              signed_message: bs58.encode(siwsOutput.signedMessage),
              signature: bs58.encode(siwsOutput.signature),
              token,
            }),
          },
        )

        const body = await response.json()

        if (response.ok) {
          setAuthState("authenticated")
          setUserId(body.data.user_id)
        } else if (body.error == "not_linked") {
          setAuthState("needs_link")
        } else if (body.error == "not_granted") {
          setAuthState("needs_grant")
        } else {
          console.error("Authentication failed:", body.error)
          await disconnect()
        }
      } catch (error) {
        console.error("Error during authentication:", error)
        await disconnect()
      }
    },
    [publicKey, signIn, siwsPayload, disconnect],
  )

  const logout = useCallback(async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Error during logout:", error)
    }

    await disconnect()
    setUserId(null)
    setAuthState("unauthenticated")
  }, [disconnect])

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/status`,
          {
            credentials: "include",
          },
        )
        const data = await response.json()

        if (data.authenticated && data.user_id) {
          setAuthState("authenticated")
          setUserId(data.user_id)
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setCheckedSession(true)
      }
    }

    checkSession()
  }, [])

  if (connected && authState === "unauthenticated" && checkedSession) {
    signInWithSolana()
  }

  if (!connected && !connecting && authState !== "unauthenticated") {
    logout()
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        userId,
        login: signInWithSolana,
        logout,
      }}
    >
      {children}
      <Modal
        title="Wallet not recognized"
        isOpen={authState === "needs_link"}
        onClose={logout}
      >
        <AccountNeedsLink />
      </Modal>
      <Modal
        title="Permission required"
        isOpen={authState === "needs_grant"}
        onClose={logout}
      >
        <AccountNeedsGrant />
      </Modal>
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
