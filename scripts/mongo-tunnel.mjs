/**
 * Dev-only TCP -> HTTP CONNECT tunnel for MongoDB Atlas.
 *
 * This sandbox's egress proxy intercepts direct TCP to Atlas (TLS handshake
 * fails), but it allows HTTP CONNECT tunnels. This script forwards three
 * loopback addresses to the three Atlas shard hosts through that proxy.
 *
 * Atlas routes by TLS SNI, so the app must connect using the REAL shard
 * hostnames. A dns.lookup patch (see src/instrumentation.ts and
 * scripts/seed.mjs, enabled only with MONGO_TUNNEL=1) maps those hostnames
 * to the loopback addresses below.
 *
 * Usage:
 *   node scripts/mongo-tunnel.mjs &        # listens on 127.0.0.2-4:27017
 *   MONGO_TUNNEL=1 node scripts/seed.mjs
 *
 * Not needed on a normal machine / Vercel — there the Atlas URI in
 * .env.local connects directly.
 */
import net from "node:net";

const proxyRaw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "";
if (!proxyRaw) {
  console.error("No HTTPS_PROXY/HTTP_PROXY set — cannot build tunnel");
  process.exit(1);
}
const proxyUrl = new URL(proxyRaw);
const proxyHost = proxyUrl.hostname;
const proxyPort = Number(proxyUrl.port || 3128);
const proxyAuth =
  proxyUrl.username || proxyUrl.password
    ? Buffer.from(
        `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`,
      ).toString("base64")
    : null;

const TARGETS = [
  { localIp: "127.0.0.2", remote: "ac-a0nip1k-shard-00-00.avcuhzc.mongodb.net:27017" },
  { localIp: "127.0.0.3", remote: "ac-a0nip1k-shard-00-01.avcuhzc.mongodb.net:27017" },
  { localIp: "127.0.0.4", remote: "ac-a0nip1k-shard-00-02.avcuhzc.mongodb.net:27017" },
];

for (const { localIp, remote } of TARGETS) {
  const server = net.createServer((client) => {
    const upstream = net.connect(proxyPort, proxyHost, () => {
      const headers = [
        `CONNECT ${remote} HTTP/1.1`,
        `Host: ${remote}`,
        ...(proxyAuth ? [`Proxy-Authorization: Basic ${proxyAuth}`] : []),
        "",
        "",
      ].join("\r\n");
      upstream.write(headers);
    });
    let established = false;
    let buffered = Buffer.alloc(0);
    upstream.on("data", (chunk) => {
      if (established) return; // piped via client.pipe/upstream.pipe below
      buffered = Buffer.concat([buffered, chunk]);
      const idx = buffered.indexOf("\r\n\r\n");
      if (idx === -1) return;
      const head = buffered.subarray(0, idx).toString();
      const rest = buffered.subarray(idx + 4);
      if (!/^HTTP\/1\.1 200/m.test(head)) {
        client.destroy();
        upstream.destroy();
        return;
      }
      established = true;
      if (rest.length) client.write(rest);
      client.pipe(upstream);
      upstream.pipe(client);
    });
    upstream.on("error", () => client.destroy());
    client.on("error", () => upstream.destroy());
  });
  server.listen(27017, localIp, () => {
    console.log(`tunnel ${localIp}:27017 -> ${remote} via ${proxyHost}:${proxyPort}`);
  });
}
