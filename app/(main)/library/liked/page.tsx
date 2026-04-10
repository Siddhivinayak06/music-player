'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { fetchLikedSongs, LikedSongItem } from '@/lib/likes-client'
import { replaceQueueWithSongs } from '@/lib/queue-client'
import { SongRow } from '@/components/song-row'
import { Button } from '@/components/ui/button'
import { SongListSkeleton } from '@/components/skeletons'

interface Song {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
  album_id?: string
  is_liked?: boolean
}

export default function LikedSongsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<LikedSongItem[]>([])

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetchLikedSongs(200)
        setItems(response.data)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  const songs = useMemo<Song[]>(() => {
    return items.map((item: LikedSongItem) => ({
      ...item.song,
      is_liked: true,
    }))
  }, [items])

  const handlePlay = async (songId: string) => {
    try {
      const orderedSongIds = songs.map((song) => song.id)
      const startIdx = orderedSongIds.indexOf(songId)

      if (startIdx >= 0) {
        const rotated = [
          ...orderedSongIds.slice(startIdx),
          ...orderedSongIds.slice(0, startIdx),
        ]
        await replaceQueueWithSongs(rotated)
      }
    } catch {
      // Player navigation should still proceed.
    }

    router.push(`/player?song=${songId}`)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sign in to view liked songs</p>
          <Link href="/auth/login" className="text-sm text-primary underline">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-10 flex items-center gap-6">
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shadow-xl border border-white/10">
          <Heart size={40} className="text-primary fill-primary animate-pulse" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Liked Songs</h1>
          <p className="text-muted-foreground font-medium">{songs.length} songs in your collection</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/10 pb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          <div className="flex items-center gap-4">
             <span className="w-8 text-center">#</span>
             <span>Title</span>
          </div>
          <span className="hidden sm:block">Album</span>
        </div>

        {loading ? (
          <SongListSkeleton count={6} />
        ) : songs.length === 0 ? (
          <div className="text-center py-24 surface-glass rounded-3xl border border-dashed border-border/50">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground max-w-xs mx-auto mb-6">You haven't liked any songs yet. Double tap on any track to add it here!</p>
            <Link href="/">
              <Button variant="outline" className="rounded-full px-8">Discover Music</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song: Song, index: number) => (
              <SongRow
                key={song.id}
                song={song}
                index={index + 1}
                onPlay={(s: Song) => handlePlay(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
