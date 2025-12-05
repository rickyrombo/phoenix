import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import styled from "styled-components"

type Origin =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "middleLeft"
  | "middleCenter"
  | "middleRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight"

interface AnchoredPopupProps {
  children: ReactNode
  isVisible: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  anchorOrigin?: Origin
  popupOrigin?: Origin
  offset?: number
  onClickOutside?: (event: MouseEvent) => void
  className?: string
}

interface ContainerProps {
  $top: number
  $left: number
  $isVisible: boolean
}

const PopupContainer = styled.div<ContainerProps>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
  transition: opacity 0.2s;
  z-index: 9999;
`

function calculateOriginOffsets(
  rect: DOMRect,
  origin: Origin,
): { x: number; y: number } {
  let x: number
  let y: number

  switch (origin) {
    case "topLeft":
      x = 0
      y = 0
      break
    case "topCenter":
      x = rect.width / 2
      y = 0
      break
    case "topRight":
      x = rect.width
      y = 0
      break
    case "middleLeft":
      x = 0
      y = rect.height / 2
      break
    case "middleCenter":
      x = rect.width / 2
      y = rect.height / 2
      break
    case "middleRight":
      x = rect.width
      y = rect.height / 2
      break
    case "bottomLeft":
      x = 0
      y = rect.height
      break
    case "bottomCenter":
      x = rect.width / 2
      y = rect.height
      break
    case "bottomRight":
      x = rect.width
      y = rect.height
      break
  }

  return { x, y }
}
function calculatePosition(
  popupRef: React.RefObject<HTMLElement | null>,
  popupOrigin: Origin,
  anchorRef: React.RefObject<HTMLElement | null>,
  anchorOrigin: Origin,
): { top: number; left: number } {
  if (!popupRef.current || !anchorRef.current) {
    return { top: 0, left: 0 }
  }
  const popup = popupRef.current.getBoundingClientRect()
  const anchor = anchorRef.current.getBoundingClientRect()

  const popupOffsets = calculateOriginOffsets(popup, popupOrigin)
  const anchorOffsets = calculateOriginOffsets(anchor, anchorOrigin)

  let left = anchor.left + anchorOffsets.x - popupOffsets.x
  let top = anchor.top + anchorOffsets.y - popupOffsets.y

  // Keep popup within viewport bounds
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth

  // Adjust horizontal position
  if (left < 0) {
    left = 8
  } else if (left + popup.width > viewportWidth) {
    left = viewportWidth - popup.width - 8 - scrollbarWidth
  }

  // Adjust vertical position
  if (top < 0) {
    top = 8
  } else if (top + popup.height > viewportHeight) {
    top = viewportHeight - popup.height - 8
  }

  return { top, left }
}

const useClickOutside = (
  refs: React.RefObject<HTMLElement | null>[],
  handler: (event: MouseEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      for (const ref of refs) {
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return
        }
      }
      handler(event)
    }

    document.addEventListener("mousedown", listener)
    return () => {
      document.removeEventListener("mousedown", listener)
    }
  }, [refs, handler])
}

export default function Popup({
  children,
  isVisible,
  anchorRef,
  anchorOrigin = "topLeft",
  popupOrigin = "topLeft",
  onClickOutside = () => {},
  className,
}: AnchoredPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useClickOutside([popupRef, anchorRef], onClickOutside)

  // Use layout effect to update position before paint
  useLayoutEffect(() => {
    if (!isVisible) return

    const updatePosition = () => {
      if (!anchorRef || !popupRef.current) return

      const { top, left } = calculatePosition(
        popupRef,
        popupOrigin,
        anchorRef,
        anchorOrigin,
      )

      setPosition({ top, left })
    }

    // Update position immediately
    updatePosition()

    // Update position on scroll and resize
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)

    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [anchorRef, isVisible, popupOrigin, anchorOrigin])

  if (!isVisible || !anchorRef) return null

  return createPortal(
    <PopupContainer
      ref={popupRef}
      $top={position.top}
      $left={position.left}
      $isVisible={isVisible}
      className={className}
    >
      {children}
    </PopupContainer>,
    document.body,
  )
}
