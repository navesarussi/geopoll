#!/usr/bin/env node
// Pull TestFlight crash feedback + crash logs from App Store Connect API (no deps).
// Env: ASC_API_KEY_ID, ASC_API_ISSUER_ID, ASC_API_KEY_P8 (PEM contents), ASC_APP_ID. Output: ./crashlogs/*.
// Endpoints: GET /v1/apps/{id}/betaFeedbackCrashSubmissions, GET /v1/betaFeedbackCrashSubmissions/{id}/crashLog.
// Secrets are never printed.
import crypto from "node:crypto";
import fs from "node:fs";
const { ASC_API_KEY_ID: kid, ASC_API_ISSUER_ID: iss, ASC_API_KEY_P8: p8, ASC_APP_ID: app } = process.env;
for (const [k, v] of Object.entries({ ASC_API_KEY_ID: kid, ASC_API_ISSUER_ID: iss, ASC_API_KEY_P8: p8, ASC_APP_ID: app })) if (!v) { console.error(`missing env ${k}`); process.exit(1); }
const b64u = (b) => Buffer.from(b).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const head = b64u(JSON.stringify({ alg: "ES256", kid, typ: "JWT" }));
const body = b64u(JSON.stringify({ iss, iat: now, exp: now + 1100, aud: "appstoreconnect-v1" }));
const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: p8, dsaEncoding: "ieee-p1363" });
const jwt = `${head}.${body}.${b64u(sig)}`;
const api = async (path) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, { headers: { Authorization: `Bearer ${jwt}` } });
  if (!r.ok) throw new Error(`${r.status} ${path}: ${(await r.text()).slice(0, 500)}`);
  return r.json();
};
fs.mkdirSync("crashlogs", { recursive: true });
const subs = await api(`/v1/apps/${app}/betaFeedbackCrashSubmissions?limit=50&sort=-createdDate`);
console.log(`crash submissions: ${subs.data.length}`);
for (const s of subs.data) {
  const a = s.attributes ?? {};
  console.log(`- ${s.id} ${a.createdDate ?? ""} build=${a.buildBundleId ?? ""} device=${a.deviceModel ?? ""} os=${a.osVersion ?? ""} comment=${JSON.stringify(a.comment ?? "")}`);
  fs.writeFileSync(`crashlogs/${s.id}.json`, JSON.stringify(s, null, 2));
  try {
    const log = await api(`/v1/betaFeedbackCrashSubmissions/${s.id}/crashLog`);
    const text = log.data?.attributes?.logText ?? JSON.stringify(log, null, 2);
    fs.writeFileSync(`crashlogs/${s.id}.crash.txt`, text);
    console.log(text.split("\n").filter((l) => /Exception|Termination|Crashed|reason|Thread 0/.test(l)).slice(0, 15).join("\n"));
  } catch (e) { console.log(`  (no crash log: ${e.message.slice(0, 200)})`); }
}
