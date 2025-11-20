import styled from 'styled-components'

const StyledSidebar = styled.nav<{ $isCollapsed: boolean }>`
  width: ${props => props.$isCollapsed ? '80px' : '240px'};
  background: #0a0a0a;
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
  position: absolute;
  top: 1rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: #606060;
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    color: oklch(71.4% 0.203 305.504);
  }
`

const Logo = styled.div<{ $isCollapsed: boolean }>`
  font-family: 'Fugaz One', sans-serif;
  font-size: ${props => props.$isCollapsed ? '1.25rem' : '1.5rem'};
  letter-spacing: 2px;
  color: oklch(71.4% 0.203 305.504);
  padding: 1.5rem;
  text-align: ${props => props.$isCollapsed ? 'center' : 'left'};
  border-bottom: 1px solid #1a1a1a;
  margin-bottom: 1rem;
`

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

const NavItem = styled.li<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s, border-left 0.2s;
  white-space: nowrap;
  justify-content: flex-start;

  &:hover {
    background: #1a1a1a;
    border-left: 2px solid oklch(71.4% 0.203 305.504);
  }
`

const NavIcon = styled.span`
  font-size: 1.125rem;
  color: #606060;
  opacity: 0.7;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
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
  return (
    <StyledSidebar $isCollapsed={isCollapsed}>
      <Logo $isCollapsed={isCollapsed}>{isCollapsed ? 'A' : 'AUDIUS'}</Logo>
      <CollapseButton onClick={onToggle} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {isCollapsed ? '»' : '«'}
      </CollapseButton>
      <NavList>
        {navItems.map((item, index) => (
          <NavItem key={index} $isCollapsed={isCollapsed}>
            <NavIcon>{item.icon}</NavIcon>
            <NavLabel $isCollapsed={isCollapsed}>{item.label}</NavLabel>
          </NavItem>
        ))}
      </NavList>
    </StyledSidebar>
  )
}