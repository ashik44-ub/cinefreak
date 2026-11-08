import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const genre = (searchParams.get("genre") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const sort = searchParams.get("sort") ?? "latest";

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
    const movies = await Movie.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();

    return Response.json({
      movies,
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error("GET /api/movies failed", err);
    return Response.json({ error: "Failed to list movies" }, { status: 500 });
  }
}
