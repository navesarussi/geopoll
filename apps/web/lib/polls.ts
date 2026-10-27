import { validate, LOCALES, type Locale, type PollDef, type PollKind } from "@geopoll/config";
import { blackoutFor, config, polls, setDbPolls } from "./config";
import type { BallotStore, Stores } from "./store";

/**
 * Admin poll authoring (DB-backed, zone B). Every write is validated against the config schema (ADR-0022),
 * respects the §16ה blackout, never changes options once ballots exist, and is audit-logged (zone C).
 * k-thresholds are not editable here: publication of every poll goes through the same k-gated pipeline.
 */
const TTL_MS = 30_000;
const g = globalThis as { __gpPollSync?: number };

export async function syncPolls(ballots: BallotStore, force = false) {
  if (!force && g.__gpPollSync && Date.now() - g.__gpPollSync < TTL_MS) return;
  try { setDbPolls((await ballots.listPollDefs()).map((r) => r.def)); g.__gpPollSync = Date.now(); }
  catch { /* table missing (not migrated yet): keep config-only polls */ }
}

export type PollInput = { id: string; kind: string; question: Record<string, string>; source?: Record<string, string>; options: { id: string; label: Record<string, string> }[] };
export type PollError = "bad_id" | "reserved_id" | "bad_kind" | "bad_text" | "bad_options" | "exists" | "not_found" | "conflict" | "blackout" | "options_locked" | "kind_locked" | "schema";

const KINDS: PollKind[] = ["knesset-election", "referendum"];
const ID = /^[a-z0-9][a-z0-9-]{2,47}$/, OPT = /^[a-z0-9_-]{1,24}$/;
const text = (t: Record<string, string> | undefined, max: number, required = true) => {
  const out: Partial<Record<Locale, string>> = {};
  for (const [l, v] of Object.entries(t ?? {})) {
    if (!(LOCALES as string[]).includes(l)) return null;
    const s = String(v ?? "").trim();
    if (s.length > max) return null;
    if (s) out[l as Locale] = s;
  }
  return required && !out.he ? null : out;
};

export function normalizePoll(i: PollInput): { ok: true; def: PollDef } | { ok: false; error: PollError } {
  if (!ID.test(i.id ?? "")) return { ok: false, error: "bad_id" };
  if (!KINDS.includes(i.kind as PollKind)) return { ok: false, error: "bad_kind" };
  const q = text(i.question, 200), src = text(i.source, 300, false);
  if (!q || !src) return { ok: false, error: "bad_text" };
  const opts = (i.options ?? []).map((o) => ({ id: String(o.id ?? "").trim(), label: text(o.label, 80) }));
  if (opts.length < 2 || opts.length > 20 || opts.some((o) => !OPT.test(o.id) || !o.label) || new Set(opts.map((o) => o.id)).size !== opts.length) return { ok: false, error: "bad_options" };
  const def: PollDef = {
    id: i.id, kind: i.kind as PollKind, dummy: false, publicPositions: true,
    question: q as PollDef["question"], source: (src.he ? src : { ...src, he: "" }) as PollDef["source"],
    options: opts.map((o) => ({ id: o.id, label: o.label as PollDef["options"][number]["label"] })),
  };
  return { ok: true, def };
}

/** Create (expectedVersion = null) or edit an admin poll. New polls start CLOSED; an admin opens them explicitly. */
export async function savePoll(s: Stores, actor: string, input: PollInput, expectedVersion: number | null, now = new Date()):
  Promise<{ ok: true; version: number } | { ok: false; error: PollError }> {
  const n = normalizePoll(input);
  if (!n.ok) { await s.content.audit(actor, "poll_save_rejected", String(input.id ?? ""), n.error); return n; }
  const def = n.def;
  if (config().polls.some((p) => p.id === def.id)) return { ok: false, error: "reserved_id" };
  await syncPolls(s.ballots, true);
  const existing = polls().find((p) => p.id === def.id);
  if (expectedVersion === null && existing) return { ok: false, error: "exists" };
  if (expectedVersion !== null && !existing) return { ok: false, error: "not_found" };
  // §16ה(ח): no creating or editing election polls during the blackout window.
  if (blackoutFor(def, now).active || (existing && blackoutFor(existing, now).active)) {
    await s.content.audit(actor, "poll_save_rejected", def.id, "blackout"); return { ok: false, error: "blackout" };
  }
  if (existing) {
    if (existing.kind !== def.kind) return { ok: false, error: "kind_locked" };
    const t = await s.ballots.totals(def.id);
    const same = existing.options.length === def.options.length && existing.options.every((o, i) => o.id === def.options[i].id);
    if (t.counted + t.queued > 0 && !same) return { ok: false, error: "options_locked" };
  }
  try { validate({ ...config(), polls: [...polls().filter((p) => p.id !== def.id), def] }); }
  catch { return { ok: false, error: "schema" }; }
  const version = await s.ballots.upsertPollDef(def, actor, expectedVersion);
  if (version === null) return { ok: false, error: expectedVersion === null ? "exists" : "conflict" };
  if (expectedVersion === null) await s.ballots.setPollStatus(def.id, "closed");
  await s.content.audit(actor, expectedVersion === null ? "poll_create" : "poll_edit", def.id, `v${version}`);
  await syncPolls(s.ballots, true);
  return { ok: true, version };
}

export const isAdminPoll = (id: string) => !config().polls.some((p) => p.id === id);

/** Parse "id | עברית | English" lines into options. */
export function parseOptions(raw: string): PollInput["options"] {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [id = "", he = "", en = ""] = l.split("|").map((x) => x.trim());
    return { id, label: { he, en } };
  });
}

