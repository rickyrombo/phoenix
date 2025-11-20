import styled from "styled-components";
import { IconRepeat, IconUpload } from "@tabler/icons-react";

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
`;

const ContextLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ContextTime = styled.span`
  color: #606060;
`;

const ContextAvatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
`;

export function FeedTrackContext({
  contextType,
  contextUser,
  contextUserAvatar,
  contextTime,
}: {
  contextType?: "repost" | "new";
  contextUser?: string;
  contextUserAvatar?: string;
  contextTime?: string;
}) {
  if (!contextType || !contextUser) return null;
  return (
    <ContextLine>
      <ContextLeft>
        {contextType === "repost" ? (
          <IconRepeat size={14} stroke={2} />
        ) : (
          <IconUpload size={14} stroke={2} />
        )}
        {contextUser ? (
          <>
            <ContextAvatar src={contextUserAvatar} alt={contextUser} />
            <span>{contextUser}</span>
          </>
        ) : (
          <span>Upload</span>
        )}
      </ContextLeft>
      {contextTime && <ContextTime>{contextTime}</ContextTime>}
    </ContextLine>
  );
}

export function TrendingTrackContext({ ranking }: { ranking: number }) {
  return (
    <ContextLine>
      <ContextLeft>
        <span style={{ fontWeight: 700, fontSize: "1.1em", color: "#fff" }}>
          #{ranking}
        </span>
      </ContextLeft>
    </ContextLine>
  );
}
