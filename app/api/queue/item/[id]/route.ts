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
    if (queue[i].position !== i) {
      await supabase.from('queue_items').update({ position: i }).eq('id', queue[i].id)
    }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const { id } = await params

    const { error } = await auth.supabase
      .from('queue_items')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await normalizePositions(auth.supabase, auth.user.id)
    const data = await getQueue(auth.supabase, auth.user.id)

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
