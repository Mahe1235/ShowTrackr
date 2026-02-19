// ============================================
// TVMaze API Types
// ============================================

export interface TVMazeImage {
  medium: string | null;
  original: string | null;
}

export interface TVMazeRating {
  average: number | null;
}

export interface TVMazeNetwork {
  id: number;
  name: string;
  country: {
    name: string;
    code: string;
    timezone: string;
  } | null;
  officialSite: string | null;
}

export interface TVMazeSchedule {
  time: string;
  days: string[];
}

export interface TVMazeExternals {
  tvrage: number | null;
  thetvdb: number | null;
  imdb: string | null;
}

export interface TVMazeShow {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string | null;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  ended: string | null;
  officialSite: string | null;
  schedule: TVMazeSchedule;
  rating: TVMazeRating;
  weight: number;
  network: TVMazeNetwork | null;
  webChannel: TVMazeNetwork | null;
  externals: TVMazeExternals;
  image: TVMazeImage | null;
  summary: string | null;
  updated: number;
  _links: {
    self: { href: string };
    previousepisode?: { href: string; name: string };
    nextepisode?: { href: string; name: string };
  };
  _embedded?: {
    nextepisode?: TVMazeEpisode;
  };
}

export interface TVMazeSearchResult {
  score: number;
  show: TVMazeShow;
}

export interface TVMazeEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string | null;
  runtime: number | null;
  rating: TVMazeRating;
  image: TVMazeImage | null;
  summary: string | null;
  _links: {
    self: { href: string };
    show?: { href: string; name: string };
  };
}

export interface TVMazeScheduleEntry extends TVMazeEpisode {
  show: TVMazeShow;
}

// ============================================
// Supabase / App Domain Types
// ============================================

export type ShowStatus =
  | "watching"
  | "completed"
  | "on_hold"
  | "dropped"
  | "plan_to_watch";

export interface UserShow {
  id: string;
  user_id: string;
  tvmaze_show_id: number;
  show_name: string;
  show_poster: string | null;
  show_backdrop: string | null;
  status: ShowStatus;
  created_at: string;
}

export interface EnrichedUserShow extends UserShow {
  /** True if next episode is in a new season and airs within 3 months */
  newSeasonComingSoon: boolean;
  /** ISO date of the next episode air date, if any */
  nextEpisodeAirDate: string | null;
  /** True if the show has unreleased episodes in the same season as the last aired */
  hasUpcomingEpisodesInCurrentSeason: boolean;
}

export interface WatchProgress {
  id: string;
  user_id: string;
  tvmaze_show_id: number;
  season: number;
  episode: number;
  watched_at: string;
}
