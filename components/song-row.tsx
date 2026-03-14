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
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>

      {/* Index */}
      <div className="w-7 text-center text-xs font-medium flex-shrink-0"
        style={{ color: 'rgba(255,255,255,0.25)' }}>
        {index}
      </div>

      {/* Play button */}
      <button
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}
        onClick={() => onPlay?.(song)}
      >
        <Play size={13} fill="white" stroke="none" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{song.title}</p>
        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{song.artist}</p>
      </div>

      {/* Duration */}
      <div className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {formatDuration(song.duration)}
      </div>

      {/* Like */}
      <button
        className="w-7 h-7 flex items-center justify-center flex-shrink-0 transition-colors"
        onClick={handleLike}
        disabled={liking || !user}
        style={{ color: isLiked ? '#a855f7' : 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
