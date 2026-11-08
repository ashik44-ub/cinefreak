import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import MovieCard from "@/components/MovieCard";

export const dynamic = "force-dynamic";

interface GenreProps {
  params: Promise<{ slug: string }>;
}

export default async function GenrePage({ params }: GenreProps) {
  const { slug } = await params;
  await connectDB();
  const allGenres = ((await Movie.distinct("genres")) as string[]).filter(Boolean);
  const genre = allGenres.find(
    (g) => g.toLowerCase() === decodeURIComponent(slug).toLowerCase(),
  );
  if (!genre) notFound();

  const movies = await Movie.find({ genres: genre })
    .sort({ rating: -1 })
    .limit(48)
    .lean();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-black">
        {genre} <span className="text-accent">Movies</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {movies.length} movie{movies.length === 1 ? "" : "s"}
      </p>
      {movies.length === 0 ? (
        <p className="mt-12 text-center text-zinc-400">No movies in this genre yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {JSON.parse(JSON.stringify(movies)).map(
            (m: { _id: string; slug: string; title: string; poster: string; year: number | null; rating: number; genres: string[] }) => (
              <MovieCard key={m._id} movie={m} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
