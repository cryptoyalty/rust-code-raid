import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a new room
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // Create a fresh Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Create the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ name, active: true } as any)
      .select()
      .single()

    if (roomError) {
      if (roomError.code === '23505') {
        return NextResponse.json(
          { error: 'Room name already exists' },
          { status: 409 }
        )
      }
      throw roomError
    }

    // Seed the room with all 10,000 codes
    const { data: seedResult, error: seedError } = await supabase
      .rpc('seed_room_codes', { room_uuid: room.id } as any)

    if (seedError) {
      console.error('Error seeding codes:', seedError)
      // Still return the room even if seeding fails
    }

    return NextResponse.json({ 
      room,
      codes_seeded: seedResult || 0
    })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}

// Get room by name
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // Create a fresh Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('name', name)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    )
  }
}
