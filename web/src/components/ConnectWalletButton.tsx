import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import styled from "styled-components"
import { useAuth } from "../contexts/AuthContext"
import { useUser } from "../queries/useUser"
import { WithMirrors } from "./WithMirrors"
import { Flex } from "./core/Flex"
import { useRef, useState } from "react"
import Popup from "./core/Popup"
import { Button } from "./core/Button"

const Handle = styled.span`
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  color: var(--accent-color);

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
`

const PopupContainer = styled(Popup)`
  padding-top: 8px;
`

const PopupMenu = styled.ul`
  display: flex;
  flex-direction: column;
  background: #0f0f0f;
  border: 1px solid #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  z-index: 1200;
  min-width: 150px;
  border-radius: 6px;
`
const PopupMenuItem = styled.button`
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  padding: 0.6rem 0.75rem;
  color: #ffffff;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
  }
`

export default function ConnectWalletButton() {
  const { authState, userId, logout } = useAuth()

  const { data: user } = useUser(userId!, {
    enabled: userId !== null && authState === "authenticated",
  })

  const walletModal = useWalletModal()

  const [isPopupVisible, setIsPopupVisible] = useState(false)

  const avatarRef = useRef<HTMLImageElement>(null)

  const togglePopup = () => {
    setIsPopupVisible((prev) => !prev)
  }

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
              <Avatar
                ref={avatarRef}
                src={url}
                alt="User Avatar"
                onClick={togglePopup}
                onError={onError}
              />
            )}
          </WithMirrors>
          <PopupContainer
            isVisible={isPopupVisible}
            anchorRef={avatarRef}
            anchorOrigin="bottomRight"
            popupOrigin="topRight"
            onClickOutside={() => {
              setIsPopupVisible(false)
            }}
          >
            <PopupMenu>
              <PopupMenuItem>Profile</PopupMenuItem>
              <PopupMenuItem>Settings</PopupMenuItem>
              <PopupMenuItem
                onClick={() => {
                  setIsPopupVisible(false)
                  logout()
                }}
              >
                Logout
              </PopupMenuItem>
            </PopupMenu>
          </PopupContainer>
        </Flex>
      )
    }
  }

  return (
    <Button
      variant="primary"
      disabled={authState === "siws_in_progress"}
      onClick={() => walletModal.setVisible(true)}
    >
      Login
    </Button>
  )
}
