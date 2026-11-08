/**
 * Seed the database with real movies imported from TMDB by IMDb id.
 * Usage: node scripts/seed.mjs [tt0111161 tt0468569 ...]
 * Defaults: The Shawshank Redemption, The Dark Knight, Inception.
 * Download links are intentionally left empty — the admin adds real links.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dns from "node:dns";

// Sandbox-only: map Atlas shard hostnames to the local CONNECT tunnel
// (scripts/mongo-tunnel.mjs) so TLS SNI stays correct. Only with MONGO_TUNNEL=1.
if (process.env.MONGO_TUNNEL === "1") {
  const map = {
    "ac-a0nip1k-shard-00-00.avcuhzc.mongodb.net": "127.0.0.2",
    "ac-a0nip1k-shard-00-01.avcuhzc.mongodb.net": "127.0.0.3",
    "ac-a0nip1k-shard-00-02.avcuhzc.mongodb.net": "127.0.0.4",
  };
  const orig = dns.lookup.bind(dns);
  dns.lookup = ((hostname, options, callback) => {
    const target = map[hostname];
    if (target) {
      const cb = typeof options === "function" ? options : callback;
      if (typeof cb === "function") {
        if (options && typeof options === "object" && options.all) {
          cb(null, [{ address: target, family: 4 }]);
        } else {
          cb(null, target, 4);
        }
        return;
      }
    }
    return orig(hostname, options, callback);
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Minimal .env.local parser (no extra dependency).
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const IMDB_IDS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["tt0111161", "tt0468569", "tt1375666"];

const TMDB_BASE = "https://api.themoviedb.org/3";
// NOTE: the supplied TMDB bearer access token returns 401 (invalid/expired),
// but the TMDB API key works — so the key is used as a query param.
const headers = { "Content-Type": "application/json" };

const img = (p, size = "w500") => (p ? `https://image.tmdb.org/t/p/${size}${p}` : "");

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const movieSchema = new mongoose.Schema(
  {
    imdbId: { type: String, required: true, unique: true },
    tmdbId: { type: Number, default: null },
    mediaType: { type: String, enum: ["movie", "tv"], default: "movie" },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    overview: { type: String, default: "" },
    poster: { type: String, default: "" },
    backdrop: { type: String, default: "" },
    releaseDate: { type: String, default: "" },
    year: { type: Number, default: null },
    runtime: { type: Number, default: null },
    rating: { type: Number, default: 0 },
    genres: { type: [String], default: [] },
    cast: {
      type: [{ name: String, character: String, profile: String }],
      default: [],
    },
    trailerKey: { type: String, default: "" },
    downloadLinks: {
      type: [{ quality: String, size: String, host: String, url: String }],
      default: [],
    },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
const Movie = mongoose.models.Movie ?? mongoose.model("Movie", movieSchema);

async function tmdbGet(p) {
  const sep = p.includes("?") ? "&" : "?";
  const res = await fetch(`${TMDB_BASE}${p}${sep}api_key=${process.env.TMDB_API_KEY}`, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function importOne(imdbId) {
  const found = await tmdbGet(`/find/${imdbId}?external_source=imdb_id`);
  const tmdbId = found.movie_results?.[0]?.id;
  if (!tmdbId) throw new Error(`No TMDB match for ${imdbId}`);
  const d = await tmdbGet(`/movie/${tmdbId}?append_to_response=credits,videos`);
  const videos = d.videos?.results ?? [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");
  const year = d.release_date ? Number(d.release_date.slice(0, 4)) : null;
  const data = {
    imdbId,
    tmdbId: d.id,
    mediaType: "movie",
    title: d.title,
    slug: year ? `${slugify(d.title)}-${year}` : slugify(d.title),
    overview: d.overview,
    poster: img(d.poster_path, "w500"),
    backdrop: img(d.backdrop_path, "w1280"),
    releaseDate: d.release_date || "",
    year,
    runtime: d.runtime ?? null,
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    genres: (d.genres ?? []).map((g) => g.name),
    cast: (d.credits?.cast ?? []).slice(0, 12).map((c) => ({
      name: c.name,
      character: c.character,
      profile: img(c.profile_path, "w185"),
    })),
    trailerKey: trailer?.key ?? "",
    downloadLinks: [],
    featured: imdbId === IMDB_IDS[0],
  };
  const doc = await Movie.findOneAndUpdate({ imdbId }, data, {
    upsert: true,
    returnDocument: "after",
  });
  return doc;
}

await mongoose.connect(process.env.MONGODB_URI, { dbName: "movie-platform" });
console.log("Connected to MongoDB");
for (const id of IMDB_IDS) {
  try {
    const doc = await importOne(id);
    console.log(`Seeded: ${doc.title} (${doc.year}) — /movie/${doc.slug}`);
  } catch (err) {
    console.error(`Failed ${id}: ${err.message}`);
  }
}
const count = await Movie.countDocuments();
console.log(`Total movies in DB: ${count}`);
await mongoose.disconnect();
