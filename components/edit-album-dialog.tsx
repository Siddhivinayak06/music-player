'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface Album {
  id: string
  title: string
  artist: string
  description: string | null
  cover_image_url: string | null
  user_id: string
}

interface EditAlbumDialogProps {
  album: Album
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (updatedAlbum: Album) => void
}

export function EditAlbumDialog({
  album,
  open,
  onOpenChange,
  onUpdate,
}: EditAlbumDialogProps) {
  const [title, setTitle] = useState(album.title)
  const [artist, setArtist] = useState(album.artist)
  const [description, setDescription] = useState(album.description || '')
  const [coverImageUrl, setCoverImageUrl] = useState(album.cover_image_url || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!title.trim()) throw new Error('Title is required')
      if (!artist.trim()) throw new Error('Artist is required')

      const { data, error: updateError } = await supabase!
        .from('albums')
        .update({
          title: title.trim(),
          artist: artist.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
        })
        .eq('id', album.id)
        .select()
        .single()

      if (updateError) throw updateError

      onUpdate(data)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update album')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] surface-glass border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Album</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your album details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-foreground">Album Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midnight Melodies"
              className="bg-background/50 border-border focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist" className="text-sm font-medium text-foreground">Artist</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. The Night Owls"
              className="bg-background/50 border-border focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover_image_url" className="text-sm font-medium text-foreground">Cover Image URL</Label>
            <Input
              id="cover_image_url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="bg-background/50 border-border focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about this album..."
              rows={3}
              className="bg-background/50 border-border focus:border-primary/50 resize-none"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
              {error}
            </p>
          )}
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
