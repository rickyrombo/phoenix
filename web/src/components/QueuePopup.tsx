import { useRef, useState, type DragEvent } from "react"
import styled from "styled-components"
import { useTrack } from "../queries/useTrack"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import { usePlayer } from "../contexts/PlayerContext"
import { IconGripVertical, IconX } from "@tabler/icons-react"
import useUser from "../queries/useUser"
import { WithMirrors } from "./WithMirrors"

const Popup = styled.div`
  width: 360px;
  max-height: 480px;
  background: #0f0f0f;
  border: 1px solid #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  overflow: auto;
  z-index: 1200;
  border-radius: 6px;

  position: fixed;
  right: 16px;
  bottom: 80px;
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

const Item = styled.div<{ $active?: boolean; $isOver?: boolean }>`
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  align-items: center;
  cursor: pointer;
  background: ${(p) => (p.$active ? "rgb(34 34 40)" : "transparent")};
  color: ${(p) => (p.$active ? "#ffffff" : "inherit")};
  box-shadow: ${(p) =>
    p.$active ? "inset 0 0 0 1px rgba(111,111,255,0.03)" : "none"};
  border-top: ${(p) => (p.$isOver ? "2px solid var(--accent-color)" : "none")};

  &:hover {
    background: rgb(30 30 36);
    color: #ffffff;
  }

  .drag-handle {
    opacity: 0;
    transition: opacity 0.12s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-right: 0.25rem;
    flex: 0;
    cursor: grab;
  }

  .remove-btn {
    opacity: 0;
    transition: opacity 0.12s ease;
    margin-left: auto;
    background: transparent;
    border: none;
    color: #bbb;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover .drag-handle {
    opacity: 1;
  }

  &:hover .remove-btn {
    opacity: 1;
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
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  isOver,
}: {
  trackId: number
  isActive: boolean
  onClick: () => void
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void
  onRemove?: () => void
  isOver?: boolean
}) => {
  const { data: track } = useTrack(trackId)
  const { data: user } = useUser(track?.owner_id ?? 0, {
    enabled: !!track?.owner_id,
  })
  if (!track) return null
  return (
    <Item
      $active={isActive}
      $isOver={isOver}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div
        className="drag-handle"
        title={isActive ? "Currently playing" : "Drag to reorder"}
      >
        <IconGripVertical size={16} stroke={1.5} />
      </div>
      {track.cover_art ? (
        <WithMirrors
          url={track.cover_art?.small}
          mirrors={track.cover_art?.mirrors}
        >
          {(url, onError) => (
            <Thumb src={url} alt={track.title} onError={onError} />
          )}
        </WithMirrors>
      ) : null}
      <Meta>
        <Title>{track.title}</Title>
        <Artist>{user?.name}</Artist>
      </Meta>
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation()
          onRemove?.()
        }}
        aria-label="Remove from queue"
        title="Remove"
      >
        <IconX size={16} stroke={2} />
      </button>
    </Item>
  )
}

export default function QueuePopup() {
  const { play } = usePlayer()
  const queue = usePlayQueue()
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  if (!queue || queue.items.length === 0) return null

  return (
    <Popup ref={popupRef} style={{}} role="dialog" aria-label="play-queue">
      <Header>Queue</Header>
      <Items>
        {queue.items.map((t, idx) => (
          <QueueItem
            key={t.cursor}
            trackId={t.trackId}
            isActive={queue.index === idx}
            isOver={dragOverIndex === idx}
            onDragStart={(e) => {
              setDragIndex(idx)
              e.dataTransfer.effectAllowed = "move"
              try {
                e.dataTransfer.setData("text/plain", String(idx))
              } catch {
                /* ignore - some browsers may disallow setData in dragstart */
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverIndex(idx)
              e.dataTransfer.dropEffect = "move"
            }}
            onDrop={(e) => {
              e.preventDefault()
              const from =
                dragIndex ?? Number(e.dataTransfer.getData("text/plain"))
              const to = idx
              if (from !== null && from !== to) {
                queue.move(from, to)
              }
              setDragIndex(null)
              setDragOverIndex(null)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              setDragOverIndex(null)
            }}
            onRemove={() => {
              queue.remove(idx)
            }}
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
