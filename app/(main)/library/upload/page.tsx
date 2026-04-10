'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Music, AlertCircle, CheckCircle2, LogOut } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SongFile {
  id: string
  file: File
  title: string
  artist: string
  duration?: number
  status: 'pending' | 'uploading' | 'done' | 'failed'
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumArtist, setAlbumArtist] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [songs, setSongs] = useState<SongFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
    }
  }, [user, router])

  const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError(null)

    for (const file of files) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select audio files only')
        return
      }

      // Extract duration from audio file
      const audio = new Audio()
      audio.src = URL.createObjectURL(file)

      const newSong: SongFile = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: albumArtist || 'Unknown Artist',
        status: 'pending',
      }

      audio.onloadedmetadata = () => {
        newSong.duration = Math.floor(audio.duration)
      }

      setSongs((prev) => [...prev, newSong])
    }

    // Reset input
    e.target.value = ''
  }

  const updateSong = (index: number, field: 'title' | 'artist', value: string) => {
    const updated = [...songs]
    updated[index] = { ...updated[index], [field]: value }
    setSongs(updated)
  }

  const removeSong = (index: number) => {
    setSongs(songs.filter((_, i) => i !== index))
  }

  const setSongStatus = (
    songId: string,
    status: SongFile['status'],
    nextError?: string
  ) => {
    setSongs((prev) =>
      prev.map((song) =>
        song.id === songId
          ? {
              ...song,
              status,
              error: nextError,
            }
          : song
      )
    )
  }

  const uploadSingleSong = async (song: SongFile, albumId: string, orderIndex: number) => {
    if (!supabase || !user) return

    setSongStatus(song.id, 'uploading')

    try {
      const fileName = `${albumId}/${Date.now()}-${song.file.name}`
      const { error: storageError } = await supabase.storage
        .from('music')
        .upload(fileName, song.file)

      if (storageError) throw storageError

      const { data: publicUrlData } = supabase.storage
        .from('music')
        .getPublicUrl(fileName)

      const { error: songError } = await supabase
        .from('songs')
        .insert({
          album_id: albumId,
          user_id: user.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration || 0,
          audio_url: publicUrlData.publicUrl,
          order_index: orderIndex,
        })

      if (songError) throw songError

      setSongStatus(song.id, 'done')
      return true
    } catch (err) {
      setSongStatus(
        song.id,
        'failed',
        err instanceof Error ? err.message : 'Upload failed'
      )
      return false
    }
  }

  const retrySong = async (songId: string) => {
    if (!activeAlbumId) {
      setError('Retry is available after the first album upload starts')
      return
    }

    const song = songs.find((s) => s.id === songId)
    if (!song) return

    const orderIndex = songs.findIndex((s) => s.id === songId)
    await uploadSingleSong(song, activeAlbumId, orderIndex)
  }

  const handleUpload = async () => {
    if (!user || !supabase || !albumTitle.trim() || songs.length === 0) {
      setError('Please provide album title and add songs')
      return
    }

    setUploading(true)
    setError(null)

    try {
      let albumId = activeAlbumId

      if (!albumId) {
        const { data: albumData, error: albumError } = await supabase
          .from('albums')
          .insert({
            user_id: user.id,
            title: albumTitle,
            artist: albumArtist || 'Unknown Artist',
            description: albumDescription || null,
          })
          .select()
          .single()

        if (albumError) throw albumError
        if (!albumData) throw new Error('Failed to create album')

        albumId = albumData.id
        setActiveAlbumId(albumId)
      }

      if (!albumId) {
        throw new Error('Failed to initialize album upload')
      }

      let successCount = 0

      for (let i = 0; i < songs.length; i++) {
        if (songs[i].status === 'done') {
          successCount += 1
          continue
        }

        const ok = await uploadSingleSong(songs[i], albumId, i)
        if (ok) successCount += 1
      }

      if (successCount === songs.length) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/album/${albumId}`)
        }, 2000)
        return
      }

      const failedCount = songs.length - successCount
      setError(`${failedCount} song${failedCount === 1 ? '' : 's'} failed. Use Retry on failed items.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <>
      {success ? (
        <div className="text-center py-24 surface-glass rounded-3xl border border-border/50">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Upload Complete!</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Your masterpiece has been uploaded successfully and is being processed.</p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium animate-pulse">
            <Music size={16} />
            Redirecting to your album...
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">Upload Album</h1>
            <p className="text-muted-foreground">Share your music with the world. Fill in the details below.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 surface-glass border-border/50">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Album Details</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="album-title" className="text-xs">Title *</Label>
                    <Input
                      id="album-title"
                      placeholder="Album name"
                      value={albumTitle}
                      onChange={(e) => setAlbumTitle(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="album-artist" className="text-xs">Artist</Label>
                    <Input
                      id="album-artist"
                      placeholder="Artist name"
                      value={albumArtist}
                      onChange={(e) => setAlbumArtist(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="album-description" className="text-xs">Description</Label>
                    <textarea
                      id="album-description"
                      placeholder="About this album..."
                      value={albumDescription}
                      onChange={(e) => setAlbumDescription(e.target.value)}
                      className="w-full min-h-[100px] rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
              </Card>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading || songs.length === 0 || !albumTitle.trim()}
                className="w-full h-12 font-bold shadow-lg shadow-primary/20"
              >
                {uploading ? 'Processing...' : 'Publish Album'}
              </Button>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 surface-glass border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Song List</h2>
                  <span className="text-xs py-1 px-2 rounded-full bg-primary/10 text-primary font-bold">
                    {songs.length} Selected
                  </span>
                </div>

                {/* File Dropzone */}
                <label className="group flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed border-border/60 rounded-2xl cursor-pointer bg-muted/20 hover:bg-muted/30 hover:border-primary/40 transition-all mb-8">
                  <div className="text-center p-6">
                    <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold">Drop your audio files here</p>
                    <p className="text-xs text-muted-foreground mt-1">High quality FLAC, WAV or MP3 preferred</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleAudioFileSelect}
                    className="hidden"
                  />
                </label>

                {/* Songs List */}
                <div className="space-y-3">
                  {songs.map((song, index) => (
                    <div key={song.id} className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-background/40 hover:bg-background/60 rounded-xl border border-border/30 transition-colors">
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          placeholder="Song title"
                          value={song.title}
                          onChange={(e) => updateSong(index, 'title', e.target.value)}
                          className="h-9 bg-background/30"
                          disabled={song.status === 'uploading' || song.status === 'done'}
                        />
                        <Input
                          placeholder="Artist"
                          value={song.artist}
                          onChange={(e) => updateSong(index, 'artist', e.target.value)}
                          className="h-9 bg-background/30"
                          disabled={song.status === 'uploading' || song.status === 'done'}
                        />
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                          {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {song.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => retrySong(song.id)}
                              disabled={uploading}
                              className="h-8 w-8 text-amber-500"
                            >
                              <AlertCircle size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSong(index)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={song.status === 'uploading' || song.status === 'done'}
                          >
                            <LogOut size={16} className="rotate-90" />
                          </Button>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="absolute -left-1 top-4 bottom-4 w-1 rounded-full transition-colors"
                        style={{ 
                          backgroundColor: song.status === 'done' ? 'var(--primary)' : 
                                         song.status === 'uploading' ? 'var(--accent)' :
                                         song.status === 'failed' ? 'var(--destructive)' : 'transparent' 
                        }} 
                      />
                    </div>
                  ))}
                </div>

                {songs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground/40 border border-dashed border-border/40 rounded-2xl">
                    <Music className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Queue is empty</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
