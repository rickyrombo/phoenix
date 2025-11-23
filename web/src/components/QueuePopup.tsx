import { useRef } from "react"
import styled from "styled-components"
import { useTrack } from "../queries/useTrack"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import { usePlayer } from "../contexts/PlayerContext"

const Popup = styled.div`
  width: 320px;
  max-height: 360px;
  background: #0f0f0f;
  border: 1px solid #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  overflow: auto;
  z-index: 1200;
  border-radius: 6px;
`

const Header = styled.div`
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #1a1a1a;
  /* Make header stick to top of the scrollable popup */
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0f0f0f;
  margin-bottom: 0.25rem;
  color: #eee;
  font-family:
    "Fugaz One", "Kode Mono", ui-monospace, "Cascadia Code", "Source Code Pro",
    Menlo, Consolas, monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.875rem;
`

const Items = styled.div`
  padding: 0.5rem 0;
`

const Item = styled.div<{ $active?: boolean }>`
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  align-items: center;
  cursor: pointer;
  background: ${(p) => (p.$active ? "rgb(34 34 40)" : "transparent")};
  color: ${(p) => (p.$active ? "#ffffff" : "inherit")};
  box-shadow: ${(p) =>
    p.$active ? "inset 0 0 0 1px rgba(111,111,255,0.03)" : "none"};

  &:hover {
    background: rgb(30 30 36);
    color: #ffffff;
  }
`

const Thumb = styled.img`
  width: 44px;
  height: 44px;
  object-fit: cover;
`

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const Title = styled.div`
  font-size: 0.9rem;
  font-family:
    "Kode Mono", ui-monospace, "Cascadia Code", "Source Code Pro", Menlo,
    Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Artist = styled.div`
  font-size: 0.75rem;
  color: inherit;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const QueueItem = ({
  trackId,
  isActive,
  onClick,
}: {
  trackId: number
  isActive: boolean
  onClick: () => void
}) => {
  const { data: track } = useTrack(trackId)
  if (!track) return null
  return (
    <Item $active={isActive} onClick={onClick}>
      <Thumb src={track.cover_art?.medium} alt={track.title} />
      <Meta>
        <Title>{track.title}</Title>
        <Artist>{track.owner_id}</Artist>
      </Meta>
    </Item>
  )
}

export default function QueuePopup() {
  const { play } = usePlayer()
  const queue = usePlayQueue()
  const popupRef = useRef<HTMLDivElement | null>(null)

  console.log("QueuePopup render", { queue })

  if (!queue || queue.items.length === 0) return null

  return (
    <Popup
      ref={popupRef}
      style={{
        position: "fixed",
        right: 16,
        bottom: 110,
      }}
      role="dialog"
      aria-label="play-queue"
    >
      <Header>Queue</Header>
      <Items>
        {queue.items.map((t, idx) => (
          <QueueItem
            key={t.cursor}
            trackId={t.trackId}
            isActive={queue.index === idx}
            onClick={() => {
              queue.set(idx)
              play()
            }}
          />
        ))}
      </Items>
    </Popup>
  )
}
