import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import MovieCard from "@/components/MovieCard";
import { formatRuntime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface DetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DetailProps) {
  const { slug } = await params;
  await connectDB();
  const movie = await Movie.findOne({ slug }).lean();
  return {
    title: movie ? `${movie.title} (${movie.year ?? ""}) — CineFreak` : "Movie — CineFreak",
    description: movie?.overview?.slice(0, 160) ?? "Movie details on CineFreak.",
  };
}

export default async function MovieDetailPage({ params }: DetailProps) {
  const { slug } = await params;
  await connectDB();
  const movie = await Movie.findOne({ slug }).lean();
  if (!movie) notFound();

  const isTv = movie.mediaType === "tv";
  const title = movie.title || "Untitled";
  // Defensive: old/junk rows may carry cast entries without a name — one
  // nameless entry used to crash this page (c.name.charAt on undefined).
  const cast = (movie.cast ?? []).filter((c) => c?.name && c.name.trim());
  const genres = (movie.genres ?? []).filter(Boolean);
  const seasons = (movie.seasons ?? []).filter(
    (s) => typeof s?.seasonNumber === "number",
  );
  const links = (movie.downloadLinks ?? []).filter((l) => l?.url?.trim());
  // General links (whole title) vs episode-specific links (TV only).
  const generalLinks = links.filter(
    (l) => l.season == null && l.episode == null,
  );
  const episodeLinks = (season: number, episode: number) =>
    links.filter(
      (l) =>
        l.season === season &&
        (l.episode == null || l.episode === episode),
    );

  const related = await Movie.find({
    _id: { $ne: movie._id },
    genres: { $in: genres },
  })
    .sort({ rating: -1 })
    .limit(6)
    .lean();

  const grouped = new Map<string, typeof generalLinks>();
  for (const link of generalLinks) {
    const key = link.quality || "Download";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(link);
  }

  return (
    <div>
      {/* Backdrop header */}
      <section className="relative overflow-hidden">
        {movie.backdrop && (
          <SafeImage
            src={movie.backdrop}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:py-14">
          <div className="w-40 shrink-0 overflow-hidden rounded-lg border border-line shadow-2xl sm:w-56">
            {movie.poster ? (
              <SafeImage
                src={movie.poster}
                alt={title}
                width={500}
                height={750}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center bg-panel-2 p-4 text-center text-sm text-zinc-500">
                {title}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                {title}
              </h1>
              {isTv && (
                <span className="rounded bg-accent px-2 py-0.5 text-xs font-black uppercase text-black">
                  TV Series
                </span>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
              <span className="font-bold text-accent">
                ★ {movie.rating ? movie.rating.toFixed(1) : "—"} / 10
              </span>
              <span>{movie.year ?? ""}</span>
              {isTv ? (
                <>
                  {movie.numberOfSeasons > 0 && (
                    <span>
                      {movie.numberOfSeasons} Season
                      {movie.numberOfSeasons === 1 ? "" : "s"}
                    </span>
                  )}
                  {movie.numberOfEpisodes > 0 && (
                    <span>{movie.numberOfEpisodes} Episodes</span>
                  )}
                  {movie.runtime ? <span>{formatRuntime(movie.runtime)} / ep</span> : null}
                </>
              ) : (
                <span>{formatRuntime(movie.runtime)}</span>
              )}
              {movie.releaseDate && <span>{movie.releaseDate}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <Link
                  key={g}
                  href={`/genre/${encodeURIComponent(g.toLowerCase())}`}
                  className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-zinc-300 hover:border-accent hover:text-accent"
                >
                  {g}
                </Link>
              ))}
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              {movie.overview || "No synopsis available."}
            </p>
            {movie.imdbId?.startsWith("tt") && (
              <a
                href={`https://www.imdb.com/title/${movie.imdbId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit text-sm font-medium text-accent hover:underline"
              >
                View on IMDb →
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        {/* Trailer */}
        {movie.trailerKey && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">Trailer</h2>
            <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                title={`${title} trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Download section (general / whole-title links) */}
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-bold">
            Download <span className="text-accent">{title}</span>
          </h2>
          {grouped.size === 0 ? (
            <div className="rounded-lg border border-line bg-panel p-5 text-sm text-zinc-400">
              {isTv
                ? "No whole-series download links yet — see the per-episode links under each episode below, or check back soon."
                : "Download links have not been added for this movie yet. Please check back soon."}
            </div>
          ) : (
            <div className="space-y-4">
              {[...grouped.entries()].map(([quality, qlinks]) => (
                <div
                  key={quality}
                  className="overflow-hidden rounded-lg border border-line bg-panel"
                >
                  <div className="flex items-center justify-between border-b border-line bg-panel-2 px-4 py-2.5">
                    <span className="text-sm font-bold">{quality}</span>
                    <span className="text-xs text-zinc-400">
                      {qlinks.length} link{qlinks.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="divide-y divide-line">
                    {qlinks.map((link, i) => (
                      <li
                        key={`${link.url}-${i}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                      >
                        <span className="text-sm font-medium">
                          {link.host || "Direct"}
                        </span>
                        {link.size && (
                          <span className="rounded bg-panel-2 px-2 py-0.5 text-xs text-zinc-400">
                            {link.size}
                          </span>
                        )}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto rounded-md bg-accent px-4 py-1.5 text-sm font-bold text-black hover:bg-accent-2"
                        >
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seasons & episodes (TV only) */}
        {isTv && seasons.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Seasons &amp; Episodes</h2>
            <div className="space-y-8">
              {seasons.map((season) => (
                <div key={season.seasonNumber}>
                  <h3 className="mb-3 text-lg font-bold">
                    {season.seasonNumber === 0
                      ? "Specials"
                      : `Season ${season.seasonNumber}`}
                    <span className="ml-2 text-sm font-normal text-zinc-400">
                      {(season.episodes ?? []).length} episode
                      {(season.episodes ?? []).length === 1 ? "" : "s"}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {(season.episodes ?? []).map((ep) => {
                      const epLinks = episodeLinks(
                        season.seasonNumber,
                        ep.episodeNumber,
                      );
                      return (
                        <div
                          key={ep.episodeNumber}
                          className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3 sm:flex-row"
                        >
                          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-md bg-panel-2">
                            {ep.still ? (
                              <SafeImage
                                src={ep.still}
                                alt={ep.name || `Episode ${ep.episodeNumber}`}
                                fill
                                sizes="160px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-lg font-bold text-zinc-500">
                                E{ep.episodeNumber}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">
                              <span className="text-accent">
                                E{ep.episodeNumber}
                              </span>{" "}
                              {ep.name || `Episode ${ep.episodeNumber}`}
                              {ep.airDate && (
                                <span className="ml-2 text-xs font-normal text-zinc-400">
                                  {ep.airDate}
                                </span>
                              )}
                            </p>
                            {ep.overview && (
                              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-400">
                                {ep.overview}
                              </p>
                            )}
                            {epLinks.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {epLinks.map((link, i) => (
                                  <a
                                    key={`${link.url}-${i}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md bg-accent px-3 py-1 text-xs font-bold text-black hover:bg-accent-2"
                                  >
                                    Download {link.quality}
                                    {link.size ? ` · ${link.size}` : ""}
                                    {link.host ? ` (${link.host})` : ""}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 rounded-md border border-dashed border-line px-3 py-2 text-xs text-zinc-500">
                                No download link for this episode yet.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-xl font-bold">Top Cast</h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {cast.slice(0, 12).map((c, i) => (
                <div key={`${c.name}-${i}`} className="text-center">
                  <div className="relative mx-auto aspect-square w-20 overflow-hidden rounded-full bg-panel-2 sm:w-24">
                    {c.profile ? (
                      <SafeImage
                        src={c.profile}
                        alt={c.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl text-zinc-500">
                        {(c.name || "?").charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-tight">{c.name}</p>
                  <p className="text-[11px] leading-tight text-zinc-500">
                    {c.character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {JSON.parse(JSON.stringify(related)).map(
                (m: { _id: string; slug: string; title: string; poster: string; year: number | null; rating: number; genres: string[] }) => (
                  <MovieCard key={m._id} movie={m} />
                ),
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
