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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : null

    if (!title) {
      return NextResponse.json({ error: 'Playlist title is required' }, { status: 400 })
    }

    const { data: playlist, error: playlistError } = await auth.supabase
      .from('playlists')
      .insert({
        user_id: auth.user.id,
        title,
        description: description || null,
        is_public: false,
      })
      .select('id, title')
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: playlistError?.message ?? 'Failed to create playlist' }, { status: 400 })
    }

    const { data: queueRows, error: queueError } = await auth.supabase
      .from('queue_items')
      .select('song_id, position')
      .eq('user_id', auth.user.id)
      .order('position', { ascending: true })

    if (queueError) {
      return NextResponse.json({ error: queueError.message }, { status: 400 })
    }

    const inserts = (queueRows ?? []).map((row: any) => ({
      playlist_id: playlist.id,
      song_id: row.song_id,
      order_index: row.position,
    }))

    if (inserts.length > 0) {
      const { error: insertError } = await auth.supabase.from('playlist_songs').insert(inserts)
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ playlistId: playlist.id, title: playlist.title })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
