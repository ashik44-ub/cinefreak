"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/admin",
    });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    // Full-page navigation (not router.push + router.refresh): the
    // push+refresh pair raced and the refresh re-rendered this login page
    // instead of navigating, so a successful login appeared to "stay" here.
    // A full reload sends the fresh session cookie to the server, which
    // renders the dashboard.
    window.location.href = res?.url ?? "/admin";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {searchParams.get("error") && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          Please sign in to access the admin panel.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@cinefreak.com"
          className="w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-accent py-2.5 text-sm font-bold text-black hover:bg-accent-2 disabled:opacity-50"
      >
        {busy ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
