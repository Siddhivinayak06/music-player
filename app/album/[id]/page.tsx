'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { SongRow } from '@/components/song-row'
import { ArrowLeft, Play, Heart, Share2 } from 'lucide-react'

interface Song {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
}

interface Album {
  id: string
  title: string
  artist: string
  cover_image_url: string | null
  description: string | null
  user_id: string
}

interface SongWithLike extends Song {
  is_liked: boolean
}

export default function AlbumPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [album, setAlbum] = useState<Album | null>(null)
  const [songs, setSongs] = useState<SongWithLike[]>([])
  const [loading, setLoading] = useState(true)

  const albumId = params.id as string

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        const { data: albumData, error: albumError } = await supabase!
          .from('albums')
          .select('*')
          .eq('id', albumId)
          .single()

        if (!albumError && albumData) {
          setAlbum(albumData)
        }

        const { data: songsData, error: songsError } = await supabase!
          .from('songs')
          .select('*')
          .eq('album_id', albumId)
          .order('order_index')

        if (!songsError && songsData) {
          if (user) {
            const { data: likesData } = await supabase!
              .from('song_likes')
              .select('song_id')
              .eq('user_id', user.id)

            const likedSongIds = new Set(likesData?.map(l => l.song_id) || [])
            setSongs(songsData.map(song => ({
              ...song,
              is_liked: likedSongIds.has(song.id)
            })))
          } else {
            setSongs(songsData.map(song => ({ ...song, is_liked: false })))
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAlbumData()
  }, [albumId, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a14, #111122, #0d0d1a)' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading album...</p>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a14, #111122, #0d0d1a)' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Album not found</p>
          <button onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d1a 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{album.title}</h1>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{album.artist}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Album Cover */}
          <div className="md:col-span-1">
            <div className="rounded-2xl overflow-hidden sticky top-24"
              style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(20,20,35,0.5)' }}>
              <div className="aspect-square relative">
                {album.cover_image_url ? (
                  <Image
                    src={album.cover_image_url}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.08))' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="1.5">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Artist</p>
                  <p className="font-semibold text-sm text-white">{album.artist}</p>
                </div>
                {album.description && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>About</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{album.description}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
                    <Heart size={13} /> Like
                  </button>
                  <button className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
                    <Share2 size={13} /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Songs List */}
          <div className="md:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Tracks</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{songs.length} songs</p>
            </div>

            {songs.length === 0 ? (
              <div className="rounded-2xl p-10 text-center"
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(20,20,35,0.3)' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>No songs in this album yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {songs.map((song, index) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index + 1}
                    onPlay={(s) => router.push(`/player?song=${s.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
