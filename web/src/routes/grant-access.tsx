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
  color: var(--accent-color);
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

const Label = styled.div`
  font-family: "Kode Mono", monospace;
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`

const InfoBox = styled.div`
  background: rgba(71, 114, 203, 0.1);
  border: 1px solid rgba(71, 114, 203, 0.3);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 2rem;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: #7ba5ff;
  line-height: 1.6;
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
  border: 2px solid var(--accent-color);
  background: ${(props) =>
    props.$secondary ? "transparent" : "var(--accent-color)"};
  color: ${(props) => (props.$secondary ? "var(--accent-color)" : "#000000")};
  margin-bottom: ${(props) => (props.$secondary ? "0" : "1rem")};

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.$secondary ? "var(--accent-color)" : "transparent"};
    color: ${(props) => (props.$secondary ? "#000000" : "var(--accent-color)")};
    box-shadow: 0 0 15px var(--accent-color / 0.3);
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

function GrantAccessPage() {
  const { publicKey } = useWallet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGrantAccess = async () => {
    if (!publicKey) {
      setError("Wallet not connected")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/grant-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
          }),
        },
      )

      const data = await response.json()

      if (response.ok) {
        // Redirect to home page after granting access
        window.location.href = "/"
      } else {
        setError(data.error || "Failed to grant access")
      }
    } catch (err) {
      setError("An error occurred while granting access")
      console.error("Grant access error:", err)
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
            Please connect your Solana wallet to continue.
          </Description>
          <Button onClick={() => (window.location.href = "/")}>Go Back</Button>
        </Card>
      </Container>
    )
  }

  return (
    <Container>
      <Card>
        <Title>Grant Access</Title>
        <Description>
          Your account exists but you haven't granted access to this wallet yet.
        </Description>

        <Label>Connected Wallet</Label>
        <WalletInfo>{publicKey.toBase58()}</WalletInfo>

        <InfoBox>
          Granting access will allow this wallet to authenticate and access your
          Audius account. You can revoke access at any time from your account
          settings.
        </InfoBox>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button onClick={handleGrantAccess} disabled={isSubmitting}>
          {isSubmitting ? "Granting Access..." : "Grant Access"}
        </Button>
        <Button $secondary onClick={handleCancel}>
          Cancel
        </Button>
      </Card>
    </Container>
  )
}

export const Route = createFileRoute("/grant-access")({
  component: GrantAccessPage,
})
