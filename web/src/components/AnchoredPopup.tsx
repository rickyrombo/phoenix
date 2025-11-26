import {
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import styled from "styled-components"

interface AnchoredPopupProps {
  children: ReactNode
  isVisible: boolean
  anchorElement: HTMLElement | null
  placement?: "top" | "bottom" | "left" | "right"
  offset?: number
  className?: string
}

const PopupContainer = styled.div<{
  $top: number
  $left: number
  $isVisible: boolean
}>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
  transition: opacity 0.2s;
  z-index: 9999;
`

function calculateInitialPosition(
  anchorElement: HTMLElement | null,
  placement: "top" | "bottom" | "left" | "right",
  offset: number,
): { top: number; left: number } {
  if (!anchorElement) return { top: 0, left: 0 }

  const anchorRect = anchorElement.getBoundingClientRect()

  switch (placement) {
    case "top":
      return {
        top: anchorRect.top - offset,
        left: anchorRect.left + anchorRect.width / 2,
      }
    case "bottom":
      return {
        top: anchorRect.bottom + offset,
        left: anchorRect.left + anchorRect.width / 2,
      }
    case "left":
      return {
        top: anchorRect.top + anchorRect.height / 2,
        left: anchorRect.left - offset,
      }
    case "right":
      return {
        top: anchorRect.top + anchorRect.height / 2,
        left: anchorRect.right + offset,
      }
  }
}

export default function AnchoredPopup({
  children,
  isVisible,
  anchorElement,
  placement = "top",
  offset = 8,
  className,
}: AnchoredPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  const initialPosition = useMemo(
    () => calculateInitialPosition(anchorElement, placement, offset),
    [anchorElement, placement, offset],
  )

  const [position, setPosition] = useState(initialPosition)

  // Use layout effect to update position before paint
  useLayoutEffect(() => {
    if (!anchorElement || !popupRef.current || !isVisible) return

    const updatePosition = () => {
      if (!anchorElement || !popupRef.current) return

      const anchorRect = anchorElement.getBoundingClientRect()
      const popupRect = popupRef.current.getBoundingClientRect()

      let top = 0
      let left = 0

      switch (placement) {
        case "top":
          top = anchorRect.top - popupRect.height - offset
          left = anchorRect.left + anchorRect.width / 2 - popupRect.width / 2
          break
        case "bottom":
          top = anchorRect.bottom + offset
          left = anchorRect.left + anchorRect.width / 2 - popupRect.width / 2
          break
        case "left":
          top = anchorRect.top + anchorRect.height / 2 - popupRect.height / 2
          left = anchorRect.left - popupRect.width - offset
          break
        case "right":
          top = anchorRect.top + anchorRect.height / 2 - popupRect.height / 2
          left = anchorRect.right + offset
          break
      }

      // Keep popup within viewport bounds
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Adjust horizontal position
      if (left < 0) {
        left = 8
      } else if (left + popupRect.width > viewportWidth) {
        left = viewportWidth - popupRect.width - 8
      }

      // Adjust vertical position
      if (top < 0) {
        top = 8
      } else if (top + popupRect.height > viewportHeight) {
        top = viewportHeight - popupRect.height - 8
      }

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
  }, [anchorElement, isVisible, placement, offset])

  if (!isVisible || !anchorElement) return null

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
