import { authedJsonRequest } from '@/lib/authed-request'

interface SongSummary {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
  album_id: string
}

export interface LikedSongItem {
  likedAt: string
  song: SongSummary
}

export async function toggleSongLike(songId: string) {
  return authedJsonRequest<{ liked: boolean }>('/api/likes/toggle', {
    method: 'POST',
    body: JSON.stringify({ songId }),
  })
}

export async function fetchLikedSongs(limit = 100) {
  return authedJsonRequest<{ data: LikedSongItem[] }>(`/api/likes/songs?limit=${limit}`)
}
