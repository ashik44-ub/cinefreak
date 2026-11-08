import { NextRequest } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/admin-guard";
import {
  extractImdbId,
  fetchPreviewByImdbId,
} from "@/lib/tmdb";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/import
 * Body: { imdbUrl?: string, imdbId?: string }
 * Fetches TMDB data and returns a preview. Does NOT save anything —
 * the admin confirms in the UI, which then POSTs to /api/admin/movies.
 * Works for movies AND TV series: TMDB /find resolves the IMDb id to
 * either a movie or a series, and for series the preview includes every
 * season with its episode list.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();
  try {
    const body = await req.json();
    const raw = String(body?.imdbUrl ?? body?.imdbId ?? "");
    const imdbId = extractImdbId(raw);
    if (!imdbId) {
      return Response.json(
        { error: "Provide a valid IMDb URL or id (e.g. tt0111161)" },
        { status: 400 },
      );
    }
    const preview = await fetchPreviewByImdbId(imdbId);
    return Response.json({ preview });
  } catch (err) {
    console.error("POST /api/admin/import failed", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "TMDB import failed" },
      { status: 500 },
    );
  }
}
