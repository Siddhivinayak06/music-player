import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice(7)
}

function getSupabaseClient(accessToken?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    }
  )
}

async function requireUser(request: NextRequest) {
  const token = getToken(request)
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = getSupabaseClient(token)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user, supabase }
}

async function getQueue(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  const { data, error } = await supabase
    .from('queue_items')
    .select('id, position, songs(*)')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? [])
    .filter((row: any) => row.songs)
    .map((row: any) => ({
      id: row.id,
      position: row.position,
      song: row.songs,
    }))
}

async function normalizePositions(supabase: ReturnType<typeof getSupabaseClient>, userId: string) {
  const queue = await getQueue(supabase, userId)

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i]
    if (item.position !== i) {
      await supabase.from('queue_items').update({ position: i }).eq('id', item.id)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ('error' in auth) {
      return auth.error
    }

    await normalizePositions(auth.supabase, auth.user.id)
    const data = await getQueue(auth.supabase, auth.user.id)

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const body = await request.json().catch(() => ({}))
    const replace = Boolean(body?.replace)
    let songIds: string[] = []

    if (Array.isArray(body?.songIds) && body.songIds.length > 0) {
      songIds = body.songIds.filter((id: unknown) => typeof id === 'string')
    } else if (typeof body?.albumId === 'string' && body.albumId.length > 0) {
      const { data: songs, error } = await auth.supabase
        .from('songs')
        .select('id')
        .eq('album_id', body.albumId)
        .order('order_index', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      const allIds = (songs ?? []).map((song: any) => song.id)
      if (typeof body.startSongId === 'string' && allIds.includes(body.startSongId)) {
        const startIdx = allIds.indexOf(body.startSongId)
        songIds = [...allIds.slice(startIdx), ...allIds.slice(0, startIdx)]
      } else {
        songIds = allIds
      }
    }

    if (songIds.length === 0) {
      return NextResponse.json({ error: 'songIds or albumId is required' }, { status: 400 })
    }

    const dedupedSongIds = Array.from(new Set(songIds))

    if (replace) {
      const { error } = await auth.supabase.from('queue_items').delete().eq('user_id', auth.user.id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    const currentQueue = await getQueue(auth.supabase, auth.user.id)
    const existingSongIds = new Set(currentQueue.map((item: any) => item.song.id))

    const inserts = dedupedSongIds
      .filter((songId) => !existingSongIds.has(songId))
      .map((songId, idx) => ({
        user_id: auth.user.id,
        song_id: songId,
        position: currentQueue.length + idx,
      }))

    if (inserts.length > 0) {
      const { error } = await auth.supabase.from('queue_items').insert(inserts)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    await normalizePositions(auth.supabase, auth.user.id)
    const data = await getQueue(auth.supabase, auth.user.id)

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
