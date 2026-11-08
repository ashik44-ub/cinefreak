import { NextRequest } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-guard";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";
import { titleSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SeasonInput = {
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
};

function cleanSeasons(input: unknown): SeasonInput[] {
  if (!Array.isArray(input)) return [];
  return (input as SeasonInput[])
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return unauthorized();
  try {
    await connectDB();
    const { id } = await params;
    const input = await req.json();
    const existing = await Movie.findById(id).lean();
    if (!existing) {
      return Response.json({ error: "Movie not found" }, { status: 404 });
    }
    const title = String(input.title ?? existing.title ?? "").trim();
    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    // Merge semantics: a field absent from the request keeps its stored
    // value. (An earlier version defaulted missing seasons/mediaType to
    // empty/"movie", so a partial update silently wiped a series.)
    const has = (k: string) =>
      Object.prototype.hasOwnProperty.call(input, k) &&
      input[k] !== undefined;
    const year = has("year") ? input.year : existing.year;
    const mediaType: "movie" | "tv" = has("mediaType")
      ? input.mediaType === "tv"
        ? "tv"
        : "movie"
      : existing.mediaType === "tv"
        ? "tv"
        : "movie";
    const seasons =
      mediaType === "tv"
        ? has("seasons")
          ? cleanSeasons(input.seasons)
          : (existing.seasons ?? []).map((s) => ({
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
            }))
        : [];
    const data = {
      title,
      slug: titleSlug(
        String(has("slug") ? input.slug : existing.slug ?? "").trim() || title,
        year,
      ),
      mediaType,
      overview: has("overview") ? input.overview : existing.overview,
      poster: has("poster") ? input.poster : existing.poster,
      backdrop: has("backdrop") ? input.backdrop : existing.backdrop,
      releaseDate: has("releaseDate")
        ? input.releaseDate
        : existing.releaseDate,
      year,
      runtime: has("runtime") ? input.runtime : existing.runtime,
      rating: has("rating")
        ? Number(input.rating ?? 0) || 0
        : existing.rating,
      genres: has("genres")
        ? (input.genres ?? []).map((g: string) => g.trim()).filter(Boolean)
        : existing.genres,
      cast: has("cast")
        ? (input.cast ?? [])
            .filter((c: { name?: string }) => c?.name?.trim())
            .map(
              (c: { name: string; character?: string; profile?: string }) => ({
                name: c.name.trim(),
                character: c.character ?? "",
                profile: c.profile ?? "",
              }),
            )
        : existing.cast,
      trailerKey: has("trailerKey") ? input.trailerKey : existing.trailerKey,
      downloadLinks: has("downloadLinks")
        ? (input.downloadLinks ?? [])
            .filter(
              (l: { quality?: string; url?: string }) =>
                l?.quality?.trim() && l?.url?.trim(),
            )
            .map(
              (l: {
                quality: string;
                size?: string;
                host?: string;
                url: string;
                season?: number | null;
                episode?: number | null;
              }) => ({
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
              }),
            )
        : existing.downloadLinks,
      seasons,
      numberOfSeasons: has("numberOfSeasons")
        ? input.numberOfSeasons
        : seasons.length,
      numberOfEpisodes: has("numberOfEpisodes")
        ? input.numberOfEpisodes
        : seasons.reduce((n, s) => n + (s.episodes ?? []).length, 0),
      featured: has("featured") ? Boolean(input.featured) : existing.featured,
    };
    const movie = await Movie.findByIdAndUpdate(id, data, { new: true });
    if (!movie) {
      return Response.json({ error: "Movie not found" }, { status: 404 });
    }
    return Response.json({ movie });
  } catch (err) {
    console.error("PUT /api/admin/movies/[id] failed", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update movie" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return unauthorized();
  try {
    await connectDB();
    const { id } = await params;
    const movie = await Movie.findByIdAndDelete(id);
    if (!movie) {
      return Response.json({ error: "Movie not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/movies/[id] failed", err);
    return Response.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}
