import { useState } from "react"
import styled from "styled-components"
import Popup from "./core/Popup"
import type { Comment } from "../queries/useTrackComments"
import dayjs from "dayjs"
import { useUser } from "../queries/useUser"
import { useAuth } from "../contexts/AuthContext"
import { WithMirrors } from "./WithMirrors"

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
  box-shadow: 0 0 4px var(--accent-color-dark);
`

const CommentTooltip = styled.div`
  background: #0a0a0a;
  border: 1px solid var(--accent-color);
  padding: 0.5rem 0.75rem;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  max-width: 360px;
`

const CommentUser = styled.span`
  display: block;
  color: var(--accent-color);
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

  const { userId } = useAuth()
  const { data: user } = useUser(userId!, { enabled: !!userId })

  return (
    <>
      <TimestampedCommentsContainer>
        <TimestampedCommentsAvatars>
          {comments?.map((comment, i) => (
            <CommentMarker
              key={comment.comment_id}
              style={{
                left: `${Math.min(Math.max(comment.track_timestamp_s ?? 0, i) / trackDuration, 1) * 100}%`,
              }}
              onMouseEnter={(e) =>
                setHoveredComment({
                  index: i,
                  element: e.currentTarget,
                })
              }
              onMouseLeave={() => setHoveredComment(null)}
            >
              {comment.user_profile_picture ? (
                <WithMirrors
                  url={comment.user_profile_picture.small}
                  mirrors={comment.user_profile_picture.mirrors}
                >
                  {(url, onError) => (
                    <CommentIndicator
                      src={url}
                      onError={onError}
                      alt={comment.user_name}
                    />
                  )}
                </WithMirrors>
              ) : null}
            </CommentMarker>
          ))}
          {draftCommentPosition !== null &&
          draftCommentPosition !== undefined &&
          user ? (
            <CommentMarker style={{ left: `${draftCommentPosition}%` }}>
              <CommentIndicator
                src={user?.profile_picture?.small}
                alt="Your comment"
              />
            </CommentMarker>
          ) : null}
        </TimestampedCommentsAvatars>
      </TimestampedCommentsContainer>
      {hoveredComment !== null && comments ? (
        <Popup
          isVisible={true}
          anchorRef={{ current: hoveredComment.element }}
          anchorOrigin="topCenter"
          popupOrigin="bottomCenter"
        >
          <CommentTooltip>
            <CommentUser>
              {comments[hoveredComment.index].user_name}{" "}
              {comments[hoveredComment.index].track_timestamp_s ? (
                <CommentTimestamp>
                  {"@ " +
                    dayjs
                      .duration(
                        comments[hoveredComment.index].track_timestamp_s!,
                        "seconds",
                      )
                      .format("m:ss")}
                </CommentTimestamp>
              ) : null}
            </CommentUser>
            <CommentText>{comments[hoveredComment.index].content}</CommentText>
          </CommentTooltip>
        </Popup>
      ) : null}
    </>
  )
}
