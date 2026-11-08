import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import MovieCard from "@/components/MovieCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

interface BrowseProps {
  searchParams: Promise<{ q?: string; genre?: string; page?: string; sort?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowseProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const genre = (sp.genre ?? "").trim();
  const sort = sp.sort ?? "latest";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (q) filter.$text = { $search: q };
  if (genre) filter.genres = genre;

  const sortSpec: Record<string, 1 | -1> =
    sort === "rating"
      ? { rating: -1 }
      : sort === "year"
        ? { year: -1 }
        : { createdAt: -1 };

  const total = await Movie.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const movies = await Movie.find(filter)
    .sort(sortSpec)
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();
  const allGenres = ((await Movie.distinct("genres")) as string[]).filter(Boolean);

  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (genre) base.set("genre", genre);
  if (sort !== "latest") base.set("sort", sort);
  const pageLink = (p: number) => {
    const params = new URLSearchParams(base);
    params.set("page", String(p));
    return `/browse?${params.toString()}`;
  };
  const sortLink = (s: string) => {
    const params = new URLSearchParams(base);
    if (s !== "latest") params.set("sort", s);
    else params.delete("sort");
    params.delete("page");
    return `/browse?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-black">
        {q ? (
          <>
            Results for <span className="text-accent">“{q}”</span>
          </>
        ) : genre ? (
          <>
            Genre: <span className="text-accent">{genre}</span>
          </>
        ) : (
          "Browse Movies"
        )}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {total} movie{total === 1 ? "" : "s"} found
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Sort:
        </span>
        {[
          { key: "latest", label: "Latest" },
          { key: "rating", label: "Top Rated" },
          { key: "year", label: "Newest Year" },
        ].map((s) => (
          <Link
            key={s.key}
            href={sortLink(s.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              sort === s.key
                ? "bg-accent font-bold text-black"
                : "border border-line bg-panel text-zinc-300 hover:border-accent"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/browse"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !genre
              ? "bg-accent font-bold text-black"
              : "border border-line bg-panel text-zinc-300 hover:border-accent"
          }`}
        >
          All Genres
        </Link>
        {allGenres.sort().map((g) => (
          <Link
            key={g}
            href={`/browse?genre=${encodeURIComponent(g)}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              genre === g
                ? "bg-accent font-bold text-black"
                : "border border-line bg-panel text-zinc-300 hover:border-accent"
            }`}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {movies.length === 0 ? (
        <p className="mt-12 text-center text-zinc-400">
          No movies found. Try a different search or genre.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {JSON.parse(JSON.stringify(movies)).map(
            (m: { _id: string; slug: string; title: string; poster: string; year: number | null; rating: number; genres: string[] }) => (
              <MovieCard key={m._id} movie={m} />
            ),
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={pageLink(page - 1)}
              className="rounded-md border border-line bg-panel px-3 py-2 text-sm hover:border-accent"
            >
              ← Prev
            </Link>
          )}
          <span className="px-3 text-sm text-zinc-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageLink(page + 1)}
              className="rounded-md border border-line bg-panel px-3 py-2 text-sm hover:border-accent"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
