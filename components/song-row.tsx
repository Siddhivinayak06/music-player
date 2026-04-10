'use client'

import { useState } from 'react'
import { Heart, MoreVertical, Play } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toggleSongLike } from '@/lib/likes-client'

interface Song {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
  is_liked?: boolean
}

interface SongRowProps {
  song: Song
  index: number
  onPlay?: (song: Song) => void
}

export function SongRow({ song, index, onPlay }: SongRowProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(song.is_liked || false)
  const [liking, setLiking] = useState(false)

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleLike = async () => {
    if (!user) return

    const previous = isLiked
    setIsLiked(!previous)
    setLiking(true)

    try {
      const response = await toggleSongLike(song.id)
      setIsLiked(response.liked)
    } catch {
      setIsLiked(previous)
    } finally {
      setLiking(false)
    }
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors bg-muted/30 border border-border/30 hover:bg-primary/[0.06]">

      {/* Index */}
      <div className="w-7 text-center text-xs font-medium flex-shrink-0 text-muted-foreground">
        {index}
      </div>

      {/* Play button */}
      <button
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-primary text-primary-foreground shadow-md"
        onClick={() => onPlay?.(song)}
      >
        <Play size={13} fill="currentColor" stroke="none" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      <div className="text-xs flex-shrink-0 text-muted-foreground tabular-nums">
        {formatDuration(song.duration)}
      </div>

      {/* Like */}
      <button
        className={`w-7 h-7 flex items-center justify-center flex-shrink-0 transition-colors border-none bg-transparent cursor-pointer ${
          isLiked ? 'text-primary' : 'text-muted-foreground/40 hover:text-primary/60'
        }`}
        onClick={handleLike}
        disabled={liking || !user}
      >
        <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
