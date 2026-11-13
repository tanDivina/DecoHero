#!/usr/bin/env node
// Builds the browser app into dist-web/ with `expo export --platform web`.
// Reads web settings from .env.web when it exists (values already in the shell win), and tells
// app.config.js this is a web build so it checks the web settings instead of the Android key.
//
//   npm run build:web                          release build, refuses placeholder settings
//   npm run build:web -- --allow-placeholder   preview build that shows the "not set up yet" page
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const allowPlaceholder = args.includes("--allow-placeholder");
const env = { ...process.env, DECOHERO_PLATFORM: "web" };
if (allowPlaceholder) env.DECOHERO_ALLOW_PLACEHOLDER = "1";

const envFile = path.join(root, ".env.web");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) env[m[1]] = value;
  }
}

const result = spawnSync(
  "npx",
  ["expo", "export", "--platform", "web", "--output-dir", "dist-web", "--clear", ...args.filter((a) => a !== "--allow-placeholder")],
  { cwd: root, env, stdio: "inherit", shell: process.platform === "win32" }
);
process.exit(result.status ?? 1);
