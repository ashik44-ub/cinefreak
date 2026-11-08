import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const movie = await Movie.findOne({
      $or: [{ _id: id }, { slug: id }],
    }).lean();
    if (!movie) {
      return Response.json({ error: "Movie not found" }, { status: 404 });
    }
    return Response.json({ movie });
  } catch {
    return Response.json({ error: "Movie not found" }, { status: 404 });
  }
}
