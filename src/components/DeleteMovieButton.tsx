"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteMovieButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/movies/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Failed to delete the movie.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="rounded-md border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
    >
      {busy ? "Deleting..." : "Delete"}
    </button>
  );
}
