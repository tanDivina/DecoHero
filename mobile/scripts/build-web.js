#!/usr/bin/env node
// Builds the browser app into dist-web/ with `expo export --platform web`.
// Reads web settings from .env.web when it exists (values already in the shell win), and tells
// app.config.js this is a web build so it checks the web settings instead of the Android key.
//
//   npm run build:web                          release build, refuses placeholder settings
//   npm run build:web -- --allow-placeholder   preview build that shows the "not set up yet" page
//
// No other flags are accepted: `--dev` (or anything else passed on to expo) could publish a
// development bundle, which contains the screenshot demo hook (src/demo). After the export the
// bundle is checked for that, and the build fails if it is a development bundle.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const OUT = "dist-web";
const ALLOWED = ["--allow-placeholder"];

// Text that is only in a bundle when it must not be published.
const FORBIDDEN = [
  { text: "__DEV__=true", why: "it is a development bundle" },
  { text: "DemoApp", why: "it contains the screenshot demo (src/demo/DemoApp.tsx)" },
  { text: '.has("demo")', why: "it contains the ?demo= hook (src/demo/index.web.ts)" },
];

/** Problems that make the export in `dir` unfit to publish. Empty = fine. */
function bundleProblems(dir) {
  const jsDir = path.join(dir, "_expo", "static", "js", "web");
  const files = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter((f) => f.endsWith(".js")) : [];
  if (!files.length) return [`no JavaScript bundle found in ${jsDir}`];
  const problems = [];
  for (const file of files) {
    const js = fs.readFileSync(path.join(jsDir, file), "utf8");
    if (!js.includes("__DEV__=false")) problems.push(`${file}: not marked as a production bundle (__DEV__=false missing)`);
    for (const { text, why } of FORBIDDEN) if (js.includes(text)) problems.push(`${file}: ${why}`);
  }
  return [...new Set(problems)];
}

function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((a) => !ALLOWED.includes(a));
  if (unknown.length) {
    console.error(`[DecoHero] build:web does not accept ${unknown.join(" ")}. Only ${ALLOWED.join(", ")} is allowed.`);
    process.exit(2);
  }

  // NODE_ENV is forced too: a shell with NODE_ENV=development must not produce a dev bundle.
  const env = { ...process.env, DECOHERO_PLATFORM: "web", NODE_ENV: "production" };
  if (args.includes("--allow-placeholder")) env.DECOHERO_ALLOW_PLACEHOLDER = "1";
  else delete env.DECOHERO_ALLOW_PLACEHOLDER;

  const envFile = path.join(root, ".env.web");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m || line.trimStart().startsWith("#")) continue;
      const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
      if (process.env[m[1]] === undefined) env[m[1]] = value;
    }
  }

  const out = path.join(root, OUT);
  // Start clean, so a failed build never leaves an older export behind that looks current.
  fs.rmSync(out, { recursive: true, force: true });
  const result = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", OUT, "--clear"], {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);

  const problems = bundleProblems(out);
  if (problems.length) {
    fs.rmSync(out, { recursive: true, force: true });
    console.error(`[DecoHero] Refusing this web build, ${OUT}/ was removed:\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`[DecoHero] ${OUT}/ checked: production bundle, no demo hook.`);
}

if (require.main === module) main();
module.exports = { bundleProblems };
