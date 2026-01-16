# Code Raid - Project Summary

## Overview
Code Raid is a real-time collaborative web application where teams work together to test 10,000 codes (0000-9999) simultaneously. Built with Next.js 14, Supabase, and Tailwind CSS.

## Tech Stack

### Frontend
- **Framework**: Next.js 14.1.0 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.3+ (Custom cyber-terminal theme)
- **UI Library**: Lucide React (Icons)
- **State Management**: React Hooks + Supabase Realtime

### Backend
- **API**: Next.js API Routes (App Router)
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Supabase Realtime (WebSockets)
- **Authentication**: None (optional enhancement)

## Architecture

### Database Schema

**rooms table**
\`\`\`sql
id          UUID PRIMARY KEY
name        TEXT UNIQUE NOT NULL
active      BOOLEAN DEFAULT true
created_at  TIMESTAMP
\`\`\`

**codes table**
\`\`\`sql
id          UUID PRIMARY KEY
room_id     UUID REFERENCES rooms(id)
code        TEXT (e.g., "0429")
status      TEXT ('pending', 'testing', 'success', 'failed')
assigned_to TEXT (optional user identifier)
updated_at  TIMESTAMP
created_at  TIMESTAMP
\`\`\`

### Critical Database Functions

1. **get_random_code(room_uuid)**
   - Atomically selects one random pending code
   - Immediately updates status to 'testing'
   - Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
   - Returns code to frontend
   - **Ensures no duplicate code assignments**

2. **seed_room_codes(room_uuid)**
   - Inserts all 10,000 codes (0000-9999) for a new room
   - Uses PostgreSQL's `generate_series` for efficiency
   - Pads numbers with leading zeros (LPAD)
   - Returns count of inserted codes

3. **get_room_stats(room_uuid)**
   - Aggregates code statistics
   - Returns: total, pending, testing, failed, success counts
   - Used for progress tracking

## File Structure

\`\`\`
code-raid/
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── rooms/
│   │   │   ├── route.ts          # POST: create room, GET: find room
│   │   │   └── [roomId]/
│   │   │       └── stats/
│   │   │           └── route.ts  # GET: room statistics
│   │   └── codes/
│   │       ├── next/
│   │       │   └── route.ts      # POST: get next random code
│   │       └── [codeId]/
│   │           └── route.ts      # PATCH: update code status
│   │
│   ├── room/
│   │   └── [roomId]/
│   │       └── page.tsx          # Main raid dashboard
│   │
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles + cyber theme
│   └── favicon.ico               # 🚀 emoji favicon
│
├── lib/
│   └── supabase/
│       ├── client.ts             # Supabase client configuration
│       └── types.ts              # TypeScript types & database types
│
├── supabase/
│   └── migrations/
│       └── 20260115000000_initial_schema.sql
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind + custom theme
├── postcss.config.mjs            # PostCSS config
├── next.config.mjs               # Next.js config
├── .gitignore                    # Git ignore rules
│
├── README.md                     # Main documentation
├── SETUP_GUIDE.md                # Step-by-step setup
├── DEPLOYMENT.md                 # Production deployment
└── PROJECT_SUMMARY.md            # This file
\`\`\`

## Key Features

### 1. Real-Time Synchronization
- **Technology**: Supabase Realtime (PostgreSQL CDC)
- **Updates**: All code status changes broadcast to all users
- **Latency**: Sub-second updates via WebSockets
- **Implementation**: `postgres_changes` subscriptions

### 2. Presence Tracking
- **Technology**: Supabase Presence API
- **Shows**: Number of active raiders in room
- **Heartbeat**: Automatic presence updates
- **Channel**: `presence:${roomId}`

### 3. Atomic Code Distribution
- **Problem**: Multiple users must not get the same code
- **Solution**: PostgreSQL function with row-level locking
- **Mechanism**: `FOR UPDATE SKIP LOCKED`
- **Result**: Thread-safe, randomized code distribution

### 4. Progress Visualization
- **Live Progress Bar**: Shows X / 10,000 codes tested
- **Statistics**: Pending, Testing, Failed, Success counts
- **Real-Time Updates**: Via Supabase subscriptions
- **Visual Design**: Gradient progress bar with neon colors

### 5. Keyboard Shortcuts
- **X** or **←**: Mark code as incorrect
- **Enter** or **Space**: Mark code as correct
- **Implementation**: Event listeners with state checks
- **UX**: Fast testing without mouse

### 6. Celebration Overlay
- **Trigger**: ANY user marks code as 'success'
- **Display**: Full-screen overlay with winning code
- **Animation**: Trophy icon, pulsing text, neon glow
- **Broadcast**: Real-time to all users in room
- **Dismissal**: Click anywhere to close

### 7. Recent Fails Sidebar
- **Shows**: Last 10 failed codes
- **Updates**: Real-time as codes fail
- **Design**: Red-bordered cards with neon glow
- **Purpose**: Avoid duplicate manual testing

## User Flow

### Creating a Room
1. User clicks "Initialize New Raid"
2. Backend generates unique name (e.g., "Raid-4959932")
3. Room created in database
4. `seed_room_codes()` inserts 10,000 codes
5. User redirected to room dashboard
6. First code automatically loaded

### Joining a Room
1. User enters room name
2. Backend queries room by name
3. If found, user redirected to dashboard
4. Joins Presence channel
5. Subscribes to real-time updates
6. First code loaded

### Testing Codes
1. User sees 4-digit code (e.g., "0429")
2. User decides: Incorrect or Correct
3. **If Incorrect**:
   - PATCH request updates status to 'failed'
   - Code added to Recent Fails
   - Next random code fetched
   - Progress bar updates
4. **If Correct**:
   - PATCH request updates status to 'success'
   - Celebration overlay shown to ALL users
   - Room essentially "won"

## Real-Time Flow

\`\`\`
User Action → API Route → Database Update → PostgreSQL CDC
     ↓                                            ↓
Supabase Realtime ← WebSocket Connection ← All Subscribed Users
     ↓
React State Update → UI Re-render
\`\`\`

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/rooms` | Create new room |
| GET | `/api/rooms?name=X` | Find room by name |
| GET | `/api/rooms/[roomId]/stats` | Get room statistics |
| POST | `/api/codes/next` | Get next random code |
| PATCH | `/api/codes/[codeId]` | Update code status |

