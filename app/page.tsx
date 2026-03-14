'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { AlbumCard } from '@/components/album-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { Music, Upload, LogOut, Library, Sparkles } from 'lucide-react'

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary/15">
            <Music className="h-6 w-6 animate-pulse text-primary" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg surface-glass">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Music className="h-6 w-6" />
              </div>
              <ThemeToggle />
            </div>
            <h1 className="text-2xl font-bold mb-2">Setup Required</h1>
            <p className="mb-4 text-muted-foreground">Supabase is not configured yet.</p>
            <div className="rounded-xl p-4 text-left text-sm font-mono mb-3 border bg-muted/35 text-muted-foreground">
              <p>NEXT_PUBLIC_SUPABASE_URL</p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            </div>
            <p className="text-sm text-muted-foreground">
              See <code className="rounded bg-muted px-1.5 py-0.5">SETUP.md</code> for instructions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-end mb-8">
            <ThemeToggle />
          </div>
          <Card className="surface-glass overflow-hidden">
            <CardContent className="p-10 md:p-14">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs text-muted-foreground mb-5">
                <Sparkles className="h-3 w-3 text-primary" />
                Next generation social music player
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
                Vinyl
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mb-8">
                Discover albums, build playlists, and keep your listening flow alive with a beautiful queue-first player.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/auth/signup">
                  <Button size="lg" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Get Started
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline">Sign In</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Music className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold">Vinyl</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/library">
              <Button variant="outline" size="sm" className="gap-2">
                <Library className="h-4 w-4" />
                Library
              </Button>
            </Link>
            <Link href="/library/upload">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </Link>
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Recently Added</h2>
          <p className="text-sm text-muted-foreground">Discover fresh uploads from the community</p>
        </div>

        {albumLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading albums...</div>
        ) : albums.length === 0 ? (
          <Card className="surface-glass">
            <CardContent className="text-center py-16">
              <div className="h-16 w-16 rounded-full mx-auto mb-4 bg-primary/10 text-primary flex items-center justify-center">
                <Music className="h-8 w-8" />
              </div>
              <p className="mb-5 text-muted-foreground">No albums yet. Be the first to upload!</p>
              <Link href="/library/upload">
                <Button>Upload Music</Button>
              </Link>
            </CardContent>
          </Card>
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
