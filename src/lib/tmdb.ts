/**
 * TMDB (The Movie Database) API layer
 * Exports the same function signatures as the old tvmaze.ts so all
 * consuming pages/components need zero changes.
 *
 * Auth: Bearer token via TMDB_API_KEY env var (server-only).
 * Images: TMDB returns relative paths — tmdbImage() prefixes the CDN base.
 */

import type {
  TVMazeShow,
  TVMazeEpisode,
  TVMazeSearchResult,
} from "@/types";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = "https://api.themoviedb.org/3";
const IMG  = "https://image.tmdb.org/t/p";

function authHeaders() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  // Accept the token with or without the "Bearer " prefix in the env var
  const value = key.startsWith("Bearer ") ? key : `Bearer ${key}`;
  return { Authorization: value };
}

// ── Raw TMDB response shapes (internal only) ──────────────────────────────────

interface TMDBGenre  { id: number; name: string }
interface TMDBNetwork { id: number; name: string; origin_country: string }

interface TMDBEpisodeRaw {
  id: number;
  name: string;
  season_number: number;
  episode_number: number;
  air_date: string | null;
  runtime: number | null;
  overview: string | null;
}

interface TMDBSeasonSummaryRaw {
  id: number;
  season_number: number;
  air_date: string | null;
  episode_count: number;
  name: string;
}

interface TMDBShowRaw {
  id: number;
  name: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  last_air_date: string | null;
  status: string;
  original_language: string;
  genres: TMDBGenre[];
  networks: TMDBNetwork[];
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  number_of_seasons: number;
  number_of_episodes: number;
  next_episode_to_air: TMDBEpisodeRaw | null;
  last_episode_to_air: TMDBEpisodeRaw | null;
  seasons: TMDBSeasonSummaryRaw[];
}

interface TMDBSeasonRaw {
  season_number: number;
  episodes: TMDBEpisodeRaw[];
}

interface TMDBListResultRaw {
  id: number;
  name: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  original_language: string;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
  origin_country: string[];
}

interface TMDBSearchResultRaw {
  results: TMDBListResultRaw[];
  total_results: number;
  total_pages: number;
}

