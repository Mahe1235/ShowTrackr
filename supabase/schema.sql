-- ============================================
-- ShowTrackr Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- user_shows: shows a user has added to their list
create table if not exists user_shows (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  tvmaze_show_id  integer not null,
  show_name       text not null,
  show_poster     text,
  show_backdrop   text,
  status          text check (status in (
                    'watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'
                  )) default 'plan_to_watch',
  created_at      timestamptz default now(),
  unique(user_id, tvmaze_show_id)
);

-- watch_progress: episode-level tracking
create table if not exists watch_progress (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  tvmaze_show_id  integer not null,
  season          integer not null,
  episode         integer not null,
  watched_at      timestamptz default now(),
  unique(user_id, tvmaze_show_id, season, episode)
);

-- Enable Row Level Security
alter table user_shows enable row level security;
alter table watch_progress enable row level security;

-- RLS Policies for user_shows
create policy "user_shows_select" on user_shows
  for select using (auth.uid() = user_id);

create policy "user_shows_insert" on user_shows
  for insert with check (auth.uid() = user_id);

create policy "user_shows_update" on user_shows
  for update using (auth.uid() = user_id);

create policy "user_shows_delete" on user_shows
  for delete using (auth.uid() = user_id);

-- RLS Policies for watch_progress
create policy "watch_progress_select" on watch_progress
  for select using (auth.uid() = user_id);

create policy "watch_progress_insert" on watch_progress
  for insert with check (auth.uid() = user_id);

create policy "watch_progress_update" on watch_progress
  for update using (auth.uid() = user_id);

create policy "watch_progress_delete" on watch_progress
  for delete using (auth.uid() = user_id);

-- Indexes for common queries
create index idx_user_shows_user_id on user_shows(user_id);
create index idx_user_shows_status on user_shows(user_id, status);
create index idx_watch_progress_user_show on watch_progress(user_id, tvmaze_show_id);
