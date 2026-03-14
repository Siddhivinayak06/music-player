import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

    const { data, error } = await auth.supabase
      .from('play_history')
      .select('played_at, songs(*)')
      .eq('user_id', auth.user.id)
      .order('played_at', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const seen = new Set<string>()
    const normalized = (data ?? [])
      .filter((row: any) => row.songs)
      .filter((row: any) => {
        const songId = row.songs.id as string
        if (seen.has(songId)) {
          return false
        }
        seen.add(songId)
        return true
      })
      .map((row: any) => ({
        playedAt: row.played_at,
        song: row.songs,
      }))

    return NextResponse.json({ data: normalized })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
