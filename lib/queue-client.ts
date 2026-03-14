import { supabase } from '@/lib/supabase'

type QueueDirection = 'up' | 'down'

async function getAccessToken() {
  if (!supabase) {
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function queueRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()

  if (!token) {
    throw new Error('You must be signed in to manage queue')
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Queue request failed')
  }

  return payload as T
}

export interface QueueSong {
  id: string
  title: string
  artist: string
  duration: number
  audio_url: string
  album_id: string
}

export interface QueueItem {
  id: string
  position: number
  song: QueueSong
}

export async function fetchQueue() {
  return queueRequest<{ data: QueueItem[] }>('/api/queue')
}

export async function replaceQueueWithSongs(songIds: string[]) {
  return queueRequest<{ data: QueueItem[] }>('/api/queue', {
    method: 'POST',
    body: JSON.stringify({
      replace: true,
      songIds,
    }),
  })
}

export async function replaceQueueFromAlbum(albumId: string, startSongId?: string) {
  return queueRequest<{ data: QueueItem[] }>('/api/queue', {
    method: 'POST',
    body: JSON.stringify({
      replace: true,
      albumId,
      startSongId,
    }),
  })
}

export async function moveQueueItem(itemId: string, direction: QueueDirection) {
  return queueRequest<{ data: QueueItem[] }>('/api/queue/reorder', {
    method: 'POST',
    body: JSON.stringify({ itemId, direction }),
  })
}

export async function reorderQueueItems(orderedItemIds: string[]) {
  return queueRequest<{ data: QueueItem[] }>('/api/queue/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedItemIds }),
  })
}

export async function removeQueueItem(itemId: string) {
  return queueRequest<{ data: QueueItem[] }>(`/api/queue/item/${itemId}`, {
    method: 'DELETE',
  })
}

export async function saveQueueAsPlaylist(title: string, description?: string) {
  return queueRequest<{ playlistId: string; title: string }>('/api/queue/save-as-playlist', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  })
}
