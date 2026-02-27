# Vinyl Music Player - Setup Guide

## Prerequisites

- Node.js 18+ and npm/pnpm
- A Supabase account
- Basic familiarity with Next.js and React

## 1. Supabase Configuration

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anonymous key
3. Go to the SQL editor and run the migration script:
   - Copy the contents of `scripts/01-create-schema.sql`
   - Paste into the SQL editor and execute

### Configure Storage

1. In Supabase dashboard, go to Storage
2. Create a new bucket named `music` (make it public)
3. Add this policy to allow authenticated users to upload:
   - Go to Policies → New Policy
   - Allow INSERT for authenticated users on the `music` bucket

## 2. Environment Variables

Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from Supabase → Settings → API

## 3. Install Dependencies

```bash
pnpm install
# or
npm install
# or
yarn install
```

## 4. Run the Development Server

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 5. Create Your First Account

1. Click "Get Started" on the home page
2. Sign up with an email and password
3. You'll be logged in and ready to explore

## Features

### User Library
- Browse all uploaded albums and songs
- Search by title or artist
- Like songs (mark as favorites)
- View your liked songs

### Music Player
- Full-featured player with play/pause controls
- Volume control and progress slider
- Vinyl record visualization with rotating animation when playing
- Like songs directly from the player

### Playlists
- Create custom playlists
- Add/remove songs from playlists
- Make playlists public or private
- Share playlists with others

### Upload System
- Upload entire albums with multiple songs
- Edit song titles and artist info during upload
- Automatic metadata extraction
- Support for all common audio formats

### Real-time Features
- Real-time updates for playlists using Supabase subscriptions
- Live like counts and interactions
- Instant playlist updates across devices

## Project Structure

```
app/
├── page.tsx                 # Home page
├── auth/
│   ├── login/page.tsx      # Sign in page
│   └── signup/page.tsx     # Sign up page
├── album/[id]/page.tsx     # Album detail page
├── library/
│   ├── page.tsx            # Library and search page
│   └── upload/page.tsx     # Upload page
├── playlists/page.tsx      # Playlists list
├── playlist/[id]/page.tsx  # Playlist detail
├── player/page.tsx         # Full-screen player
└── api/songs/route.ts      # API route for songs

components/
├── album-card.tsx          # Album card component
├── song-row.tsx            # Song row in lists
├── vinyl-record.tsx        # Vinyl animation
└── vinyl-player.tsx        # Mini player component

lib/
├── supabase.ts             # Supabase client
└── auth-context.tsx        # Auth context and hooks
```

## Database Schema

### Users
- Profiles for each authenticated user
- Username, email, bio, avatar

### Albums
- Created by users
- Contains metadata and cover image URL

### Songs
- Belong to albums
- Store audio file URLs and metadata
- Track order within albums

### Playlists
- User-created playlists
- Can be public or private
- Songs organized via playlist_songs junction table

### Likes & Social
- `song_likes`: Track which users like which songs
- `follows`: User follow relationships (can be extended)

## Customization

### Styling
- Colors are defined in `app/globals.css` using CSS variables
- The theme uses a dark background (oklch 0.08) with gold/orange accents
- Modify color values to match your brand

### Features to Add
- Direct messaging between users
- Comment on songs or albums
- Song recommendations algorithm
- Offline mode with service workers
- Mobile app with React Native
- Audio visualization while playing

## Troubleshooting

### Storage Upload Fails
- Ensure the `music` bucket exists in Supabase Storage
- Check bucket policies allow authenticated uploads
- Verify file size limits

### Auth Issues
- Clear browser cookies and localStorage
- Check Supabase URL and keys in `.env.local`
- Verify email confirmation is not required in auth settings

### Real-time Updates Not Working
- Check your Supabase account includes Realtime
- Verify row-level security policies are correctly set
- Check browser console for connection errors

## Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

For other platforms, ensure Node.js 18+ support and the env variables are configured.

## Support

For issues with:
- **Supabase**: Check [docs.supabase.com](https://docs.supabase.com)
- **Next.js**: Check [nextjs.org](https://nextjs.org)
- **This project**: Review the code comments and schema

Happy listening!
