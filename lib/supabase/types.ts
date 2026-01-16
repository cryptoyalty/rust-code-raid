export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          created_at?: string
        }
      }
      codes: {
        Row: {
          id: string
          room_id: string
          code: string
          status: 'pending' | 'testing' | 'success' | 'failed'
          assigned_to: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          code: string
          status?: 'pending' | 'testing' | 'success' | 'failed'
          assigned_to?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          code?: string
          status?: 'pending' | 'testing' | 'success' | 'failed'
          assigned_to?: string | null
          updated_at?: string
          created_at?: string
        }
      }
    }
    Functions: {
      get_random_code: {
        Args: { room_uuid: string }
        Returns: {
          code_id: string
          code_value: string
          new_status: string
        }[]
      }
      seed_room_codes: {
        Args: { room_uuid: string }
        Returns: number
      }
      get_room_stats: {
        Args: { room_uuid: string }
        Returns: {
          total_codes: number
          pending_codes: number
          testing_codes: number
          failed_codes: number
          success_codes: number
        }[]
      }
    }
  }
}

export type Room = Database['public']['Tables']['rooms']['Row']
export type Code = Database['public']['Tables']['codes']['Row']
export type CodeStatus = 'pending' | 'testing' | 'success' | 'failed'

export interface RoomStats {
  total_codes: number
  pending_codes: number
  testing_codes: number
  failed_codes: number
  success_codes: number
}
