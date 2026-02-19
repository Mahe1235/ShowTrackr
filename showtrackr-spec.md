# ShowTrackr — Project Spec & Claude Code Kickoff

## Overview

A personal TV show tracker web app with a cinematic, Apple TV-inspired dark UI.
Users can search for shows, track watch progress, see where to stream, and get upcoming episode alerts.
Built mobile-first on the web, with a clear path to React Native after 50 users.

---

## Tech Stack

| Layer        | Choice                          | Notes                                      |
|--------------|---------------------------------|--------------------------------------------|
| Framework    | Next.js 14 (App Router)         | TypeScript, file-based routing             |
| Styling      | Tailwind CSS + Framer Motion    | Dark theme, animations, transitions        |
| Auth & DB    | Supabase                        | Email + Google OAuth, Postgres, RLS        |
| Show Data    | TVMaze API (free, no key)       | Search, episodes, air dates                |
| Stream Info  | Streaming Availability (RapidAPI)| Where to watch per show                   |
| Dynamic Color| `colorthief` npm package        | Extract dominant color from show posters   |
| Deployment   | Vercel                          | Free tier, auto-deploy from GitHub         |

---

## Design System

### Philosophy
Content is the UI. Posters, backdrops, and show art lead every screen.
Dark by default. Imagery first. Text supports visuals, never competes.

### Color Tokens
```css
--bg-base:        #0A0A0F;   /* page background */
--bg-surface:     #141418;   /* cards, sheets */
--bg-raised:      #1C1C22;   /* elevated modals, popovers */
--accent:         #6C63FF;   /* default; override dynamically from poster */
--text-primary:   #F5F5F7;
--text-secondary: #A1A1AA;
--text-muted:     #52525B;
```

### Typography
- Font: **Inter** (Google Fonts)
- Display titles: `font-bold text-3xl+`, letter-spacing tight
- Metadata / labels: `font-light text-sm`, text-secondary
- No system fonts — Inter only

### Component Rules
- **Poster cards**: `aspect-[2/3]` ratio, `rounded-xl`, no borders, `overflow-hidden`
- **Backdrop heroes**: `w-full`, gradient overlay `from-transparent to-[#0A0A0F]`
- **Bottom nav**: 4 icons, frosted glass `backdrop-blur-md bg-black/40`, fixed bottom
- **Shelf rows**: `overflow-x-auto scroll-smooth snap-x snap-mandatory`
- **Skeleton loaders**: card-shaped, `animate-pulse bg-bg-raised` — no spinners
- **Dynamic glow**: extract poster color via colorthief, apply as `box-shadow` on card hover
- **Card press**: `whileTap={{ scale: 0.96 }}` via Framer Motion
- **Progress ring**: thin SVG arc overlay on poster for in-progress shows

---

## Supabase Database Schema

```sql
-- user_shows: shows a user has added
create table user_shows (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade,
  tvmaze_show_id  integer not null,
  show_name       text not null,
  show_poster     text,          -- image URL
  show_backdrop   text,          -- backdrop/banner URL
  status          text check (status in (
                    'watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'
                  )) default 'plan_to_watch',
  created_at      timestamptz default now(),
  unique(user_id, tvmaze_show_id)
);

-- watch_progress: episode-level tracking
create table watch_progress (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade,
  tvmaze_show_id  integer not null,
  season          integer not null,
  episode         integer not null,
  watched_at      timestamptz default now(),
  unique(user_id, tvmaze_show_id, season, episode)
);

-- Enable Row Level Security
alter table user_shows    enable row level security;
alter table watch_progress enable row level security;

-- RLS Policies (users only see their own data)
create policy "user_shows: own rows" on user_shows
  using (auth.uid() = user_id);

create policy "watch_progress: own rows" on watch_progress
  using (auth.uid() = user_id);
```

---

## App Routes & Pages

### `/` — Landing Page
- Full-bleed cinematic hero with backdrop collage of popular shows
- App name, tagline, Sign In / Sign Up CTA
- No bottom nav (unauthenticated)

### `/dashboard` — Home
- **Hero card** (top): currently watching show — full backdrop, episode title, "Continue" button
- **Shelf rows** (horizontal scroll):
  - "Continue Watching" — shows with in-progress status
  - "Airing This Week" — upcoming episodes from TVMaze for tracked shows
  - "Recently Added" — last 10 shows added
- **Stats strip**: total shows, completed, hours watched (estimate 45min/episode)
- Bottom nav visible

### `/search` — Discover
- Centered search input with soft focus glow
- Empty state: genre chip pills (Drama, Thriller, Comedy, Sci-Fi, Crime, Animation)
- Results: 2-column poster grid
- Each card: poster image, show name, year, quick-add icon button

### `/show/[id]` — Show Detail
Layout (top to bottom):
1. **Full-bleed backdrop** — gradient fade to base background
2. **Show identity bar** — poster (anchored left), title, year, rating, genre pills, status badge (Ongoing / Ended)
3. **Streaming strip** — platform logos (Netflix, Prime, etc.) in a horizontal scrollable row
4. **Synopsis** — 3 lines collapsed, tap to expand
5. **Season selector** — segmented control (Season 1, 2, 3…)
6. **Episode list** — each row: still image, ep number + title, runtime, watched toggle (swipe or tap)
7. **Add / Status button** — floating or pinned at bottom of page

