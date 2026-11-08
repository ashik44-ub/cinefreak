import { NextRequest } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-guard";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import { titleSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface MovieInput {
  imdbId?: string;
  tmdbId?: number | null;
  mediaType?: "movie" | "tv";
  title: string;
  slug?: string;
  overview?: string;
  poster?: string;
  backdrop?: string;
  releaseDate?: string;
  year?: number | null;
  runtime?: number | null;
  rating?: number;
  genres?: string[];
  cast?: { name: string; character?: string; profile?: string }[];
  trailerKey?: string;
  downloadLinks?: {
    quality: string;
    size?: string;
    host?: string;
    url: string;
    season?: number | null;
    episode?: number | null;
  }[];
  seasons?: {
    seasonNumber: number;
    name?: string;
    episodeCount?: number;
    episodes?: {
      episodeNumber: number;
      name?: string;
      overview?: string;
      airDate?: string;
      still?: string;
      runtime?: number | null;
    }[];
  }[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  featured?: boolean;
}

function cleanCast(
  cast: MovieInput["cast"] = [],
): { name: string; character: string; profile: string }[] {
  // Drop nameless cast entries — one crashed the detail page (charAt on
  // undefined) and must never be saved.
  return (cast ?? [])
    .filter((c) => c?.name?.trim())
    .map((c) => ({
      name: c.name.trim(),
      character: c.character ?? "",
      profile: c.profile ?? "",
    }));
}

function cleanSeasons(
  seasons: MovieInput["seasons"] = [],
): {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes: {
    episodeNumber: number;
    name: string;
    overview: string;
    airDate: string;
    still: string;
    runtime: number | null;
  }[];
}[] {
  return (seasons ?? [])
    .filter((s) => typeof s?.seasonNumber === "number")
    .map((s) => {
      const episodes = (s.episodes ?? []).map((e) => ({
        episodeNumber: e.episodeNumber,
        name: e.name ?? "",
        overview: e.overview ?? "",
        airDate: e.airDate ?? "",
        still: e.still ?? "",
        runtime: e.runtime ?? null,
      }));
      return {
        seasonNumber: s.seasonNumber,
        name: s.name ?? `Season ${s.seasonNumber}`,
        episodeCount: s.episodeCount ?? episodes.length,
        episodes,
      };
    })
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

function cleanLinks(
  links: MovieInput["downloadLinks"] = [],
): {
  quality: string;
  size: string;
  host: string;
  url: string;
  season: number | null;
  episode: number | null;
}[] {
  return (links ?? [])
    .filter((l) => l?.quality?.trim() && l?.url?.trim())
    .map((l) => ({
      quality: l.quality.trim(),
      size: (l.size ?? "").trim(),
      host: (l.host ?? "").trim(),
      url: l.url.trim(),
      season:
        typeof l.season === "number" && Number.isFinite(l.season)
          ? l.season
          : null,
      episode:
        typeof l.episode === "number" && Number.isFinite(l.episode)
          ? l.episode
          : null,
    }));
}

function normalize(input: MovieInput) {
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("Title is required");
  const imdbId = (input.imdbId ?? "").trim();
  const year = input.year ?? null;
  const mediaType: "movie" | "tv" =
    input.mediaType === "tv" ? "tv" : "movie";
  const seasons = mediaType === "tv" ? cleanSeasons(input.seasons) : [];
  return {
    imdbId,
    tmdbId: input.tmdbId ?? null,
    mediaType,
    title,
    slug: titleSlug(input.slug?.trim() || title, year),
    overview: input.overview ?? "",
    poster: input.poster ?? "",
    backdrop: input.backdrop ?? "",
    releaseDate: input.releaseDate ?? "",
    year,
    runtime: input.runtime ?? null,
    rating: Number(input.rating ?? 0) || 0,
    genres: (input.genres ?? []).map((g) => g.trim()).filter(Boolean),
    cast: cleanCast(input.cast),
    trailerKey: input.trailerKey ?? "",
    downloadLinks: cleanLinks(input.downloadLinks),
    seasons,
    numberOfSeasons:
      input.numberOfSeasons ?? seasons.length,
    numberOfEpisodes:
      input.numberOfEpisodes ??
      seasons.reduce((n, s) => n + s.episodes.length, 0),
    featured: Boolean(input.featured),
  };
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    await connectDB();
    const movies = await Movie.find().sort({ createdAt: -1 }).lean();
    return Response.json({ movies });
  } catch (err) {
    console.error("GET /api/admin/movies failed", err);
    return Response.json({ error: "Failed to list movies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  try {
    await connectDB();
    const input = (await req.json()) as MovieInput;
    const data = normalize(input);
    if (!data.imdbId) {
      // Manual entries without an IMDb id get a generated placeholder id.
      data.imdbId = `manual-${data.slug}`;
    }
    const existing = await Movie.findOne({ imdbId: data.imdbId });
    if (existing) {
      return Response.json(
        { error: `A movie with IMDb id ${data.imdbId} already exists` },
        { status: 409 },
      );
    }
    const movie = await Movie.create(data);
    return Response.json({ movie }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/movies failed", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create movie" },
      { status: 500 },
    );
  }
}
