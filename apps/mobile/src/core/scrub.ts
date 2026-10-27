/** Privacy scrubber for error reports (ADR-0026). Secret ballot: no vote, choice, token, nullifier, signature, session or identity
 * value may leave the device in a crash report. Pure, dependency-free, unit-tested. Keep in sync with apps/web/lib/sentry-scrub.ts. */
export const SENSITIVE = /vote|ballot|choice|option|token|nullifier|sig|blind|secret|session|cookie|auth|password|email|phone|name|teudat|id_?number|kyc|address|^ip$|ip_address|remote_addr/i;
const REDACTED = "[scrubbed]";
const LONG_OPAQUE = /[A-Za-z0-9+/_=.-]{24,}/g; // tokens / base64 blobs inside free text

export function scrubValue(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.replace(LONG_OPAQUE, REDACTED);
  if (v === null || typeof v !== "object" || depth > 6) return v;
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = SENSITIVE.test(k) ? REDACTED : scrubValue(x, depth + 1);
  return out;
}

type Ev = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
/** beforeSend: drop user/request/contexts that can identify a voter; scrub messages, extras, tags, breadcrumbs, frame vars. */
export function scrubEvent<T>(input: T): T {
  const e = input as Ev;
  delete e.user; delete e.request; delete e.server_name;
  if (e.message) e.message = scrubValue(e.message);
  if (e.extra) e.extra = scrubValue(e.extra);
  if (e.tags) e.tags = scrubValue(e.tags);
  if (e.contexts) { delete e.contexts.state; delete e.contexts.response; e.contexts = scrubValue(e.contexts); }
  for (const ex of e.exception?.values ?? []) {
    if (ex.value) ex.value = scrubValue(ex.value);
    for (const f of ex.stacktrace?.frames ?? []) delete f.vars;
  }
  if (e.breadcrumbs) e.breadcrumbs = e.breadcrumbs.map(scrubBreadcrumb).filter(Boolean);
  return e as T;
}
/** beforeBreadcrumb: keep only navigation-ish crumbs; never console (may print app state) and never HTTP bodies/URLs with query. */
export function scrubBreadcrumb<T>(input: T | null): T | null {
  const b = input as Ev | null;
  if (!b) return null;
  if (b.category === "console" || b.category === "xhr" || b.category === "fetch" || b.type === "http") return null;
  if (b.message) b.message = scrubValue(b.message);
  if (b.data) b.data = scrubValue(b.data);
  return b as T;
}
