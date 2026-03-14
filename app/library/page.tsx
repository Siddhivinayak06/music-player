'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { fetchRecentlyPlayed, RecentlyPlayedItem } from '@/lib/history-client'
import { AlbumCard } from '@/components/album-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Music, Search, ArrowLeft, Upload } from 'lucide-react'

interface Album {
  id: string
  title: string
  artist: string
  cover_image_url: string | null
  user_id: string
  song_count?: number
}

export default function LibraryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [allAlbums, setAllAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedItem[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) { setLoading(false); return }
      try {
        const { data: albums } = await supabase
          .from('albums')
          .select('*, songs(id)')

        if (albums) {
          setAllAlbums(albums.map((a: any) => ({
            ...a,
            song_count: a.songs?.length || 0,
            songs: undefined
          })))
        }
      } finally { setLoading(false) }
    }
    fetchData()
  }, [user])

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user) {
        setRecentlyPlayed([])
        return
      }

      try {
        const response = await fetchRecentlyPlayed(6)
        setRecentlyPlayed(response.data)
      } catch {
        setRecentlyPlayed([])
      }
    }

    fetchRecent()
  }, [user])

  const displayed = allAlbums
    .filter(a => activeTab === 'all' || a.user_id === user?.id)
    .filter(a =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.artist.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full border bg-card text-muted-foreground flex items-center justify-center transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-bold flex-1">Your Library</h1>
          <Link href="/library/upload">
            <Button size="sm" className="gap-2">
              <Upload size={13} /> Upload
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Search + Tabs */}
      <div className="border-b bg-background/50">
        <div className="max-w-6xl mx-auto px-5 py-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search albums or artists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(['all', 'my'] as const).map(tab => (
              <button key={tab}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeTab === tab ? 'color-mix(in oklab, var(--primary) 16%, transparent)' : 'transparent',
                  color: activeTab === tab ? 'var(--primary)' : 'var(--muted-foreground)',
                  border: activeTab === tab ? '1px solid color-mix(in oklab, var(--primary) 35%, transparent)' : '1px solid transparent',
                }}
                onClick={() => setActiveTab(tab)}>
                {tab === 'all' ? 'All Albums' : 'My Albums'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-5 py-8">
        <section className="mb-8 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Access
            </h2>
            <Link href="/library/liked">
              <Button variant="outline" size="sm">
                Liked Songs
              </Button>
            </Link>
          </div>

          {user && recentlyPlayed.length > 0 && (
            <div
              className="rounded-xl p-3"
              style={{
                border: '1px solid var(--border)',
                background: 'color-mix(in oklab, var(--card) 90%, transparent)',
              }}
            >
              <p className="text-xs mb-2 text-muted-foreground">
                Recently Played
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recentlyPlayed.map((item) => (
                  <button
                    key={`${item.song.id}-${item.playedAt}`}
                    className="text-left rounded-lg px-3 py-2 transition-colors"
                    style={{
                      border: '1px solid var(--border)',
                      background: 'color-mix(in oklab, var(--card) 85%, transparent)',
                    }}
                    onClick={() => router.push(`/player?song=${item.song.id}`)}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{item.song.title}</p>
                    <p className="text-xs truncate text-muted-foreground">
                      {item.song.artist}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <p className="text-center py-16 text-muted-foreground">Loading albums...</p>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)' }}>
              <Music className="h-7 w-7 text-primary/70" />
            </div>
            <p className="mb-4 text-muted-foreground">
              {activeTab === 'my' ? "You haven't uploaded any albums yet" : 'No albums found'}
            </p>
            {activeTab === 'my' && (
              <Link href="/library/upload">
                <Button>
                  Upload Your First Album
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayed.map(album => (
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
