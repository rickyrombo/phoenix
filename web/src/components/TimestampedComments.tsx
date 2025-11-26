import { useState } from "react"
import styled from "styled-components"
import AnchoredPopup from "./AnchoredPopup"
import type { Comment } from "../queries/useTrackComments"
import dayjs from "dayjs"

interface TimestampedCommentsProps {
  comments?: Comment[]
  trackDuration: number
  draftCommentPosition?: number | null
}

const TimestampedCommentsContainer = styled.div`
  position: absolute;
  left: -12px;
  right: -12px;
  bottom: 0;
  padding: 0 12px;
  height: 24px;
  overflow: hidden;
  pointer-events: none;
`

const TimestampedCommentsAvatars = styled.div`
  position: relative;
  width: 100%;
  height: 24px;
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

const CommentTooltip = styled.div`
  background: #0a0a0a;
  border: 1px solid oklch(71.4% 0.203 305.504);
  padding: 0.5rem 0.75rem;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  max-width: 360px;
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: #b0b0b0;
  font-size: 0.875rem;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 1.4;
`

const CommentTimestamp = styled.span`
  color: #808080;
  font-size: 0.75rem;
  margin-left: 0.25rem;
`

export default function TimestampedComments({
  comments,
  trackDuration,
  draftCommentPosition,
}: TimestampedCommentsProps) {
  const [hoveredComment, setHoveredComment] = useState<{
    index: number
    element: HTMLElement
  } | null>(null)

  return (
    <>
      <TimestampedCommentsContainer>
        <TimestampedCommentsAvatars>
          {comments?.map((comment, i) => (
            <CommentMarker
              key={comment.comment_id}
              style={{
                left: `${Math.min(Math.max(comment.timestamp ?? 0, i) / trackDuration, 1) * 100}%`,
              }}
              onMouseEnter={(e) =>
                setHoveredComment({
                  index: i,
                  element: e.currentTarget,
                })
              }
              onMouseLeave={() => setHoveredComment(null)}
            >
              <CommentIndicator
                src={comment.user_profile_picture}
                alt={comment.user_name}
              />
            </CommentMarker>
          ))}
          {draftCommentPosition !== null &&
          draftCommentPosition !== undefined ? (
            <CommentMarker style={{ left: `${draftCommentPosition}%` }}>
              <CommentIndicator
                src="https://picsum.photos/seed/currentuser/100"
                alt="Your comment"
              />
            </CommentMarker>
          ) : null}
        </TimestampedCommentsAvatars>
      </TimestampedCommentsContainer>
      {hoveredComment !== null && comments ? (
        <AnchoredPopup
          isVisible={true}
          anchorElement={hoveredComment.element}
          placement="top"
        >
          <CommentTooltip>
            <CommentUser>
              {comments[hoveredComment.index].user_name}{" "}
              {comments[hoveredComment.index].timestamp !== undefined ? (
                <CommentTimestamp>
                  {"@ " +
                    dayjs
                      .duration(comments[hoveredComment.index].timestamp)
                      .format("m:ss")}
                </CommentTimestamp>
              ) : null}
            </CommentUser>
            <CommentText>{comments[hoveredComment.index].content}</CommentText>
          </CommentTooltip>
        </AnchoredPopup>
      ) : null}
    </>
  )
}
