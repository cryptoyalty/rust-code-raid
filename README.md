# Code Raid 🚀

A real-time collaborative code-breaking web application built with Next.js, Tailwind CSS, and Supabase. Teams can work together to test 10,000 codes simultaneously with live progress tracking and presence awareness.

![Code Raid Demo](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Real--time-green?style=for-the-badge&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

## ✨ Features

- **Real-Time Collaboration**: See live updates from all team members
- **Atomic Code Distribution**: PostgreSQL function ensures no two users get the same code
- **Presence Tracking**: See how many raiders are active in your room
- **Progress Visualization**: Live progress bar showing X/10,000 codes tested
- **Celebration Overlay**: Instant notification when ANY user finds the correct code
- **Keyboard Shortcuts**: Fast testing with X/← for incorrect, Enter/Space for correct
- **Cyber-Terminal UI**: Dark mode with neon green/red accents

## 🏗️ Architecture

### Database Schema
- `rooms` table: Stores raid sessions with unique names
- `codes` table: 10,000 codes (0000-9999) per room with status tracking
- Atomic `get_random_code()` function: Ensures thread-safe code distribution
- `seed_room_codes()` function: Efficiently seeds all codes on room creation

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS with custom cyber-terminal theme
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Supabase Realtime (WebSockets)
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works great)

### 1. Clone the Repository
\`\`\`bash
git clone <your-repo-url>
cd code-raid
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy and paste the contents of `supabase/migrations/20260115000000_initial_schema.sql`
4. Run the migration
5. Go to **Settings** > **API** to get your credentials

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
\`\`\`

### 5. Run the Development Server
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Use

### Creating a Raid
1. Click **"Initialize New Raid"** on the home page
2. A unique room name (e.g., `Raid-4959932`) is automatically generated
3. Share this room name with your team
4. The app automatically seeds 10,000 codes for testing

### Joining a Raid
1. Click **"Connect to Raid"** on the home page
2. Enter the room name provided by your team
3. Start testing codes immediately

### Testing Codes
- **Incorrect**: Click the red X button or press `X` or `←`
- **Correct**: Click the green CHECK button or press `Enter` or `Space`
- Watch the progress bar update in real-time as your team works

### Finding the Code
When ANY user marks a code as correct, ALL users in the room see a celebration overlay with the winning code!

## 📁 Project Structure

\`\`\`
code-raid/
├── app/
│   ├── api/
│   │   ├── rooms/           # Room CRUD operations
│   │   └── codes/           # Code fetching & updating
│   ├── room/[roomId]/       # Main raid dashboard
│   ├── page.tsx             # Landing page
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── lib/
│   └── supabase/
│       ├── client.ts        # Supabase client config
│       └── types.ts         # TypeScript types
├── supabase/
│   └── migrations/          # Database migrations
├── package.json
├── tailwind.config.ts
└── tsconfig.json
\`\`\`

## 🔐 Database Functions

### `get_random_code(room_uuid)`
Atomically selects a random pending code and marks it as "testing". Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions.

### `seed_room_codes(room_uuid)`
Efficiently inserts all 10,000 codes (0000-9999) for a new room using PostgreSQL's `generate_series`.

### `get_room_stats(room_uuid)`
Returns aggregated statistics: total codes, pending, testing, failed, and success counts.

## 🎨 Customization

### Color Scheme
Edit `tailwind.config.ts` to customize the cyber-terminal theme:
- `cyber-bg`: Main background
- `neon-green`: Success/primary actions
- `neon-red`: Failures/warnings
- `neon-blue`: Info/secondary actions

### Code Range
To change from 10,000 codes to a different range, modify the `seed_room_codes` function in the migration file:
\`\`\`sql
FROM generate_series(0, 9999)  -- Change 9999 to your desired max
\`\`\`

## 🚀 Deployment

### Deploy to Vercel
\`\`\`bash
npm run build
\`\`\`

Push to GitHub and connect to Vercel. Add your environment variables in the Vercel dashboard.

### Database Considerations
- Supabase free tier: 500MB database, 50,000 monthly active users
- Each room uses ~10,000 rows in the `codes` table
- Consider cleanup scripts for inactive rooms in production

## 🤝 Contributing

Contributions welcome! Some ideas:
- Add authentication for persistent user profiles
- Implement room passwords for private raids
- Add difficulty levels (fewer codes)
- Create leaderboards for fastest solvers
- Add sound effects and animations

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🙏 Acknowledgments

Built with ❤️ using:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Happy Raiding! 🎯**
