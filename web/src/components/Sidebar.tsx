import styled from 'styled-components'
import { Link } from '@tanstack/react-router'
import SidebarIcon from './SidebarIcon'

const StyledSidebar = styled.nav<{ $isCollapsed: boolean }>`
  width: ${props => props.$isCollapsed ? '80px' : '240px'};
  background: #101010;
  overflow-y: auto;
  transition: width 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  height: 100%;

  @media (max-width: 1024px) {
    position: fixed;
    z-index: 1000;
    box-shadow: ${props => props.$isCollapsed ? 'none' : '2px 0 8px rgba(0, 0, 0, 0.5)'};
    height: calc(100vh - 90px);
  }
`

const CollapseButton = styled.button`
  background: transparent;
  border: none;
  color: #606060;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s;
  margin-left: auto;

  &:hover {
    color: oklch(71.4% 0.203 305.504);
  }
`

const Logo = styled.div<{ $isCollapsed: boolean }>`
  font-family: 'Fugaz One', sans-serif;
  font-size: ${props => props.$isCollapsed ? '1.25rem' : '1.5rem'};
  letter-spacing: 2px;
  color: oklch(71.4% 0.203 305.504);
  padding: ${props => props.$isCollapsed ? '1.5rem' : '1rem 2rem'};
  text-align: ${props => props.$isCollapsed ? 'center' : 'left'};
  border-bottom: 1px solid #1a1a1a;
  margin-bottom: 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
`

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

const NavItem = styled(Link)<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s, border-left 0.2s;
  white-space: nowrap;
  justify-content: flex-start;
  text-decoration: none;
  color: #ffffff;

  &:hover {
    background: #1a1a1a;
    border-left: 2px solid oklch(71.4% 0.203 305.504);
  }

  &.active {
    background: #1a1a1a;
    border-left: 2px solid oklch(71.4% 0.203 305.504);
  }
`

const NavIcon = styled.div`
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #808080;
  font-size: 1.5rem;
`

const NavLabel = styled.span<{ $isCollapsed: boolean }>`
  font-weight: 500;
  opacity: 0.9;
  letter-spacing: 1px;
  font-size: 0.875rem;
  text-transform: uppercase;
  display: ${props => props.$isCollapsed ? 'none' : 'block'};
`

interface NavItem {
  label: string
  icon: string
}

interface SidebarProps {
  navItems: NavItem[]
  isCollapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ navItems, isCollapsed, onToggle }: SidebarProps) {
  const navRoutes: Record<string, string> = {
    'Home': '/',
    'Trending': '/trending',
    'Library': '/library',
    'Groups': '/groups',
    'Messaging': '/messaging',
    'Artist Coins': '/coins',
    'Wallet': '/wallet',
  }

  return (
    <StyledSidebar $isCollapsed={isCollapsed}>
      <Logo $isCollapsed={isCollapsed}>
        <span>{isCollapsed ? 'A' : 'AUDIUS'}</span>
        <CollapseButton onClick={onToggle} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isCollapsed ? '»' : '«'}
        </CollapseButton>
      </Logo>
      <NavList>
        {navItems.map((item, index) => {
          const route = navRoutes[item.label] || '/'
          return (
            <NavItem 
              key={index} 
              $isCollapsed={isCollapsed}
              to={route}
              activeOptions={{ exact: route === '/' }}
            >
              <NavIcon>
                <SidebarIcon name={item.icon} size={24} />
              </NavIcon>
              <NavLabel $isCollapsed={isCollapsed}>{item.label}</NavLabel>
            </NavItem>
          )
        })}
      </NavList>
    </StyledSidebar>
  )
}