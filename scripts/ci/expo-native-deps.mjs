#!/usr/bin/env node
// Guard (bug-learnings #1): fail if the installed Expo native packages are inconsistent.
// 1. exactly one copy of expo-modules-core (two copies = two native ABIs);
// 2. every dependency/peer range that any installed expo-*/@expo/* package declares on another expo-* package is satisfied;
// 4. (network) installed `expo` is the newest patch of its SDK line: Expo ships native ABI fixes as SDK patches, and a
//    stale `expo` pins an old expo-modules-core while transitive expo-* packages float to newer ones (the build-5..7 crash).
// 3. every direct expo-* dependency matches expo/bundledNativeModules.json (same rule as `expo install --check`).
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const app = path.resolve(process.argv[2] ?? "apps/mobile");
const semver = createRequire(path.join(app, "package.json"))("semver");
const pkgs = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith(".")) continue;
    const p = path.join(dir, n);
    if (n.startsWith("@")) { walk(p); continue; }
    const pj = path.join(p, "package.json");
    if (fs.existsSync(pj)) { const j = JSON.parse(fs.readFileSync(pj, "utf8")); pkgs.push({ dir: p, j }); walk(path.join(p, "node_modules")); }
  }
})(path.join(app, "node_modules"));
const errs = [];
const isExpo = (n) => n === "expo" || n.startsWith("expo-") || n.startsWith("@expo/");
const cores = pkgs.filter((p) => p.j.name === "expo-modules-core");
if (cores.length !== 1) errs.push(`expected 1 expo-modules-core, found ${cores.length}: ${cores.map((c) => c.j.version + " @ " + path.relative(app, c.dir)).join(", ")}`);
// resolve like node: nearest node_modules upwards from the requiring package
const resolve = (from, name) => { let d = from; while (d.startsWith(app)) { const c = path.join(d, "node_modules", name, "package.json"); if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, "utf8")); d = path.dirname(d); } return null; };
for (const { dir, j } of pkgs.filter((p) => isExpo(p.j.name))) {
  for (const [dep, range] of Object.entries({ ...(j.peerDependencies ?? {}), ...(j.dependencies ?? {}) })) {
    if (!dep.startsWith("expo-") || range === "*" ) continue;
    const got = resolve(dir, dep);
    if (got && semver.validRange(range) && !semver.satisfies(got.version, range)) errs.push(`${j.name}@${j.version} needs ${dep}@${range}, resolved ${got.version}`);
  }
}
const bundled = JSON.parse(fs.readFileSync(path.join(app, "node_modules/expo/bundledNativeModules.json"), "utf8"));
const expoV = JSON.parse(fs.readFileSync(path.join(app, "node_modules/expo/package.json"), "utf8")).version;
const own = JSON.parse(fs.readFileSync(path.join(app, "package.json"), "utf8")).dependencies;
for (const [dep] of Object.entries(own)) {
  const want = bundled[dep]; if (!want) continue;
  const got = resolve(app, dep)?.version;
  if (got && !semver.satisfies(got, want)) errs.push(`${dep} ${got} does not match SDK expected ${want} (expo ${expoV})`);
}
import { execFileSync } from "node:child_process";
if (!process.env.OFFLINE) {
  const major = semver.major(expoV);
  const vs = JSON.parse(execFileSync("npm", ["view", `expo@~${major}.0.0`, "version", "--json"], { encoding: "utf8" }));
  const latest = semver.maxSatisfying([].concat(vs), `~${major}.0.0`);
  if (latest && semver.lt(expoV, latest)) errs.push(`expo ${expoV} is behind the SDK ${major} patch ${latest} – run: npx expo install expo --fix`);
}
if (errs.length) { for (const e of errs) console.log(`::error::${e}`); process.exit(1); }
console.log(`expo native deps OK (expo ${expoV}, expo-modules-core ${cores[0].j.version}, ${pkgs.filter((p) => isExpo(p.j.name)).length} expo packages)`);
