"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search movies..."
        className="w-full rounded-l-md border border-line bg-panel-2 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="rounded-r-md bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-2"
      >
        Search
      </button>
    </form>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-night/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-tight">
          <span className="text-accent">CINE</span>FREAK
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-zinc-300">
          <Link href="/" className="hover:text-accent">
            Home
          </Link>
          <Link href="/browse" className="hover:text-accent">
            Movies
          </Link>
          <Link href="/browse?sort=rating" className="hover:text-accent">
            Top Rated
          </Link>
          <Link href="/browse?sort=year" className="hover:text-accent">
            Latest
          </Link>
        </nav>
        <div className="ml-auto flex w-full sm:w-auto">
          <Suspense>
            <SearchForm />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