## Styling System

### Color Palette
- **Background**: `#0a0e27` (cyber-bg)
- **Surface**: `#151b3d` (cyber-surface)
- **Border**: `#1e2749` (cyber-border)
- **Success**: `#00ff41` (neon-green)
- **Error**: `#ff0055` (neon-red)
- **Info**: `#00d9ff` (neon-blue)

### Visual Effects
- **Scanline**: Animated vertical line (cyber feel)
- **Text Shadow**: Neon glow on important text
- **Box Shadow**: Neon glow on buttons/cards
- **Grid Background**: Subtle animated grid
- **Pulse Animation**: On active elements

### Typography
- **Font**: Monospace (system font)
- **Weights**: Bold for emphasis
- **Code Display**: 9xl size (144px)
- **Tracking**: Wide letter spacing

## Performance Optimizations

### Database
- **Indexes**: On `room_id`, `status`, and composite
- **Row Locking**: `SKIP LOCKED` prevents contention
- **Efficient Seeding**: `generate_series` batch insert

### Frontend
- **React Hooks**: Optimized state management
- **Cleanup**: Proper subscription teardown
- **Conditional Rendering**: Only show needed components
- **Debouncing**: Prevent rapid re-fetches

### Real-Time
- **Channel Isolation**: One channel per room
- **Selective Updates**: Only relevant changes trigger re-renders
- **Presence Throttling**: Limited heartbeat frequency

## Security Considerations

### Current (Development)
- ✅ Row Level Security (RLS) enabled
- ✅ Public read/write policies (for easy testing)
- ⚠️ No authentication required
- ⚠️ No rate limiting
- ⚠️ No input sanitization

### Recommended (Production)
- Add Supabase Auth
- Restrict RLS policies to authenticated users
- Implement rate limiting (Upstash)
- Add input validation (Zod)
- Add room passwords
- Implement room expiration

## Scalability

### Current Limits (Free Tier)
- **Database**: 500MB (~250 rooms)
- **Connections**: 60 concurrent
- **Bandwidth**: 5GB/month
- **Realtime**: 200 concurrent connections

### Optimization Strategies
1. **Room Cleanup**: Delete inactive rooms
2. **Pagination**: Limit recent fails display
3. **Caching**: Cache room stats briefly
4. **CDN**: Use Vercel Edge for static assets
5. **Database Upgrade**: Scale to Pro tier

## Testing Strategy

### Manual Testing Checklist
- [ ] Room creation with unique name
- [ ] Room joining with existing name
- [ ] Code fetching returns random codes
- [ ] No duplicate codes across users
- [ ] Status updates reflect immediately
- [ ] Progress bar calculates correctly
- [ ] Presence count updates
- [ ] Celebration overlay triggers
- [ ] Keyboard shortcuts work
- [ ] Real-time sync across tabs

### Automated Testing (Future)
- Unit tests for API routes
- Integration tests for database functions
- E2E tests for user flows (Playwright)
- Load testing for concurrent users

## Future Enhancements

### Short Term
- [ ] Add room passwords
- [ ] Show username/avatar for presence
- [ ] Add sound effects
- [ ] Implement "Skip" button
- [ ] Export results as CSV

### Medium Term
- [ ] User authentication
- [ ] Persistent user profiles
- [ ] Leaderboards (fastest solver)
- [ ] Custom code ranges (not just 0000-9999)
- [ ] Team vs Team mode

### Long Term
- [ ] Voice chat integration
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] API for external integrations
- [ ] Plugin system

## Dependencies

### Production
- `next`: ^14.1.0 (Framework)
- `react`: ^18.2.0 (UI Library)
- `react-dom`: ^18.2.0 (React DOM)
- `@supabase/supabase-js`: ^2.39.3 (Supabase Client)
- `lucide-react`: ^0.314.0 (Icons)

### Development
- `typescript`: ^5 (Type Safety)
- `@types/node`: ^20 (Node Types)
- `@types/react`: ^18 (React Types)
- `@types/react-dom`: ^18 (React DOM Types)
- `tailwindcss`: ^3.3.0 (Styling)
- `autoprefixer`: ^10.0.1 (CSS Compatibility)
- `postcss`: ^8 (CSS Processing)

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## Build & Deploy

### Local Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Production Build
\`\`\`bash
npm run build
npm start
\`\`\`

### Deploy to Vercel
- Push to GitHub
- Import repo in Vercel
- Add environment variables
- Deploy automatically

## Support & Documentation

- **README.md**: Overview and quick start
- **SETUP_GUIDE.md**: Step-by-step setup instructions
- **DEPLOYMENT.md**: Production deployment guide
- **PROJECT_SUMMARY.md**: This comprehensive overview

## License

MIT License - Free to use, modify, and distribute.

---

**Built with ❤️ by a Senior Full-Stack Engineer**

Last Updated: January 15, 2026
