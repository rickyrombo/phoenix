import styled from "styled-components"
import SocialActionButton from "./SocialButton"
import WaveformPlayer from "./WaveformPlayer"
import ActiveComments from "./ActiveComments"
import TimestampedComments from "./TimestampedComments"
import { usePlayer } from "../contexts/PlayerContext"
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconHeart,
  IconRepeat,
  IconShare3,
  IconDownload,
  IconMessage,
  IconSend2,
  IconDots,
} from "@tabler/icons-react"
import { useState, useRef, useEffect, type ReactNode } from "react"
import type { Track } from "../queries/useTrack"
import useUser from "../queries/useUser"
import { usePlayQueue } from "../contexts/PlayQueueContext"
import dayjs from "dayjs"
import useTrackComments from "../queries/useTrackComments"
import { WithMirrors } from "./WithMirrors"
import Linkify from "linkify-react"
import { GhostButton } from "./core/Button"
import { useSaveTrack } from "../queries/useSaveTrack"
import { useUnsaveTrack } from "../queries/useUnsaveTrack"

const Tile = styled.div<{ $isActive: boolean }>`
  background: transparent;
  border: none;
  border-bottom: 1px solid #333333;
  border-radius: 0;
  padding: 1rem 0 1.5rem 0;
  display: grid;
  grid-template-columns: 180px 1fr;
  grid-template-rows: auto auto auto;
  gap: 0;
  transition: all 0.2s;
  position: relative;

  ${(props) =>
    props.$isActive &&
    `
    border-bottom-color: oklch(71.4% 0.203 305.504);
    background: transparent;
    box-shadow: none;
  `}

  ${(props) =>
    props.$isActive &&
    `
    .waveform-bar {
      background: oklch(71.4% 0.203 305.504);
    }
  `}
`

const CoverArt = styled.img`
  grid-column: 1;
  grid-row: 2 / 3;
  width: 180px;
  height: 180px;
  object-fit: cover;
  border: none;
  border-right: 1px solid #1a1a1a;
`

const TrackContent = styled.div<{ $isExpanded: boolean }>`
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  padding: 0 0 0 1rem;
  min-width: 0;
  gap: 0.25rem;
  min-height: ${(props) => (props.$isExpanded ? "auto" : "180px")};
  justify-content: space-between;
  box-sizing: border-box;
  transition: all 0.3s ease-out;
`

const TrackDetails = styled.div`
  grid-column: 2;
  grid-row: 3;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem 1rem 1rem;
`

const TrackHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`

const TrackMainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1;
`

const TrackInfo = styled.div`
  min-width: 0;
  flex: 1;
`

const TrackTitle = styled.h3`
  font-family: "Fugaz One", sans-serif;
  font-size: 1.125rem;
  margin: 0 0 0.25rem 0;
  font-weight: 700;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TrackArtist = styled.p`
  font-size: 0.875rem;
  color: #b0b0b0;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TrackStats = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  font-size: 0.75rem;
  color: #808080;
  letter-spacing: 0.5px;
  font-weight: 500;
  white-space: nowrap;
`

const StatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const PlayBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid oklch(71.4% 0.203 305.504);
  color: oklch(71.4% 0.203 305.504);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background: oklch(71.4% 0.203 305.504);
    color: #000000;
    box-shadow: 0 0 15px oklch(71.4% 0.203 305.504 / 0.5);
  }
`

const OverflowMenu = styled.div`
  position: absolute;
  right: 0.5rem;
  top: 2.5rem;
  background: #0f0f0f;
  border: 1px solid #222;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  z-index: 1300;
  min-width: 160px;
  border-radius: 6px;
  overflow: hidden;
`

const OverflowMenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: none;
  color: #ddd;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
  }
`

const OverflowContainer = styled.div`
  position: relative;
`

const WaveformWrapper = styled.div`
  position: relative;
  padding: 0;
  cursor: pointer;
  height: 80px;
  margin-bottom: 12px;
