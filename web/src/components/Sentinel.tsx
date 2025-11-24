import { useEffect, useRef } from "react"

type SentinelProps = {
  onIntersect: () => void
}

export const Sentinel = ({ onIntersect }: SentinelProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const options = {
      root: null,
      rootMargin: "500px",
      threshold: 0.01,
    }

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onIntersect()
        }
      })
    }

    const observer = new IntersectionObserver(handleIntersect, options)

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [onIntersect])
  return <div ref={sentinelRef} style={{ height: "1px" }} />
}
