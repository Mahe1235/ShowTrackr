import { notFound } from "next/navigation";
import ShowDetail from "./ShowDetail";
import { getShowWithNextEpisode, getEpisodes, getWatchProviders, type WatchProviders } from "@/lib/tmdb";
import type { TVMazeShow, TVMazeEpisode } from "@/types";

export default async function ShowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) notFound();

  let show: TVMazeShow;
  let episodes: TVMazeEpisode[];
  let watchProviders: WatchProviders;

  try {
    [show, episodes, watchProviders] = await Promise.all([
      getShowWithNextEpisode(id),
      getEpisodes(id),
      getWatchProviders(id, "IN"),
    ]);
  } catch {
    notFound();
    return null as never;
  }

  return <ShowDetail show={show!} episodes={episodes!} watchProviders={watchProviders!} />;
}
