import React from "react"
import styled from "styled-components"
import type { Track } from "./TrackTile"

const Popup = styled.div`
  position: fixed;
  right: 2rem;
  bottom: 110px;
  width: 320px;
  max-height: 360px;
  background: #0f0f0f;
  border: 1px solid #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  overflow: auto;
  z-index: 1200;
  padding: 0.5rem;
  border-radius: 6px;
`

const Header = styled.div`
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #1a1a1a;
  margin-bottom: 0.25rem;
  color: #eee;
  font-family:
    "Fugaz One", "Kode Mono", ui-monospace, "Cascadia Code", "Source Code Pro",
    Menlo, Consolas, monospace;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.875rem;
`

const Item = styled.div<{ $active?: boolean }>`
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  align-items: center;
  cursor: pointer;
  background: ${(p) => (p.$active ? "rgb(20 20 24)" : "transparent")};
  &:hover {
    background: rgb(18 18 22);
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
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

type Queue = {
  tracks: Track[]
  currentIndex?: number
}

export default function QueuePopup({
  queue,
  onSelect,
}: {
  queue: Queue
  onSelect: (index: number) => void
}) {
  if (!queue || !queue.tracks) return null

  return (
    <Popup>
      <Header>Queue</Header>
      {queue.tracks.map((t, idx) => (
        <Item
          key={t.id ?? idx}
          $active={queue.currentIndex === idx}
          onClick={() => onSelect(idx)}
        >
          <Thumb src={t.coverArt} alt={t.title} />
          <Meta>
            <Title>{t.title}</Title>
            <Artist>{t.artist}</Artist>
          </Meta>
        </Item>
      ))}
    </Popup>
  )
}
