import styled from 'styled-components'
import SocialButton from './SocialButton'
import WaveformPlayer from './WaveformPlayer'
import { usePlayer } from '../contexts/PlayerContext'
import { useState, useEffect, useRef } from 'react'

const ContextLine = styled.div`
  grid-column: 1 / 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: #808080;
  margin-bottom: 1rem;
  padding: 0;
`

const ContextLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const ContextTime = styled.span`
  color: #606060;
`

const ContextAvatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
`

const ContextIcon = styled.span`
  font-size: 0.875rem;
  opacity: 0.8;
`

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

  &:last-child {
    border-bottom: none;
  }

  ${props => props.$isActive && `
    border-bottom-color: oklch(71.4% 0.203 305.504);
    background: transparent;
    box-shadow: none;
  `}

  ${props => props.$isActive && `
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
  padding: 0 1rem;
  min-width: 0;
  gap: 0.25rem;
  height: ${props => props.$isExpanded ? 'auto' : '180px'};
  justify-content: flex-start;
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
  font-family: 'Fugaz One', sans-serif;
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

const WaveformWrapper = styled.div`
  position: relative;
  padding: 0;
  cursor: pointer;
  height: 85px;
  margin-bottom: 8px;
`

const Spacer = styled.div<{ $isExpanded: boolean }>`
  flex: ${props => props.$isExpanded ? '0' : '1'};
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

const ActiveCommentWrapper = styled.div`
  position: relative;
  min-height: 80px;
  margin-top: 0.5rem;
  border-top: 1px solid #1a1a1a;
`

const ActiveCommentDisplay = styled.div<{ $fadingOut: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  opacity: ${props => props.$fadingOut ? 0 : 1};
  transition: opacity 0.4s ease-in-out;
  animation: fadeIn 0.4s ease-in-out;
  pointer-events: ${props => props.$fadingOut ? 'none' : 'auto'};
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ActiveCommentAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid oklch(71.4% 0.203 305.504);
`

