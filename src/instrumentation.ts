export const runtime = "nodejs";

/**
 * Sandbox-only MongoDB tunnel support.
 *
 * In this dev sandbox, direct TCP to Atlas is intercepted by the egress
 * proxy, so the app can only reach Atlas through the local CONNECT tunnel
 * (scripts/mongo-tunnel.mjs). Atlas routes by TLS SNI, so the real shard
 * hostnames must be used — this patch maps them to the tunnel's loopback
 * addresses (127.0.0.2/3/4) at DNS level.
 *
 * Only active when MONGO_TUNNEL=1. Never enabled in production.
 */
export async function register() {
  if (process.env.MONGO_TUNNEL !== "1") return;
  const dnsMod = await import("node:dns");
  // Use the CJS exports object (mutable) rather than the frozen ESM namespace.
  const dns = (dnsMod as unknown as { default?: typeof dnsMod }).default ?? dnsMod;
  const map: Record<string, string> = {
    "ac-a0nip1k-shard-00-00.avcuhzc.mongodb.net": "127.0.0.2",
    "ac-a0nip1k-shard-00-01.avcuhzc.mongodb.net": "127.0.0.3",
    "ac-a0nip1k-shard-00-02.avcuhzc.mongodb.net": "127.0.0.4",
  };
  const origLookup = dns.lookup;
  (dns as unknown as { lookup: typeof dns.lookup }).lookup = ((
    hostname: string,
    options: unknown,
    callback?: unknown,
  ) => {
    const target = map[hostname];
    if (target) {
      const cb =
        typeof options === "function"
          ? (options as (...a: unknown[]) => void)
          : (callback as (...a: unknown[]) => void);
      const opts =
        typeof options === "object" && options !== null ? options : {};
      const family =
        typeof opts === "object" && (opts as { family?: number }).family
          ? (opts as { family?: number }).family
          : 4;
      if (typeof cb === "function") {
        if ((opts as { all?: boolean }).all) {
          cb(null, [{ address: target, family }]);
        } else {
          cb(null, target, family);
        }
        return;
      }
    }
    return (origLookup as (...a: unknown[]) => unknown).call(
      dns,
      hostname,
      options,
      callback,
    );
  }) as typeof dns.lookup;
}
