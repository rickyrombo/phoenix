import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import styled from "styled-components"
import { useAuth } from "../contexts/AuthContext"
import { useEffect } from "react"

const StyledWalletButton = styled(WalletMultiButton)`
  && {
    padding: 0.625rem 1.25rem;
    border-radius: 4px;
    font-family: "Kode Mono", monospace;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 2px solid oklch(71.4% 0.203 305.504);
    background: oklch(71.4% 0.203 305.504);
    color: #000000;
    height: auto;

    &:hover:not(:disabled) {
      background: transparent;
      color: oklch(71.4% 0.203 305.504);
      box-shadow: 0 0 15px oklch(71.4% 0.203 305.504 / 0.3);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
    }
  }
`

const LogoutButton = styled.button`
  padding: 0.625rem 1.25rem;
  border-radius: 4px;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 2px solid oklch(71.4% 0.203 305.504);
  background: transparent;
  color: oklch(71.4% 0.203 305.504);

  &:hover {
    background: oklch(71.4% 0.203 305.504);
    color: #000000;
    box-shadow: 0 0 15px oklch(71.4% 0.203 305.504 / 0.3);
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`

const WalletAddress = styled.span`
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: oklch(71.4% 0.203 305.504);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`

export default function ConnectWalletButton() {
  const { connected, publicKey } = useWallet()
  const { isAuthenticated, isAuthenticating, user, login, logout } = useAuth()

  // Automatically trigger login when wallet connects
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated && !isAuthenticating) {
      login()
    }
  }, [connected, publicKey, isAuthenticated, isAuthenticating, login])

  if (isAuthenticated && user) {
    return (
      <ButtonGroup>
        <WalletAddress>
          {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
        </WalletAddress>
        <LogoutButton onClick={logout}>Disconnect</LogoutButton>
      </ButtonGroup>
    )
  }

  return <StyledWalletButton disabled={isAuthenticating} />
}
