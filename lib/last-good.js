import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fileFor = (key) => join(tmpdir(), "shokubutsu-last-good", `${createHash("sha256").update(key).digest("hex")}.json`);

async function readSaved(key) {
  try {
    return JSON.parse(await readFile(fileFor(key), "utf8"));
  } catch {
    return null;
  }
}

async function save(key, data) {
  try {
    const file = fileFor(key);
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // Saving is only a safety net. The page still works without it, including on read-only hosts.
  }
}

/**
 * Runs a loader and keeps its last good result on disk. If the loader fails in a
 * way `shouldFallback` accepts, returns that saved result with `staleSince` set.
 */
export async function withLastGood(key, load, { shouldFallback, shouldSave = () => true }) {
  try {
    const data = await load();
    if (shouldSave(data)) await save(key, data);
    return { ...data, staleSince: null };
  } catch (error) {
    if (!shouldFallback(error)) throw error;
    const saved = await readSaved(key);
    if (!saved) throw error;
    return { ...saved.data, staleSince: saved.savedAt };
  }
}
