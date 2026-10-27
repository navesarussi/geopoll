const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Dependency-free base64 (Hermes has no Buffer). */
export function b64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 3) {
    const n = (u[i] << 16) | ((u[i + 1] ?? 0) << 8) | (u[i + 2] ?? 0);
    s += A[(n >> 18) & 63] + A[(n >> 12) & 63] + (i + 1 < u.length ? A[(n >> 6) & 63] : "=") + (i + 2 < u.length ? A[n & 63] : "=");
  }
  return s;
}
export function unb64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, "");
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = (A.indexOf(clean[i]) << 18) | (A.indexOf(clean[i + 1]) << 12) | ((A.indexOf(clean[i + 2]) & 63) << 6) | (A.indexOf(clean[i + 3]) & 63);
    out.push((n >> 16) & 255);
    if (clean[i + 2] !== undefined) out.push((n >> 8) & 255);
    if (clean[i + 3] !== undefined) out.push(n & 255);
  }
  return Uint8Array.from(out);
}
export const b64url = (u: Uint8Array) => b64(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const hex = (u: Uint8Array) => Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
