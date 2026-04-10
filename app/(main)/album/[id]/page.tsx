'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { replaceQueueWithSongs } from '@/lib/queue-client'
import { SongRow } from '@/components/song-row'
import { ArrowLeft, Play, Heart, Share2, Pencil, Home, Music } from 'lucide-react'
import { EditAlbumDialog } from '@/components/edit-album-dialog'
import { Button } from '@/components/ui/button'
import { AlbumDetailSkeleton } from '@/components/skeletons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
  const [isEditOpen, setIsEditOpen] = useState(false)


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

            const likedSongIds = new Set(likesData?.map((l: { song_id: string }) => l.song_id) || [])
            setSongs(songsData.map((song: Song) => ({
              ...song,
              is_liked: likedSongIds.has(song.id)
            })))
          } else {
            setSongs(songsData.map((song: Song) => ({ ...song, is_liked: false })))
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAlbumData()
  }, [albumId, user])

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
    return <AlbumDetailSkeleton />
  }

  if (!album) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Album not found</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-10 flex flex-col md:flex-row gap-8 items-start md:items-end">
        {/* Album Artwork in Hero Section */}
        <div className="relative h-48 w-48 sm:h-64 sm:w-64 flex-shrink-0 group overflow-hidden rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/5">
           {album.cover_image_url ? (
            <Image
              src={album.cover_image_url}
              alt={album.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
              <Music className="h-16 w-16 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Album</p>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground truncate max-w-2xl">{album.title}</h1>
              {user?.id === album.user_id && (
                <button 
                  onClick={() => setIsEditOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary shadow-sm"
                  title="Edit Album Metadata"
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            <p className="text-lg sm:text-xl font-medium text-muted-foreground">{album.artist}</p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button 
               onClick={() => songs.length > 0 && handlePlaySong(songs[0].id)}
               className="rounded-full px-8 h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg shadow-primary/20 transition-transform active:scale-95"
               disabled={songs.length === 0}
            >
              <Play className="fill-current" size={18} />
              Play Album
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-border/50 hover:bg-muted/50">
                  <Share2 size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="surface-glass">
                <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  // Optional: add toast notification here
                }}>
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border/10 pb-4">
            <h2 className="text-xl font-bold tracking-tight">Tracks</h2>
            <p className="text-sm text-muted-foreground font-medium">{songs.length} songs</p>
          </div>

          {songs.length === 0 ? (
            <div className="rounded-2xl p-12 text-center surface-glass border border-dashed border-border/50">
              <p className="text-muted-foreground">No songs in this album yet. Upload some to get started!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {songs.map((song, index) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={index + 1}
                  onPlay={(s: Song) => handlePlaySong(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-10">
            {album.description && (
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">About this album</h3>
                <p className="text-sm leading-relaxed text-muted-foreground/80">{album.description}</p>
              </section>
            )}

            <section className="space-y-4">
               <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">More from {album.artist}</h3>
               <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
                  <p className="text-xs text-muted-foreground italic">Coming soon: More albums by this artist.</p>
               </div>
            </section>
          </div>
        </div>
      </div>

      <EditAlbumDialog 
        album={album}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdate={(updatedAlbum: Album) => {
          setAlbum(updatedAlbum)
        }}
      />
    </>
  )
}

