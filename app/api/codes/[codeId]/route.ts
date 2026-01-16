import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

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

    const { data, error } = await supabase
      .from('codes')
      .update({ 
        status: status as string,
        updated_at: new Date().toISOString() 
      })
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
