import styled from 'styled-components'

const StyledHeader = styled.header`
  height: 60px;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  gap: 2rem;
  z-index: 100;
`

const HeaderCenter = styled.div`
  flex: 1;
  max-width: 600px;
`

const SearchBar = styled.div`
  position: relative;
  width: 100%;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: #1a1a1a;
  border: 1px solid #333333;
  border-radius: 0;
  color: #ffffff;
  font-family: 'Kode Mono', monospace;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border: 1px solid oklch(71.4% 0.203 305.504);
    background: #0a0a0a;
    box-shadow: 0 0 0 1px oklch(71.4% 0.203 305.504);
  }

  &::placeholder {
    color: #606060;
  }
`

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;
`

const Button = styled.button<{ $primary?: boolean }>`
  padding: 0.625rem 1.25rem;
  border-radius: 0;
  font-family: 'Kode Mono', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 2px solid oklch(71.4% 0.203 305.504);
  background: ${props => props.$primary ? 'oklch(71.4% 0.203 305.504)' : 'transparent'};
  color: ${props => props.$primary ? '#000000' : 'oklch(71.4% 0.203 305.504)'};

  &:hover {
    background: ${props => props.$primary ? 'transparent' : 'oklch(71.4% 0.203 305.504)'};
    color: ${props => props.$primary ? 'oklch(71.4% 0.203 305.504)' : '#000000'};
    box-shadow: 0 0 15px oklch(71.4% 0.203 305.504 / 0.3);
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }
`

interface HeaderProps {
  onSearch?: (query: string) => void
}

export default function Header({ onSearch }: HeaderProps) {
  return (
    <StyledHeader>
      <HeaderCenter>
        <SearchBar>
          <SearchInput
            type="text" 
            placeholder="Search tracks, artists, playlists..." 
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </SearchBar>
      </HeaderCenter>
      <HeaderRight>
        <Button>Login</Button>
        <Button $primary>Sign Up</Button>
      </HeaderRight>
    </StyledHeader>
  )
}