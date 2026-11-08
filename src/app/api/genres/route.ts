import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const genres = await Movie.distinct("genres");
    return Response.json({ genres: (genres as string[]).filter(Boolean).sort() });
  } catch (err) {
    console.error("GET /api/genres failed", err);
    return Response.json({ error: "Failed to list genres" }, { status: 500 });
  }
}
