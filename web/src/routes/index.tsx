import { createFileRoute, Navigate } from "@tanstack/react-router"
import styled from "styled-components"

import { useAuth } from "../contexts/AuthContext"
import { Toggle } from "../components/core/Toggle"
import { ActivityFeed } from "../components/ActivitiyFeed"
import { useState } from "react"
import { Page, PageHeader, PageTitle } from "../components/Page"

const FilterControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const FilterLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
`

function FeedPage() {
  const { userId } = useAuth()
  const [originalsOnly, setOriginalsOnly] = useState(false)

  if (!userId) {
    return <Navigate to="/trending" />
  }

  return (
    <Page>
      <PageHeader>
        <PageTitle>Feed</PageTitle>
        <FilterControls>
          <FilterLabel>
            Originals only
            <Toggle checked={originalsOnly} onChange={setOriginalsOnly} />
          </FilterLabel>
        </FilterControls>
      </PageHeader>
      <ActivityFeed originalsOnly={originalsOnly} followedByUserId={userId} />
    </Page>
  )
}
export const Route = createFileRoute("/")({
  component: FeedPage,
})
