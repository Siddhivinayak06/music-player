import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

type Direction = 'up' | 'down'

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

async function writeOrderedQueue(
  supabase: ReturnType<typeof getSupabaseClient>,
  queue: Array<{ id: string }>
) {
  for (let i = 0; i < queue.length; i++) {
    await supabase.from('queue_items').update({ position: i }).eq('id', queue[i].id)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ('error' in auth) {
      return auth.error
    }

    const body = await request.json().catch(() => ({}))
    const orderedItemIds = Array.isArray(body?.orderedItemIds)
      ? body.orderedItemIds.filter((id: unknown) => typeof id === 'string')
      : null
    const itemId = typeof body?.itemId === 'string' ? body.itemId : null
    const direction = body?.direction as Direction

    const queue = await getQueue(auth.supabase, auth.user.id)

    if (orderedItemIds && orderedItemIds.length > 0) {
      if (orderedItemIds.length !== queue.length) {
        return NextResponse.json({ error: 'orderedItemIds length mismatch' }, { status: 400 })
      }

      const queueIdSet = new Set(queue.map((item: any) => item.id))
      const orderIdSet = new Set(orderedItemIds)

      if (orderIdSet.size !== queue.length) {
        return NextResponse.json({ error: 'orderedItemIds contains duplicates' }, { status: 400 })
      }

      for (const id of orderedItemIds) {
        if (!queueIdSet.has(id)) {
          return NextResponse.json({ error: 'orderedItemIds contains invalid id' }, { status: 400 })
        }
      }

      const byId = new Map(queue.map((item: any) => [item.id, item]))
      const reordered = orderedItemIds.map((id: string) => byId.get(id))

      await writeOrderedQueue(auth.supabase, reordered)

      const data = await getQueue(auth.supabase, auth.user.id)
      return NextResponse.json({ data })
    }

    if (!itemId || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json(
        { error: 'orderedItemIds or itemId with valid direction is required' },
        { status: 400 }
      )
    }

    const index = queue.findIndex((item: any) => item.id === itemId)

    if (index === -1) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
    }

    if (direction === 'up' && index > 0) {
      const temp = queue[index - 1]
      queue[index - 1] = queue[index]
      queue[index] = temp
    }

    if (direction === 'down' && index < queue.length - 1) {
      const temp = queue[index + 1]
      queue[index + 1] = queue[index]
      queue[index] = temp
    }

    await writeOrderedQueue(auth.supabase, queue)

    const data = await getQueue(auth.supabase, auth.user.id)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
