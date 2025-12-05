import styled from "styled-components"
import ConnectWalletButton from "./ConnectWalletButton"

const StyledHeader = styled.header`
  height: 60px;
  background: #101010;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  gap: 2rem;
  z-index: 100;
  border-bottom: 1px solid #1a1a1a;
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
  font-family: "Kode Mono", monospace;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border: 1px solid var(--accent-color);
    background: #0a0a0a;
    box-shadow: 0 0 0 1px var(--accent-color);
  }

  &::placeholder {
    color: #606060;
  }
`

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;
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
        <ConnectWalletButton />
      </HeaderRight>
    </StyledHeader>
  )
}
