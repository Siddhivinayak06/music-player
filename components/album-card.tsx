'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Play, MoreVertical } from 'lucide-react'

interface AlbumCardProps {
  id: string
  title: string
  artist: string
  coverImage?: string
  songCount: number
}

export function AlbumCard({ id, title, artist, coverImage, songCount }: AlbumCardProps) {
  const router = useRouter()
  const [firstSongId, setFirstSongId] = useState<string | null>(null)

  useEffect(() => {
    // Fetch first song of album so Play goes directly to player
    const fetchFirst = async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('songs')
        .select('id')
        .eq('album_id', id)
        .order('order_index')
        .limit(1)
      if (data && data.length > 0) setFirstSongId(data[0].id)
    }
    fetchFirst()
  }, [id])

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (firstSongId) {
      router.push(`/player?song=${firstSongId}`)
    } else {
      router.push(`/album/${id}`)
    }
  }

  return (
    <div className="group relative rounded-xl overflow-hidden bg-card/60 hover:bg-card transition-all duration-300"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <Link href={`/album/${id}`}>
        <div className="relative aspect-square overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.08))' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}

          {/* Hover overlay with play button */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                boxShadow: '0 4px 20px rgba(168,85,247,0.5)',
              }}
            >
              <Play size={20} fill="white" stroke="none" />
            </button>
          </div>
        </div>
      </Link>

      <div className="p-3.5">
        <h3 className="font-semibold text-sm truncate text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{artist}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5">{songCount} songs</p>
      </div>
    </div>
  )
}
