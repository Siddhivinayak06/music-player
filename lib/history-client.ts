import { authedJsonRequest } from '@/lib/authed-request'

interface SongSummary {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
  album_id: string
}

export interface RecentlyPlayedItem {
  playedAt: string
  song: SongSummary
}

export async function trackPlay(songId: string) {
  return authedJsonRequest<{ ok: boolean; deduped?: boolean }>('/api/history/play', {
    method: 'POST',
    body: JSON.stringify({ songId }),
  })
}

export async function fetchRecentlyPlayed(limit = 20) {
  return authedJsonRequest<{ data: RecentlyPlayedItem[] }>(`/api/history/recent?limit=${limit}`)
}
