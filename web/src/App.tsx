import { useState, useEffect } from 'react'
import styled from 'styled-components'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import TrackTile from './components/TrackTile'
import type { Track } from './components/TrackTile'
import Player from './components/Player'
import { PlayerProvider } from './contexts/PlayerContext'

const AppContainer = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto auto;
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  font-family: 'Kode Mono', ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
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
  align-self: start;
  height: calc(100vh - 90px);
`

const HeaderWrapper = styled.div`
  grid-row: 1;
  grid-column: 2;
  position: sticky;
  top: 0;
  z-index: 99;
`

const MainLayout = styled.div`
  grid-row: 2;
  grid-column: 2;
`

const PlayerWrapper = styled.div`
  grid-row: 3;
  grid-column: 1 / -1;
  height: 90px;
  position: sticky;
  bottom: 0;
  z-index: 100;
`

const MainContent = styled.main`
  padding: 2rem;
  padding-bottom: 2rem;
`

const PageTitle = styled.h1`
  font-family: 'Fugaz One', sans-serif;
  font-size: 2rem;
  margin: 0 0 2rem 0;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: oklch(71.4% 0.203 305.504);
`

const TracksGrid = styled.div`
  display: flex;
  flex-direction: column;
`

function App() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsNavCollapsed(true)
      }
    }

    // Set initial state
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mock track data
  // Generate 100 dummy comments for testing
  const generateComments = () => {
    const users = ['MusicFan', 'BeatLover', 'SoundWave', 'AudioPhile', 'MixMaster', 'TrackStar', 'VibeCheck', 'Groover', 'Melody', 'Rhythm'];
    const texts = [
      'This is fire!',
      'Absolutely love this',
      'On repeat!',
      'Best track ever',
      'Amazing production',
      'The drop is insane',
      'Can\'t stop listening',
      'Masterpiece',
      'Incredible vibes',
      'This hits different',
      'Pure gold',
      'So good!',
      'What a banger',
      'Love the energy',
      'This is everything'
    ];
    
    const comments = [];
    for (let i = 0; i < 100; i++) {
      const user = `${users[i % users.length]}${Math.floor(i / users.length) + 1}`;
      const text = texts[i % texts.length];
      const position = i; // Spread comments evenly across 0-100%
      const avatar = `https://picsum.photos/seed/user${i}/100`;
      comments.push({ user, text, position, avatar });
    }
    return comments;
  };

  const tracks: Track[] = [
    { id: 1, title: 'Summer Vibes', artist: 'DJ Alex', duration: '3:45', plays: '1.2M', coverArt: 'https://picsum.photos/seed/summer/200', host: 'creatornode.audius.co', description: 'A laid-back summer anthem with tropical house influences and sunset vibes.', comments: generateComments(), waveform: [12, 18, 24, 32, 28, 35, 42, 38, 45, 52, 48, 55, 62, 58, 65, 70, 68, 72, 75, 70, 65, 60, 55, 50, 45, 40, 38, 42, 48, 52, 48, 45, 40, 35, 30, 28, 32, 38, 42, 38, 35, 30, 25, 22, 18, 15, 12, 10, 8, 12], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 342, reposts: 89, contextType: 'repost', contextUser: 'TropicalBeats', contextUserAvatar: 'https://picsum.photos/seed/tropical/100', contextTime: '9 min ago' },
    { id: 2, title: 'Night Drive', artist: 'Luna Wave', duration: '4:12', plays: '850K', coverArt: 'https://picsum.photos/seed/night/200', host: 'audius-cn1.tikilabs.com', description: 'Moody synth-wave track inspired by late night city cruises and neon lights.', comments: [{user: 'RetroWave', text: 'That bassline hits different', position: 22, avatar: 'https://picsum.photos/seed/retrowave/100'}, {user: 'NightOwl', text: 'My new driving playlist staple', position: 45, avatar: 'https://picsum.photos/seed/nightowl/100'}, {user: 'SynthLover', text: 'Neon dreams', position: 68, avatar: 'https://picsum.photos/seed/synthlover/100'}], waveform: [8, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 68, 70, 72, 75, 78, 75, 72, 68, 65, 60, 55, 50, 45, 42, 38, 35, 32, 30, 28, 32, 35, 40, 45, 50, 48, 45, 40, 35, 30, 25, 20, 18, 15, 12, 10, 8, 5], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 267, reposts: 54, contextType: 'repost', contextUser: 'SynthWaveFan', contextUserAvatar: 'https://picsum.photos/seed/synthfan/100', contextTime: '23 min ago' },
    { id: 3, title: 'Electric Dreams', artist: 'Nova Sound', duration: '3:28', plays: '2.1M', coverArt: 'https://picsum.photos/seed/electric/200', host: 'blockdaemon-audius-content-01.bdnodes.net', description: 'High-energy electronic banger with futuristic sound design and driving beats.', comments: [{user: 'BeatMaster', text: 'Festival ready!', position: 28, avatar: 'https://picsum.photos/seed/beatmaster/100'}, {user: 'EDMLife', text: 'Need this on Spotify ASAP', position: 52, avatar: 'https://picsum.photos/seed/edmlife/100'}, {user: 'Raver2025', text: 'Drop is insane', position: 78, avatar: 'https://picsum.photos/seed/raver2025/100'}], waveform: [15, 22, 28, 35, 42, 48, 55, 62, 68, 72, 75, 78, 80, 78, 75, 72, 68, 65, 60, 55, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22, 20, 18, 22, 28, 35, 42, 48, 52, 48, 42, 38, 32, 28, 22, 18, 15, 12, 10], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 521, reposts: 143, contextType: 'new', contextUser: 'Nova Sound', contextUserAvatar: 'https://picsum.photos/seed/nova/100', contextTime: '1 hr ago' },
    { id: 4, title: 'Sunset Boulevard', artist: 'Metro Beats', duration: '5:03', plays: '945K', coverArt: 'https://picsum.photos/seed/sunset/200', host: 'audius-content-1.figment.io', description: 'Smooth hip-hop instrumental with jazzy undertones and west coast influence.', comments: [{user: 'RapHead', text: "Can't wait to freestyle over this", position: 18, avatar: 'https://picsum.photos/seed/raphead/100'}, {user: 'ChillBeats', text: 'So smooth!', position: 42, avatar: 'https://picsum.photos/seed/chillbeats/100'}, {user: 'WestCoast', text: 'California dreaming', position: 65, avatar: 'https://picsum.photos/seed/westcoast/100'}], waveform: [10, 15, 20, 25, 30, 35, 40, 42, 45, 48, 52, 55, 58, 62, 65, 68, 70, 72, 75, 72, 70, 68, 65, 62, 58, 55, 52, 48, 45, 42, 40, 38, 35, 32, 30, 28, 32, 35, 40, 45, 48, 45, 40, 35, 30, 25, 20, 15, 12, 8], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 198, reposts: 67, contextType: 'repost', contextUser: 'HipHopDaily', contextUserAvatar: 'https://picsum.photos/seed/hiphop/100', contextTime: '2 hrs ago' },
    { id: 5, title: 'Ocean Waves', artist: 'Chill Master', duration: '4:36', plays: '1.8M', coverArt: 'https://picsum.photos/seed/ocean/200', host: 'cn1.mainnet.audiusindex.org', description: 'Ambient soundscape combining natural ocean sounds with ethereal melodies.', comments: [{user: 'Meditator', text: 'Perfect for yoga sessions', position: 25, avatar: 'https://picsum.photos/seed/meditator/100'}, {user: 'RelaxZone', text: 'So peaceful', position: 55, avatar: 'https://picsum.photos/seed/relaxzone/100'}, {user: 'ZenMaster', text: 'Pure tranquility', position: 82, avatar: 'https://picsum.photos/seed/zenmaster/100'}], waveform: [5, 10, 12, 15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 50, 52, 55, 58, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22, 20, 18, 15, 12, 10, 12, 15, 18, 20, 18, 15, 12, 10, 8, 5, 3], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 456, reposts: 112, contextType: 'new', contextUser: 'Chill Master', contextUserAvatar: 'https://picsum.photos/seed/chillmaster/100', contextTime: '3 hrs ago' },
    { id: 6, title: 'Urban Jungle', artist: 'Street Sound', duration: '3:52', plays: '670K', coverArt: 'https://picsum.photos/seed/urban/200', host: 'audius-creator-1.theblueprint.xyz', description: 'Gritty urban beats with industrial textures and aggressive drum patterns.', comments: [{user: 'StreetBeats', text: 'This goes hard!', position: 30, avatar: 'https://picsum.photos/seed/streetbeats/100'}, {user: 'UrbaniST', text: 'Raw energy', position: 58, avatar: 'https://picsum.photos/seed/urbanist/100'}, {user: 'CityLife', text: 'Concrete vibes', position: 85, avatar: 'https://picsum.photos/seed/citylife/100'}], waveform: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 72, 75, 78, 80, 78, 75, 72, 70, 68, 65, 62, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 32, 35, 40, 45, 48, 50, 48, 45, 40, 35, 30, 25, 20, 15], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 289, reposts: 73, contextType: 'repost', contextUser: 'BeatCollective', contextUserAvatar: 'https://picsum.photos/seed/collective/100', contextTime: '5 hrs ago' },
    { id: 7, title: 'Cosmic Journey', artist: 'Space Echo', duration: '6:15', plays: '1.5M', coverArt: 'https://picsum.photos/seed/cosmic/200', host: 'audius.bragi.cc', description: 'Epic space odyssey with progressive build-ups and cosmic atmospheres.', comments: [{user: 'StarGazer', text: 'This is transcendent', position: 20, avatar: 'https://picsum.photos/seed/stargazer/100'}, {user: 'SpaceMusic', text: 'Journey through the stars', position: 48, avatar: 'https://picsum.photos/seed/spacemusic/100'}, {user: 'AstroVibes', text: 'To infinity and beyond', position: 75, avatar: 'https://picsum.photos/seed/astrovibes/100'}], waveform: [8, 15, 22, 28, 35, 42, 48, 55, 62, 68, 72, 75, 78, 80, 78, 75, 72, 68, 65, 60, 55, 50, 45, 40, 35, 30, 28, 32, 38, 42, 48, 52, 55, 58, 60, 58, 55, 50, 45, 40, 35, 30, 25, 20, 15, 12, 10, 8, 5, 3], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 387, reposts: 95, contextType: 'repost', contextUser: 'AmbientLover', contextUserAvatar: 'https://picsum.photos/seed/ambient/100', contextTime: '8 hrs ago' },
    { id: 8, title: 'Morning Coffee', artist: 'Jazz Cafe', duration: '4:20', plays: '920K', coverArt: 'https://picsum.photos/seed/coffee/200', host: 'cn1.shakespearetech.com', description: 'Mellow jazz fusion perfect for your morning routine and coffee moments.', comments: [{user: 'JazzHead', text: 'Better than my actual coffee shop', position: 24, avatar: 'https://picsum.photos/seed/jazzhead/100'}, {user: 'MorningVibes', text: 'Part of my daily ritual now', position: 50, avatar: 'https://picsum.photos/seed/morningvibes/100'}, {user: 'CoffeeAddict', text: 'Smooth as espresso', position: 70, avatar: 'https://picsum.photos/seed/coffeeaddict/100'}], waveform: [12, 18, 22, 28, 32, 38, 42, 45, 48, 52, 55, 58, 60, 62, 65, 68, 70, 68, 65, 62, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22, 20, 22, 25, 28, 32, 35, 38, 35, 32, 28, 25, 22, 18, 15], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 412, reposts: 128, contextType: 'new', contextUser: 'Jazz Cafe', contextUserAvatar: 'https://picsum.photos/seed/jazzcafe/100', contextTime: '12 hrs ago' },
  ]

  const navItems = [
    { label: 'Home', icon: '⌂' },
    { label: 'Trending', icon: '↗' },
    { label: 'Library', icon: '♪' },
    { label: 'Groups', icon: '���' },
    { label: 'Messaging', icon: '✉' },
    { label: 'Artist Coins', icon: '⬡' },
    { label: 'Wallet', icon: '⊞' },
  ]

  return (
    <PlayerProvider>
      <AppContainer>
        <SidebarWrapper>
          <Sidebar 
            navItems={navItems} 
            isCollapsed={isNavCollapsed} 
            onToggle={() => setIsNavCollapsed(!isNavCollapsed)}
          />
        </SidebarWrapper>

        <HeaderWrapper>
          <Header onSearch={(query) => console.log('Search:', query)} />
        </HeaderWrapper>

        <MainLayout>
          <MainContent>
            <PageTitle>Featured Tracks</PageTitle>
            
            <TracksGrid>
              {tracks.map((track) => (
                <TrackTile
                  key={track.id}
                  track={track}
                />
              ))}
            </TracksGrid>
          </MainContent>
        </MainLayout>

        <PlayerWrapper>
          <Player />
        </PlayerWrapper>
      </AppContainer>
    </PlayerProvider>
  )
}

export default App
