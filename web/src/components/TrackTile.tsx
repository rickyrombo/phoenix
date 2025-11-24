import styled from "styled-components"
import SocialButton from "./SocialButton"
import WaveformPlayer from "./WaveformPlayer"
import ActiveComments from "./ActiveComments"
import { usePlayer, useAudioTime } from "../contexts/PlayerContext"
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
import { WithMirrors } from "./WIthMirrors"

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
  overflow: hidden;
  will-change: max-height, opacity;
  animation: expandDetails 0.3s ease-out;
  max-height: 500px;

  @keyframes expandDetails {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 500px;
    }
  }
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

const OverflowBtn = styled.button`
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #fff;
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

const Spacer = styled.div<{ $isExpanded: boolean }>`
  flex: ${(props) => (props.$isExpanded ? "0" : "1")};
`

const CommentAvatarsContainer = styled.div`
  position: absolute;
  bottom: -12px;
  left: 0;
  right: 0;
  height: 24px;
  pointer-events: none;
`

const CommentMarker = styled.div`
  position: absolute;
  top: 0;
  height: 100%;
  width: 2px;
  background: transparent;
  cursor: pointer;
  z-index: 10;
  pointer-events: auto;

  &:hover .comment-tooltip {
    opacity: 1;
  }
`

const CommentIndicator = styled.img`
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  object-fit: cover;
  box-shadow: 0 0 8px oklch(71.4% 0.203 305.504 / 0.6);
`

const CommentTooltip = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  background: #0a0a0a;
  border: 1px solid oklch(71.4% 0.203 305.504);
  padding: 0.5rem 0.75rem;
  border-radius: 0;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
`

const CommentUser = styled.span`
  display: block;
  color: oklch(71.4% 0.203 305.504);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const CommentText = styled.span`
  display: block;
  color: #b0b0b0;
  font-size: 0.875rem;
`

const CommentInputSection = styled.div`
  display: flex;
  align-items: center;
  margin: 1rem 0;
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
  flex-wrap: wrap;
`

const FooterStats = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.75rem;
  color: #808080;
  letter-spacing: 0.5px;
  font-weight: 500;
  flex-wrap: wrap;
`

const FooterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`

export interface Comment {
  user: string
  text: string
  position: number
  avatar: string
}

interface TrackTileProps {
  track: Track
  context?: ReactNode
  onPlayToggle?: () => void
}

export default function TrackTile({
  track,
  context,
  onPlayToggle: onPlayToggle,
}: TrackTileProps) {
  const { track: currentTrack, isPlaying, duration } = usePlayer()
  const currentTime = useAudioTime()
  const { data: user } = useUser(track.owner_id)
  const queue = usePlayQueue()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const { data: comments } = useTrackComments(track.track_id)

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

  const handleCommentInputFocus = () => {
    if (duration > 0) {
      const position = (currentTime / duration) * 100
      setDraftCommentPosition(position)
    }
  }

  const handleCommentInputBlur = () => {
    setDraftCommentPosition(null)
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
      ) : null}
      <TrackContent $isExpanded={isPlaying && isActive}>
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
            isPlaying={isPlaying && isActive}
            onPlayPause={handlePlayToggle}
            trackId={track.track_id}
          />
          <CommentAvatarsContainer>
            {comments?.map((comment, i) => (
              <CommentMarker
                key={comment.comment_id}
                style={{
                  left: `${Math.min(Math.max(comment.timestamp ?? 0, i + 1) / track.duration, 1) * 100}%`,
                }}
              >
                <CommentIndicator
                  src={comment.user_profile_picture}
                  alt={comment.user_name}
                />
                <CommentTooltip className="comment-tooltip" $isVisible={false}>
                  <CommentUser>{comment.user_name}</CommentUser>
                  <CommentText>{comment.content}</CommentText>
                </CommentTooltip>
              </CommentMarker>
            ))}
            {draftCommentPosition !== null && (
              <CommentMarker style={{ left: `${draftCommentPosition}%` }}>
                <CommentIndicator
                  src="https://picsum.photos/seed/currentuser/100"
                  alt="Your comment"
                />
              </CommentMarker>
            )}
          </CommentAvatarsContainer>
        </WaveformWrapper>
        {comments ? (
          <ActiveComments
            comments={comments}
            trackId={track.track_id}
            duration={duration}
          />
        ) : null}
        {isPlaying && isActive && (
          <CommentInputSection>
            <CommentUserAvatar
              src="https://picsum.photos/seed/currentuser/100"
              alt="You"
            />
            <CommentInput
              type="text"
              placeholder="Add a comment..."
              onFocus={handleCommentInputFocus}
              onBlur={handleCommentInputBlur}
            />
            <CommentSubmit title="Send comment">
              <IconSend2 size={16} stroke={2} />
            </CommentSubmit>
          </CommentInputSection>
        )}
        <Spacer $isExpanded={isPlaying && isActive} />
        <TrackFooter>
          <FooterLeft>
            <ButtonGroup>
              <SocialButton
                icon={<IconHeart size={16} stroke={2} />}
                label="Favorite"
                title="Favorite"
                expanded={isPlaying && isActive}
                count={track.save_count}
              />
              <SocialButton
                icon={<IconRepeat size={16} stroke={2} />}
                label="Repost"
                title="Repost"
                expanded={isPlaying && isActive}
                count={track.repost_count}
              />
              <SocialButton
                icon={<IconShare3 size={16} stroke={2} />}
                label="Share"
                title="Share"
                expanded={isPlaying && isActive}
              />
              <SocialButton
                icon={<IconDownload size={16} stroke={2} />}
                label="Download"
                title="Download"
                expanded={isPlaying && isActive}
              />
              <OverflowContainer>
                <OverflowBtn
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((v) => !v)
                  }}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  title="More"
                >
                  <IconDots size={18} stroke={2} />
                </OverflowBtn>
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
      {isPlaying && isActive && (
        <TrackDetails>
          {track.description ? (
            <TrackDescription>
              <DetailsHeading>DESCRIPTION</DetailsHeading>
              <p>{track.description}</p>
            </TrackDescription>
          ) : null}
        </TrackDetails>
      )}
    </Tile>
  )
}
