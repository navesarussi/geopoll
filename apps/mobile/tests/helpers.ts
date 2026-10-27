import type { Http, JsonRes, KV } from "../src/core/types";
export const memKV = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => { m.set(k, v); }, del: async (k) => { m.delete(k); } };
};
export type Call = { path: string; method?: string; body?: unknown; auth?: boolean };
export const fakeHttp = (handler: (c: Call) => JsonRes | Promise<JsonRes>): Http & { calls: Call[] } => {
  const calls: Call[] = [];
  const h = (async (path: string, init: Omit<Call, "path"> = {}) => { const c = { path, ...init }; calls.push(c); return handler(c); }) as Http & { calls: Call[] };
  h.calls = calls;
  return h;
};
