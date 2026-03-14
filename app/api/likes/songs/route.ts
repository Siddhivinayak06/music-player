import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 200)

    const { data, error } = await auth.supabase
      .from('song_likes')
      .select('created_at, songs(*)')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const songs = (data ?? [])
      .filter((row: any) => row.songs)
      .map((row: any) => ({
        likedAt: row.created_at,
        song: row.songs,
      }))

    return NextResponse.json({ data: songs })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
