import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params

    const { data, error } = await supabase
      .rpc('get_room_stats', { room_uuid: roomId })

    if (error) throw error

    const stats = data?.[0] || {
      total_codes: 0,
      pending_codes: 0,
      testing_codes: 0,
      failed_codes: 0,
      success_codes: 0,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching room stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room stats' },
      { status: 500 }
    )
  }
}
