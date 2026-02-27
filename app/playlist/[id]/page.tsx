'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SongRow } from '@/components/song-row'
import { ArrowLeft, Music, Share2, Trash2, Lock, Unlock } from 'lucide-react'

interface Playlist {
  id: string
  title: string
  description?: string
  is_public: boolean
  user_id: string
}

interface Song {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
  is_liked?: boolean
}

export default function PlaylistPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  const playlistId = params.id as string

  useEffect(() => {
    const fetchPlaylistData = async () => {
      try {
        const { data: playlistData } = await supabase!
          .from('playlists')
          .select('*')
          .eq('id', playlistId)
          .single()

        if (playlistData) {
          setPlaylist(playlistData)
          setIsOwner(user?.id === playlistData.user_id)
        }

        const { data: songsData } = await supabase!
          .from('playlist_songs')
          .select(`
            songs(*)
          `)
          .eq('playlist_id', playlistId)
          .order('order_index')

        if (songsData) {
          const songs = songsData.map((ps: any) => ps.songs).filter(Boolean)

          if (user) {
            const { data: likesData } = await supabase!
              .from('song_likes')
              .select('song_id')
              .eq('user_id', user.id)

            const likedSongIds = new Set(likesData?.map(l => l.song_id) || [])
            setSongs(songs.map(song => ({
              ...song,
              is_liked: likedSongIds.has(song.id)
            })))
          } else {
            setSongs(songs.map(song => ({ ...song, is_liked: false })))
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylistData()
  }, [playlistId, user])

  const handleDeletePlaylist = async () => {
    if (!confirm('Delete this playlist?')) return

    await supabase!.from('playlists').delete().eq('id', playlistId)
    router.push('/playlists')
  }

  const togglePublic = async () => {
    if (!playlist) return

    await supabase!
      .from('playlists')
      .update({ is_public: !playlist.is_public })
      .eq('id', playlistId)

    setPlaylist({ ...playlist, is_public: !playlist.is_public })
  }

  const removeSong = async (songId: string) => {
    await supabase!
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', songId)

    setSongs(songs.filter(s => s.id !== songId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading playlist...</p>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Playlist not found</p>
          <Link href="/playlists">
            <Button>Back to Playlists</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Link href="/playlists">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-sm text-muted-foreground truncate">{playlist.description}</p>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePublic}
                className="gap-2"
              >
                {playlist.is_public ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Private
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePlaylist}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Playlist Cover */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
            <Music className="h-24 w-24 text-muted-foreground/30" />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Tracks</h2>
              <p className="text-muted-foreground">{songs.length} songs</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {songs.length === 0 ? (
            <Card className="p-8 text-center">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No songs in this playlist yet</p>
              <Link href="/library">
                <Button variant="outline">Browse Music</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {songs.map((song, index) => (
                <div key={song.id} className="flex items-center gap-2 group">
                  <SongRow
                    song={song}
                    index={index + 1}
                    onPlay={(s) => router.push(`/player?song=${s.id}`)}
                  />
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSong(song.id)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
