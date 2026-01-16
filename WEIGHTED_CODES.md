# Weighted Code Selection System

## Overview

The Code Raid app now uses **weighted randomization** based on real-world PIN frequency data. This means that more commonly used PIN codes (like `1234`, `0000`, `1111`) are **more likely** to appear during raids, making the raiding experience more realistic and efficient.

## How It Works

### Weighting Algorithm

Codes are weighted based on their rank in the most common PIN list:

| Rank Range | Weight Multiplier | Description |
|-----------|------------------|-------------|
| **1-10** | 10x | High Priority (most common) |
| **11-1,000** | 15x | Very High (top common codes) |
| **1,001-3,000** | 10x | High |
| **3,001-5,000** | 5x | Medium |
| **5,001-10,000** | 3x | Low |
| **Not in list** | 1x | Very Low (uncommon codes) |

### Example

- Code `1234` (rank #1) has a weight of **10**
- Code `7777` (rank #11) has a weight of **15**
- Code `1245` (rank #115) has a weight of **15**
- Code `8642` (rank #1683) has a weight of **10**
- Code `4516` (rank #6301) has a weight of **3**
- Code `3827` (not in list) has a weight of **1**

This means **`7777` is 15x more likely** to be selected than an unlisted code, but still random within its weight class.

## Setup Instructions

### 1. Run the Database Migration

The weighted selection system requires a new database table and updated function. Run the migration:

```bash
# Apply the migration to your Supabase database
# In Supabase Dashboard: SQL Editor > paste contents of:
# supabase/migrations/20260116000000_weighted_code_selection.sql
```

### 2. Seed the Common PINs Data

The system needs the list of 10,000 common PINs loaded into the database.

**Option A: Using the Script (Recommended)**

1. Install dependencies:
```bash
npm install
```

2. Make sure your `.env.local` has Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

3. Edit `scripts/seed-common-pins.ts` and paste the FULL list of 10,000 PIN codes into the `COMMON_PINS` constant (the complete list you provided).

4. Run the seeding script:
```bash
npm run seed-pins
```

**Option B: Manual SQL Insert**

Alternatively, you can manually insert the data using SQL in the Supabase dashboard by running the `supabase/seed_common_pins.sql` file (you'll need to complete it with all 10,000 codes).

### 3. Verify It's Working

1. Create a new raid room
2. Start testing codes
3. You should notice common codes like `1234`, `0000`, `1111` appearing much more frequently

## Benefits

✅ **More Realistic**: Mirrors real-world PIN usage patterns
✅ **Faster Success**: Higher probability of finding the correct code quickly
✅ **Still Random**: Maintains unpredictability within weight classes
✅ **Configurable**: Easy to adjust weights in the migration file

## Technical Details

### Database Function

The `get_random_code()` function now uses this query:

```sql
SELECT c.id, c.code
FROM codes c
LEFT JOIN common_pins cp ON c.code = cp.code
WHERE c.room_id = room_uuid AND c.status = 'pending'
ORDER BY (
    CASE 
        WHEN cp.rank IS NULL THEN random() * 1    -- Not in list: 1x
        WHEN cp.rank <= 10 THEN random() * 10     -- Top 10: 10x
        WHEN cp.rank <= 1000 THEN random() * 15   -- Top 1000: 15x
        WHEN cp.rank <= 3000 THEN random() * 10   -- Top 3000: 10x
        WHEN cp.rank <= 5000 THEN random() * 5    -- Top 5000: 5x
        ELSE random() * 3                          -- Rest: 3x
    END
) DESC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

This ensures:
- **Atomic selection** (no duplicate codes)
- **Weighted randomization** (common codes prioritized)
- **Thread-safe** (multiple raiders can work simultaneously)

## Customization

Want to adjust the weights? Edit the CASE statement in `supabase/migrations/20260116000000_weighted_code_selection.sql` and reapply the migration.

Example: Make top 1000 codes even more likely:
```sql
WHEN cp.rank <= 1000 THEN random() * 25  -- Changed from 15 to 25
```

## Troubleshooting

**Q: Codes still seem purely random**
- Verify the `common_pins` table is populated: `SELECT COUNT(*) FROM common_pins;` should return 10000
- Check the migration was applied successfully

**Q: Seeding script fails**
- Ensure your `.env.local` has correct Supabase credentials
- Check that you have the `common_pins` table created
- Try running the migration first

**Q: Want to disable weighted selection**
- Simply revert to the original `get_random_code()` function from the initial migration

---

Made with 💚 by **cryp** | [Steam](https://steamcommunity.com/id/crypCS/) | [Twitter](https://x.com/crypCS)
