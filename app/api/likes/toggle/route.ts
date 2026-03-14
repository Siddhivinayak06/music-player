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

    const { data: existing, error: existingError } = await auth.supabase
      .from('song_likes')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('song_id', songId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 })
    }

    if (existing) {
      const { error } = await auth.supabase
        .from('song_likes')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', auth.user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ liked: false })
    }

    const { error } = await auth.supabase.from('song_likes').insert({
      user_id: auth.user.id,
      song_id: songId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ liked: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
