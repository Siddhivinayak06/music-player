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
import { ArrowLeft, Upload, Music, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SongFile {
  file: File
  title: string
  artist: string
  duration?: number
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
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: albumArtist || 'Unknown Artist',
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

  const handleUpload = async () => {
    if (!user || !supabase || !albumTitle.trim() || songs.length === 0) {
      setError('Please provide album title and add songs')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Create album
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

      // Upload songs
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i]

        // Upload audio file to Supabase Storage
        const fileName = `${albumData.id}/${Date.now()}-${song.file.name}`
        const { data: storageData, error: storageError } = await supabase.storage
          .from('music')
          .upload(fileName, song.file)

        if (storageError) throw storageError

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('music')
          .getPublicUrl(fileName)

        // Create song record
        const { error: songError } = await supabase
          .from('songs')
          .insert({
            album_id: albumData.id,
            user_id: user.id,
            title: song.title,
            artist: song.artist,
            duration: song.duration || 0,
            audio_url: publicUrlData.publicUrl,
            order_index: i,
          })

        if (songError) throw songError
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/album/${albumData.id}`)
      }, 2000)
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
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/library">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Upload Album</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {success ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Upload Complete!</h2>
            <p className="text-muted-foreground mb-4">Your album has been uploaded successfully</p>
            <p className="text-sm text-muted-foreground">Redirecting to your album...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Album Info */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Album Information</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="album-title">Album Title *</Label>
                  <Input
                    id="album-title"
                    placeholder="Enter album title"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="album-artist">Artist Name</Label>
                  <Input
                    id="album-artist"
                    placeholder="Enter artist name"
                    value={albumArtist}
                    onChange={(e) => setAlbumArtist(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="album-description">Description</Label>
                  <Input
                    id="album-description"
                    placeholder="Describe your album (optional)"
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Songs Upload */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Upload Songs</h2>

              {/* File Input */}
              <div className="mb-6">
                <label className="flex items-center justify-center w-full px-6 py-10 border-2 border-dashed border-border rounded-lg cursor-pointer bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP3, WAV, FLAC and other audio formats supported
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleAudioFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Songs List */}
              {songs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground mb-4">
                    {songs.length} song{songs.length !== 1 ? 's' : ''} added
                  </h3>
                  {songs.map((song, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-background rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Input
                          placeholder="Song title"
                          value={song.title}
                          onChange={(e) => updateSong(index, 'title', e.target.value)}
                          className="mb-2"
                        />
                        <Input
                          placeholder="Song artist"
                          value={song.artist}
                          onChange={(e) => updateSong(index, 'artist', e.target.value)}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground flex-shrink-0">
                        {song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : '?'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSong(index)}
                        className="text-destructive flex-shrink-0"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {songs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No songs added yet. Upload some audio files to get started.</p>
                </div>
              )}
            </Card>

            {/* Upload Button */}
            <div className="flex gap-4">
              <Link href="/library" className="flex-1">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleUpload}
                disabled={uploading || songs.length === 0 || !albumTitle.trim()}
                className="flex-1"
              >
                {uploading ? 'Uploading...' : 'Upload Album'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
