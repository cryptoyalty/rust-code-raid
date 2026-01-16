import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params

    // Create a fresh Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Use the database function (fixed to return INT instead of BIGINT)
    const { data, error } = await (supabase as any)
      .rpc('get_room_stats', { room_uuid: roomId })

    if (error) {
      console.error('Stats RPC error:', error)
      throw error
    }

    // RPC returns an array with one row
    const stats = data?.[0] || {
      total_codes: 10000,
      pending_codes: 10000,
      testing_codes: 0,
      failed_codes: 0,
      success_codes: 0,
    }

    return NextResponse.json({ stats }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error fetching room stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room stats' },
      { status: 500 }
    )
  }
}
