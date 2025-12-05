import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import styled from "styled-components"
import { useAuth } from "../contexts/AuthContext"
import { useUser } from "../queries/useUser"
import { WithMirrors } from "./WithMirrors"
import { Flex } from "./core/Flex"

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
    border: 2px solid var(--accent-color);
    background: var(--accent-color);
    color: #000000;
    height: auto;

    &:hover:not(:disabled) {
      background: transparent;
      color: var(--accent-color);
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

const Handle = styled.span`
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: var(--accent-color);

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`

export default function ConnectWalletButton() {
  const { authState, userId } = useAuth()

  const { data: user } = useUser(userId!, {
    enabled: userId !== null && authState === "authenticated",
  })

  if (authState === "authenticated" && user) {
    if (user.profile_picture) {
      return (
        <Flex gap={24} alignItems="center">
          <Handle>@{user.handle}</Handle>
          <WithMirrors
            url={user.profile_picture.small}
            mirrors={user.profile_picture.mirrors}
          >
            {(url, onError) => (
              <img
                src={url}
                alt="User Avatar"
                width={32}
                height={32}
                onError={onError}
                style={{ borderRadius: "50%" }}
              />
            )}
          </WithMirrors>
        </Flex>
      )
    }
  }

  return <StyledWalletButton disabled={authState === "siws_in_progress"} />
}
