import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Query codes directly instead of using RPC function
    const { data: codes, error } = await (supabase as any)
      .from('codes')
      .select('status')
      .eq('room_id', roomId)

    if (error) {
      console.error('Stats query error:', error)
      throw error
    }

    // Calculate stats from the codes array
    const stats = {
      total_codes: codes?.length || 0,
      pending_codes: codes?.filter((c: any) => c.status === 'pending').length || 0,
      testing_codes: codes?.filter((c: any) => c.status === 'testing').length || 0,
      failed_codes: codes?.filter((c: any) => c.status === 'failed').length || 0,
      success_codes: codes?.filter((c: any) => c.status === 'success').length || 0,
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
