import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import MovieCard, { MovieCardData } from "@/components/MovieCard";
import TrendingCarousel from "@/components/TrendingCarousel";
import { formatRuntime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function toCardData(m: {
  _id: unknown;
  slug: string;
  title: string;
  poster: string;
  year: number | null;
  rating: number;
  genres: string[];
  mediaType?: "movie" | "tv";
}): MovieCardData {
  return {
    _id: String(m._id),
    slug: m.slug,
    title: m.title,
    poster: m.poster,
    year: m.year,
    rating: m.rating,
    genres: m.genres ?? [],
    mediaType: m.mediaType === "tv" ? "tv" : "movie",
  };
}

export default async function Home() {
  await connectDB();
  const [featured, trending, latest, genres] = await Promise.all([
    Movie.find({ featured: true }).sort({ createdAt: -1 }).limit(1).lean(),
    Movie.find().sort({ rating: -1 }).limit(12).lean(),
    Movie.find().sort({ createdAt: -1 }).limit(24).lean(),
    Movie.distinct("genres"),
  ]);

  const hero =
    featured[0] ??
    (trending as typeof latest)[0] ??
    (latest as typeof trending)[0];

  return (
    <div>
      {/* Hero / featured slider (single featured title) */}
      {hero ? (
        <section className="relative overflow-hidden">
          {hero.backdrop && (
            <SafeImage
              src={hero.backdrop}
              alt={hero.title}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-transparent" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-16 sm:py-24">
            <span className="w-fit rounded bg-accent px-2 py-1 text-xs font-black uppercase tracking-wide text-black">
              Featured
            </span>
            <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
              {hero.title}
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
              <span className="font-bold text-accent">
                ★ {hero.rating ? hero.rating.toFixed(1) : "—"}
              </span>
              <span>{hero.year ?? ""}</span>
              <span>{formatRuntime(hero.runtime)}</span>
              <span>{(hero.genres ?? []).join(" · ")}</span>
            </p>
            <p className="line-clamp-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              {hero.overview}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/movie/${hero.slug}`}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-black hover:bg-accent-2"
              >
                View &amp; Download
              </Link>
              <Link
                href="/browse"
                className="rounded-md border border-line bg-panel/80 px-5 py-2.5 text-sm font-semibold hover:border-accent"
              >
                Browse All Movies
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h1 className="text-3xl font-black">
            Welcome to <span className="text-accent">CineFreak</span>
          </h1>
          <p className="mt-2 text-zinc-400">
            No movies yet — the admin can add movies from the admin panel using
            an IMDb link.
          </p>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4">
        {/* Genre chips */}
        {(genres as string[]).filter(Boolean).length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-2">
              {(genres as string[]).filter(Boolean).slice(0, 20).map((g) => (
                <Link
                  key={g}
                  href={`/genre/${encodeURIComponent(g.toLowerCase())}`}
                  className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-accent hover:text-accent"
                >
                  {g}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Trending row — auto-scrolling carousel */}
        {trending.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold">Trending Now</h2>
              <Link
                href="/browse?sort=rating"
                className="text-sm text-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            <TrendingCarousel
              movies={trending.slice(0, 12).map((m) => toCardData(m))}
            />
          </section>
        )}

        {/* Latest grid */}
        {latest.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold">Latest Movies</h2>
              <Link href="/browse" className="text-sm text-accent hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {latest.map((m) => (
                <MovieCard key={String(m._id)} movie={toCardData(m)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