`

const CommentInputSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
  position: relative;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const CommentUserAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const CommentInput = styled.input`
  flex: 1;
  background: transparent;
  border: 1px solid #333333;
  border-radius: 0;
  padding: 0.625rem 3.5rem 0.625rem 1rem;
  color: #ffffff;
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: oklch(71.4% 0.203 305.504);
  }

  &::placeholder {
    color: #606060;
  }
`

const CommentSubmit = styled.button`
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: oklch(71.4% 0.203 305.504);
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #ffffff;
    transform: translateX(2px);
  }
`

const DetailsHeading = styled.h4`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: oklch(71.4% 0.203 305.504);
  margin: 0 0 0.75rem 0;
`

const TrackDescription = styled.div`
  p {
    font-size: 0.875rem;
    line-height: 1.6;
    color: #b0b0b0;
    margin: 0;
    white-space: pre-wrap;
  }

  a {
    color: oklch(71.4% 0.203 305.504);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`

const TrackFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`

const TrackGenreRow = styled.div`
  display: inline-block;
  font-size: 0.75rem;
  color: #e6e6e6;
  letter-spacing: 0.4px;
  font-weight: 600;
  text-transform: none;
  align-self: flex-end;
  text-align: right;
  background: #141414;
  border: 1px solid #252525;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
`

const StatsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
`

const TrackHost = styled.p`
  font-size: 0.75rem;
  color: #606060;
  margin: 0;
  font-style: italic;
  flex: 0 0 auto;
  white-space: nowrap;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`

const FooterStats = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.75rem;
  color: #808080;
  letter-spacing: 0.5px;
  font-weight: 500;
`

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

interface TrackTileProps {
  track: Track
  context?: ReactNode
  onPlayToggle?: () => void
}

// Separate component to isolate time subscription
function CommentInputBox({
  isActive,
  onDraftPositionChange,
}: {
  isActive: boolean
  onDraftPositionChange: (position: number | null) => void
}) {
  const { duration, getAudio } = usePlayer()

  const handleFocus = () => {
    const audio = getAudio()
    if (audio && duration > 0) {
      const position = (audio.currentTime / duration) * 100
      onDraftPositionChange(position)
    }
  }

  const handleBlur = () => {
    onDraftPositionChange(null)
  }

  if (!isActive) return null

  return (
    <CommentInputSection>
      <CommentUserAvatar
        src="https://picsum.photos/seed/currentuser/100"
        alt="You"
      />
      <CommentInput
        type="text"
        placeholder="Add a comment..."
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <CommentSubmit title="Send comment">
        <IconSend2 size={16} stroke={2} />
      </CommentSubmit>
    </CommentInputSection>
  )
}

function TrackTile({
  track,
  context,
  onPlayToggle: onPlayToggle,
}: TrackTileProps) {
  const { track: currentTrack, isPlaying } = usePlayer()
  const { data: user } = useUser(track.owner_id)
  const queue = usePlayQueue()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const { data: comments } = useTrackComments(track.track_id)
  const { mutate: saveTrack } = useSaveTrack()
  const { mutate: unsaveTrack } = useUnsaveTrack()

  const handleSaveClicked = () => {
    if (track.is_saved) {
      unsaveTrack(track.track_id)
    } else {
      saveTrack(track.track_id)
    }
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [menuOpen])

  const isActive = currentTrack?.track_id === track.track_id
  const [draftCommentPosition, setDraftCommentPosition] = useState<
    number | null
  >(null)

  const handlePlayToggle = () => {
    onPlayToggle?.()
  }
  return (
    <Tile $isActive={isActive}>
      {context}
      {track.cover_art ? (
        <WithMirrors
          url={track.cover_art.medium}
          mirrors={track.cover_art.mirrors}
        >
          {(url, onError) => (
            <CoverArt src={url} alt={track.title} onError={onError} />
          )}
        </WithMirrors>
      ) : user?.profile_picture ? (
        <WithMirrors
          url={user.profile_picture.medium}
          mirrors={user.profile_picture.mirrors}
        >
          {(url, onError) => (
            <CoverArt src={url} alt={user.name} onError={onError} />
          )}
        </WithMirrors>
      ) : null}
      <TrackContent $isExpanded={isActive}>
        <TrackHeader>
          <TrackMainInfo>
            <PlayBtn
              onClick={(e) => {
                e.stopPropagation()
                handlePlayToggle()
              }}
            >
              {isPlaying && isActive ? (
                <IconPlayerPause size={18} stroke={2} />
              ) : (
                <IconPlayerPlay size={18} stroke={2} />
              )}
            </PlayBtn>
            <TrackInfo>
              <TrackTitle>{track.title}</TrackTitle>
              <TrackArtist>{user?.name}</TrackArtist>
            </TrackInfo>
          </TrackMainInfo>
          <StatsColumn>
            {track.genre && <TrackGenreRow>{track.genre}</TrackGenreRow>}
            <TrackStats>
              <StatItem>{track.musical_key}</StatItem>
              <StatItem>
                {track.bpm ? Math.round(track.bpm) + " bpm" : null}
              </StatItem>
              <StatItem>
                {dayjs.duration(track.duration, "seconds").format("m:ss")}
              </StatItem>
            </TrackStats>
          </StatsColumn>
        </TrackHeader>
        <WaveformWrapper>
          <WaveformPlayer
            onPlayPause={handlePlayToggle}
            trackId={track.track_id}
          />
          <TimestampedComments
            comments={comments}
            trackDuration={track.duration}
            draftCommentPosition={draftCommentPosition}
          />
        </WaveformWrapper>
        {comments && isActive ? (
          <ActiveComments comments={comments} trackId={track.track_id} />
        ) : null}
        <CommentInputBox
          isActive={isActive}
          onDraftPositionChange={setDraftCommentPosition}
        />
        <TrackFooter>
          <FooterLeft>
            <ButtonGroup>
              <SocialActionButton
                icon={
                  <IconHeart
                    size={16}
                    stroke={2}
                    fill={track.is_saved ? "currentColor" : "none"}
                  />
                }
                label="Favorite"
                title={
                  track.is_saved ? "Remove from favorites" : "Add to favorites"
                }
                expanded={isActive}
                count={track.save_count}
                isOn={track.is_saved}
                onClick={handleSaveClicked}
              />
              <SocialActionButton
                icon={<IconRepeat size={16} stroke={2} />}
                label="Repost"
                title="Repost"
                expanded={isActive}
                count={track.repost_count}
              />
              <SocialActionButton
                icon={<IconShare3 size={16} stroke={2} />}
                label="Share"
                title="Share"
                expanded={isActive}
              />
              <SocialActionButton
                icon={<IconDownload size={16} stroke={2} />}
                label="Download"
                title="Download"
                expanded={isActive}
              />
              <OverflowContainer>
                <GhostButton
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((v) => !v)
                  }}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  title="More"
                >
                  <IconDots size={18} stroke={2} />
                </GhostButton>
                {menuOpen && (
                  <OverflowMenu ref={menuRef}>
                    <OverflowMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        queue.add({
                          cursor: `track:${track.track_id}:${Date.now()}`,
                          trackId: track.track_id,
                          manuallyAdded: true,
                        })
                        setMenuOpen(false)
                      }}
                    >
                      Add to Queue
                    </OverflowMenuItem>
                  </OverflowMenu>
                )}
              </OverflowContainer>
            </ButtonGroup>
            <FooterStats>
              <StatItem>
                <IconPlayerPlay size={12} stroke={2} /> {track.play_count}
              </StatItem>
              <StatItem>
                <IconMessage size={12} stroke={2} /> {track.comment_count}
              </StatItem>
            </FooterStats>
          </FooterLeft>
          <TrackHost>served by {new URL(track.stream.url).host}</TrackHost>
        </TrackFooter>
      </TrackContent>
      {isActive && (
        <TrackDetails>
          {track.description ? (
            <TrackDescription>
              <DetailsHeading>DESCRIPTION</DetailsHeading>
              <p>
                <Linkify
                  options={{ target: "_blank", rel: "noopener noreferrer" }}
                >
                  {track.description}
                </Linkify>
              </p>
            </TrackDescription>
          ) : null}
        </TrackDetails>
      )}
    </Tile>
  )
}

// React Compiler handles memoization automatically
export default TrackTile
