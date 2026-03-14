'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Music, Trash2, Lock, Unlock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Playlist {
  id: string
  title: string
  description?: string
  cover_image_url?: string
  is_public: boolean
  user_id: string
  song_count?: number
}

export default function PlaylistsPage() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchPlaylists()
  }, [user])

  useEffect(() => {
    if (!user || !supabase) return

    const subscription = supabase
      .channel(`user-playlists-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playlists',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlaylists([...playlists, payload.new as Playlist])
          } else if (payload.eventType === 'UPDATE') {
            setPlaylists(
              playlists.map((p) => (p.id === payload.new.id ? payload.new : p) as Playlist)
            )
          } else if (payload.eventType === 'DELETE') {
            setPlaylists(playlists.filter((p) => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, playlists])

  const fetchPlaylists = async () => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }

    try {
      const { data } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_songs(id)
        `)
        .eq('user_id', user.id)

      if (data) {
        const enriched = data.map((p) => ({
          ...p,
          song_count: p.playlist_songs?.length || 0,
          playlist_songs: undefined,
        })) as Playlist[]
        setPlaylists(enriched)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!user || !supabase || !newPlaylistTitle.trim()) return

    setCreating(true)
    try {
      const { data } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          title: newPlaylistTitle,
          description: newPlaylistDescription || null,
          is_public: newPlaylistPublic,
        })
        .select()

      if (data) {
        setNewPlaylistTitle('')
        setNewPlaylistDescription('')
        setNewPlaylistPublic(false)
        setShowCreateDialog(false)
        fetchPlaylists()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePlaylist = async (id: string) => {
    if (!supabase) return
    if (!confirm('Delete this playlist?')) return

    await supabase.from('playlists').delete().eq('id', id)
    fetchPlaylists()
  }

  const togglePlaylistPublic = async (playlist: Playlist) => {
    if (!supabase) return
    await supabase
      .from('playlists')
      .update({ is_public: !playlist.is_public })
      .eq('id', playlist.id)

    fetchPlaylists()
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sign in to view your playlists</p>
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Your Playlists</h1>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Playlist</DialogTitle>
                <DialogDescription>Create a new playlist to organize your music</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Playlist Title</Label>
                  <Input
                    id="title"
                    placeholder="My awesome playlist"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Add a description..."
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="public"
                    checked={newPlaylistPublic}
                    onChange={(e) => setNewPlaylistPublic(e.target.checked)}
                  />
                  <Label htmlFor="public" className="cursor-pointer">
                    Make this playlist public
                  </Label>
                </div>
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={creating || !newPlaylistTitle.trim()}
                  className="w-full"
                >
                  {creating ? 'Creating...' : 'Create Playlist'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <p className="text-muted-foreground">Loading playlists...</p>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">You don't have any playlists yet</p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>Create Your First Playlist</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Playlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Playlist Title</Label>
                    <Input
                      id="title"
                      placeholder="My awesome playlist"
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Add a description..."
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={newPlaylistPublic}
                      onChange={(e) => setNewPlaylistPublic(e.target.checked)}
                    />
                    <Label htmlFor="public" className="cursor-pointer">
                      Make this playlist public
                    </Label>
                  </div>
                  <Button
                    onClick={handleCreatePlaylist}
                    disabled={creating || !newPlaylistTitle.trim()}
                    className="w-full"
                  >
                    {creating ? 'Creating...' : 'Create Playlist'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="overflow-hidden bg-card hover:bg-card/80 transition-colors"
              >
                <Link href={`/playlist/${playlist.id}`}>
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Music className="h-12 w-12 text-muted-foreground" />
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/playlist/${playlist.id}`}>
                        <h3 className="font-semibold truncate text-foreground hover:underline">
                          {playlist.title}
                        </h3>
                      </Link>
                      {playlist.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {playlist.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {playlist.song_count || 0} songs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => togglePlaylistPublic(playlist)}
                    >
                      {playlist.is_public ? (
                        <>
                          <Unlock className="h-3 w-3 mr-1" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
