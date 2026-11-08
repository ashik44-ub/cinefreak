import Link from "next/link";
import SafeImage from "@/components/SafeImage";

export interface MovieCardData {
  _id: string;
  slug: string;
  title: string;
  poster: string;
  year: number | null;
  rating: number;
  genres: string[];
  mediaType?: "movie" | "tv";
}

export default function MovieCard({ movie }: { movie: MovieCardData }) {
  return (
    <Link
      href={`/movie/${movie.slug}`}
      className="group overflow-hidden rounded-lg border border-line bg-panel transition hover:border-accent/60 hover:shadow-lg hover:shadow-black/40"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-panel-2">
        {movie.poster ? (
          <SafeImage
            src={movie.poster}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-zinc-500">
            {movie.title}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-bold text-accent">
          ★ {movie.rating ? movie.rating.toFixed(1) : "—"}
        </span>
        {movie.mediaType === "tv" && (
          <span className="absolute right-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
            TV
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">
          {movie.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          {movie.year ?? "—"}
          {movie.genres?.length ? ` · ${movie.genres.slice(0, 2).join(", ")}` : ""}
        </p>
      </div>
    </Link>
  );
}
