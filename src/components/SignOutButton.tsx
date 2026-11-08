"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-accent hover:text-accent"
    >
      Sign Out
    </button>
  );
}
