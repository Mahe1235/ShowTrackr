import { notFound } from "next/navigation";
import ShowDetail from "./ShowDetail";
import { getShowWithNextEpisode, getEpisodes } from "@/lib/tvmaze";
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

  try {
    [show, episodes] = await Promise.all([
      getShowWithNextEpisode(id),
      getEpisodes(id),
    ]);
  } catch {
    notFound();
    return null as never;
  }

  return <ShowDetail show={show!} episodes={episodes!} />;
}
