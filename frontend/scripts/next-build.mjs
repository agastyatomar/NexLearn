import { spawnSync } from "node:child_process";

// Turbopack ships without Android native bindings, so builds there must use
// webpack. Every other platform keeps the fast default (Turbopack).
const engine =
  process.env.NEXT_BUILD_ENGINE ??
  (process.platform === "android" ? "webpack" : "turbopack");

const flag = engine === "webpack" ? "--webpack" : "--turbopack";
console.log(`[next-build] engine: ${engine}`);

const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build", flag],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
