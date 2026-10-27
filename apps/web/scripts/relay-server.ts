// Standalone beta relay (separate process/host): RELAY_UPSTREAM=http://vote-host RELAY_SECRET=... PORT=8787 npm run relay
import { createServer } from "node:http";
import { relay, MAX_BODY } from "../lib/relay";

const upstream = process.env.RELAY_UPSTREAM;
if (!upstream) throw new Error("RELAY_UPSTREAM required");
const allowOrigin = process.env.RELAY_ALLOW_ORIGIN ?? "";

createServer(async (req, res) => {
  // CORS for the web app origin only; no credentials.
  if (allowOrigin) { res.setHeader("access-control-allow-origin", allowOrigin); res.setHeader("access-control-allow-headers", "content-type"); }
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  const m = /^\/relay\/([a-z-]+)$/.exec(req.url ?? "");
  let body = "", size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) break; body += chunk; }
  const r = await relay(m?.[1] ?? "", { method: req.method ?? "", body }, { upstream, secret: process.env.RELAY_SECRET });
  res.writeHead(r.status, { "content-type": "application/json", "cache-control": "no-store" }).end(r.body);
}).listen(Number(process.env.PORT ?? 8787), "127.0.0.1", () => console.log("relay listening (no request logging)"));