const ActiveCommentContent = styled.div`
  flex: 1;
  min-width: 0;
`

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`

const CommentTimestamp = styled.a`
  color: #606060;
  font-size: 0.75rem;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: oklch(71.4% 0.203 305.504);
    text-decoration: underline;
  }
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
  font-family: 'Kode Mono', monospace;
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
`

const TrackHost = styled.p`
  font-size: 0.75rem;
  color: #606060;
  margin: 0;
  font-style: italic;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`

export interface Comment {
  user: string
  text: string
  position: number
  avatar: string
}

export interface Track {
  id: number
  title: string
  artist: string
  duration: string
  plays: string
  coverArt: string
  host: string
  description: string
  comments: Comment[]
  waveform: number[]
  audioUrl?: string
  audioData?: Float32Array
  likes?: number
  reposts?: number
  contextType?: 'repost' | 'new'
  contextUser?: string
  contextUserAvatar?: string
  contextTime?: string
}

interface TrackTileProps {
  track: Track
}

interface ActiveComment {
  commentIndex: number
  id: number
  fadingOut: boolean
}

export default function TrackTile({ track }: TrackTileProps) {
  const { currentTrack, isPlaying, setCurrentTrack, togglePlay, currentTime, duration, seek } = usePlayer()
  const isActive = currentTrack?.id === track.id
  const [activeComments, setActiveComments] = useState<ActiveComment[]>([])
  const nextCommentIdRef = useRef(0)
  const lastShownCommentRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    if (!isActive || !isPlaying || duration === 0) return

    const currentProgress = (currentTime / duration) * 100
    
    // Find if we just passed a comment timestamp
    track.comments.forEach((comment, index) => {
      const isAtPosition = currentProgress >= comment.position && currentProgress < comment.position + 0.5
      
      // Check if this comment is already being shown
      const alreadyActive = activeComments.some(ac => ac.commentIndex === index && !ac.fadingOut)
      
      if (isAtPosition && !alreadyActive) {
        const lastShown = lastShownCommentRef.current.get(index) || 0
        const now = Date.now()
        
        // Prevent showing the same comment too quickly (at least 4 seconds between shows)
        if (now - lastShown < 4000) {
          return
        }
        
        lastShownCommentRef.current.set(index, now)
        
        // Fade out all existing comments
        setActiveComments(prev => prev.map(c => ({ ...c, fadingOut: true })))
        
        // Remove faded comments after transition completes
        setTimeout(() => {
          setActiveComments(prev => prev.filter(c => !c.fadingOut))
        }, 400)
        
        // Add new comment to the stack
        const commentId = nextCommentIdRef.current++
        const newComment: ActiveComment = {
          commentIndex: index,
          id: commentId,
          fadingOut: false
        }
        
        setTimeout(() => {
          setActiveComments(prev => [...prev, newComment])
        }, 50)
        
        // Start fade-out after 10 seconds
        setTimeout(() => {
          setActiveComments(prev => prev.map(c => 
            c.id === commentId ? { ...c, fadingOut: true } : c
          ))
          
          // Remove completely after fade-out completes
          setTimeout(() => {
            setActiveComments(prev => prev.filter(c => c.id !== commentId))
          }, 400)
        }, 10000)
      }
    })
  }, [isActive, isPlaying, currentTime, duration, track.comments, activeComments])
  
  const getContextText = () => {
    const action = track.contextType === 'repost' ? 'reposted' : 'uploaded'
    return `${track.contextUser} ${action}`
  }

  const handlePlayToggle = () => {
    if (isActive) {
      togglePlay()
    } else {
      setCurrentTrack(track)
      // Always start playing when switching to a new track
      if (!isPlaying) {
        togglePlay()
      }
    }
  }

  return (
    <Tile 
      $isActive={isActive}
    >
      {track.contextType && track.contextUser && (
        <ContextLine>
          {track.contextType === 'repost' ? (
            <>
              <ContextLeft>
                <ContextIcon>↻</ContextIcon>
                <ContextAvatar src={track.contextUserAvatar} alt={track.contextUser} />
                <span>{getContextText()}</span>
              </ContextLeft>
              <ContextTime>{track.contextTime}</ContextTime>
            </>
          ) : (
            <>
              <div></div>
              <ContextTime>{track.contextTime}</ContextTime>
            </>
          )}
        </ContextLine>
      )}
      <CoverArt src={track.coverArt} alt={track.title} />
      <TrackContent $isExpanded={isPlaying && isActive}>
        <TrackHeader>
          <TrackMainInfo>
            <PlayBtn 
              onClick={(e) => {
                e.stopPropagation()
                handlePlayToggle()
              }}
            >
              {isPlaying && isActive ? '⏸' : '▶'}
            </PlayBtn>
            <TrackInfo>
              <TrackTitle>{track.title}</TrackTitle>
              <TrackArtist>{track.artist}</TrackArtist>
            </TrackInfo>
          </TrackMainInfo>
          <TrackStats>
            <StatItem>{track.duration}</StatItem>
            <StatItem>▶ {track.plays}</StatItem>
            <StatItem>🗨 {track.comments.length}</StatItem>
          </TrackStats>
        </TrackHeader>
        <WaveformWrapper>
          <WaveformPlayer 
            audioData={track.audioData}
            isPlaying={isPlaying && isActive}
            onPlayPause={handlePlayToggle}
            trackId={track.id}
          />
          <CommentAvatarsContainer>
            {track.comments.map((comment, i) => (
              <CommentMarker 
                key={i} 
                style={{ left: `${comment.position}%` }}
              >
                <CommentIndicator src={comment.avatar} alt={comment.user} />
                <CommentTooltip className="comment-tooltip" $isVisible={false}>
                  <CommentUser>{comment.user}</CommentUser>
                  <CommentText>{comment.text}</CommentText>
                </CommentTooltip>
              </CommentMarker>
            ))}
          </CommentAvatarsContainer>
        </WaveformWrapper>
        {activeComments.length > 0 && (
          <ActiveCommentWrapper>
            {activeComments.map((activeComment) => {
              const comment = track.comments[activeComment.commentIndex]
              return (
                <ActiveCommentDisplay key={activeComment.id} $fadingOut={activeComment.fadingOut}>
                  <ActiveCommentAvatar 
                    src={comment.avatar} 
                    alt={comment.user} 
                  />
                  <ActiveCommentContent>
                    <CommentHeader>
                      <CommentUser>{comment.user}</CommentUser>
                      <CommentTimestamp 
                        onClick={(e) => {
                          e.preventDefault()
                          if (duration > 0) {
                            const seekTime = (comment.position / 100) * duration
                            seek(seekTime)
                          }
                        }}
                      >
                        @ {(() => {
                          const position = comment.position
                          const timeInSeconds = (position / 100) * duration
                          const mins = Math.floor(timeInSeconds / 60)
                          const secs = Math.floor(timeInSeconds % 60)
                          return `${mins}:${secs.toString().padStart(2, '0')}`
                        })()}
                      </CommentTimestamp>
                    </CommentHeader>
                    <CommentText>{comment.text}</CommentText>
                  </ActiveCommentContent>
                </ActiveCommentDisplay>
              )
            })}
          </ActiveCommentWrapper>
        )}
        {isPlaying && isActive && (
          <CommentInputSection>
            <CommentUserAvatar 
              src="https://picsum.photos/seed/currentuser/100" 
              alt="You" 
            />
            <CommentInput 
              type="text" 
              placeholder="Add a comment..." 
            />
            <CommentSubmit title="Send comment">➤</CommentSubmit>
          </CommentInputSection>
        )}
        <Spacer $isExpanded={isPlaying && isActive} />
        <TrackFooter>
          <ButtonGroup>
            <SocialButton icon="♥" label="Like" title="Like" expanded={isPlaying && isActive} count={track.likes} />
            <SocialButton icon="↻" label="Repost" title="Repost" expanded={isPlaying && isActive} count={track.reposts} />
            <SocialButton icon="⤴" label="Share" title="Share" expanded={isPlaying && isActive} />
            <SocialButton icon="↓" label="Download" title="Download" expanded={isPlaying && isActive} />
          </ButtonGroup>
          <TrackHost>hosted on {track.host}</TrackHost>
        </TrackFooter>
      </TrackContent>
      {isPlaying && isActive && (
        <TrackDetails>
          <TrackDescription>
            <DetailsHeading>DESCRIPTION</DetailsHeading>
            <p>{track.description}</p>
          </TrackDescription>
        </TrackDetails>
      )}
    </Tile>
  )
}
