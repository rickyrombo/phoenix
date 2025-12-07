import { createFileRoute } from "@tanstack/react-router"
import { Page, PageHeader, PageTitle } from "../components/Page"
import { useUserByHandle } from "../queries/useUser"
import { ActivityFeed } from "../components/ActivitiyFeed"

export const Route = createFileRoute("/u/$handle/")({
  component: ProfilePage,
})

function ProfilePage() {
  const { handle } = Route.useParams()
  const { data: user } = useUserByHandle(handle)
  if (!user) {
    return <Page>Loading...</Page>
  }
  return (
    <Page>
      <PageHeader>
        <PageTitle>{user.name}</PageTitle>
      </PageHeader>
      <ActivityFeed userIds={[user.user_id]} />
    </Page>
  )
}
