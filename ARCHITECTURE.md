# Code Raid - Architecture Overview

## System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (React Components)                     │   │
│  │  - Landing Page (app/page.tsx)                          │   │
│  │  - Room Dashboard (app/room/[roomId]/page.tsx)         │   │
│  │  - Real-time State Management (React Hooks)            │   │
│  └──────────┬───────────────────────────────┬──────────────┘   │
└─────────────┼───────────────────────────────┼──────────────────┘
              │                               │
              │ HTTP/REST                     │ WebSocket
              │                               │
┌─────────────▼───────────────────────────────▼──────────────────┐
│                    Next.js API Routes                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /api/rooms (POST, GET)                                 │   │
│  │  /api/rooms/[roomId]/stats (GET)                       │   │
│  │  /api/codes/next (POST)                                │   │
│  │  /api/codes/[codeId] (PATCH)                           │   │
│  └─────────┬────────────────────────────────────────────────┘  │
└────────────┼──────────────────────────────────────────────────┘
             │
             │ PostgreSQL Protocol
             │
┌────────────▼──────────────────────────────────────────────────┐
│                    Supabase Platform                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                     │ │
│  │  ┌────────────────┐  ┌────────────────┐                │ │
│  │  │  rooms         │  │  codes         │                │ │
│  │  │  - id          │  │  - id          │                │ │
│  │  │  - name        │  │  - room_id     │                │ │
│  │  │  - active      │  │  - code        │                │ │
│  │  │  - created_at  │  │  - status      │                │ │
│  │  └────────────────┘  │  - assigned_to │                │ │
│  │                      │  - updated_at  │                │ │
│  │                      └────────────────┘                │ │
│  │                                                          │ │
│  │  Functions:                                             │ │
│  │  • get_random_code(room_uuid)   [ATOMIC]               │ │
│  │  • seed_room_codes(room_uuid)                          │ │
│  │  • get_room_stats(room_uuid)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Realtime Engine (Change Data Capture)                  │ │
│  │  - Monitors INSERT/UPDATE/DELETE on codes table        │ │
│  │  - Broadcasts changes via WebSocket                    │ │
│  │  - Presence tracking for active users                  │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

## Data Flow Diagrams

### Room Creation Flow

