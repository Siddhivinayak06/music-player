'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { AlbumCard } from '@/components/album-card'
import { Button } from '@/components/ui/button'
import { Music, Upload, LogOut, Library } from 'lucide-react'

interface Album {
  id: string
  title: string
  artist: string
  cover_image_url: string | null
  user_id: string
  song_count?: number
}

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [albumLoading, setAlbumLoading] = useState(true)

  useEffect(() => {
    const fetchAlbums = async () => {
      if (!supabase) { setAlbumLoading(false); return }

      const { data, error } = await supabase
        .from('albums')
        .select('*, songs(id)')
        .limit(12)

      if (!error && data) {
        setAlbums(data.map((a: any) => ({
          ...a,
          song_count: a.songs?.length || 0,
          songs: undefined,
        })))
      }
      setAlbumLoading(false)
    }
    if (!loading) fetchAlbums()
  }, [loading])

  /* ─── loading state ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a14, #111122, #0d0d1a)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(168,85,247,0.12)' }}>
            <Music className="h-6 w-6 animate-pulse" style={{ color: '#a855f7' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  /* ─── supabase not configured ─── */
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a14, #111122, #0d0d1a)' }}>
        <div className="text-center max-w-md px-6">
          <Music className="h-14 w-14 mx-auto mb-4" style={{ color: 'rgba(168,85,247,0.4)' }} />
          <h1 className="text-2xl font-bold text-white mb-2">Setup Required</h1>
          <p className="mb-3" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Supabase is not configured yet.</p>
          <div className="rounded-xl p-4 text-left text-sm font-mono mb-4"
            style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)', color: 'rgba(255,255,255,0.5)' }}>
            <p>NEXT_PUBLIC_SUPABASE_URL</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>See <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>SETUP.md</code> for instructions.</p>
        </div>
      </div>
    )
  }

  /* ─── not logged in ─── */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #111122 50%, #0d0d1a 100%)' }}>
        <div className="text-center px-6">
          <div className="mb-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))', boxShadow: '0 0 40px rgba(168,85,247,0.15)' }}>
              <Music className="h-10 w-10" style={{ color: '#a855f7' }} />
            </div>
            <h1 className="text-5xl font-bold text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Vinyl</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.05rem' }}>Your music, your way</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/signup">
              <button className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                Get Started
              </button>
            </Link>
            <Link href="/auth/login">
              <button className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ─── main logged-in view ─── */
  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d1a 100%)' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(12px)' }}
        className="sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))' }}>
              <Music className="h-4 w-4" style={{ color: '#a855f7' }} />
            </div>
            <h1 className="text-lg font-bold text-white">Vinyl</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/library">
              <button className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <Library size={14} />
                Library
              </button>
            </Link>
            <Link href="/library/upload">
              <button className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <Upload size={14} />
                Upload
              </button>
            </Link>
            <button onClick={() => signOut()}
              className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">Recently Added</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.88rem' }}>Discover music from the community</p>
        </div>

        {albumLoading ? (
          <div className="text-center py-16">
            <p style={{ color: 'rgba(255,255,255,0.35)' }}>Loading albums...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.08)' }}>
              <Music className="h-8 w-8" style={{ color: 'rgba(168,85,247,0.35)' }} />
            </div>
            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>No albums yet. Be the first to upload!</p>
            <Link href="/library/upload">
              <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)', boxShadow: '0 4px 16px rgba(168,85,247,0.35)' }}>
                Upload Music
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                id={album.id}
                title={album.title}
                artist={album.artist}
                coverImage={album.cover_image_url || undefined}
                songCount={album.song_count || 0}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
