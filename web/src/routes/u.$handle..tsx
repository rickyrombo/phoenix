import { createFileRoute } from "@tanstack/react-router"
import { Page, PageTitle } from "../components/Page"
import { useUserByHandle } from "../queries/useUser"
import { ActivityFeed } from "../components/ActivitiyFeed"
import { WithMirrors } from "../components/WithMirrors"
import styled from "styled-components"

export const Route = createFileRoute("/u/$handle/")({
  component: ProfilePage,
})

const ProfileHeader = styled.div<{ $coverPhotoUrl?: string }>`
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  padding: 2rem;
  background-color: #101010;
  background-image: ${({ $coverPhotoUrl }) =>
    $coverPhotoUrl ? `url(${$coverPhotoUrl})` : "none"};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  min-height: 360px;
  margin-bottom: 2rem;
  position: sticky;
  top: -100px;
  z-index: 49;
  box-shadow:
    inset 0 -60px 60px -20px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(0, 0, 0, 0.5);

  ${({ $coverPhotoUrl }) =>
    $coverPhotoUrl &&
    `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 1;
    }
    
    > * {
      position: relative;
      z-index: 2;
    }
  `}
`

const HiddenImageLoader = styled.img`
  display: none;
`

const ProfileLockup = styled.div`
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-end;
  gap: 1rem;
`

const ProfileImage = styled.img`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`

const ProfileIdentity = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 2rem;

  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.8),
    0 2px 4px rgba(0, 0, 0, 0.6);
`

const ProfileTitle = styled(PageTitle)`
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.8),
    0 2px 4px rgba(0, 0, 0, 0.6);
`

const ProfileHandle = styled.span`
  font-size: 1rem;
  margin-left: 0.5rem;
`

function ProfilePage() {
  const { handle } = Route.useParams()
  const { data: user } = useUserByHandle(handle)
  if (!user) {
    return <Page>Loading...</Page>
  }
  return (
    <Page>
      <WithMirrors
        url={user.cover_photo?.large}
        mirrors={user.cover_photo?.mirrors}
      >
        {(coverUrl, onError) => (
          <ProfileHeader $coverPhotoUrl={coverUrl}>
            <HiddenImageLoader src={coverUrl} onError={onError} alt="" />
            <ProfileLockup>
              <ProfileIdentity>
                <ProfileTitle>{user.name}</ProfileTitle>
                <ProfileHandle>@{user.handle}</ProfileHandle>
              </ProfileIdentity>
              <WithMirrors
                url={user.profile_picture?.medium}
                mirrors={user.profile_picture?.mirrors}
              >
                {(url, onError) => (
                  <ProfileImage
                    src={url}
                    alt={`${user.name}'s profile`}
                    onError={onError}
                  />
                )}
              </WithMirrors>
            </ProfileLockup>
          </ProfileHeader>
        )}
      </WithMirrors>
      <ActivityFeed userIds={[user.user_id]} />
    </Page>
  )
}
