import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
