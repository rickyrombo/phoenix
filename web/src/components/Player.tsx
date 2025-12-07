import styled from "styled-components"
import { usePlayer, useAudioTime } from "../contexts/PlayerContext"
import React, { useState, useRef } from "react"
import QueuePopup from "./QueuePopup"
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRepeat,
  IconRepeatOff,
  IconArrowsShuffle,
  IconHeart,
  IconUserPlus,
  IconUserCheck,
  IconPlaylist,
} from "@tabler/icons-react"
import useUser from "../queries/useUser"
import { Marquee } from "./Marquee"
import { WithMirrors } from "./WithMirrors"

const PlayerFooter = styled.footer`
  height: 90px;
  background: #101010;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2rem;
  gap: 2rem;
  border-top: 1px solid #1a1a1a;

  @media (max-width: 1024px) {
    padding: 0 1rem;
    gap: 1rem;
  }
`

const PlayerTrackInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
  flex: 0 1 25%;

  @media (max-width: 768px) {
    min-width: 150px;
  }
`

const PlayerArtwork = styled.div`
  width: 50px;
  height: 50px;
  background: #333333;
  border-radius: 0;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const PlayerDetails = styled.div`
  min-width: 0;
  /* overflow: hidden; */
`

const PlayerTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
`

const PlayerArtist = styled.div`
  font-size: 0.75rem;
  color: #808080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PlayerMain = styled.div`
  flex: 0 1 50%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const PlayerControls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
`

const ControlBtn = styled.button<{ $isActive?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 0;
  background: transparent;
  border: none;
  color: ${(props) => (props.$isActive ? "var(--accent-color)" : "#808080")};
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--accent-color);
  }
`

const ControlBtnMain = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid var(--accent-color);
  color: var(--accent-color);
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background: var(--accent-color);
    color: #000000;
    box-shadow: 0 0 15px var(--accent-color / 0.5);
  }
`

const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const TimeLabel = styled.span`
  font-size: 0.75rem;
  color: #808080;
  font-variant-numeric: tabular-nums;
  min-width: 40px;
`

const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  background: #333333;
  cursor: pointer;
  position: relative;
`

const ProgressFill = styled.div`
  height: 100%;
  background: var(--accent-color);
  transition: width 0.1s linear;
`

const PlayerExtras = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  min-width: 200px;
  justify-content: flex-end;
  flex: 0 1 25%;

  @media (max-width: 768px) {
    min-width: 100px;
  }
`

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 1024px) {
    gap: 0.5rem;
  }
`

const VolumeLabel = styled.span`
  font-size: 0.75rem;
  color: #808080;
  letter-spacing: 1px;
  font-weight: 600;

  @media (max-width: 1024px) {
    display: none;
  }
`

const VolumeSlider = styled.input`
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #333333;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--accent-color);
    cursor: pointer;
    border-radius: 0;
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--accent-color);
    cursor: pointer;
    border: none;
    border-radius: 0;
  }

  @media (max-width: 1024px) {
    width: 60px;
  }
`

const FavoriteBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #808080;
  font-size: 1.125rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
  &:hover {
    color: var(--accent-color);
  }
  &.active {
    color: var(--accent-color);
  }
`

const FollowBtn = styled(FavoriteBtn)`
  display: flex;
  align-items: center;
  justify-content: center;
`

const QueueBtn = styled(FavoriteBtn)`
  margin-left: 0;
