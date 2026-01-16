import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { codeId: string } }
) {
  try {
    const { codeId } = params
    const { status } = await request.json()

    // Allow pending status for undo functionality
    if (!status || !['success', 'failed', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (success, failed, or pending)' },
        { status: 400 }
      )
    }

    // Create a fresh Supabase client for this API route
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('codes')
      .update({ 
        status,
        updated_at: new Date().toISOString() 
      } as any)
      .eq('id', codeId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ code: data })
  } catch (error) {
    console.error('Error updating code:', error)
    return NextResponse.json(
      { error: 'Failed to update code' },
      { status: 500 }
    )
  }
}
