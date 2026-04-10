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
import { PlaylistGridSkeleton } from '@/components/skeletons'
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
        (payload: { eventType: string; new: any; old: any }) => {
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
        const enriched = data.map((p: any) => ({
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
    <>
      <div className="mb-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Your Playlists</h1>
          <p className="text-muted-foreground">Organize and share your favorite tracks</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg shadow-primary/20 gap-2 h-11 px-6">
              <Plus size={18} />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="surface-glass border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Playlist</DialogTitle>
              <DialogDescription>
                Organize your music collection by creating a new playlist.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs uppercase tracking-widest text-muted-foreground">Playlist Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Midnight Grooves"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="bg-background/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs uppercase tracking-widest text-muted-foreground">Description (optional)</Label>
                <textarea
                  id="description"
                  placeholder="What's the vibe?"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  className="w-full min-h-[100px] rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                <input
                  type="checkbox"
                  id="public"
                  checked={newPlaylistPublic}
                  onChange={(e) => setNewPlaylistPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="space-y-0.5">
                   <Label htmlFor="public" className="text-sm font-semibold cursor-pointer">
                     Public Playlist
                   </Label>
                   <p className="text-[10px] text-muted-foreground">Others will be able to discover and listen to this playlist.</p>
                </div>
              </div>
              <Button
                onClick={handleCreatePlaylist}
                disabled={creating || !newPlaylistTitle.trim()}
                className="w-full h-11 font-bold"
              >
                {creating ? 'Creating...' : 'Create Playlist'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8">
        {loading ? (
          <PlaylistGridSkeleton count={6} />
        ) : playlists.length === 0 ? (
          <div className="text-center py-24 surface-glass rounded-3xl border border-dashed border-border/50">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Music className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-xl font-bold mb-2">Start your collection</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8">You don't have any playlists yet. Creating a playlist is the best way to keep your music organized.</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="rounded-full px-8">
               Create Your First Playlist
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="group overflow-hidden surface-glass border-border/40 hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5 rounded-2xl"
              >
                <Link href={`/playlist/${playlist.id}`} className="block relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <Music className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                     <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Plus size={24} className="rotate-45" />
                     </div>
                  </div>
                </Link>
                <div className="p-5">
                  <div className="space-y-1 mb-4">
                    <Link href={`/playlist/${playlist.id}`}>
                      <h3 className="font-bold text-lg text-foreground hover:text-primary transition-colors truncate">
                        {playlist.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                      {playlist.song_count || 0} songs
                    </p>
                  </div>
                  
                  <div className="flex gap-2 border-t border-border/10 pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-9 bg-muted/20 hover:bg-muted/40 text-[10px] sm:text-xs font-bold gap-2 uppercase tracking-tight"
                      onClick={() => togglePlaylistPublic(playlist)}
                    >
                      {playlist.is_public ? (
                        <>
                          <Unlock size={12} className="text-primary" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock size={12} />
                          Private
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
