import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Throws a redirect to /admin/login when no admin session exists. */
export async function requireAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login?error=1");
  return session;
}