interface TMDBPopularResultRaw {
  results: TMDBListResultRaw[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tmdbImage(path: string | null, size = "w500"): string | null {
  if (!path) return null;
  return `${IMG}/${size}${path}`;
}

const LANG_MAP: Record<string, string> = {
  en: "English", fr: "French",  es: "Spanish",    de: "German",
  ja: "Japanese", ko: "Korean", pt: "Portuguese",  it: "Italian",
  zh: "Chinese",  ar: "Arabic", hi: "Hindi",       ru: "Russian",
  nl: "Dutch",    sv: "Swedish", da: "Danish",      tr: "Turkish",
  pl: "Polish",   no: "Norwegian",
};

const STATUS_MAP: Record<string, string> = {
  "Returning Series": "Running",
  "Ended":            "Ended",
  "Canceled":         "Ended",
  "In Production":    "In Development",
  "Planned":          "In Development",
  "Pilot":            "In Development",
};

function mapStatus(raw: string): string {
  return STATUS_MAP[raw] ?? raw;
}

function mapLanguage(code: string): string {
  return LANG_MAP[code] ?? code.toUpperCase();
}

/** Map a raw TMDB show to the TVMazeShow shape used throughout the app */
function mapShow(raw: TMDBShowRaw): TVMazeShow {
  const nextEp = raw.next_episode_to_air
    ? mapEpisode(raw.next_episode_to_air)
    : undefined;

  return {
    id:             raw.id,
    url:            `https://www.themoviedb.org/tv/${raw.id}`,
    name:           raw.name,
    type:           "Scripted",
    language:       mapLanguage(raw.original_language),
    genres:         raw.genres?.map((g) => g.name) ?? [],
    status:         mapStatus(raw.status),
    runtime:        raw.episode_run_time?.[0] ?? null,
    averageRuntime: raw.episode_run_time?.[0] ?? null,
    premiered:      raw.first_air_date ?? null,
    ended:          raw.last_air_date ?? null,
    officialSite:   null,
    schedule:       { time: "", days: [] },
    rating:         { average: raw.vote_average ?? null },
    weight:         raw.popularity ?? 0,
    network:        raw.networks?.[0]
      ? { id: raw.networks[0].id, name: raw.networks[0].name, country: null, officialSite: null }
      : null,
    webChannel:     null,
    externals:      { tvrage: null, thetvdb: null, imdb: null },
    image: {
      medium:   tmdbImage(raw.poster_path, "w500"),
      original: tmdbImage(raw.poster_path, "original"),
    },
    summary: raw.overview ?? null,
    updated: 0,
    _links:  { self: { href: "" } },
    ...(nextEp ? { _embedded: { nextepisode: nextEp } } : {}),
  };
}

/** Map a raw TMDB episode to the TVMazeEpisode shape */
function mapEpisode(raw: TMDBEpisodeRaw): TVMazeEpisode {
  return {
    id:       raw.id,
    url:      "",
    name:     raw.name ?? "",
    season:   raw.season_number,
    number:   raw.episode_number,
    type:     "regular",
    airdate:  raw.air_date ?? "",
    airtime:  "",
    airstamp: raw.air_date ? `${raw.air_date}T00:00:00+00:00` : null,
    runtime:  raw.runtime ?? null,
    rating:   { average: null },
    image:    null,
    summary:  raw.overview ?? null,
    _links:   { self: { href: "" } },
  };
}

// ── Genre ID → name map (fetched once, cached in module scope) ────────────────

let _genreMap: Record<number, string> | null = null;

async function getGenreMap(): Promise<Record<number, string>> {
  if (_genreMap) return _genreMap;
  try {
    const data = await tmdbFetch<{ genres: TMDBGenre[] }>("/genre/tv/list");
    _genreMap = Object.fromEntries(data.genres.map((g) => [g.id, g.name]));
  } catch {
    _genreMap = {};
  }
  return _genreMap;
}

function resolveGenres(ids: number[], map: Record<number, string>): string[] {
  return ids.map((id) => map[id]).filter(Boolean) as string[];
}

/** Map a TMDB list/search result (with genre_ids) to TVMazeShow */
function mapListResult(r: TMDBListResultRaw, genreMap: Record<number, string>): TVMazeShow {
  return {
    id:             r.id,
    url:            `https://www.themoviedb.org/tv/${r.id}`,
    name:           r.name,
    type:           "Scripted",
    language:       mapLanguage(r.original_language),
    genres:         resolveGenres(r.genre_ids ?? [], genreMap),
    status:         "Unknown",
    runtime:        null,
    averageRuntime: null,
    premiered:      r.first_air_date ?? null,
    ended:          null,
    officialSite:   null,
    schedule:       { time: "", days: [] },
    rating:         { average: r.vote_average ?? null },
    weight:         r.popularity ?? 0,
    network:        null,
    webChannel:     null,
    externals:      { tvrage: null, thetvdb: null, imdb: null },
    image: {
      medium:   tmdbImage(r.poster_path, "w500"),
      original: tmdbImage(r.poster_path, "original"),
    },
    summary:  r.overview ?? null,
    updated:  0,
    _links:   { self: { href: "" } },
  };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, noCache = false): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: authHeaders(),
    next: noCache ? { revalidate: 0 } : { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText} (${endpoint})`);
  }
  return res.json() as Promise<T>;
}

// ── Public API (same signatures as old tvmaze.ts) ─────────────────────────────

/** Search TV shows by query string */
export async function searchShows(query: string): Promise<TVMazeSearchResult[]> {
  const [data, genreMap] = await Promise.all([
    tmdbFetch<TMDBSearchResultRaw>(
      `/search/tv?query=${encodeURIComponent(query)}&page=1`,
      true  // no cache on search — user expects fresh results
    ),
    getGenreMap(),
  ]);

  return (data.results ?? []).map((r) => ({
    score: r.popularity,
    show: mapListResult(r, genreMap),
  }));
}

/** Get full show details by TMDB ID */
export async function getShow(id: number): Promise<TVMazeShow> {
  const raw = await tmdbFetch<TMDBShowRaw>(`/tv/${id}`);
  return mapShow(raw);
}

/** Get show details — TMDB includes next_episode_to_air inline, so same as getShow */
export async function getShowWithNextEpisode(id: number): Promise<TVMazeShow> {
  const raw = await tmdbFetch<TMDBShowRaw>(`/tv/${id}`);
  return mapShow(raw);
}

/** Get all episodes for a show (fetches each season in parallel) */
export async function getEpisodes(showId: number): Promise<TVMazeEpisode[]> {
  // First get the show to find number_of_seasons
  const show = await tmdbFetch<TMDBShowRaw>(`/tv/${showId}`);
  const numSeasons = show.number_of_seasons ?? 0;
  if (numSeasons === 0) return [];

  // Fetch all seasons in parallel
  const seasonNums = Array.from({ length: numSeasons }, (_, i) => i + 1);
  const seasons = await Promise.all(
    seasonNums.map((n) =>
      tmdbFetch<TMDBSeasonRaw>(`/tv/${showId}/season/${n}`).catch(() => null)
    )
  );

  // Flatten to a single episode list, filter out specials (season 0)
  return seasons
    .filter((s): s is TMDBSeasonRaw => s !== null && s.season_number > 0)
    .flatMap((s) =>
      (s.episodes ?? [])
        .filter((ep) => ep.episode_number > 0)
        .map(mapEpisode)
    );
}

// ── Genre ID → name map (exported for UI usage) ──────────────────────────────

export const GENRE_MAP: Record<string, number> = {
  "Drama":              18,
  "Comedy":             35,
  "Crime":              80,
  "Sci-Fi & Fantasy":   10765,
  "Action & Adventure": 10759,
  "Mystery":            9648,
  "Animation":          16,
  "Documentary":        99,
  "Reality":            10764,
  "Kids":               10762,
  "News":               10763,
  "Talk":               10767,
  "Family":             10751,
  "War & Politics":     10768,
  "Western":            37,
  "Soap":               10766,
};

/** Get popular TV shows — fetches 3 pages (~60 shows) in parallel */
export async function getPopularShows(): Promise<TVMazeShow[]> {
  const [pages, genreMap] = await Promise.all([
    Promise.all(
      [1, 2, 3].map((p) =>
        tmdbFetch<TMDBPopularResultRaw>(`/tv/popular?page=${p}`).catch(() => ({ results: [] }))
      )
    ),
    getGenreMap(),
  ]);

  const all = pages.flatMap((p) => p.results ?? []);
  all.sort((a, b) => b.popularity - a.popularity);
  return all.map((r) => mapListResult(r, genreMap));
}

/** Get top-rated TV shows (single page, 20 results) */
export async function getTopRatedShows(): Promise<TVMazeShow[]> {
  const [data, genreMap] = await Promise.all([
    tmdbFetch<TMDBPopularResultRaw>(`/tv/top_rated?page=1`),
    getGenreMap(),
  ]);

  return (data.results ?? []).map((r) => mapListResult(r, genreMap));
}

// ── Season metadata (for My Shows enrichment) ──────────────────────────────────

export interface ShowSeasonMeta {
  tmdbId: number;
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    airDate: string | null;
  } | null;
  lastEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    airDate: string | null;
  } | null;
  numberOfSeasons: number;
  /** Air date of the latest (highest-numbered, non-specials) season premiere */
  latestSeasonAirDate: string | null;
  /** Whether the show is still airing ("Running") or has ended */
  isRunning: boolean;
}

/** Lightweight metadata fetch — returns season-level info for enrichment logic */
export async function getShowSeasonMeta(id: number): Promise<ShowSeasonMeta | null> {
  try {
    const raw = await tmdbFetch<TMDBShowRaw>(`/tv/${id}`);

    // Find the latest non-specials season's air_date from the seasons array
    let latestSeasonAirDate: string | null = null;
    if (raw.seasons && raw.seasons.length > 0) {
      // Filter out specials (season 0), sort descending by season_number
      const regularSeasons = raw.seasons
        .filter((s) => s.season_number > 0 && s.air_date)
        .sort((a, b) => b.season_number - a.season_number);
      if (regularSeasons.length > 0) {
        latestSeasonAirDate = regularSeasons[0].air_date;
      }
    }

    return {
      tmdbId: raw.id,
      nextEpisode: raw.next_episode_to_air
        ? {
            seasonNumber: raw.next_episode_to_air.season_number,
            episodeNumber: raw.next_episode_to_air.episode_number,
            airDate: raw.next_episode_to_air.air_date,
          }
        : null,
      lastEpisode: raw.last_episode_to_air
        ? {
            seasonNumber: raw.last_episode_to_air.season_number,
            episodeNumber: raw.last_episode_to_air.episode_number,
            airDate: raw.last_episode_to_air.air_date,
          }
        : null,
      numberOfSeasons: raw.number_of_seasons,
      latestSeasonAirDate,
      isRunning: raw.status === "Returning Series",
    };
  } catch {
    return null;
  }
}

// ── Watch providers ──────────────────────────────────────────────────────────

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  /** Streaming / subscription services (e.g. Netflix, Hulu) */
  flatrate: WatchProvider[];
  /** Purchase providers (e.g. Apple TV, Google Play) */
  buy: WatchProvider[];
  /** Rental providers */
  rent: WatchProvider[];
  /** TMDB "Where to Watch" link */
  link: string | null;
}

interface TMDBProviderRaw {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface TMDBWatchProvidersRaw {
  results: Record<
    string,
    {
      link?: string;
      flatrate?: TMDBProviderRaw[];
      buy?: TMDBProviderRaw[];
      rent?: TMDBProviderRaw[];
    }
  >;
}

function mapProvider(raw: TMDBProviderRaw): WatchProvider {
  return {
    id: raw.provider_id,
    name: raw.provider_name,
    logoPath: tmdbImage(raw.logo_path, "w92"),
  };
}

/**
 * Fetch watch/streaming providers for a TV show.
 * Returns data for the given region (default "US").
 */
export async function getWatchProviders(
  showId: number,
  region = "IN"
): Promise<WatchProviders> {
  try {
    const data = await tmdbFetch<TMDBWatchProvidersRaw>(
      `/tv/${showId}/watch/providers`
    );
    const regionData = data.results?.[region];
    if (!regionData) {
      return { flatrate: [], buy: [], rent: [], link: null };
    }
    return {
      flatrate: (regionData.flatrate ?? []).map(mapProvider),
      buy: (regionData.buy ?? []).map(mapProvider),
      rent: (regionData.rent ?? []).map(mapProvider),
      link: regionData.link ?? null,
    };
  } catch {
    return { flatrate: [], buy: [], rent: [], link: null };
  }
}

/** Discover TV shows by genre (paginated, 20 per page) with optional server-side filters */
export async function discoverShows(options: {
  genreId?: number;
  page?: number;
  sortBy?: string;
  status?: "running" | "ended";
  ratingMin?: number;
  language?: string;       // ISO 639-1 code, e.g. "en"
  voteCountMin?: number;   // minimum vote count (filters out obscure shows)
}): Promise<{ shows: TVMazeShow[]; totalPages: number }> {
  const { genreId, page = 1, sortBy = "popularity.desc", status, ratingMin, language, voteCountMin } = options;

  const params = new URLSearchParams({
    sort_by: sortBy,
    page: String(page),
  });
  if (genreId) params.set("with_genres", String(genreId));
  // TMDB with_status: 0=Returning Series, 3=Ended, 4=Cancelled
  if (status === "running") params.set("with_status", "0");
  if (status === "ended") params.set("with_status", "3|4");
  if (ratingMin) params.set("vote_average.gte", String(ratingMin));
  if (language) params.set("with_original_language", language);
  if (voteCountMin) params.set("vote_count.gte", String(voteCountMin));

  const [data, genreMap] = await Promise.all([
    tmdbFetch<{ results: TMDBListResultRaw[]; total_pages: number }>(
      `/discover/tv?${params.toString()}`,
      true // no stale cache — user navigates between genres frequently
    ),
    getGenreMap(),
  ]);

  return {
    shows: (data.results ?? []).map((r) => mapListResult(r, genreMap)),
    totalPages: data.total_pages ?? 0,
  };
}

/**
 * Hybrid "top rated" discover: fetch multiple pages sorted by popularity from
 * TMDB (ensuring only well-known shows), then re-sort by vote_average on our
 * server. Returns a virtual page (20 shows) from that re-sorted pool.
 *
 * This avoids the TMDB issue where sorting by vote_average surfaces obscure
 * shows with high ratings but very few votes.
 */
const RATING_POOL_PAGES = 5;          // 5 TMDB pages = 100 popular shows
const RATING_PAGE_SIZE  = 20;
const RATING_MIN_VOTES  = 200;

export async function discoverShowsByRating(options: {
  genreId?: number;
  page?: number;                       // virtual page within the re-sorted pool
  status?: "running" | "ended";
  ratingMin?: number;
  language?: string;
}): Promise<{ shows: TVMazeShow[]; totalPages: number }> {
  const { genreId, page = 1, status, ratingMin, language } = options;

  // Build base params — always fetch by popularity so we get well-known shows
  const baseParams = new URLSearchParams({
    sort_by: "popularity.desc",
  });
  if (genreId) baseParams.set("with_genres", String(genreId));
  if (status === "running") baseParams.set("with_status", "0");
  if (status === "ended") baseParams.set("with_status", "3|4");
  if (ratingMin) baseParams.set("vote_average.gte", String(ratingMin));
  if (language) baseParams.set("with_original_language", language);
  baseParams.set("vote_count.gte", String(RATING_MIN_VOTES));

  // Fetch multiple pages in parallel
  const pageNums = Array.from({ length: RATING_POOL_PAGES }, (_, i) => i + 1);

  const [pages, genreMap] = await Promise.all([
    Promise.all(
      pageNums.map((p) => {
        const params = new URLSearchParams(baseParams);
        params.set("page", String(p));
        return tmdbFetch<{ results: TMDBListResultRaw[]; total_pages: number }>(
          `/discover/tv?${params.toString()}`,
          true
        ).catch(() => ({ results: [] as TMDBListResultRaw[], total_pages: 0 }));
      })
    ),
    getGenreMap(),
  ]);

  // Merge all results, deduplicate by ID, then re-sort by rating desc
  const seen = new Set<number>();
  const allShows: TVMazeShow[] = [];
  for (const p of pages) {
    for (const r of p.results ?? []) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        allShows.push(mapListResult(r, genreMap));
      }
    }
  }

  allShows.sort((a, b) => (b.rating.average ?? 0) - (a.rating.average ?? 0));

  // Virtual pagination: slice the re-sorted pool
  const totalShows = allShows.length;
  const totalPages = Math.ceil(totalShows / RATING_PAGE_SIZE);
  const start = (page - 1) * RATING_PAGE_SIZE;
  const shows = allShows.slice(start, start + RATING_PAGE_SIZE);

  return { shows, totalPages };
}
