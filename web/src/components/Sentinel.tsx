import { useEffect, useRef } from "react"

type SentinelProps = {
  onIntersect: () => void
  options?: IntersectionObserverInit
}

export const Sentinel = ({ onIntersect, options }: SentinelProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const intersectObserverOptions = {
      root: null,
      rootMargin: "1000px",
      threshold: 0.01,
      ...options,
    }

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onIntersect()
        }
      })
    }

    const observer = new IntersectionObserver(
      handleIntersect,
      intersectObserverOptions,
    )

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [onIntersect, options])

  return <div ref={sentinelRef} style={{ height: "1px" }} />
}
