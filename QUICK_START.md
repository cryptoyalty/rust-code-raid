# Quick Start Guide ⚡

Get Code Raid running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free)

## 1️⃣ Install (30 seconds)

\`\`\`bash
npm install
\`\`\`

## 2️⃣ Set Up Supabase (2 minutes)

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New query**
3. Copy/paste from `supabase/migrations/20260115000000_initial_schema.sql`
4. Click **Run** ▶️

## 3️⃣ Configure Environment (1 minute)

Create `.env.local`:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-key-here
\`\`\`

Get these from: **Supabase Dashboard** → **Settings** → **API**

## 4️⃣ Run (10 seconds)

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## 5️⃣ Test (1 minute)

1. Click **"Initialize New Raid"**
2. Open the same URL in another tab
3. Test keyboard shortcuts:
   - Press `X` for incorrect
   - Press `Enter` for correct
4. Watch real-time updates! 🎉

## Troubleshooting

**"Failed to create room"**
- Did you run the SQL migration?
- Check `.env.local` has correct credentials

**"No codes available"**
- Room wasn't seeded properly
- Check Supabase logs

**Real-time not working**
- Ensure Realtime is enabled on both tables
- Check browser console for WebSocket errors

## Next Steps

- 📖 Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
- 🚀 Read [DEPLOYMENT.md](DEPLOYMENT.md) to go live
- 📚 Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) to understand architecture

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `X` or `←` | Mark code as incorrect |
| `Enter` or `Space` | Mark code as correct |

## File Structure

\`\`\`
code-raid/
├── app/                    # Next.js pages & API
│   ├── page.tsx           # Landing page
│   └── room/[roomId]/     # Raid dashboard
├── lib/supabase/          # Database client
├── supabase/migrations/   # SQL schema
└── .env.local            # Your credentials (create this!)
\`\`\`

## Key Features

✅ **Real-time sync** - See updates instantly across all users  
✅ **10,000 codes** - Test 0000-9999 collaboratively  
✅ **No duplicates** - Atomic database function ensures uniqueness  
✅ **Keyboard shortcuts** - Fast testing without clicking  
✅ **Celebration overlay** - Victory screen when code found  
✅ **Presence tracking** - See active raiders count  

## Common Commands

\`\`\`bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Check for errors
\`\`\`

## API Endpoints

\`\`\`
POST   /api/rooms              # Create room
GET    /api/rooms?name=X       # Find room
GET    /api/rooms/[id]/stats   # Get statistics
POST   /api/codes/next         # Get random code
PATCH  /api/codes/[id]         # Update code status
\`\`\`

## Database Functions

\`\`\`sql
-- Get random code (atomic, no duplicates)
SELECT * FROM get_random_code('room-uuid');

-- Seed 10,000 codes for a room
SELECT seed_room_codes('room-uuid');

-- Get room statistics
SELECT * FROM get_room_stats('room-uuid');
\`\`\`

## Need Help?

1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed troubleshooting
2. Review browser console for errors
3. Check Supabase logs in dashboard
4. Verify environment variables are set correctly

---

**Happy Raiding! 🎯**

Got it working? Star the repo and share with your team!
