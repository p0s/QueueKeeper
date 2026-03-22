import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseStateConfig = {
  client: SupabaseClient;
  bucket: string;
  stateKey: string;
  objectsPrefix: string;
  runtimeDir: string;
  dbPath: string;
  objectDir: string;
};

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function getSupabaseStateConfig(): SupabaseStateConfig | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  const runtimeDir = path.join(os.tmpdir(), "queuekeeper-runtime");
  const dbPath = path.join(runtimeDir, "queuekeeper.sqlite");
  const objectDir = path.join(runtimeDir, "objects");
  ensureDir(runtimeDir);
  ensureDir(objectDir);

  return {
    client: createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    bucket: process.env.QUEUEKEEPER_SUPABASE_BUCKET ?? "queuekeeper-private",
    stateKey: process.env.QUEUEKEEPER_SUPABASE_STATE_KEY ?? "state/queuekeeper.sqlite",
    objectsPrefix: process.env.QUEUEKEEPER_SUPABASE_OBJECTS_PREFIX ?? "objects",
    runtimeDir,
    dbPath,
    objectDir
  };
}

export async function hydrateSupabaseState(config: SupabaseStateConfig) {
  const stateDownload = await config.client.storage.from(config.bucket).download(config.stateKey);
  if (!stateDownload.error && stateDownload.data) {
    fs.writeFileSync(config.dbPath, Buffer.from(await stateDownload.data.arrayBuffer()));
  }

  async function walk(prefix: string, localBase: string) {
    const { data: entries } = await config.client.storage.from(config.bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" }
    });
    for (const entry of entries ?? []) {
      if (!entry.id) {
        await walk(`${prefix}/${entry.name}`, path.join(localBase, entry.name));
        continue;
      }
      const objectPath = `${prefix}/${entry.name}`;
      const download = await config.client.storage.from(config.bucket).download(objectPath);
      if (!download.error && download.data) {
        const localPath = path.join(localBase, entry.name);
        ensureDir(path.dirname(localPath));
        fs.writeFileSync(localPath, Buffer.from(await download.data.arrayBuffer()));
      }
    }
  }

  await walk(config.objectsPrefix, config.objectDir);
}

export async function persistSupabaseState(config: SupabaseStateConfig, dirtyObjectKeys: string[] = []) {
  if (fs.existsSync(config.dbPath)) {
    await config.client.storage.from(config.bucket).upload(config.stateKey, fs.readFileSync(config.dbPath), {
      upsert: true,
      contentType: "application/octet-stream"
    });
  }

  for (const objectKey of dirtyObjectKeys) {
    const filePath = path.join(config.objectDir, objectKey);
    if (!fs.existsSync(filePath)) continue;
    await config.client.storage.from(config.bucket).upload(`${config.objectsPrefix}/${objectKey}`, fs.readFileSync(filePath), {
      upsert: true,
      contentType: "application/json"
    });
  }
}
