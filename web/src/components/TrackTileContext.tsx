import styled from "styled-components"
import { IconRepeat, IconUpload } from "@tabler/icons-react"
import useUser from "../queries/useUser"
import dayjs from "dayjs"

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

export function FeedTrackContext({
  contextType,
  contextUserId,
  contextTime,
}: {
  contextUserId?: number
  contextType: "Repost" | "Create"
  contextTime: string
}) {
  const { data: user } = useUser(contextUserId ?? 0, {
    enabled: !!contextUserId,
  })
  return (
    <ContextLine>
      <ContextLeft>
        {contextType === "Repost" ? (
          <IconRepeat size={14} stroke={2} />
        ) : (
          <IconUpload size={14} stroke={2} />
        )}
        {user ? (
          <>
            <ContextAvatar
              src={
                user.cover_art?.medium ??
                `https://picsum.photos/seed/${user.handle}/100`
              }
              alt={user.name}
            />
            <span>{user.name}</span>
          </>
        ) : (
          <span>Upload</span>
        )}
      </ContextLeft>
      {contextTime && <ContextTime>{dayjs(contextTime).fromNow()}</ContextTime>}
    </ContextLine>
  )
}

export function TrendingTrackContext({ ranking }: { ranking: number }) {
  return (
    <ContextLine>
      <ContextLeft>#{ranking}</ContextLeft>
    </ContextLine>
  )
}
