import { useState, useEffect } from 'react'
import styled from 'styled-components'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import TrackTile from './components/TrackTile'
import type { Track } from './components/TrackTile'
import Player from './components/Player'
import Visualizer from './components/Visualizer'
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

function AppContent() {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)
  const [isVisualizerVisible, setIsVisualizerVisible] = useState(false)

  // Global keyboard listener for visualizer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyV' && !isVisualizerVisible) {
        e.preventDefault()
        setIsVisualizerVisible(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisualizerVisible])

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
  const tracks: Track[] = [
    { id: 1, title: 'Summer Vibes', artist: 'DJ Alex', duration: '3:45', plays: '1.2M', coverArt: 'https://picsum.photos/seed/summer/200', host: 'creatornode.audius.co', description: 'A laid-back summer anthem with tropical house influences and sunset vibes.', comments: [
      {user: 'MusicFan22', text: 'Perfect for beach days!', position: 1, avatar: 'https://picsum.photos/seed/fan22/100'},
      {user: 'SunsetLover', text: 'That intro gives me chills', position: 2, avatar: 'https://picsum.photos/seed/sunset1/100'},
      {user: 'TropicalVibes', text: 'Finally some good house music', position: 2.5, avatar: 'https://picsum.photos/seed/tropical1/100'},
      {user: 'BeachBum', text: 'This is my summer anthem', position: 3, avatar: 'https://picsum.photos/seed/beach1/100'},
      {user: 'WaveRider', text: 'So chill and relaxing', position: 3.2, avatar: 'https://picsum.photos/seed/wave1/100'},
      {user: 'SandyToes', text: 'Perfect poolside vibes', position: 4, avatar: 'https://picsum.photos/seed/sandy/100'},
      {user: 'CoconutDream', text: 'This takes me to paradise', position: 4.1, avatar: 'https://picsum.photos/seed/coconut/100'},
      {user: 'SoundLover', text: 'This production is incredible', position: 4.3, avatar: 'https://picsum.photos/seed/soundlover/100'},
      {user: 'HouseFan', text: 'DJ Alex never disappoints', position: 4.5, avatar: 'https://picsum.photos/seed/house1/100'},
      {user: 'GoldenHour', text: 'This is golden hour music', position: 4.7, avatar: 'https://picsum.photos/seed/golden/100'},
      {user: 'AquaBlue', text: 'Crystal clear aqua blue vibes', position: 4.9, avatar: 'https://picsum.photos/seed/aqua/100'},
      {user: 'MelodyMaker', text: 'That melody is so catchy', position: 8, avatar: 'https://picsum.photos/seed/melody/100'},
      {user: 'RhythmKing', text: 'Groove is infectious', position: 15, avatar: 'https://picsum.photos/seed/rhythm/100'},
      {user: 'BassHead', text: 'Love that sub bass', position: 15.3, avatar: 'https://picsum.photos/seed/bass1/100'},
      {user: 'SummerNights', text: 'This is pure summer magic', position: 15.8, avatar: 'https://picsum.photos/seed/summer1/100'},
      {user: 'IslandBreeze', text: 'Feeling those tropical winds', position: 16, avatar: 'https://picsum.photos/seed/island/100'},
      {user: 'DanceFloor', text: 'Cannot stop moving to this', position: 16.2, avatar: 'https://picsum.photos/seed/dance1/100'},
      {user: 'VibeCollector', text: 'Adding to my favorites', position: 16.5, avatar: 'https://picsum.photos/seed/vibe1/100'},
      {user: 'SunKissed', text: 'This track is golden', position: 16.7, avatar: 'https://picsum.photos/seed/sun1/100'},
      {user: 'OceanWaves', text: 'Sounds like summer waves', position: 17, avatar: 'https://picsum.photos/seed/ocean1/100'},
      {user: 'PoolParty', text: 'Perfect for my next party', position: 17.2, avatar: 'https://picsum.photos/seed/pool/100'},
      {user: 'TropicalHouse', text: 'This is what I call tropical house', position: 17.5, avatar: 'https://picsum.photos/seed/tropic2/100'},
      {user: 'BeachVibes', text: 'On repeat all summer', position: 17.8, avatar: 'https://picsum.photos/seed/beachvibes/100'},
      {user: 'SummerDaze', text: 'Those lazy summer days', position: 18, avatar: 'https://picsum.photos/seed/daze/100'},
      {user: 'Coral', text: 'Diving into coral reefs', position: 23, avatar: 'https://picsum.photos/seed/coral/100'},
      {user: 'ChillOut', text: 'So relaxing and peaceful', position: 28, avatar: 'https://picsum.photos/seed/chill1/100'},
      {user: 'PalmTrees', text: 'I can see palm trees swaying', position: 32, avatar: 'https://picsum.photos/seed/palm/100'},
      {user: 'SandCastle', text: 'Building sandcastles to this', position: 32.5, avatar: 'https://picsum.photos/seed/sand/100'},
      {user: 'CocktailHour', text: 'Perfect cocktail music', position: 33, avatar: 'https://picsum.photos/seed/cocktail/100'},
      {user: 'SunsetStrip', text: 'Watching the sunset to this', position: 33.2, avatar: 'https://picsum.photos/seed/strip/100'},
      {user: 'TropicalStorm', text: 'This track is a storm of good vibes', position: 33.5, avatar: 'https://picsum.photos/seed/storm/100'},
      {user: 'BeachWalk', text: 'Long walks on the beach music', position: 33.8, avatar: 'https://picsum.photos/seed/walk/100'},
      {user: 'SummerFling', text: 'Reminds me of summer romance', position: 34, avatar: 'https://picsum.photos/seed/fling/100'},
      {user: 'WarmBreeze', text: 'Feels like a warm ocean breeze', position: 34.3, avatar: 'https://picsum.photos/seed/breeze/100'},
      {user: 'Hammock', text: 'Hammock music at its finest', position: 34.5, avatar: 'https://picsum.photos/seed/hammock/100'},
      {user: 'BoardWalk', text: 'Boardwalk vibes all day', position: 34.8, avatar: 'https://picsum.photos/seed/board/100'},
      {user: 'SeaShells', text: 'Collecting seashells to this beat', position: 35, avatar: 'https://picsum.photos/seed/shells/100'},
      {user: 'VacationMode', text: 'I am officially in vacation mode', position: 35.2, avatar: 'https://picsum.photos/seed/vacation/100'},
      {user: 'SunTanned', text: 'Getting my tan on to this', position: 35.5, avatar: 'https://picsum.photos/seed/tan/100'},
      {user: 'TikiBar', text: 'Tiki bar playlist essential', position: 35.7, avatar: 'https://picsum.photos/seed/tiki/100'},
      {user: 'SurfBoard', text: 'Surfing the waves with this', position: 36, avatar: 'https://picsum.photos/seed/surf/100'},
      {user: 'BeachBall', text: 'Beach volleyball soundtrack', position: 36.2, avatar: 'https://picsum.photos/seed/ball/100'},
      {user: 'SandDunes', text: 'Lost in the sand dunes', position: 36.5, avatar: 'https://picsum.photos/seed/dunes/100'},
      {user: 'Coastline', text: 'Driving down the coastline', position: 36.8, avatar: 'https://picsum.photos/seed/coast/100'},
      {user: 'SummerSolstice', text: 'Longest day of the year vibes', position: 37, avatar: 'https://picsum.photos/seed/solstice/100'},
      {user: 'BeachHouse', text: 'Playing this at my beach house', position: 37.3, avatar: 'https://picsum.photos/seed/beachhouse/100'},
      {user: 'TropicalFruit', text: 'Tastes like tropical fruit', position: 37.5, avatar: 'https://picsum.photos/seed/fruit/100'},
      {user: 'SunGlasses', text: 'Sunglasses on, vibes up', position: 37.8, avatar: 'https://picsum.photos/seed/glasses/100'},
      {user: 'FlipFlops', text: 'Flip flops and good music', position: 38, avatar: 'https://picsum.photos/seed/flips/100'},
      {user: 'Seagull', text: 'Seagulls flying overhead', position: 45, avatar: 'https://picsum.photos/seed/seagull/100'},
      {user: 'BeachChair', text: 'Relaxing in my beach chair', position: 52, avatar: 'https://picsum.photos/seed/chair/100'},
      {user: 'SummerEnd', text: 'Never want summer to end', position: 52.5, avatar: 'https://picsum.photos/seed/end/100'},
      {user: 'Lighthouse', text: 'Lighthouse guiding the way', position: 53, avatar: 'https://picsum.photos/seed/light/100'},
      {user: 'Sailboat', text: 'Sailing away with this track', position: 53.3, avatar: 'https://picsum.photos/seed/sail/100'},
      {user: 'Anchor', text: 'This track anchors my playlist', position: 53.5, avatar: 'https://picsum.photos/seed/anchor/100'},
      {user: 'Horizon', text: 'Looking toward the horizon', position: 53.8, avatar: 'https://picsum.photos/seed/horizon/100'},
      {user: 'MargaritaTime', text: 'Time for margaritas', position: 54, avatar: 'https://picsum.photos/seed/margarita/100'},
      {user: 'PinaColada', text: 'Pina colada in hand', position: 54.2, avatar: 'https://picsum.photos/seed/pina/100'},
      {user: 'BeachUmbrella', text: 'Under my beach umbrella', position: 54.5, avatar: 'https://picsum.photos/seed/umbrella/100'},
      {user: 'SandySocks', text: 'Sandy socks, happy heart', position: 54.7, avatar: 'https://picsum.photos/seed/socks/100'},
      {user: 'Driftwood', text: 'Like finding perfect driftwood', position: 55, avatar: 'https://picsum.photos/seed/drift/100'},
      {user: 'StarFish', text: 'Starfish on the shore', position: 55.2, avatar: 'https://picsum.photos/seed/star/100'},
      {user: 'ShellCollector', text: 'Adding to my shell collection', position: 55.5, avatar: 'https://picsum.photos/seed/collector/100'},
      {user: 'WaveWatcher', text: 'Watching waves crash', position: 55.7, avatar: 'https://picsum.photos/seed/watcher/100'},
      {user: 'SunWorshipper', text: 'Worshipping the summer sun', position: 56, avatar: 'https://picsum.photos/seed/worship/100'},
      {user: 'BeachComber', text: 'Combing the beach for treasures', position: 56.3, avatar: 'https://picsum.photos/seed/comber/100'},
      {user: 'TidePool', text: 'Exploring tide pools', position: 56.5, avatar: 'https://picsum.photos/seed/tide/100'},
      {user: 'Barnacle', text: 'Sticking to this like a barnacle', position: 56.8, avatar: 'https://picsum.photos/seed/barnacle/100'},
      {user: 'Seaweed', text: 'Flowing like seaweed', position: 57, avatar: 'https://picsum.photos/seed/seaweed/100'},
      {user: 'Jellyfish', text: 'Floating like a jellyfish', position: 57.2, avatar: 'https://picsum.photos/seed/jelly/100'},
      {user: 'Dolphin', text: 'Swimming with dolphins', position: 57.5, avatar: 'https://picsum.photos/seed/dolphin/100'},
      {user: 'Whale', text: 'Majestic as a whale song', position: 57.7, avatar: 'https://picsum.photos/seed/whale/100'},
      {user: 'Sandbar', text: 'Chilling on the sandbar', position: 58, avatar: 'https://picsum.photos/seed/sandbar/100'},
      {user: 'Lagoon', text: 'Hidden lagoon discovery', position: 58.2, avatar: 'https://picsum.photos/seed/lagoon/100'},
      {user: 'Mangrove', text: 'Mangrove mystery vibes', position: 58.5, avatar: 'https://picsum.photos/seed/mangrove/100'},
      {user: 'Estuary', text: 'Where river meets ocean', position: 58.7, avatar: 'https://picsum.photos/seed/estuary/100'},
      {user: 'Archipelago', text: 'Island hopping soundtrack', position: 59, avatar: 'https://picsum.photos/seed/archipelago/100'},
      {user: 'Atoll', text: 'Coral atoll paradise', position: 59.2, avatar: 'https://picsum.photos/seed/atoll/100'},
      {user: 'Peninsula', text: 'Edge of the peninsula', position: 59.5, avatar: 'https://picsum.photos/seed/peninsula/100'},
      {user: 'Fjord', text: 'Deep blue fjord vibes', position: 59.7, avatar: 'https://picsum.photos/seed/fjord/100'},
      {user: 'Inlet', text: 'Peaceful inlet waters', position: 60, avatar: 'https://picsum.photos/seed/inlet/100'},
      {user: 'Bay', text: 'Sheltered bay serenity', position: 68, avatar: 'https://picsum.photos/seed/bay/100'},
      {user: 'Cove', text: 'Secret cove hideaway', position: 75, avatar: 'https://picsum.photos/seed/cove/100'},
      {user: 'Harbor', text: 'Safe harbor feeling', position: 82, avatar: 'https://picsum.photos/seed/harbor/100'},
      {user: 'Marina', text: 'Docked at the marina', position: 82.5, avatar: 'https://picsum.photos/seed/marina/100'},
      {user: 'Pier', text: 'Walking down the pier', position: 83, avatar: 'https://picsum.photos/seed/pier/100'},
      {user: 'Jetty', text: 'Rocky jetty adventures', position: 83.2, avatar: 'https://picsum.photos/seed/jetty/100'},
      {user: 'Breakwater', text: 'Calm behind the breakwater', position: 83.5, avatar: 'https://picsum.photos/seed/break/100'},
      {user: 'Seawall', text: 'Protected by the seawall', position: 83.7, avatar: 'https://picsum.photos/seed/seawall/100'},
      {user: 'Boardwalk', text: 'Strolling the boardwalk', position: 84, avatar: 'https://picsum.photos/seed/boardwalk/100'},
      {user: 'Promenade', text: 'Seaside promenade stroll', position: 84.2, avatar: 'https://picsum.photos/seed/promenade/100'},
      {user: 'Esplanade', text: 'Waterfront esplanade views', position: 84.5, avatar: 'https://picsum.photos/seed/esplanade/100'},
      {user: 'Quay', text: 'Historic quay atmosphere', position: 84.7, avatar: 'https://picsum.photos/seed/quay/100'},
      {user: 'Wharf', text: 'Old fishing wharf charm', position: 85, avatar: 'https://picsum.photos/seed/wharf/100'},
      {user: 'Dock', text: 'Sunset from the dock', position: 85.2, avatar: 'https://picsum.photos/seed/dock/100'},
      {user: 'Moorage', text: 'Peaceful moorage morning', position: 85.5, avatar: 'https://picsum.photos/seed/moor/100'},
      {user: 'Anchorage', text: 'Safe anchorage vibes', position: 85.7, avatar: 'https://picsum.photos/seed/anchorage/100'},
      {user: 'Berth', text: 'Cozy berth for the night', position: 86, avatar: 'https://picsum.photos/seed/berth/100'},
      {user: 'Slip', text: 'Boat slip serenity', position: 90, avatar: 'https://picsum.photos/seed/slip/100'},
      {user: 'Mooring', text: 'Secure mooring spot', position: 95, avatar: 'https://picsum.photos/seed/mooring/100'}
    ], waveform: [12, 18, 24, 32, 28, 35, 42, 38, 45, 52, 48, 55, 62, 58, 65, 70, 68, 72, 75, 70, 65, 60, 55, 50, 45, 40, 38, 42, 48, 52, 48, 45, 40, 35, 30, 28, 32, 38, 42, 38, 35, 30, 25, 22, 18, 15, 12, 10, 8, 12], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 342, reposts: 89, contextType: 'repost', contextUser: 'TropicalBeats', contextUserAvatar: 'https://picsum.photos/seed/tropical/100', contextTime: '9 min ago' },
    { id: 2, title: 'Night Drive', artist: 'Luna Wave', duration: '4:12', plays: '850K', coverArt: 'https://picsum.photos/seed/night/200', host: 'audius-cn1.tikilabs.com', description: 'Moody synth-wave track inspired by late night city cruises and neon lights.', comments: [{user: 'RetroWave', text: 'That bassline hits different', position: 22, avatar: 'https://picsum.photos/seed/retrowave/100'}, {user: 'NightOwl', text: 'My new driving playlist staple', position: 45, avatar: 'https://picsum.photos/seed/nightowl/100'}, {user: 'SynthLover', text: 'Neon dreams', position: 68, avatar: 'https://picsum.photos/seed/synthlover/100'}], waveform: [8, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 68, 70, 72, 75, 78, 75, 72, 68, 65, 60, 55, 50, 45, 42, 38, 35, 32, 30, 28, 32, 35, 40, 45, 50, 48, 45, 40, 35, 30, 25, 20, 18, 15, 12, 10, 8, 5], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 267, reposts: 54, contextType: 'repost', contextUser: 'SynthWaveFan', contextUserAvatar: 'https://picsum.photos/seed/synthfan/100', contextTime: '23 min ago' },
    { id: 3, title: 'Electric Dreams', artist: 'Nova Sound', duration: '3:28', plays: '2.1M', coverArt: 'https://picsum.photos/seed/electric/200', host: 'blockdaemon-audius-content-01.bdnodes.net', description: 'High-energy electronic banger with futuristic sound design and driving beats.', comments: [{user: 'BeatMaster', text: 'Festival ready!', position: 28, avatar: 'https://picsum.photos/seed/beatmaster/100'}, {user: 'EDMLife', text: 'Need this on Spotify ASAP', position: 52, avatar: 'https://picsum.photos/seed/edmlife/100'}, {user: 'Raver2025', text: 'Drop is insane', position: 78, avatar: 'https://picsum.photos/seed/raver2025/100'}], waveform: [15, 22, 28, 35, 42, 48, 55, 62, 68, 72, 75, 78, 80, 78, 75, 72, 68, 65, 60, 55, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22, 20, 18, 22, 28, 35, 42, 48, 52, 48, 42, 38, 32, 28, 22, 18, 15, 12, 10], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 521, reposts: 143, contextType: 'new', contextUser: 'Nova Sound', contextUserAvatar: 'https://picsum.photos/seed/nova/100', contextTime: '1 hr ago' },
    { id: 4, title: 'Sunset Boulevard', artist: 'Metro Beats', duration: '5:03', plays: '945K', coverArt: 'https://picsum.photos/seed/sunset/200', host: 'audius-content-1.figment.io', description: 'Smooth hip-hop instrumental with jazzy undertones and west coast influence.', comments: [{user: 'RapHead', text: "Can't wait to freestyle over this", position: 18, avatar: 'https://picsum.photos/seed/raphead/100'}, {user: 'ChillBeats', text: 'So smooth!', position: 42, avatar: 'https://picsum.photos/seed/chillbeats/100'}, {user: 'WestCoast', text: 'California dreaming', position: 65, avatar: 'https://picsum.photos/seed/westcoast/100'}], waveform: [10, 15, 20, 25, 30, 35, 40, 42, 45, 48, 52, 55, 58, 62, 65, 68, 70, 72, 75, 72, 70, 68, 65, 62, 58, 55, 52, 48, 45, 42, 40, 38, 35, 32, 30, 28, 32, 35, 40, 45, 48, 45, 40, 35, 30, 25, 20, 15, 12, 8], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 198, reposts: 67, contextType: 'repost', contextUser: 'HipHopDaily', contextUserAvatar: 'https://picsum.photos/seed/hiphop/100', contextTime: '2 hrs ago' },
    { id: 5, title: 'Ocean Waves', artist: 'Chill Master', duration: '4:36', plays: '1.8M', coverArt: 'https://picsum.photos/seed/ocean/200', host: 'cn1.mainnet.audiusindex.org', description: 'Ambient soundscape combining natural ocean sounds with ethereal melodies.', comments: [{user: 'Meditator', text: 'Perfect for yoga sessions', position: 25, avatar: 'https://picsum.photos/seed/meditator/100'}, {user: 'RelaxZone', text: 'So peaceful', position: 55, avatar: 'https://picsum.photos/seed/relaxzone/100'}, {user: 'ZenMaster', text: 'Pure tranquility', position: 82, avatar: 'https://picsum.photos/seed/zenmaster/100'}], waveform: [5, 10, 12, 15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 50, 52, 55, 58, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22, 20, 18, 15, 12, 10, 12, 15, 18, 20, 18, 15, 12, 10, 8, 5, 3], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 456, reposts: 112, contextType: 'new', contextUser: 'Chill Master', contextUserAvatar: 'https://picsum.photos/seed/chillmaster/100', contextTime: '3 hrs ago' },
    { id: 6, title: 'Urban Jungle', artist: 'Street Sound', duration: '3:52', plays: '670K', coverArt: 'https://picsum.photos/seed/urban/200', host: 'audius-creator-1.theblueprint.xyz', description: 'Gritty urban beats with industrial textures and aggressive drum patterns.', comments: [{user: 'StreetBeats', text: 'This goes hard!', position: 30, avatar: 'https://picsum.photos/seed/streetbeats/100'}, {user: 'UrbaniST', text: 'Raw energy', position: 58, avatar: 'https://picsum.photos/seed/urbanist/100'}, {user: 'CityLife', text: 'Concrete vibes', position: 85, avatar: 'https://picsum.photos/seed/citylife/100'}], waveform: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 72, 75, 78, 80, 78, 75, 72, 70, 68, 65, 62, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 32, 35, 40, 45, 48, 50, 48, 45, 40, 35, 30, 25, 20, 15], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 289, reposts: 73, contextType: 'repost', contextUser: 'BeatCollective', contextUserAvatar: 'https://picsum.photos/seed/collective/100', contextTime: '5 hrs ago' },
    { id: 7, title: 'Cosmic Journey', artist: 'Space Echo', duration: '6:15', plays: '1.5M', coverArt: 'https://picsum.photos/seed/cosmic/200', host: 'audius.bragi.cc', description: 'Epic space odyssey with progressive build-ups and cosmic atmospheres.', comments: [{user: 'StarGazer', text: 'This is transcendent', position: 20, avatar: 'https://picsum.photos/seed/stargazer/100'}, {user: 'SpaceMusic', text: 'Journey through the stars', position: 48, avatar: 'https://picsum.photos/seed/spacemusic/100'}, {user: 'AstroVibes', text: 'To infinity and beyond', position: 75, avatar: 'https://picsum.photos/seed/astrovibes/100'}], waveform: [8, 15, 22, 28, 35, 42, 48, 55, 62, 68, 72, 75, 78, 80, 78, 75, 72, 68, 65, 60, 55, 50, 45, 40, 35, 30, 28, 32, 38, 42, 48, 52, 55, 58, 60, 58, 55, 50, 45, 40, 35, 30, 25, 20, 15, 12, 10, 8, 5, 3], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 387, reposts: 95, contextType: 'repost', contextUser: 'AmbientLover', contextUserAvatar: 'https://picsum.photos/seed/ambient/100', contextTime: '8 hrs ago' },
    { id: 8, title: 'Morning Coffee', artist: 'Jazz Cafe', duration: '4:20', plays: '920K', coverArt: 'https://picsum.photos/seed/coffee/200', host: 'cn1.shakespearetech.com', description: 'Mellow jazz fusion perfect for your morning routine and coffee moments.', comments: [{user: 'JazzHead', text: 'Better than my actual coffee shop', position: 24, avatar: 'https://picsum.photos/seed/jazzhead/100'}, {user: 'MorningVibes', text: 'Part of my daily ritual now', position: 50, avatar: 'https://picsum.photos/seed/morningvibes/100'}, {user: 'CoffeeAddict', text: 'Smooth as espresso', position: 70, avatar: 'https://picsum.photos/seed/coffeeaddict/100'}], waveform: [12, 18, 22, 28, 32, 38, 42, 45, 48, 52, 55, 58, 60, 62, 65, 68, 70, 68, 65, 62, 60, 58, 55, 52, 50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22, 20, 22, 25, 28, 32, 35, 38, 35, 32, 28, 25, 22, 18, 15], audioUrl: 'https://audius-creator-13.theblueprint.xyz/tracks/cidstream/baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4?id3=true&id3_artist=Coop+Records&id3_title=Lyrah+-+Maps&signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsearhicuqwaojxxagysqks6mk5zyq466m2vlo4ay3sfb4r2h2ckzs4%5C%22%2C%5C%22timestamp%5C%22%3A1763605981000%2C%5C%22trackId%5C%22%3A109835528%2C%5C%22userId%5C%22%3A106879%7D%22%2C%22signature%22%3A%220xa83749e4ff58bbafa8964d49c83136be352c1c84de7342693a5467843182644156f32caa635d4992a67c52e90440ab75f68379073a47b0c71deeab9f8d9dec7c00%22%7D', likes: 412, reposts: 128, contextType: 'new', contextUser: 'Jazz Cafe', contextUserAvatar: 'https://picsum.photos/seed/jazzcafe/100', contextTime: '12 hrs ago' },
  ]

  const navItems = [
    { label: 'Home', icon: 'home' },
    { label: 'Trending', icon: 'trending' },
    { label: 'Library', icon: 'library' },
    { label: 'Groups', icon: 'groups' },
    { label: 'Messaging', icon: 'messaging' },
    { label: 'Artist Coins', icon: 'coins' },
    { label: 'Wallet', icon: 'wallet' },
  ]

  return (
    <>
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

      <Visualizer 
        isVisible={isVisualizerVisible}
        onClose={() => setIsVisualizerVisible(false)}
      />
    </>
  )
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  )
}

export default App
