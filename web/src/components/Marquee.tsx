import styled from "styled-components"
import { useEffect, useRef, useState } from "react"

const MarqueeWrapper = styled.div`
  overflow: hidden;
  position: relative;

  &:hover .marquee-mover {
    animation: marquee 5s linear infinite;
  }
`

const MarqueeMover = styled.div`
  display: inline-flex;
  min-width: 100%;
  white-space: nowrap;
`

const MarqueeInner = styled.div`
  display: inline-block;
  white-space: nowrap;
`

const MarqueeSeparator = styled.div`
  display: inline-block;
  padding: 0 1rem;
  color: #808080;
`

interface MarqueeProps {
  children: React.ReactNode
  separator?: string
}

export const Marquee = ({ children, separator = "•" }: MarqueeProps) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const separatorRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [needsMarquee, setNeedsMarquee] = useState<boolean | null>(null)
  const separatorWidthRef = useRef<number>(0)
  const [resizeKey, setResizeKey] = useState(0)

  // ResizeObserver to watch for size changes
  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      setResizeKey((prev) => prev + 1)
    })

    resizeObserver.observe(wrapperRef.current)
    resizeObserver.observe(contentRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (contentRef.current && wrapperRef.current) {
      // Cache separator width on first measurement
      if (needsMarquee === null && separatorRef.current) {
        separatorWidthRef.current = separatorRef.current.offsetWidth
      }

      const contentWidth = contentRef.current.offsetWidth
      const wrapperWidth = wrapperRef.current.offsetWidth
      const shouldMarquee = contentWidth > wrapperWidth

      setNeedsMarquee(shouldMarquee)

      if (shouldMarquee) {
        const separatorWidth = separatorWidthRef.current
        const totalSegmentWidth = contentWidth + separatorWidth

        const keyframes = `
          @keyframes marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-${totalSegmentWidth}px);
            }
          }
        `

        let styleSheet = document.getElementById(
          "marquee-styles",
        ) as HTMLStyleElement
        if (!styleSheet) {
          styleSheet = document.createElement("style")
          styleSheet.id = "marquee-styles"
          document.head.appendChild(styleSheet)
        }
        styleSheet.textContent = keyframes
      }
    }
  }, [children, needsMarquee, resizeKey])

  return (
    <MarqueeWrapper ref={wrapperRef}>
      <MarqueeMover className={needsMarquee ? "marquee-mover" : ""}>
        <MarqueeInner ref={contentRef}>{children}</MarqueeInner>
        {(needsMarquee === null || needsMarquee) && (
          <>
            <MarqueeSeparator ref={separatorRef}>{separator}</MarqueeSeparator>
            <MarqueeInner>{children}</MarqueeInner>
          </>
        )}
      </MarqueeMover>
    </MarqueeWrapper>
  )
}