\`\`\`
User                 Frontend            API Route           Database
  │                     │                    │                   │
  │ 1. Click Create     │                    │                   │
  ├────────────────────>│                    │                   │
  │                     │ 2. POST /api/rooms │                   │
  │                     ├───────────────────>│                   │
  │                     │                    │ 3. INSERT room    │
  │                     │                    ├──────────────────>│
  │                     │                    │ 4. room created   │
  │                     │                    │<──────────────────┤
  │                     │                    │ 5. CALL seed_room │
  │                     │                    ├──────────────────>│
  │                     │                    │ 6. 10k codes      │
  │                     │                    │<──────────────────┤
  │                     │ 7. room + count    │                   │
  │                     │<───────────────────┤                   │
  │ 8. Redirect to room │                    │                   │
  │<────────────────────┤                    │                   │
\`\`\`

### Code Testing Flow

\`\`\`
User A              Frontend A          API               Database          Frontend B          User B
  │                     │                 │                   │                   │                 │
  │ 1. Load page        │                 │                   │                   │                 │
  ├────────────────────>│                 │                   │                   │                 │
  │                     │ 2. POST /next   │                   │                   │                 │
  │                     ├────────────────>│                   │                   │                 │
  │                     │                 │ 3. get_random()   │                   │                 │
  │                     │                 ├──────────────────>│                   │                 │
  │                     │                 │ 4. code + UPDATE  │                   │                 │
  │                     │                 │<──────────────────┤                   │                 │
  │                     │ 5. code: "0429" │                   │                   │                 │
  │                     │<────────────────┤                   │                   │                 │
  │ 6. Display "0429"   │                 │                   │                   │                 │
  │<────────────────────┤                 │                   │                   │                 │
  │                     │                 │                   │                   │                 │
  │ 7. Press X (fail)   │                 │                   │                   │                 │
  ├────────────────────>│                 │                   │                   │                 │
  │                     │ 8. PATCH status │                   │                   │                 │
  │                     ├────────────────>│                   │                   │                 │
  │                     │                 │ 9. UPDATE failed  │                   │                 │
  │                     │                 ├──────────────────>│                   │                 │
  │                     │                 │                   │ 10. CDC Event    │                 │
  │                     │                 │                   ├──────────────────>│                 │
  │                     │ 11. Realtime    │                   │                   │ 12. Update UI   │
  │                     │<────────────────┼───────────────────┤                   ├────────────────>│
  │ 13. Next code       │                 │                   │                   │ 13. +1 failed   │
  │<────────────────────┤                 │                   │                   │<────────────────┤
\`\`\`

### Real-Time Synchronization

\`\`\`
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User A    │         │   User B    │         │   User C    │
│  (Browser)  │         │  (Browser)  │         │  (Browser)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ WebSocket             │ WebSocket             │ WebSocket
       │ Connected             │ Connected             │ Connected
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Supabase Realtime  │
                    │  Channel: room-123  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PostgreSQL CDC     │
                    │  (Change Data       │
                    │   Capture)          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   codes table       │
                    │   UPDATE/INSERT     │
                    └─────────────────────┘
\`\`\`

## Component Hierarchy

\`\`\`
app/layout.tsx (Root Layout)
│
├── app/page.tsx (Landing Page)
│   ├── Terminal Icon
│   ├── Feature Grid
│   │   ├── Real-Time Sync Card
│   │   ├── 10,000 Codes Card
│   │   └── Cyber UI Card
│   ├── Create Room Section
│   │   └── Create Button
│   └── Join Room Section
│       ├── Room Name Input
│       └── Join Button
│
└── app/room/[roomId]/page.tsx (Raid Dashboard)
    ├── Header
    │   ├── Exit Button
    │   ├── Room Name
    │   └── Active Users Count
    ├── Progress Bar
    │   ├── Progress Percentage
    │   └── Status Counts
    ├── Main Grid
    │   ├── Recent Fails Sidebar
    │   │   └── Failed Code List
    │   └── Testing Area
    │       ├── Current Code Display (9xl)
    │       ├── Action Buttons
    │       │   ├── Incorrect Button (X)
    │       │   └── Correct Button (✓)
    │       └── Stats Cards
    │           ├── Testing Count
    │           ├── Failed Count
    │           └── Success Count
    └── Celebration Overlay (Conditional)
        ├── Trophy Icon
        ├── "CODE FOUND" Text
        └── Winning Code Display
\`\`\`

## State Management

### React Hooks Used

\`\`\`typescript
// Room state
const [room, setRoom] = useState<Room | null>(null)
const [stats, setStats] = useState<RoomStats>({ /* ... */ })
const [currentCode, setCurrentCode] = useState<{ id, value } | null>(null)

// UI state
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState('')
const [showCelebration, setShowCelebration] = useState(false)
const [winningCode, setWinningCode] = useState('')

// User tracking
const [userId] = useState(() => `user-${random()}`)
const [activeUsers, setActiveUsers] = useState(1)
const [recentFails, setRecentFails] = useState<string[]>([])
\`\`\`

### State Update Triggers

1. **Local Actions**
   - User clicks button → API call → State update
   
2. **Real-Time Updates**
   - Other user action → Database change → CDC → WebSocket → State update

3. **Presence Updates**
   - User joins/leaves → Presence sync → activeUsers update

## Database Indexing Strategy

\`\`\`sql
-- Primary lookup: Get codes for a specific room
CREATE INDEX idx_codes_room_id ON codes(room_id);

-- Status filtering: Find pending codes quickly
CREATE INDEX idx_codes_status ON codes(status);

-- Composite: Optimal for get_random_code()
CREATE INDEX idx_codes_room_status ON codes(room_id, status);
\`\`\`

### Query Performance

| Query | Index Used | Rows Scanned | Time |
|-------|-----------|--------------|------|
| Find pending codes for room | idx_codes_room_status | ~5000 | ~5ms |
| Random pending code | idx_codes_room_status | 1 | ~2ms |
| Update code status | Primary key | 1 | ~1ms |
| Count by status | idx_codes_room_id | 10000 | ~10ms |

## Atomicity & Concurrency

### The Race Condition Problem

Without atomic operations:
\`\`\`
Time    User A                    User B                    Database
0ms     SELECT random code
1ms                               SELECT random code        
2ms     Code: "0429"              Code: "0429"              ❌ DUPLICATE!
3ms     UPDATE status=testing
4ms                               UPDATE status=testing     ❌ CONFLICT!
\`\`\`

### The Solution: Row-Level Locking

\`\`\`sql
SELECT id, code 
FROM codes
WHERE room_id = $1 AND status = 'pending'
ORDER BY RANDOM()
LIMIT 1
FOR UPDATE SKIP LOCKED;  -- Key: Skip if locked by another transaction
\`\`\`

Result:
\`\`\`
Time    User A                    User B                    Database
0ms     SELECT ... FOR UPDATE
        → Locks "0429"
1ms                               SELECT ... SKIP LOCKED    
2ms     Code: "0429"              Code: "0817"              ✅ DIFFERENT!
3ms     UPDATE status=testing
4ms                               UPDATE status=testing     ✅ SUCCESS!
\`\`\`

## Security Model

### Current Implementation (Development)

\`\`\`sql
-- Row Level Security: ENABLED
-- Policies: PUBLIC ACCESS (for easy development)

CREATE POLICY "Allow public read access to rooms"
ON rooms FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to rooms"
ON rooms FOR INSERT WITH CHECK (true);
\`\`\`

### Production Recommendations

\`\`\`sql
-- Require authentication
CREATE POLICY "Authenticated users only"
ON rooms FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own assigned codes
CREATE POLICY "Update own codes only"
ON codes FOR UPDATE
USING (assigned_to = auth.uid());
\`\`\`

## Deployment Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Static Assets (Cached)                            │ │
│  │  - CSS, Images, Fonts                              │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Serverless Functions (Dynamic)                    │ │
│  │  - API Routes                                      │ │
│  │  - SSR Pages                                       │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Database Queries
                 │
┌────────────────▼────────────────────────────────────────┐
│              Supabase Cloud Infrastructure              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PostgreSQL (Primary)                              │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Realtime Server (WebSocket)                       │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Gateway (REST)                                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Performance Metrics (Target)

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load | < 2s | First contentful paint |
| API Response | < 200ms | 95th percentile |
| Real-time Latency | < 500ms | Code update propagation |
| Database Query | < 50ms | 99th percentile |
| Concurrent Users | 100+ | Per room |

## Monitoring Points

1. **Frontend**
   - Page load times
   - JavaScript errors
   - User interactions

2. **API Routes**
   - Response times
   - Error rates
   - Request volumes

3. **Database**
   - Query performance
   - Connection pool usage
   - Lock contention

4. **Real-time**
   - WebSocket connection count
   - Message throughput
   - Presence updates

## Scalability Considerations

### Current Capacity (Free Tier)
- **Rooms**: ~250 (500MB / 2MB per room)
- **Concurrent Users**: 200 (Realtime limit)
- **Bandwidth**: 5GB/month

### Bottlenecks
1. **Database Size**: 10,000 codes × room count
2. **WebSocket Connections**: Realtime concurrent limit
3. **API Rate Limits**: Supabase free tier

### Scaling Solutions
1. **Horizontal**: Multiple Supabase projects (sharding)
2. **Vertical**: Upgrade to Supabase Pro
3. **Optimization**: Cleanup old rooms, paginate data
4. **Caching**: Redis for stats, CDN for static assets

---

**Architecture designed for clarity, performance, and real-time collaboration** 🏗️
