import styled from "styled-components"

const Tile = styled.div`
  width: 100%;
  background: transparent;
  padding: 1rem 0 1.5rem 0;
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 0;
  position: relative;
  overflow: hidden;

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`

const Cover = styled.div`
  width: 180px;
  height: 180px;
  background: linear-gradient(90deg, #1a1a1a 0%, #252525 50%, #1a1a1a 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
  border-right: 1px solid #1a1a1a;
`

const Content = styled.div`
  padding: 0 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 180px;
  justify-content: space-between;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: space-between;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`

const PlayButton = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(90deg, #1a1a1a 0%, #252525 50%, #1a1a1a 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
`

const TextGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Text = styled.div<{ $width: string }>`
  height: 1.2rem;
  width: ${(props) => props.$width};
  background: linear-gradient(90deg, #1a1a1a 0%, #252525 50%, #1a1a1a 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
  border-radius: 2px;
`

const Waveform = styled.div`
  height: 80px;
  width: 100%;
  background: linear-gradient(90deg, #1a1a1a 0%, #252525 50%, #1a1a1a 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
  border-radius: 2px;
  margin-bottom: 12px;
`

const Footer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const Button = styled.div`
  width: 30px;
  height: 26px;
  background: linear-gradient(90deg, #1a1a1a 0%, #252525 50%, #1a1a1a 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
`

export default function SkeletonTrackTile() {
  return (
    <Tile>
      <Cover />
      <Content>
        <Header>
          <HeaderLeft>
            <PlayButton />
            <TextGroup>
              <Text $width="500px" />
              <Text $width="360px" />
            </TextGroup>
          </HeaderLeft>
          <Text $width="80px" />
        </Header>
        <Waveform />
        <Footer>
          <Button />
          <Button />
          <Button />
          <Button />
        </Footer>
      </Content>
    </Tile>
  )
}
