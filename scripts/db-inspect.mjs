/** One-off DB inspector (sandbox-only, uses the same DNS patch as seed.mjs). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dns from "node:dns";

if (process.env.MONGO_TUNNEL === "1") {
  const map = {
    "ac-a0nip1k-shard-00-00.avcuhzc.mongodb.net": "127.0.0.2",
    "ac-a0nip1k-shard-00-01.avcuhzc.mongodb.net": "127.0.0.3",
    "ac-a0nip1k-shard-00-02.avcuhzc.mongodb.net": "127.0.0.4",
  };
  const orig = dns.lookup.bind(dns);
  dns.lookup = (hostname, options, callback) => {
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
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

await mongoose.connect(process.env.MONGODB_URI, { dbName: "movie-platform" });
const docs = await mongoose.connection.db
  .collection("movies")
  .find({}, { projection: { title: 1, year: 1, slug: 1, imdbId: 1, rating: 1 } })
  .toArray();
console.log(`movies in DB: ${docs.length}`);
for (const d of docs) {
  console.log(`- ${d.title} (${d.year}) [${d.imdbId}] /movie/${d.slug} rating=${d.rating}`);
}
await mongoose.disconnect();
