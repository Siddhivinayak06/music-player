'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { replaceQueueWithSongs } from '@/lib/queue-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SongRow } from '@/components/song-row'
import { ArrowLeft, Music, Share2, Trash2, Lock, Unlock, Play } from 'lucide-react'

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
          const songs = songsData.map((ps: { songs: any }) => ps.songs).filter(Boolean)

          if (user) {
            const { data: likesData } = await supabase!
              .from('song_likes')
              .select('song_id')
              .eq('user_id', user.id)

            const likedSongIds = new Set(likesData?.map((l: { song_id: string }) => l.song_id) || [])
            setSongs(songs.map((song: Song) => ({
              ...song,
              is_liked: likedSongIds.has(song.id)
            })))
          } else {
            setSongs(songs.map((song: Song) => ({ ...song, is_liked: false })))
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

  const handlePlaySong = async (songId: string) => {
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
      // Navigation still works if queue priming fails.
    }

    router.push(`/player?song=${songId}`)
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
    <>
      {/* Playlist Hero Section */}
      <div className="mb-10 flex flex-col md:flex-row gap-8 items-start md:items-end p-8 rounded-3xl surface-glass border border-white/10 shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 -z-10 group-hover:scale-110 transition-transform duration-1000" />
        
        <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-2xl ring-1 ring-white/10 shrink-0">
          <Music size={80} className="text-primary/40 drop-shadow-lg" />
        </div>

        <div className="flex-1 space-y-4 min-w-0 w-full">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Playlist</p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground truncate">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-lg text-muted-foreground line-clamp-2 max-w-2xl">{playlist.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground/60 font-medium pt-1">
               <span>{songs.length} songs</span>
               <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
               <span className="flex items-center gap-1.5 uppercase tracking-tighter text-[10px] font-bold">
                  {playlist.is_public ? <Unlock size={12} className="text-primary" /> : <Lock size={12} />}
                  {playlist.is_public ? 'Public' : 'Private'}
               </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
               onClick={() => songs.length > 0 && handlePlaySong(songs[0].id)}
               className="rounded-full px-8 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
               disabled={songs.length === 0}
            >
              <Play className="fill-current" size={18} />
              Play All
            </Button>

            {isOwner && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full h-12 px-6 gap-2 border-border/50 hover:bg-muted/50"
                  onClick={togglePublic}
                >
                  {playlist.is_public ? 'Make Private' : 'Make Public'}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full h-12 w-12 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeletePlaylist}
                >
                  <Trash2 size={18} />
                </Button>
              </>
            )}
            <Button variant="outline" className="rounded-full h-12 w-12 p-0 border-border/50 hover:bg-muted/50">
              <Share2 size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/10 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Tracks</h2>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-20 surface-glass rounded-3xl border border-dashed border-border/50">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">This playlist is empty. Browse your library to add some tracks!</p>
            <Link href="/library">
              <Button variant="outline" className="rounded-full px-8">Browse Library</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song, index) => (
              <div key={song.id} className="group relative flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <SongRow
                    song={song}
                    index={index + 1}
                    onPlay={(s: Song) => handlePlaySong(s.id)}
                  />
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSong(song.id)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from playlist"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