### `/my-shows` — Watchlist
- Status filter tabs: All · Watching · Plan to Watch · Completed · On Hold · Dropped
- 3-column poster grid
- Poster card shows: image + thin progress arc (for in-progress shows)
- Long-press or swipe-up to change status inline

### `/settings` — Profile & Preferences
- Avatar, display name (from Supabase Auth)
- Notification preferences toggle (email alerts for new episodes)
- Sign out

---

## TVMaze API Reference

Base URL: `https://api.tvmaze.com`

| Purpose             | Endpoint                                     |
|---------------------|----------------------------------------------|
| Search shows        | `/search/shows?q={query}`                    |
| Show detail         | `/shows/{id}`                                |
| All episodes        | `/shows/{id}/episodes`                       |
| Next episode        | `/shows/{id}?embed=nextepisode`              |
| Cast                | `/shows/{id}/cast`                           |
| Show images         | `/shows/{id}/images`                         |
| Schedule (by date)  | `/schedule?date={YYYY-MM-DD}&country=US`     |

All responses are JSON. No API key required.

---

## Key Components to Build

```
components/
  layout/
    BottomNav.tsx         # 4-tab frosted glass nav bar
    PageWrapper.tsx       # consistent padding + bg
  cards/
    ShowCard.tsx          # poster card (2:3, dynamic glow, progress ring)
    EpisodeRow.tsx        # episode list item with watched toggle
    HeroCard.tsx          # full-bleed hero for dashboard
  ui/
    ShelfRow.tsx          # horizontal scroll section with title
    StatusBadge.tsx       # Watching / Completed / etc pill
    SkeletonCard.tsx      # loading placeholder
    PlatformLogo.tsx      # streaming service icon
    GenreChip.tsx         # pill for genre filter
  modals/
    AddShowModal.tsx      # status picker when adding a show
```

---

## Framer Motion Animations

```tsx
// Card tap
whileTap={{ scale: 0.96 }}
transition={{ type: "spring", stiffness: 400, damping: 25 }}

// Page enter
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, ease: "easeOut" }}

// Shelf item stagger
variants={{ hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}
// wrap in staggerChildren: 0.05
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RAPIDAPI_KEY=your_rapidapi_key          # for streaming availability
```

---

## Build Order for Claude Code

Work in this sequence to avoid blockers:

1. **Project scaffold** — Next.js 14, Tailwind config with custom color tokens, Inter font, Framer Motion install
2. **Supabase setup** — client config, auth flow (email + Google), run schema SQL in Supabase dashboard
3. **TVMaze API layer** — `lib/tvmaze.ts` with typed fetch helpers for all endpoints above
4. **Search page** — first real feature, tests the API layer end-to-end
5. **Show Detail page** — heaviest page, get this right early
6. **Add to list flow** — Supabase writes, status picker modal
7. **Dashboard** — assembles shelf rows, reads from Supabase + TVMaze
8. **Episode tracking** — watch_progress table reads/writes, progress ring on cards
9. **My Shows page** — filtered grid view
10. **Streaming info** — integrate RapidAPI Streaming Availability on show detail
11. **Email alerts** — Supabase Edge Function, cron to check TVMaze schedule daily
12. **Polish pass** — skeleton loaders, transitions, dynamic color glow, empty states

---

## Mobile-to-Native Path (Post-MVP)

Once the web app has ~50 active users:

1. Extract `lib/` (API helpers, Supabase client, types) into a shared package
2. Scaffold **Expo (React Native)** app pointing to the same Supabase backend
3. Reuse business logic; rebuild UI with React Native equivalents
4. Alternatively: wrap with **Capacitor** for a faster (but less native) iOS/Android shell

The Next.js → Expo migration is clean because both use React and the same Supabase JS client.

---

## Claude Code Starting Prompt

Paste this into Claude Code to begin:

```
I'm building "ShowTrackr" — a personal TV show tracker web app.
Full spec is in SPEC.md in this project. Please read it fully before starting.

Start with steps 1–4 from the Build Order:
1. Scaffold Next.js 14 (App Router, TypeScript) with Tailwind configured 
   using the custom color tokens in the spec
2. Install and configure: framer-motion, colorthief, @supabase/supabase-js, 
   @supabase/auth-helpers-nextjs
3. Set up Supabase auth (email + Google OAuth) with middleware protecting 
   /dashboard, /search, /show/*, /my-shows
4. Create lib/tvmaze.ts with typed fetch helpers for: searchShows, 
   getShow, getEpisodes, getNextEpisode
5. Build the /search page using the design system — dark bg, 2-column 
   poster grid, genre chips for empty state, Inter font, mobile-first

Use the color tokens, component rules, and animation values exactly as 
specified in the spec. Mobile-first on all layouts (375px base).
```
