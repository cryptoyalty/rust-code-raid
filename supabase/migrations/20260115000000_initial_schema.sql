-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create codes table
CREATE TABLE IF NOT EXISTS codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'success', 'failed')),
    assigned_to TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_codes_room_id ON codes(room_id);
CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);
CREATE INDEX IF NOT EXISTS idx_codes_room_status ON codes(room_id, status);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated and anonymous users to read/write
-- (For a production app, you'd want more restrictive policies)
CREATE POLICY "Allow public read access to rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to rooms" ON rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to codes" ON codes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to codes" ON codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to codes" ON codes FOR UPDATE USING (true);

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE codes;

-- CRITICAL: Atomic function to get a random code and mark it as testing
-- This ensures no two users ever get the same code
CREATE OR REPLACE FUNCTION get_random_code(room_uuid UUID)
RETURNS TABLE (
    code_id UUID,
    code_value TEXT,
    new_status TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    selected_code_id UUID;
    selected_code_value TEXT;
BEGIN
    -- Select and lock a random pending code atomically
    SELECT id, code INTO selected_code_id, selected_code_value
    FROM codes
    WHERE room_id = room_uuid AND status = 'pending'
    ORDER BY RANDOM()
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- If we found a code, update its status to 'testing'
    IF selected_code_id IS NOT NULL THEN
        UPDATE codes
        SET status = 'testing', updated_at = NOW()
        WHERE id = selected_code_id;
        
        -- Return the code information
        RETURN QUERY
        SELECT selected_code_id, selected_code_value, 'testing'::TEXT;
    ELSE
        -- No pending codes available
        RETURN QUERY
        SELECT NULL::UUID, NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$;

-- Function to seed all 10,000 codes for a room
CREATE OR REPLACE FUNCTION seed_room_codes(room_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    -- Insert all codes from 0000 to 9999
    WITH code_series AS (
        SELECT 
            room_uuid as room_id,
            LPAD(generate_series::TEXT, 4, '0') as code
        FROM generate_series(0, 9999)
    )
    INSERT INTO codes (room_id, code, status)
    SELECT room_id, code, 'pending'
    FROM code_series;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;

-- Function to get room statistics
CREATE OR REPLACE FUNCTION get_room_stats(room_uuid UUID)
RETURNS TABLE (
    total_codes BIGINT,
    pending_codes BIGINT,
    testing_codes BIGINT,
    failed_codes BIGINT,
    success_codes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_codes,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_codes,
        COUNT(*) FILTER (WHERE status = 'testing')::BIGINT as testing_codes,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_codes,
        COUNT(*) FILTER (WHERE status = 'success')::BIGINT as success_codes
    FROM codes
    WHERE room_id = room_uuid;
END;
$$;
