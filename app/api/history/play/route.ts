import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const body = await request.json().catch(() => ({}))
    const songId = typeof body?.songId === 'string' ? body.songId : ''

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 })
    }

    const { data: latestPlay } = await auth.supabase
      .from('play_history')
      .select('song_id, played_at')
      .eq('user_id', auth.user.id)
      .order('played_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestPlay && latestPlay.song_id === songId) {
      const lastPlayedMs = new Date(latestPlay.played_at).getTime()
      const nowMs = Date.now()

      if (nowMs - lastPlayedMs < 60_000) {
        return NextResponse.json({ ok: true, deduped: true })
      }
    }

    const { error } = await auth.supabase.from('play_history').insert({
      user_id: auth.user.id,
      song_id: songId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
