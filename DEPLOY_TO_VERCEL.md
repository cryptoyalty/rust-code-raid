# Deploy Rust Code Raid to GitHub & Vercel

## Prerequisites

- GitHub account (free)
- Vercel account (free) - sign up at [vercel.com](https://vercel.com)
- Your Supabase project already set up

## Step 1: Push to GitHub

### 1.1 Create a new repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `rust-code-raid` (or whatever you prefer)
3. Make it **Public** or **Private** (both work with Vercel free)
4. **Do NOT** initialize with README (you already have code)
5. Click **Create repository**

### 1.2 Push your local code to GitHub

Open your terminal in the project directory and run:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit - Rust Code Raid"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/rust-code-raid.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** Replace `YOUR_USERNAME` with your GitHub username and `rust-code-raid` with your repo name.

## Step 2: Deploy to Vercel

### 2.1 Import your project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Authorize Vercel to access your GitHub account if needed
5. Find your `rust-code-raid` repository and click **"Import"**

### 2.2 Configure your project

Vercel will auto-detect that it's a Next.js project. Configure these settings:

- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)

### 2.3 Add Environment Variables

**CRITICAL:** Add your Supabase credentials as environment variables.

In the Vercel deployment screen:

1. Expand **"Environment Variables"**
2. Add these two variables:

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: your_supabase_project_url

Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: your_supabase_anon_key
```

**How to find these values:**
- Go to your Supabase dashboard
- Click your project
- Go to **Settings** → **API**
- Copy **Project URL** and **anon/public** key

### 2.4 Deploy!

1. Click **"Deploy"**
2. Wait 1-2 minutes for build to complete
3. Your site will be live at `https://your-project-name.vercel.app`

## Step 3: Run Database Migrations

Your app is deployed, but the database needs to be set up:

### 3.1 Apply the migrations in Supabase

1. Go to your Supabase dashboard
2. Click **SQL Editor**
3. Create a new query
4. Copy and paste the contents of:
   - `supabase/migrations/20260115000000_initial_schema.sql`
5. Click **RUN**
6. Then do the same for:
   - `supabase/migrations/20260116000000_weighted_code_selection.sql`

### 3.2 (Optional) Seed the weighted codes

If you want the weighted code selection:

**Option A: Using the script**
1. On your local machine, run:
   ```bash
   npm install
   npm run seed-pins
   ```

**Option B: Manual SQL**
You'll need to manually insert all 10,000 common PINs into the `common_pins` table via SQL. (The script is much easier!)

## Step 4: Test Your Deployment

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Create a test raid room
3. Verify codes are loading
4. Test the X and Correct buttons
5. Check real-time updates work

## Step 5: Custom Domain (Optional)

Want a custom domain like `raidcodes.com`?

1. Buy a domain from any registrar (Namecheap, Google Domains, etc.)
2. In Vercel dashboard:
   - Go to your project → **Settings** → **Domains**
   - Click **"Add"**
   - Enter your domain
   - Follow DNS configuration instructions
3. Wait for DNS propagation (5-60 minutes)

## Troubleshooting

### ❌ Build fails on Vercel

**Issue:** "Module not found" or dependency errors

**Fix:**
```bash
# Delete node_modules and package-lock.json locally
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Commit and push
git add .
git commit -m "Fix dependencies"
git push
```

Vercel will automatically redeploy.

### ❌ Site loads but shows errors

**Issue:** "Failed to fetch" or database errors

**Fix:** 
- Check environment variables are set correctly in Vercel
- Go to Vercel dashboard → Project → **Settings** → **Environment Variables**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- After updating, click **"Redeploy"** in Deployments tab

### ❌ Real-time updates don't work

**Issue:** Codes don't update live

**Fix:**
- In Supabase dashboard, verify Realtime is enabled:
  - Go to **Database** → **Replication**
  - Ensure `rooms` and `codes` tables are enabled
- Check RLS policies are correct (they should allow public access for this app)

### ❌ "All codes tested" immediately

**Issue:** No codes in database

**Fix:**
- Make sure you ran both SQL migrations
- The `seed_room_codes()` function should automatically create 10,000 codes when you create a room
- Check in Supabase: `SELECT COUNT(*) FROM codes;`

## Automatic Deployments

Once set up, every time you push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel will automatically:
1. Detect the push
2. Build your app
3. Deploy the new version
4. Keep the same URL

**No manual redeployment needed!**

## Free Tier Limits

**GitHub:**
- Unlimited public repositories
- Unlimited private repositories
- 500 MB storage per repo

**Vercel (Hobby Plan - Free):**
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth per month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Serverless functions
- ⚠️ 10-second function timeout (should be fine for this app)

**Supabase (Free Tier):**
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth per month
- ✅ Unlimited API requests
- ⚠️ Projects pause after 7 days of inactivity (just visit to wake up)

For a code raiding tool, these limits are **more than enough**!

## Security Notes

- ✅ Your Supabase `anon` key is safe to be public (it's designed for client-side use)
- ✅ Row Level Security (RLS) policies protect your data
- ⚠️ For production, consider adding authentication
- ⚠️ Monitor your Supabase usage to avoid unexpected bills (unlikely on free tier)

---

**That's it!** Your Rust Code Raid app is now live and free to use! 🚀

Made by **cryp** | [Steam](https://steamcommunity.com/id/crypCS/) | [Twitter](https://x.com/crypCS)
