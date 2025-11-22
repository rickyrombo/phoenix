import { useState, useEffect, useRef } from "react"
import styled from "styled-components"
import { usePlayer } from "../contexts/PlayerContext"

interface Comment {
  position: number
  user: string
  avatar: string
  text: string
}

interface ActiveComment {
  commentIndex: number
  id: number
  fadingOut: boolean
}

interface ActiveCommentsProps {
  comments: Comment[]
  trackId: number
  duration: number
}

const ActiveCommentWrapper = styled.div`
  position: relative;
  min-height: 60px;
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
  opacity: ${(props) => (props.$fadingOut ? 0 : 1)};
  transition: opacity 0.4s ease-in-out;
  animation: fadeIn 0.4s ease-in-out;
  pointer-events: ${(props) => (props.$fadingOut ? "none" : "auto")};

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

const CommentUser = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #ffffff;
`

const CommentTimestamp = styled.a`
  font-size: 0.75rem;
  color: oklch(71.4% 0.203 305.504);
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const CommentText = styled.p`
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #b0b0b0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`

export default function ActiveComments({
  comments,
  trackId,
  duration,
}: ActiveCommentsProps) {
  const { currentTrack, isPlaying, currentTime, seek } = usePlayer()
  const isActive = currentTrack === trackId
  const [activeComments, setActiveComments] = useState<ActiveComment[]>([])
  const nextCommentIdRef = useRef(0)
  const lastShownCommentRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    if (!isActive || !isPlaying || duration === 0) return

    const currentProgress = (currentTime / duration) * 100

    // Find if we just passed a comment timestamp
    comments.forEach((comment, index) => {
      const isAtPosition =
        currentProgress >= comment.position &&
        currentProgress < comment.position + 0.5

      // Check if this comment is already being shown
      const alreadyActive = activeComments.some(
        (ac) => ac.commentIndex === index && !ac.fadingOut,
      )

      if (isAtPosition && !alreadyActive) {
        const lastShown = lastShownCommentRef.current.get(index) || 0
        const now = Date.now()

        // Prevent showing the same comment too quickly (at least 4 seconds between shows)
        if (now - lastShown < 4000) {
          return
        }

        lastShownCommentRef.current.set(index, now)

        // Fade out all existing comments
        setActiveComments((prev) =>
          prev.map((c) => ({ ...c, fadingOut: true })),
        )

        // Remove faded comments after transition completes
        setTimeout(() => {
          setActiveComments((prev) => prev.filter((c) => !c.fadingOut))
        }, 400)

        // Add new comment to the stack
        const commentId = nextCommentIdRef.current++
        const newComment: ActiveComment = {
          commentIndex: index,
          id: commentId,
          fadingOut: false,
        }

        setTimeout(() => {
          setActiveComments((prev) => [...prev, newComment])
        }, 50)

        // Start fade-out after 10 seconds
        setTimeout(() => {
          setActiveComments((prev) =>
            prev.map((c) =>
              c.id === commentId ? { ...c, fadingOut: true } : c,
            ),
          )

          // Remove completely after fade-out completes
          setTimeout(() => {
            setActiveComments((prev) => prev.filter((c) => c.id !== commentId))
          }, 400)
        }, 10000)
      }
    })
  }, [isActive, isPlaying, currentTime, duration, comments, activeComments])

  // Clear all comments when track stops or becomes inactive
  useEffect(() => {
    if (!isActive || !isPlaying) {
      setTimeout(() => setActiveComments([]), 0)
    }
  }, [isActive, isPlaying])

  if (activeComments.length === 0) return null

  return (
    <ActiveCommentWrapper>
      {activeComments.map((activeComment) => {
        const comment = comments[activeComment.commentIndex]
        return (
          <ActiveCommentDisplay
            key={activeComment.id}
            $fadingOut={activeComment.fadingOut}
          >
            <ActiveCommentAvatar src={comment.avatar} alt={comment.user} />
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
                  @{" "}
                  {(() => {
                    const position = comment.position
                    const timeInSeconds = (position / 100) * duration
                    const mins = Math.floor(timeInSeconds / 60)
                    const secs = Math.floor(timeInSeconds % 60)
                    return `${mins}:${secs.toString().padStart(2, "0")}`
                  })()}
                </CommentTimestamp>
              </CommentHeader>
              <CommentText>{comment.text}</CommentText>
            </ActiveCommentContent>
          </ActiveCommentDisplay>
        )
      })}
    </ActiveCommentWrapper>
  )
}
