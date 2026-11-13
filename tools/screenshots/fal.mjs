// Tiny fal.ai client for the screenshot tools. The key is read from ~/.fal/key (or FAL_KEY) at run
// time and is never printed or written anywhere.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const ROOMS = path.join(ROOT, "store/rooms");
const LOG = path.join(ROOMS, "fal-calls.log");

function key() {
  const k = process.env.FAL_KEY || fs.readFileSync(path.join(os.homedir(), ".fal/key"), "utf8").trim();
  if (!k) throw new Error("No fal key: set FAL_KEY or create ~/.fal/key");
  return k;
}

/** One blocking call to a fal model. Every call is appended to store/rooms/fal-calls.log. */
export async function falRun(model, input, note = "") {
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const ok = res.ok;
  fs.appendFileSync(LOG, `${new Date().toISOString()}\t${model}\t${ok ? "ok" : res.status}\t${note}\n`);
  if (!ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}
