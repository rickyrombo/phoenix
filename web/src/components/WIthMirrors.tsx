import { useCallback, useEffect, useState, type ReactNode } from "react"

type WithMirrorsProps = {
  url: string
  mirrors: string[]
  children: (url: string, onError: () => void) => ReactNode
}

export const WithMirrors = ({ url, mirrors, children }: WithMirrorsProps) => {
  const [currentUrl, setCurrentUrl] = useState(url)
  const [currentMirrorIndex, setCurrentMirrorIndex] = useState(0)
  const onError = useCallback(() => {
    if (currentMirrorIndex < mirrors.length) {
      const newMirror = new URL(mirrors[currentMirrorIndex])
      const u = new URL(url)
      u.hostname = newMirror.hostname
      setCurrentUrl(u.toString())
      setCurrentMirrorIndex(currentMirrorIndex + 1)
      console.warn(
        `Mirror failed for url ${url} at index ${currentMirrorIndex}, trying next mirror ${u.toString()}`,
      )
    } else {
      console.error("All mirrors failed for url", url)
    }
  }, [currentMirrorIndex, mirrors, url])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUrl(url)
    setCurrentMirrorIndex(0)
  }, [url])

  return children(currentUrl, onError)
}
