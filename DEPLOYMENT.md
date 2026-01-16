# Deployment Guide for Code Raid

This guide covers deploying Code Raid to production environments.

## Quick Deploy to Vercel (Recommended)

Vercel is the easiest deployment option for Next.js applications.

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- Supabase project with migration applied

### Steps

1. **Push to GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/code-raid.git
   git push -u origin main
   \`\`\`

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables**
   In Vercel project settings → Environment Variables:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
   \`\`\`

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live! 🚀

## Deploy to Netlify

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18 or higher

2. **Environment Variables**
   Add the same variables as Vercel

3. **Deploy**
   - Connect GitHub repo
   - Configure build settings
   - Deploy!

## Deploy with Docker

### Dockerfile
Create a `Dockerfile` in the project root:

\`\`\`dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
\`\`\`

### Build and Run
\`\`\`bash
docker build -t code-raid .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  code-raid
\`\`\`

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |

⚠️ **Security Note**: The `NEXT_PUBLIC_` prefix exposes these variables to the browser. This is safe for the anonymous key, but never expose service role keys!

## Post-Deployment Checklist

After deploying, verify:

- [ ] Landing page loads correctly
- [ ] Can create new rooms
- [ ] Can join existing rooms
- [ ] Real-time updates work across multiple browser tabs
- [ ] Keyboard shortcuts function properly
- [ ] Progress bar updates in real-time
- [ ] Celebration overlay appears when code marked as correct
- [ ] Active users count is accurate
- [ ] No console errors in browser dev tools

## Performance Optimization

### Edge Functions
Consider using Vercel Edge Functions for faster response times:

\`\`\`typescript
// app/api/codes/next/route.ts
export const runtime = 'edge'
\`\`\`

### Database Indexing
Already included in migration:
- Index on `codes.room_id`
- Index on `codes.status`
- Composite index on `codes(room_id, status)`

### Caching Strategy
Add caching headers to static API responses:

\`\`\`typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
  },
})
\`\`\`

## Monitoring & Analytics

### Supabase Dashboard
Monitor your database:
- **Database** → Check table sizes
- **Logs** → Review query performance
- **API** → Check API usage

### Vercel Analytics
Enable in Vercel dashboard:
- Performance metrics
- User geography
- Page views

### Error Tracking
Consider integrating:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **PostHog**: Product analytics

## Scaling Considerations

### Database
- **Free tier**: 500MB, 50,000 MAU
- **Pro tier**: 8GB+, 100,000+ MAU
- Monitor table sizes: Each room = ~1-2MB

### Compute
- Vercel free tier: 100GB bandwidth/month
- Edge Functions: Faster global response times
- Consider CDN for static assets

### Cost Estimates

| Users/Month | Vercel | Supabase | Total |
|-------------|--------|----------|-------|
| 0-1,000 | Free | Free | $0 |
| 1,000-10,000 | Free-$20 | $25 | $25-45 |
| 10,000-100,000 | $20+ | $25-100 | $45-120 |

## Production Security

### Current Setup (Development)
- ✅ RLS enabled
- ✅ Public read/write policies
- ⚠️ No authentication
- ⚠️ No rate limiting

### Recommended for Production

1. **Add Authentication**
   \`\`\`bash
   npm install @supabase/auth-helpers-nextjs
   \`\`\`

2. **Update RLS Policies**
   \`\`\`sql
   DROP POLICY "Allow public read access to rooms" ON rooms;
   
   CREATE POLICY "Authenticated users can read rooms"
   ON rooms FOR SELECT
   TO authenticated
   USING (true);
   \`\`\`

3. **Add Rate Limiting**
   - Use Vercel's edge middleware
   - Or integrate Upstash Rate Limiting

4. **Input Validation**
   - Add Zod for runtime type checking
   - Sanitize room names

5. **CORS Configuration**
   - Restrict to your domain only
   - Set in Supabase dashboard

## Maintenance

### Regular Tasks

**Weekly**
- Check error logs in Vercel
- Review Supabase usage metrics
- Test core functionality

**Monthly**
- Review database size growth
- Clean up inactive rooms (>30 days)
- Update dependencies

**Quarterly**
- Security audit
- Performance review
- Cost optimization

### Database Cleanup Script

Run this SQL monthly to clean up old rooms:

\`\`\`sql
-- Delete rooms older than 30 days with no activity
DELETE FROM rooms 
WHERE created_at < NOW() - INTERVAL '30 days'
AND id NOT IN (
  SELECT DISTINCT room_id 
  FROM codes 
  WHERE updated_at > NOW() - INTERVAL '7 days'
);
\`\`\`

## Troubleshooting Production Issues

### Real-time Disconnects
- Check Supabase Realtime quota
- Verify WebSocket connections aren't blocked
- Increase timeout values if needed

### Slow Database Queries
- Review query performance in Supabase logs
- Add additional indexes if needed
- Consider connection pooling

### High Costs
- Implement room expiration
- Add user limits per room
- Cache frequently accessed data

## Rollback Plan

If deployment fails:

1. **Vercel**: Use "Rollback" button in deployments
2. **Database**: Keep migration backups
   \`\`\`bash
   pg_dump your_database > backup.sql
   \`\`\`
3. **Environment**: Keep previous `.env` values

## Support & Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Support](https://vercel.com/support)

---

**Ready to deploy? Follow the Quick Deploy section above! 🚀**
