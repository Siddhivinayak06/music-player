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
import { AlbumGridSkeleton, LibraryHeaderSkeleton } from '@/components/skeletons'

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
          setAllAlbums(albums.map((a: { id: string; title: string; artist: string; cover_image_url: string | null; user_id: string; songs: { id: string }[] }) => ({
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
    <>
      {/* Search + Tabs */}
      <div className="mb-8 p-6 rounded-2xl surface-glass border border-border/50 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Your Library</h1>
          <p className="text-sm text-muted-foreground">Manage your collection and uploads</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search albums or artists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-background/50 border border-border text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/library/liked">
              <Button variant="outline" size="sm" className="h-9">
                Liked Songs
              </Button>
            </Link>
            <Link href="/library/upload">
              <Button size="sm" className="h-9">
                Upload Album
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-t border-border/10 pt-4">
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

      {/* Content */}
      <section className="mb-10 space-y-4">
        {user && recentlyPlayed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recently Played
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentlyPlayed.map((item: RecentlyPlayedItem) => (
                <button
                  key={`${item.song.id}-${item.playedAt}`}
                  className="text-left group rounded-xl px-4 py-3 transition-all surface-glass border border-border/50 hover:border-primary/30 hover:bg-primary/5"
                  onClick={() => router.push(`/player?song=${item.song.id}`)}
                >
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{item.song.title}</p>
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
        <AlbumGridSkeleton count={10} />
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 surface-glass rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary/10">
            <Music className="h-8 w-8 text-primary/70" />
          </div>
          <p className="mb-6 text-muted-foreground max-w-xs mx-auto">
            {activeTab === 'my' ? "You haven't uploaded any albums yet. Start your journey by sharing your first masterpiece!" : 'No albums match your search criteria.'}
          </p>
          {activeTab === 'my' && (
            <Link href="/library/upload">
              <Button className="rounded-full px-8">
                Upload Your First Album
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
    </>
  )
}
