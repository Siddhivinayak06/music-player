import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const { searchParams } = new URL(request.url)
    const albumId = searchParams.get('album_id')
    const userId = searchParams.get('user_id')

    let query = auth.supabase.from('songs').select('*')

    if (albumId) {
      query = query.eq('album_id', albumId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.order('order_index')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
