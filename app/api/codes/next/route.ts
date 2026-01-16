import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId } = await request.json()

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    // Call the atomic function to get a random code
    const { data, error } = await supabase
      .rpc('get_random_code', { room_uuid: roomId })

    if (error) throw error

    if (!data || data.length === 0 || !data[0].code_id) {
      return NextResponse.json(
        { error: 'No codes available', code: null },
        { status: 200 }
      )
    }

    const codeData = data[0]

    // Optionally assign to user
    if (userId && codeData.code_id) {
      await supabase
        .from('codes')
        .update({ assigned_to: userId })
        .eq('id', codeData.code_id)
    }

    return NextResponse.json({
      code: {
        id: codeData.code_id,
        value: codeData.code_value,
        status: codeData.new_status,
      },
    })
  } catch (error) {
    console.error('Error fetching next code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next code' },
      { status: 500 }
    )
  }
}
