import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import { requireAdminPage } from "@/lib/require-admin-page";
import MovieForm, { MovieFormData } from "@/components/MovieForm";

export const dynamic = "force-dynamic";

interface EditProps {
  params: Promise<{ id: string }>;
}

export default async function EditMoviePage({ params }: EditProps) {
  await requireAdminPage();
  const { id } = await params;
  await connectDB();
  const movie = await Movie.findById(id).lean();
  if (!movie) notFound();

  const initial: MovieFormData = {
    _id: String(movie._id),
    imdbId: movie.imdbId ?? "",
    tmdbId: movie.tmdbId ?? null,
    mediaType: movie.mediaType === "tv" ? "tv" : "movie",
    title: movie.title,
    slug: movie.slug,
    overview: movie.overview ?? "",
    poster: movie.poster ?? "",
    backdrop: movie.backdrop ?? "",
    releaseDate: movie.releaseDate ?? "",
    year: movie.year ?? null,
    runtime: movie.runtime ?? null,
    rating: movie.rating ?? 0,
    genres: (movie.genres ?? []).join(", "),
    castText: (movie.cast ?? [])
      .map((c) =>
        c.character ? `${c.name} as ${c.character}` : c.name,
      )
      .join("\n"),
    trailerKey: movie.trailerKey ?? "",
    downloadLinks: (movie.downloadLinks ?? []).map((l) => ({
      quality: l.quality,
      size: l.size ?? "",
      host: l.host ?? "",
      url: l.url,
      season: l.season ?? null,
      episode: l.episode ?? null,
    })),
    seasons: (movie.seasons ?? []).map((s) => ({
      seasonNumber: s.seasonNumber,
      name: s.name ?? "",
      episodeCount: s.episodeCount ?? s.episodes?.length ?? 0,
      episodes: (s.episodes ?? []).map((e) => ({
        episodeNumber: e.episodeNumber,
        name: e.name ?? "",
        overview: e.overview ?? "",
        airDate: e.airDate ?? "",
        still: e.still ?? "",
        runtime: e.runtime ?? null,
      })),
    })),
    numberOfSeasons: movie.numberOfSeasons ?? movie.seasons?.length ?? 0,
    numberOfEpisodes:
      movie.numberOfEpisodes ??
      (movie.seasons ?? []).reduce(
        (n: number, s: { episodes?: unknown[] }) => n + (s.episodes?.length ?? 0),
        0,
      ),
    featured: Boolean(movie.featured),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-black">
        Edit <span className="text-accent">{movie.title}</span>
      </h1>
      <div className="mt-6">
        <MovieForm initial={initial} mode="edit" />
      </div>
    </div>
  );
}
