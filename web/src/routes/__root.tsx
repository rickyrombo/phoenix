import { createRootRoute, Outlet } from "@tanstack/react-router"
import styled from "styled-components"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import Player from "../components/Player"
import Visualizer from "../components/Visualizer"
import { useState, useEffect } from "react"

const navItems = [
  { label: "Home", icon: "home" },
  { label: "Trending", icon: "trending" },
  { label: "Library", icon: "library" },
  { label: "Groups", icon: "groups" },
  { label: "Messaging", icon: "messaging" },
  { label: "Artist Coins", icon: "coins" },
  { label: "Wallet", icon: "wallet" },
]

const AppContainer = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 60px auto 90px;
  min-height: 100vh;
  background: #111;
  color: #ffffff;
  font-family:
    "Kode Mono", ui-monospace, "Cascadia Code", "Source Code Pro", Menlo,
    Consolas, monospace;
  font-size: 14px;
  min-width: 720px;

  @media (max-width: 1024px) {
    grid-template-columns: 80px 1fr;
  }
`

const SidebarWrapper = styled.div`
  grid-row: 1 / 3;
  grid-column: 1;
  position: sticky;
  top: 0;
  z-index: 100;
  max-height: 100vh;
`

const HeaderWrapper = styled.div`
  grid-row: 1;
  grid-column: 2;
  position: sticky;
  top: 0;
  z-index: 50;
`

const MainContent = styled.main`
  grid-row: 2;
  grid-column: 2;
`

const PlayerWrapper = styled.div`
  grid-row: 3;
  grid-column: 1 / 3;
  position: sticky;
  bottom: 0;
  z-index: 100;
`

function RootComponent() {
  const [isVisualizerVisible, setIsVisualizerVisible] = useState(false)
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyV" && !e.repeat) {
        setIsVisualizerVisible((prev) => !prev)
      }
    }

    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsNavCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <AppContainer>
      <SidebarWrapper>
        <Sidebar
          navItems={navItems}
          isCollapsed={isNavCollapsed}
          onToggle={() => setIsNavCollapsed(!isNavCollapsed)}
        />
      </SidebarWrapper>
      <HeaderWrapper>
        <Header />
      </HeaderWrapper>
      <MainContent>
        <Outlet />
      </MainContent>
      <PlayerWrapper>
        <Player />
      </PlayerWrapper>
      <Visualizer
        isVisible={isVisualizerVisible}
        onClose={() => setIsVisualizerVisible(false)}
      />
    </AppContainer>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
