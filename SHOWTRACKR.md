# ShowTrackr — Project Write-up

> A mobile-first TV show tracking app built with Next.js 14, Supabase, and the TVMaze API.
> Live at [show-trackr-ten.vercel.app](https://show-trackr-ten.vercel.app) · Code on [GitHub](https://github.com/Mahe1235/ShowTrackr)

---

## What is it?

ShowTrackr is a personal TV show tracking app. You can browse trending shows, search across thousands of titles, and build a watchlist organised by status — Watching, Plan to Watch, Completed, On Hold, or Dropped. It's designed to feel like a native mobile app running in the browser: fast transitions, smooth animations, and a clean dark UI.

The whole thing is free to use — no ads, no paid tiers. The TVMaze API (which powers the show data) is free with no key required, and Supabase's free tier handles the database and authentication.

---

## Features

### Discovery & Search

- **Home screen** greets you by time of day and surfaces content differently based on whether you're signed in or not
- **Trending Now** — a horizontal scroll rail of the top popular shows pulled from TVMaze, updated hourly
- **Explore by Genre** — genre chips (Drama, Comedy, Crime, Sci-Fi, Action, Thriller, Fantasy, Animation) that instantly land you on a filtered search
- **Full-text search** with 300ms debounce — searches the entire TVMaze catalogue as you type
- **Genre filtering** via 12 genre chips on the Search screen
- **Advanced filters** — sort by Popularity / Rating / Year / A→Z, filter by Status (Running/Ended), minimum rating (7.0+ / 8.0+), and Language
- **Infinite scroll** — the popular shows grid starts with 20 results and loads 20 more as you scroll, all from a single server-side fetch with no extra API calls

### Show Detail

Each show gets a dedicated page with:

- **Hero poster** with a gradient overlay and show info
- **Core metadata** — premiere year, running status (live green dot), IMDb-style rating, episode runtime, and language
- **Genre badges**
- **Summary** — HTML-stripped and truncated with a "Read more" toggle
- **Next episode card** — shows when the next episode airs if the show is still running
- **Full episode list** — organised by season, collapsible, with air dates and runtimes
- **Track this show** — a button that opens a status picker bottom sheet

### Tracking

- Five tracking statuses: **Watching**, **Plan to Watch**, **Completed**, **On Hold**, **Dropped**
- The button on the show page reflects your current status with a colour-coded label
- **Optimistic UI** — the status updates instantly in the UI, then confirms with the database in the background (reverts on error)
- Remove a show from your list any time from the same bottom sheet
- All your shows are stored in Supabase linked to your account — available on any device

### My Shows

- A tab-based library view: All / Watching / Plan to Watch / Completed / On Hold / Dropped
- Count badges on each tab so you can see your breakdown at a glance
- Status badges overlaid on each poster card (colour-coded to match the tracking status)
- Animated transitions between tabs

### Home (personalised)

For signed-in users with shows tracked:

- **Continue Watching** rail — your Watching-status shows front and centre
- **Up Next** rail — your Plan to Watch shows ready to start
- Stats line: "X shows tracked · Y watching"

For new users with nothing tracked yet:

- A prompt card linking to the search page to get started
- Trending and genre discovery always visible so the screen is never empty

### Authentication

- **Sign in with Google** — one-tap OAuth via Supabase, no form needed
- **Email + password** — standard sign-up and sign-in with validation
- Soft gates — the app is fully browsable without an account; authentication is only required when you try to save a show

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| Backend / Auth | Supabase (`@supabase/ssr`) |
| Show data | TVMaze API (free, no key) |
| Font | Inter via `next/font/google` |
| Hosting | Vercel |

---

## Architecture

### Next.js App Router patterns

The app uses the server/client component split throughout:

- **Server components** handle all data fetching — they talk directly to Supabase and TVMaze, return props to their client counterparts, and never expose API logic to the browser
- **Client components** handle all interactivity — search input, tab switching, the tracking bottom sheet, filter panels, infinite scroll
- This means pages are fast to load (server renders the initial content) and interactive immediately (client components hydrate only what needs to be interactive)

### Route structure

```
src/app/
├── page.tsx                    ← public landing page
├── auth/
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── callback/route.ts       ← OAuth code exchange
└── (app)/                      ← route group with BottomNav
    ├── dashboard/              ← Home
    ├── search/                 ← Discover
    ├── my-shows/               ← Library
    ├── show/[id]/              ← Show detail (dynamic)
    └── settings/
```

### Data flow

```
TVMaze API ──→ Server Component ──→ Client Component (props)
                                          │
Supabase DB ──→ Server Component ──→ Client Component (props)
                                          │
                                    User interaction
                                          │
                              Supabase browser client
                              (mutations, auth)
```

### Supabase schema

A single `user_shows` table with a unique constraint on `(user_id, tvmaze_show_id)` — so tracking the same show twice just updates the status rather than creating a duplicate row.

```sql
user_shows (
  id               uuid primary key,
  user_id          uuid references auth.users,
  tvmaze_show_id   integer,
  show_name        text,
  show_poster      text,
  status           text,  -- watching | plan_to_watch | completed | on_hold | dropped
  created_at       timestamptz
)
```

---

## Design

### Visual language

- **Dark-only** — no light mode toggle, the design is built specifically for dark
- **Colour palette**
  - Background base: `#0A0A0F`
  - Surface: `#141418`
  - Raised: `#1C1C22`
  - Accent: `#6C63FF` (purple)
  - Text: `#F5F5F7` / `#A1A1AA` / `#52525B`
- **Borders** are `white/8` (very subtle) — structure without hard lines
- **Typography** — Inter, with light weight for secondary text and medium/semibold for headings

### Navigation

A **floating pill** nav sits above the bottom of the screen — icons only, no labels. The active icon gets an accent-coloured fill and a small dot below it. Both animate with Framer Motion's `layoutId` so they spring between tabs smoothly. The pill has a frosted-glass blur and a deep shadow so it reads well over any content.

### Animations

- Page transitions: fade + slide up (Framer Motion `motion.main`)
- Grid cards: staggered fade + scale on load
- Tab switches: cross-fade with slight Y offset
- Bottom sheet: spring physics open/close with backdrop
- Season accordions: height animation with Framer Motion `AnimatePresence`
- Nav pill: `layoutId` spring between active positions

### Loading states

Every async view has skeleton cards (pulsing placeholder rectangles) so there's never a blank screen while data loads.

---

## What I'd build next

- **Watch progress tracking** — mark specific episodes as watched, not just the whole show
- **Push notifications** — alert when a show you're tracking has a new episode air
- **Friends / social** — see what your friends are watching
- **Show recommendations** — "Because you watched Breaking Bad…"
- **Import from Trakt / Letterboxd** — bring your existing list over

---

## Feedback

Built and designed by Mahendra. If you have thoughts, suggestions, or bugs to report — I'd love to hear them.

→ **[Leave feedback](#)** *(link to feedback section on mahendra's site)*

---

*ShowTrackr is an independent project, not affiliated with TVMaze. Show data is provided by the [TVMaze API](https://www.tvmaze.com/api).*
