'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

interface Song {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
}

interface VinylPlayerProps {
  song?: Song | null
  isPlaying: boolean
  onPlayPause: () => void
  onNext?: () => void
  onPrev?: () => void
  onLike?: () => void
  isLiked?: boolean
}

export function VinylPlayer({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onLike,
  isLiked = false,
}: VinylPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(err => console.error('Play error:', err))
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !song) return

    audio.src = song.audio_url
    audio.load()
  }, [song])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onNext}
      />

      {/* Progress bar */}
      <div className="px-4 pt-4">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 0}
          step={0.1}
          onValueChange={handleProgressChange}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="px-4 py-4 flex items-center gap-4">
        {/* Song Info */}
        <div className="flex-1 min-w-0">
          {song ? (
            <>
              <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
              <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No song playing</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={!song}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={onPlayPause}
            disabled={!song}
            className="gap-2"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!song}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            disabled={!song}
          >
            <Heart
              className="h-4 w-4"
              fill={isLiked ? 'currentColor' : 'none'}
              color={isLiked ? '#d946ef' : 'currentColor'}
            />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-32">
          <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(value) => {
              setVolume(value[0])
              if (audioRef.current) {
                audioRef.current.volume = value[0]
              }
            }}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  )
}
