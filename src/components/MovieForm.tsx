"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export interface DownloadLinkInput {
  quality: string;
  size: string;
  host: string;
  url: string;
  /** Optional: link applies to one season/episode only (TV series). Blank = whole title. */
  season: number | null;
  episode: number | null;
}

export interface SeasonFormData {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes: {
    episodeNumber: number;
    name: string;
    overview: string;
    airDate: string;
    still: string;
    runtime: number | null;
  }[];
}

export interface MovieFormData {
  _id?: string;
  imdbId: string;
  tmdbId: number | null;
  mediaType: "movie" | "tv";
  title: string;
  slug: string;
  overview: string;
  poster: string;
  backdrop: string;
  releaseDate: string;
  year: number | null;
  runtime: number | null;
  rating: number;
  genres: string;
  castText: string;
  trailerKey: string;
  downloadLinks: DownloadLinkInput[];
  seasons: SeasonFormData[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  featured: boolean;
}

export const emptyForm: MovieFormData = {
  imdbId: "",
  tmdbId: null,
  mediaType: "movie",
  title: "",
  slug: "",
  overview: "",
  poster: "",
  backdrop: "",
  releaseDate: "",
  year: null,
  runtime: null,
  rating: 0,
  genres: "",
  castText: "",
  trailerKey: "",
  downloadLinks: [],
  seasons: [],
  numberOfSeasons: 0,
  numberOfEpisodes: 0,
  featured: false,
};

const QUALITIES = ["480p", "720p", "1080p", "2160p 4K", "BluRay", "WEB-DL"];

const inputCls =
  "w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent";

/** Inline "add a download link" form shown under one episode (TV series). */
function EpisodeLinkAdder({
  onAdd,
}: {
  onAdd: (draft: {
    quality: string;
    size: string;
    host: string;
    url: string;
  }) => void;
}) {
  const [quality, setQuality] = useState("720p");
  const [size, setSize] = useState("");
  const [host, setHost] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");

  function add() {
    if (!url.trim()) {
      setMsg("Paste a download URL first.");
      return;
    }
    onAdd({
      quality,
      size: size.trim(),
      host: host.trim(),
      url: url.trim(),
    });
    setSize("");
    setHost("");
    setUrl("");
    setMsg("");
  }

  return (
    <div className="mt-2 rounded-md border border-line bg-panel-2 p-2.5">
      <p className="mb-2 text-xs font-semibold text-zinc-300">
        Add download link for this episode
      </p>
      <div className="grid gap-2 sm:grid-cols-[110px_110px_1fr] lg:grid-cols-[110px_110px_150px_1fr_auto]">
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className={inputCls}
          aria-label="Quality"
        >
          {QUALITIES.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Size (e.g. 1.4 GB)"
          className={inputCls}
          aria-label="File size"
        />
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="Host (e.g. Google Drive)"
          className={inputCls}
          aria-label="Host"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://... download URL"
          className={inputCls}
          aria-label="Download URL"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-accent-2"
        >
          + Add
        </button>
      </div>
      {msg && <p className="mt-1.5 text-xs text-red-400">{msg}</p>}
    </div>
  );
}

export default function MovieForm({
  initial,
  mode,
}: {
  initial: MovieFormData;
  mode: "new" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<MovieFormData>(initial);
  const [imdbInput, setImdbInput] = useState(initial.imdbId || "");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof MovieFormData>(key: K, value: MovieFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onImport() {
    if (!imdbInput.trim()) {
      setImportMsg("Paste an IMDb URL or id first (e.g. tt0111161).");
      return;
    }
    setImporting(true);
    setImportMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imdbUrl: imdbInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      const p = data.preview;
      setForm((f) => ({
        ...f,
        imdbId: p.imdbId,
        tmdbId: p.tmdbId,
        mediaType: p.mediaType === "tv" ? "tv" : "movie",
        title: p.title,
        overview: p.overview,
        poster: p.poster,
        backdrop: p.backdrop,
        releaseDate: p.releaseDate,
        year: p.year,
        runtime: p.runtime,
        rating: p.rating,
        genres: p.genres.join(", "),
        castText: p.cast
          .map((c: { name: string; character: string }) =>
            c.character ? `${c.name} as ${c.character}` : c.name,
          )
          .join("\n"),
        trailerKey: p.trailerKey,
        seasons: p.seasons ?? [],
        numberOfSeasons: p.numberOfSeasons ?? 0,
        numberOfEpisodes: p.numberOfEpisodes ?? 0,
      }));
      setImportMsg(
        p.mediaType === "tv"
          ? `Imported TV series "${p.title}" (${p.year ?? ""}) from TMDB — ${p.numberOfSeasons} season${p.numberOfSeasons === 1 ? "" : "s"}, ${p.numberOfEpisodes} episodes. Review and save below.`
          : `Imported "${p.title}" (${p.year ?? ""}) from TMDB. Review and save below.`,
      );
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function updateLink(i: number, key: keyof DownloadLinkInput, value: string | number | null) {
    setForm((f) => ({
      ...f,
      downloadLinks: f.downloadLinks.map((l, idx) =>
        idx === i ? { ...l, [key]: value } : l,
      ),
    }));
  }

  function addLink() {
    setForm((f) => ({
      ...f,
      downloadLinks: [
        ...f.downloadLinks,
        { quality: "720p", size: "", host: "", url: "", season: null, episode: null },
      ],
    }));
  }

  function removeLink(i: number) {
    setForm((f) => ({
      ...f,
      downloadLinks: f.downloadLinks.filter((_, idx) => idx !== i),
    }));
  }

  /** Links attached to one episode, with their index in the flat list. */
  function episodeLinks(season: number, episode: number) {
    return form.downloadLinks
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.season === season && l.episode === episode);
  }

  function addEpisodeLink(
    season: number,
    episode: number,
    draft: { quality: string; size: string; host: string; url: string },
  ) {
    setForm((f) => ({
      ...f,
      downloadLinks: [...f.downloadLinks, { ...draft, season, episode }],
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const cast = form.castText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split(/\s+as\s+/i);
        return { name: name.trim(), character: rest.join(" as ").trim(), profile: "" };
      })
      .filter((c) => c.name);
    const payload = {
      imdbId: form.imdbId.trim(),
      tmdbId: form.tmdbId,
      mediaType: form.mediaType,
      title: form.title.trim(),
      slug: form.slug.trim(),
      overview: form.overview,
      poster: form.poster.trim(),
      backdrop: form.backdrop.trim(),
      releaseDate: form.releaseDate,
      year: form.year,
      runtime: form.runtime,
      rating: form.rating,
      genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
      cast,
      trailerKey: form.trailerKey.trim(),
      downloadLinks: form.downloadLinks,
      seasons: form.mediaType === "tv" ? form.seasons : [],
      numberOfSeasons: form.mediaType === "tv" ? form.numberOfSeasons : 0,
      numberOfEpisodes: form.mediaType === "tv" ? form.numberOfEpisodes : 0,
      featured: form.featured,
    };
    try {
      const url =
        mode === "edit" ? `/api/admin/movies/${form._id}` : "/api/admin/movies";
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "mb-1 block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* IMDb import */}
      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-bold">Import from IMDb / TMDB</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Paste an IMDb link (e.g. https://www.imdb.com/title/tt0111161/) or a
          bare id (tt0111161) and the title, poster, cast, trailer and more are
          filled in automatically.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={imdbInput}
            onChange={(e) => setImdbInput(e.target.value)}
            placeholder="https://www.imdb.com/title/tt0111161/"
            className={inputCls}
          />
          <button
            type="button"
            onClick={onImport}
            disabled={importing}
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-2 disabled:opacity-50"
          >
            {importing ? "Fetching..." : "Fetch Details"}
          </button>
        </div>
        {importMsg && (
          <p className="mt-2 text-sm text-zinc-300">{importMsg}</p>
        )}
      </section>

      {/* Basics */}
      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-bold">Movie Details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title *</label>
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>IMDb ID</label>
            <input value={form.imdbId} onChange={(e) => set("imdbId", e.target.value)} placeholder="tt0111161" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Slug (optional, auto from title)</label>
            <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="the-shawshank-redemption" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Overview</label>
            <textarea rows={4} value={form.overview} onChange={(e) => set("overview", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Poster URL</label>
            <input value={form.poster} onChange={(e) => set("poster", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Backdrop URL</label>
            <input value={form.backdrop} onChange={(e) => set("backdrop", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Release Date</label>
            <input type="date" value={form.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input type="number" value={form.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Runtime (minutes)</label>
            <input type="number" value={form.runtime ?? ""} onChange={(e) => set("runtime", e.target.value ? Number(e.target.value) : null)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Rating (0–10)</label>
            <input type="number" step="0.1" min="0" max="10" value={form.rating} onChange={(e) => set("rating", Number(e.target.value) || 0)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Genres (comma separated)</label>
            <input value={form.genres} onChange={(e) => set("genres", e.target.value)} placeholder="Drama, Crime" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Trailer YouTube Key</label>
            <input value={form.trailerKey} onChange={(e) => set("trailerKey", e.target.value)} placeholder="6hB3S9bIaco" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Cast (one per line: “Name as Character”)</label>
            <textarea rows={4} value={form.castText} onChange={(e) => set("castText", e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[#f5c518]" />
            Featured on homepage hero
          </label>
        </div>
      </section>

      {/* Series seasons (TV only, filled by import) — per-episode links */}
      {form.mediaType === "tv" && (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-bold">TV Series — Seasons &amp; Episodes</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {form.numberOfSeasons} season{form.numberOfSeasons === 1 ? "" : "s"} ·{" "}
            {form.numberOfEpisodes} episodes (from TMDB). Add a download link
            under any episode below — it will appear under that episode on
            the series page. The episode list itself changes only by
            re-importing.
          </p>
          {form.seasons.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No seasons loaded yet — import from an IMDb link above.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {form.seasons.map((s) => (
                <details
                  key={s.seasonNumber}
                  open={s.seasonNumber === 1}
                  className="overflow-hidden rounded-md border border-line bg-panel-2"
                >
                  <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold hover:text-accent">
                    {s.seasonNumber === 0 ? "Specials" : `Season ${s.seasonNumber}`}
                    <span className="ml-2 font-normal text-zinc-400">
                      {s.episodes.length} episode
                      {s.episodes.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-line p-3">
                    {s.episodes.map((ep) => {
                      const links = episodeLinks(
                        s.seasonNumber,
                        ep.episodeNumber,
                      );
                      return (
                        <div
                          key={ep.episodeNumber}
                          className="rounded-md border border-line bg-panel p-3"
                        >
                          <p className="text-sm font-semibold">
                            <span className="text-accent">
                              E{ep.episodeNumber}
                            </span>{" "}
                            {ep.name || `Episode ${ep.episodeNumber}`}
                            {ep.airDate && (
                              <span className="ml-2 text-xs font-normal text-zinc-400">
                                {ep.airDate}
                              </span>
                            )}
                          </p>
                          {links.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                              {links.map(({ l, i }) => (
                                <li
                                  key={i}
                                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                                >
                                  <span className="rounded bg-panel-2 px-2 py-0.5 font-semibold">
                                    {l.quality}
                                  </span>
                                  {l.size && (
                                    <span className="text-zinc-400">{l.size}</span>
                                  )}
                                  {l.host && (
                                    <span className="text-zinc-400">{l.host}</span>
                                  )}
                                  <span className="min-w-0 flex-1 truncate text-zinc-400">
                                    {l.url}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeLink(i)}
                                    className="font-semibold text-red-400 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <EpisodeLinkAdder
                            onAdd={(draft) =>
                              addEpisodeLink(
                                s.seasonNumber,
                                ep.episodeNumber,
                                draft,
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Download links */}
      <section className="rounded-lg border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Download Links</h2>
          <button
            type="button"
            onClick={addLink}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent"
          >
            + Add Link
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Each link opens in a new tab for the user. Add one row per quality /
          host. These are whole-title links
          {form.mediaType === "tv"
            ? " — set a Season number for a season-wide link, or add a link under a single episode in the Seasons & Episodes section above."
            : "."}
        </p>
        {form.downloadLinks.filter((l) => l.episode == null).length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">
            No download links yet — use “+ Add Link”.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {form.downloadLinks.map((link, i) =>
            link.episode != null ? null : (
              <div
                key={i}
                className="grid gap-2 rounded-md border border-line bg-panel-2 p-3 sm:grid-cols-[130px_1fr_1fr] lg:grid-cols-[130px_110px_160px_1fr_90px_auto]"
              >
                <select
                  value={link.quality}
                  onChange={(e) => updateLink(i, "quality", e.target.value)}
                  className={inputCls}
                >
                  {QUALITIES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                  {!QUALITIES.includes(link.quality) && (
                    <option value={link.quality}>{link.quality}</option>
                  )}
                </select>
                <input
                  value={link.size}
                  onChange={(e) => updateLink(i, "size", e.target.value)}
                  placeholder="Size (e.g. 1.4 GB)"
                  className={inputCls}
                />
                <input
                  value={link.host}
                  onChange={(e) => updateLink(i, "host", e.target.value)}
                  placeholder="Host (e.g. Google Drive)"
                  className={inputCls}
                />
                <input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://... download URL"
                  className={inputCls}
                />
                {form.mediaType === "tv" && (
                  <input
                    type="number"
                    min="0"
                    value={link.season ?? ""}
                    onChange={(e) =>
                      updateLink(
                        i,
                        "season",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    placeholder="Season (blank = all)"
                    className={inputCls}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="rounded-md border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            ),
          )}
        </div>
      </section>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-6 py-2.5 text-sm font-bold text-black hover:bg-accent-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Movie"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-md border border-line px-6 py-2.5 text-sm font-semibold hover:border-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
