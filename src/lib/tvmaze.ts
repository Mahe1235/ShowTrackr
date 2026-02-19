import type {
  TVMazeSearchResult,
  TVMazeShow,
  TVMazeEpisode,
  TVMazeScheduleEntry,
} from "@/types";

const BASE_URL = "https://api.tvmaze.com";

async function fetchFromTVMaze<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TVMaze API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Search shows by query string */
export async function searchShows(
  query: string
): Promise<TVMazeSearchResult[]> {
  return fetchFromTVMaze<TVMazeSearchResult[]>(
    `/search/shows?q=${encodeURIComponent(query)}`
  );
}

/** Get full show details by TVMaze ID */
export async function getShow(id: number): Promise<TVMazeShow> {
  return fetchFromTVMaze<TVMazeShow>(`/shows/${id}`);
}

/** Get show details with embedded next episode */
export async function getShowWithNextEpisode(
  id: number
): Promise<TVMazeShow> {
  return fetchFromTVMaze<TVMazeShow>(`/shows/${id}?embed=nextepisode`);
}

/** Get all episodes for a show */
export async function getEpisodes(showId: number): Promise<TVMazeEpisode[]> {
  return fetchFromTVMaze<TVMazeEpisode[]>(`/shows/${showId}/episodes`);
}

/** Get the TV schedule for a specific date and country */
export async function getSchedule(
  date: string,
  country: string = "US"
): Promise<TVMazeScheduleEntry[]> {
  return fetchFromTVMaze<TVMazeScheduleEntry[]>(
    `/schedule?date=${date}&country=${country}`
  );
}

/** Get popular shows sorted by TVMaze weight (page 0 = top ~250 shows) */
export async function getPopularShows(): Promise<TVMazeShow[]> {
  return fetchFromTVMaze<TVMazeShow[]>("/shows?page=0");
}
