import type { Http, KV } from "./types";
export const SESSION_KEY = "gp.session.v1";
/**
 * fetch-based Http. auth:true → bearer from secure KV (Zone A only). auth:false → no credentials, no extra headers
 * (Zone B / relay). Never sends cookies (credentials:"omit").
 */
export function makeHttp(base: string, kv: KV, fetchImpl: typeof fetch = fetch): Http {
  return async (path, init = {}) => {
    const headers: Record<string, string> = { accept: "application/json" };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    if (init.auth) { const s = await kv.get(SESSION_KEY); if (s) headers.authorization = `Bearer ${s}`; }
    const r = await fetchImpl(new URL(path, base).toString(), {
      method: init.method ?? "GET", headers, credentials: "omit", body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    let json: unknown = null;
    try { json = await r.json(); } catch { /* non-JSON */ }
    return { status: r.status, json };
  };
}
