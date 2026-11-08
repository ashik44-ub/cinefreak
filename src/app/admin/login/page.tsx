import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // Already signed in? Skip the form entirely — a refresh while logged in
  // used to show the login page again.
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-center text-2xl font-black">
        Admin <span className="text-accent">Login</span>
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-400">
        Sign in to manage movies and download links.
      </p>
      <div className="mt-8 rounded-lg border border-line bg-panel p-6">
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
