import { spawnSync } from "node:child_process";

// Turbopack has no Android native bindings — fall back to webpack there.
const engine =
  process.env.NEXT_DEV_ENGINE ??
  (process.platform === "android" ? "webpack" : "turbopack");

const flag = engine === "webpack" ? "--webpack" : "--turbopack";
console.log(`[next-dev] engine: ${engine}`);

const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", flag],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
