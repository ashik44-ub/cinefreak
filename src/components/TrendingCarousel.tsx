"use client";

import { useEffect, useRef, useState } from "react";
import MovieCard, { MovieCardData } from "@/components/MovieCard";

/**
 * Auto-scrolling "Trending Now" row.
 *
 * The row glides continuously instead of jumping one card at a time:
 * requestAnimationFrame advances scrollLeft a tiny amount every frame, so a
 * card-width passes roughly every 2 seconds in one smooth motion. The list
 * is rendered twice (when there are enough cards) so the loop wraps
 * seamlessly — when the scroll position passes the first copy it wraps back
 * to the start with no visible jump. Pauses while the mouse hovers over it
 * and while the tab is hidden. With only a few cards it falls back to a
 * gentle stepped smooth scroll.
 */
export default function TrendingCarousel({
  movies,
}: {
  movies: MovieCardData[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  // Enough cards to fill more than one viewport at every breakpoint
  // (6 fit per view at lg) — only then can the duplicated list loop
  // seamlessly without showing the same card twice side by side.
  const seamless = movies.length >= 7;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || movies.length === 0) return;

    if (!seamless) {
      // Few items: keep the old gentle stepped scroll.
      const id = window.setInterval(() => {
        if (pausedRef.current) return;
        const first = el.firstElementChild as HTMLElement | null;
        const step = first ? first.offsetWidth + 16 : 240;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          el.scrollBy({ left: step, behavior: "smooth" });
        }
      }, 2000);
      return () => window.clearInterval(id);
    }

    // Seamless mode: constant slow glide, one card-width per ~2000ms.
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100); // clamp tab-switch jumps
      last = now;
      if (!document.hidden && !pausedRef.current) {
        const first = el.firstElementChild as HTMLElement | null;
        const step = first ? first.offsetWidth + 16 : 240;
        const setWidth = el.scrollWidth / 2; // content is duplicated
        if (setWidth - el.clientWidth > 0) {
          el.scrollLeft += (step / 2000) * dt;
          if (el.scrollLeft >= setWidth) el.scrollLeft -= setWidth;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seamless, movies.length]);

  if (movies.length === 0) return null;

  const items = seamless ? [...movies, ...movies] : movies;
  return (
    <div
      ref={trackRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((m, i) => (
        <div
          key={`${m._id}-${i}`}
          aria-hidden={seamless && i >= movies.length ? true : undefined}
          className="w-[calc(50%-8px)] shrink-0 sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(16.666%-14px)]"
        >
          <MovieCard movie={m} />
        </div>
      ))}
    </div>
  );
}
