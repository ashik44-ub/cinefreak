import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import { requireAdminPage } from "@/lib/require-admin-page";
import DeleteMovieButton from "@/components/DeleteMovieButton";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface AdminProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function AdminDashboard({ searchParams }: AdminProps) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const requestedPage = Math.max(1, Number(sp.page ?? "1") || 1);

  await connectDB();
  const filter = q
    ? {
        $or: [
          { title: { $regex: escapeRegex(q), $options: "i" } },
          { imdbId: { $regex: escapeRegex(q), $options: "i" } },
        ],
      }
    : {};
  const total = await Movie.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const movies = await Movie.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();
  const linkAgg = await Movie.aggregate([
    { $match: filter },
    { $project: { n: { $size: { $ifNull: ["$downloadLinks", []] } } } },
    { $group: { _id: null, total: { $sum: "$n" } } },
  ]);
  const totalLinks = linkAgg[0]?.total ?? 0;

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/admin?${s}` : "/admin";
  };
  // Compact page-number window: current ±2, clamped to range.
  const winStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const winEnd = Math.min(totalPages, winStart + 4);
  const pageNumbers: number[] = [];
  for (let p = winStart; p <= winEnd; p++) pageNumbers.push(p);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            Admin <span className="text-accent">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {total} {q ? "matching" : ""} movie{total === 1 ? "" : "s"} ·{" "}
            {totalLinks} download link{totalLinks === 1 ? "" : "s"}
            {total > 0 &&
              ` · showing ${from}–${to}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/movies/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-2"
          >
            + Add Movie
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* Search */}
      <form method="get" action="/admin" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title or IMDb id (e.g. tt0111161)…"
          className="w-full max-w-md rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-2"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin"
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:border-accent"
          >
            Clear
          </Link>
        )}
      </form>

      {movies.length === 0 ? (
        <div className="mt-10 rounded-lg border border-line bg-panel p-8 text-center">
          {q ? (
            <>
              <p className="text-zinc-300">
                No movies match “{q}”.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Try a different title or IMDb id.
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm font-semibold hover:border-accent"
              >
                Show all movies
              </Link>
            </>
          ) : (
            <>
              <p className="text-zinc-300">No movies yet.</p>
              <p className="mt-1 text-sm text-zinc-500">
                Add your first movie by pasting an IMDb link — details are fetched
                automatically from TMDB.
              </p>
              <Link
                href="/admin/movies/new"
                className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-2"
              >
                Add Movie
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-panel">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-panel-2 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3">Movie</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Genres</th>
                  <th className="px-4 py-3">Links</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {movies.map((m) => (
                  <tr key={String(m._id)} className="hover:bg-panel-2/60">
                    <td className="px-4 py-3">
                      <a
                        href={`/movie/${m.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold hover:text-accent"
                      >
                        {m.title}
                      </a>
                      <span className="block text-xs text-zinc-500">
                        {m.imdbId}
                        {m.mediaType === "tv" && (
                          <span className="ml-2 rounded bg-accent px-1 py-px text-[10px] font-black uppercase text-black">
                            TV
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{m.year ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {m.rating ? m.rating.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {(m.genres ?? []).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {m.downloadLinks?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/movies/${String(m._id)}`}
                          className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent"
                        >
                          Edit
                        </Link>
                        <DeleteMovieButton id={String(m._id)} title={m.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:border-accent"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="rounded-md border border-line px-3 py-1.5 text-sm text-zinc-600 opacity-50">
                  ← Prev
                </span>
              )}
              {pageNumbers.map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={
                    p === page
                      ? "rounded-md bg-accent px-3 py-1.5 text-sm font-bold text-black"
                      : "rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:border-accent"
                  }
                >
                  {p}
                </Link>
              ))}
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:border-accent"
                >
                  Next →
                </Link>
              ) : (
                <span className="rounded-md border border-line px-3 py-1.5 text-sm text-zinc-600 opacity-50">
                  Next →
                </span>
              )}
              <span className="ml-2 text-xs text-zinc-500">
                Page {page} of {totalPages}
              </span>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
