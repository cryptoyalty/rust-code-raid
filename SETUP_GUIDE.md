# Code Raid - Complete Setup Guide

This guide will walk you through setting up the Code Raid application from scratch.

## Prerequisites

- **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
- **npm**: Comes with Node.js
- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)

## Step-by-Step Setup

### Step 1: Install Dependencies

Open your terminal in the project directory and run:

\`\`\`bash
npm install
\`\`\`

This will install all required packages:
- Next.js 14
- React 18
- Supabase client
- Tailwind CSS
- Lucide React icons
- TypeScript

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/sign up
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: Code Raid (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your users
   - **Plan**: Free tier is perfect for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

### Step 3: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/migrations/20260115000000_initial_schema.sql` from this project
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned"

**What this migration does:**
- Creates `rooms` and `codes` tables
- Sets up indexes for performance
- Enables Row Level Security (RLS) with public access policies
- Enables Realtime subscriptions
- Creates three PostgreSQL functions:
  - `get_random_code()`: Atomically fetches a random code
  - `seed_room_codes()`: Seeds all 10,000 codes for a room
  - `get_room_stats()`: Returns room statistics

### Step 4: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: Looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long JWT token starting with `eyJ...`

### Step 5: Configure Environment Variables

1. In the project root, create a new file called `.env.local`
2. Add your Supabase credentials:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

⚠️ **Important**: 
- Replace the values with YOUR actual credentials from Step 4
- Never commit `.env.local` to git (it's already in .gitignore)
- For production, add these as environment variables in your hosting platform

### Step 6: Start the Development Server

\`\`\`bash
npm run dev
\`\`\`

You should see:
\`\`\`
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - Ready in 2.3s
\`\`\`

### Step 7: Test the Application

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **"Initialize New Raid"**
3. You should see:
   - Room creation
   - Automatic seeding of 10,000 codes
   - Redirect to the raid dashboard
4. Open the same room in another browser tab/window to test real-time features
5. Test keyboard shortcuts:
   - Press `X` to mark code as incorrect
   - Press `Enter` to mark code as correct

## Verification Checklist

After setup, verify these features work:

- [ ] Landing page loads with cyber-terminal theme
- [ ] Can create a new room (generates name like "Raid-4959932")
- [ ] Can join existing room by name
- [ ] Room dashboard shows a 4-digit code (e.g., "0429")
- [ ] Progress bar shows "0 / 10,000" initially
- [ ] Keyboard shortcuts work (X and Enter)
- [ ] Marking code as incorrect adds it to "Recent Fails" sidebar
- [ ] Progress updates in real-time
- [ ] Active users count shows at least 1
- [ ] Marking code as correct shows celebration overlay
- [ ] Opening room in multiple tabs shows real-time sync

## Troubleshooting

### "Failed to create room"
- **Check**: Did you run the database migration?
- **Check**: Are your Supabase credentials correct in `.env.local`?
- **Check**: Is your Supabase project active (check dashboard)?

### "No codes available"
- **Check**: Look in Supabase dashboard > Table Editor > `codes` table
- **Check**: Should see 10,000 rows for your room
- **Fix**: If empty, run this SQL in Supabase:
  \`\`\`sql
  SELECT seed_room_codes('your-room-id-here');
  \`\`\`

### Real-time not working
- **Check**: Go to Supabase > Database > Replication
- **Check**: Both `rooms` and `codes` tables should have Realtime enabled
- **Fix**: Run these SQL commands:
  \`\`\`sql
  ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  ALTER PUBLICATION supabase_realtime ADD TABLE codes;
  \`\`\`

### TypeScript errors
- **Fix**: Delete `.next` folder and `node_modules`, then:
  \`\`\`bash
  npm install
  npm run dev
  \`\`\`

### Port 3000 already in use
- **Fix**: Kill the process or use a different port:
  \`\`\`bash
  npm run dev -- -p 3001
  \`\`\`

## Database Inspection

To inspect your database directly:

1. Go to Supabase dashboard
2. Click **Table Editor**
3. View `rooms` and `codes` tables
4. Check the data structure matches the schema

To run queries:
1. Go to **SQL Editor**
2. Run queries like:
   \`\`\`sql
   -- See all rooms
   SELECT * FROM rooms;
   
   -- Count codes by status for a room
   SELECT status, COUNT(*) 
   FROM codes 
   WHERE room_id = 'your-room-id'
   GROUP BY status;
   
   -- Get room stats
   SELECT * FROM get_room_stats('your-room-id');
   \`\`\`

## Production Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Database Considerations

- **Free Tier Limits**: 500MB database, 50,000 monthly active users
- **Each room uses**: ~10,000 rows in `codes` table (about 1-2MB)
- **Recommendation**: Implement cleanup for old/inactive rooms
- **Scaling**: Consider upgrading to Supabase Pro for production traffic

### Security Enhancements for Production

The current RLS policies allow public access. For production, consider:

1. **Authentication**: Add Supabase Auth
   \`\`\`sql
   CREATE POLICY "Users can only access rooms they created"
   ON rooms FOR SELECT
   USING (auth.uid() = created_by);
   \`\`\`

2. **Rate Limiting**: Add rate limiting to API routes

3. **Room Passwords**: Add password protection to rooms

4. **Expiration**: Auto-delete rooms after 24 hours

## Next Steps

Now that your app is running:

1. **Customize**: Edit colors in `tailwind.config.ts`
2. **Add Features**: See README.md for contribution ideas
3. **Share**: Invite friends to test the real-time features
4. **Deploy**: Push to production when ready

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Review this guide again
4. Check the main README.md for architecture details

Happy coding! 🚀
