import { createFileRoute } from "@tanstack/react-router"
import styled from "styled-components"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState } from "react"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 140px);
  padding: 2rem;
  background: #111;
`

const Card = styled.div`
  background: #1a1a1a;
  border: 2px solid oklch(71.4% 0.203 305.504);
  border-radius: 8px;
  padding: 3rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 0 30px oklch(71.4% 0.203 305.504 / 0.2);
`

const Title = styled.h1`
  font-family: "Kode Mono", monospace;
  font-size: 2rem;
  font-weight: 700;
  color: oklch(71.4% 0.203 305.504);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
`

const Description = styled.p`
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: #999;
  margin-bottom: 2rem;
  text-align: center;
  line-height: 1.6;
`

const WalletInfo = styled.div`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 2rem;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: #fff;
  word-break: break-all;
`

const Label = styled.label`
  display: block;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: oklch(71.4% 0.203 305.504);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #fff;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border: 1px solid oklch(71.4% 0.203 305.504);
    box-shadow: 0 0 0 1px oklch(71.4% 0.203 305.504);
  }

  &::placeholder {
    color: #606060;
  }
`

const Button = styled.button<{ $secondary?: boolean }>`
  width: 100%;
  padding: 0.875rem 1.5rem;
  border-radius: 4px;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 2px solid oklch(71.4% 0.203 305.504);
  background: ${(props) =>
    props.$secondary ? "transparent" : "oklch(71.4% 0.203 305.504)"};
  color: ${(props) =>
    props.$secondary ? "oklch(71.4% 0.203 305.504)" : "#000000"};
  margin-bottom: ${(props) => (props.$secondary ? "0" : "1rem")};

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$secondary ? "oklch(71.4% 0.203 305.504)" : "transparent"};
    color: ${(props) =>
      props.$secondary ? "#000000" : "oklch(71.4% 0.203 305.504)"};
    box-shadow: 0 0 15px oklch(71.4% 0.203 305.504 / 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const ErrorMessage = styled.div`
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: #ff6b6b;
`

function SignupPage() {
  const { publicKey } = useWallet()
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async () => {
    if (!publicKey) {
      setError("Wallet not connected")
      return
    }

    if (!username.trim() || !displayName.trim()) {
      setError("Please fill in all fields")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          username,
          displayName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to home page after successful signup
        window.location.href = "/"
      } else {
        setError(data.error || "Signup failed")
      }
    } catch (err) {
      setError("An error occurred during signup")
      console.error("Signup error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    window.location.href = "/"
  }

  if (!publicKey) {
    return (
      <Container>
        <Card>
          <Title>Wallet Not Connected</Title>
          <Description>
            Please connect your Solana wallet to continue with signup.
          </Description>
          <Button onClick={() => (window.location.href = "/")}>Go Back</Button>
        </Card>
      </Container>
    )
  }

  return (
    <Container>
      <Card>
        <Title>Create Your Account</Title>
        <Description>
          Your wallet isn't registered yet. Complete the signup process to create
          your Audius account.
        </Description>

        <Label>Connected Wallet</Label>
        <WalletInfo>{publicKey.toBase58()}</WalletInfo>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Label>Username</Label>
        <Input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Label>Display Name</Label>
        <Input
          type="text"
          placeholder="Enter your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <Button onClick={handleSignup} disabled={isSubmitting}>
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </Button>
        <Button $secondary onClick={handleCancel}>
          Cancel
        </Button>
      </Card>
    </Container>
  )
}

export const Route = createFileRoute("/signup")({
  component: SignupPage,
})