`

export default function Player() {
  const {
    track,
    isPlaying,
    togglePlay,
    duration,
    volume,
    seek,
    setVolume,
    playNext,
    playPrevious,
    repeatMode,
    setRepeatMode,
    shuffle,
    toggleShuffle,
  } = usePlayer()
  const currentTime = useAudioTime()

  const [showQueue, setShowQueue] = useState(false)

  const queueBtnRef = useRef<HTMLButtonElement | null>(null)

  // local follow state (replace with real follow logic later)
  const [isFollowing, setIsFollowing] = useState(false)
  const toggleFollow = () => setIsFollowing((v) => !v)

  const openQueue = () => setShowQueue((s) => !s)

  // local favorite state for now (replace with real like/favorite logic)
  const [isFavorite, setIsFavorite] = useState(false)
  const toggleFavorite = () => setIsFavorite((v) => !v)

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    seek(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value) / 100)
  }

  const handleRepeatClick = () => {
    const modes = ["off", "all", "one"] as const
    const currentIndex = modes.indexOf(repeatMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setRepeatMode(nextMode)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const { data: user } = useUser(track?.owner_id || 0, { enabled: !!track })

  return (
    <PlayerFooter>
      <PlayerTrackInfo>
        <PlayerArtwork>
          <WithMirrors
            url={track?.cover_art?.medium}
            mirrors={track?.cover_art?.mirrors}
          >
            {(url, onError) => (
              <img src={url} alt={track?.title} onError={onError} />
            )}
          </WithMirrors>
        </PlayerArtwork>
        <PlayerDetails>
          <Marquee>
            <PlayerTitle>{track?.title || "No track selected"}</PlayerTitle>
          </Marquee>
          <PlayerArtist>{user?.name || "Select a track to play"}</PlayerArtist>
        </PlayerDetails>
      </PlayerTrackInfo>

      <PlayerMain>
        <PlayerControls>
          <ControlBtn
            onClick={toggleShuffle}
            $isActive={shuffle}
            title={shuffle ? "Shuffle on" : "Shuffle off"}
          >
            <IconArrowsShuffle size={18} stroke={2} />
          </ControlBtn>
          <ControlBtn onClick={playPrevious} title="Previous track">
            <IconPlayerSkipBack size={18} stroke={2} />
          </ControlBtn>
          <ControlBtnMain onClick={togglePlay}>
            {isPlaying ? (
              <IconPlayerPause size={20} stroke={2} />
            ) : (
              <IconPlayerPlay size={20} stroke={2} />
            )}
          </ControlBtnMain>
          <ControlBtn onClick={playNext} title="Next track">
            <IconPlayerSkipForward size={18} stroke={2} />
          </ControlBtn>
          <ControlBtn
            onClick={handleRepeatClick}
            $isActive={repeatMode !== "off"}
            title={
              repeatMode === "off"
                ? "Repeat off"
                : repeatMode === "all"
                  ? "Repeat all"
                  : "Repeat one"
            }
          >
            {repeatMode === "one" ? (
              <IconRepeat size={18} stroke={2} style={{ position: "relative" }}>
                <text
                  x="50%"
                  y="50%"
                  fontSize="10"
                  fill="currentColor"
                  textAnchor="middle"
                  dy=".3em"
                >
                  1
                </text>
              </IconRepeat>
            ) : repeatMode === "off" ? (
              <IconRepeatOff size={18} stroke={2} />
            ) : (
              <IconRepeat size={18} stroke={2} />
            )}
          </ControlBtn>
        </PlayerControls>

        <ProgressBar>
          <TimeLabel>{formatTime(currentTime)}</TimeLabel>
          <ProgressTrack onClick={handleProgressClick}>
            <ProgressFill style={{ width: `${progress}%` }}></ProgressFill>
          </ProgressTrack>
          <TimeLabel>{formatTime(duration)}</TimeLabel>
        </ProgressBar>
      </PlayerMain>

      <PlayerExtras>
        <FollowBtn
          className={isFollowing ? "active" : ""}
          onClick={toggleFollow}
          title={isFollowing ? "Unfollow" : "Follow"}
          aria-label={isFollowing ? "Unfollow" : "Follow"}
        >
          {isFollowing ? (
            <IconUserCheck size={18} stroke={2} />
          ) : (
            <IconUserPlus size={18} stroke={2} />
          )}
        </FollowBtn>
        <FavoriteBtn
          className={isFavorite ? "active" : ""}
          onClick={toggleFavorite}
          title={isFavorite ? "Unfavorite" : "Favorite"}
          aria-label={isFavorite ? "Unfavorite" : "Favorite"}
        >
          <IconHeart
            size={18}
            stroke={2.2}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </FavoriteBtn>
        <QueueBtn
          ref={queueBtnRef}
          className={showQueue ? "active" : ""}
          onClick={openQueue}
          title="Queue"
          aria-label="Open queue"
        >
          <IconPlaylist size={18} stroke={2} />
        </QueueBtn>
        <VolumeControl>
          <VolumeLabel>VOL</VolumeLabel>
          <VolumeSlider
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
          />
        </VolumeControl>
        {showQueue && <QueuePopup />}
      </PlayerExtras>
    </PlayerFooter>
  )
}
