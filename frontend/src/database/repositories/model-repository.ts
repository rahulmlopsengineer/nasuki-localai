// ModelRepository — global model catalog + device-level install metadata.
// (No downloads yet — Phase 3 fills local_path/checksum.)

import { AIModel, InstalledModel, ModelDownloadStatus } from "@/src/types";
import { nowIso, uid } from "@/src/utils/misc";
import { queryAll, queryFirst, run } from "../client";

interface ModelRow {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  version: string | null;
  size_bytes: number;
  ram_requirement: number;
  license: string | null;
  developer_name: string | null;
  price: number;
  capabilities: string | null;
  featured: number;
}

interface InstalledRow {
  model_id: string;
  status: string;
  progress: number;
  installed_at: string | null;
}

const toModel = (r: ModelRow): AIModel => ({
  id: r.id,
  name: r.name,
  tagline: r.tagline ?? "",
  description: r.description ?? "",
  version: r.version ?? "1.0.0",
  sizeMb: Math.round(r.size_bytes / 1_000_000),
  minRamGb: r.ram_requirement,
  license: r.license ?? "",
  developer: r.developer_name ?? "",
  price: r.price,
  capabilities: r.capabilities ? (JSON.parse(r.capabilities) as string[]) : [],
  featured: !!r.featured,
});

const toInstall = (r: InstalledRow): InstalledModel => ({
  modelId: r.model_id,
  status: r.status as ModelDownloadStatus,
  progress: r.progress,
  installedAt: r.installed_at ?? undefined,
});

export const ModelRepository = {
  async seed(models: AIModel[]): Promise<void> {
    const now = nowIso();
    for (const m of models) {
      const exists = await queryFirst<{ id: string }>("SELECT id FROM models WHERE id = ?", [m.id]);
      if (exists) continue;
      await run(
        `INSERT INTO models (id, name, tagline, description, version, size_bytes, ram_requirement,
          license, developer_name, price, currency, capabilities, featured, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'credits', ?, ?, 'available', ?, ?)`,
        [
          m.id,
          m.name,
          m.tagline,
          m.description,
          m.version,
          m.sizeMb * 1_000_000,
          m.minRamGb,
          m.license,
          m.developer,
          m.price,
          JSON.stringify(m.capabilities),
          m.featured ? 1 : 0,
          now,
          now,
        ],
      );
    }
  },

  async list(): Promise<AIModel[]> {
    const rows = await queryAll<ModelRow>("SELECT * FROM models ORDER BY featured DESC, name ASC");
    return rows.map(toModel);
  },

  async get(id: string): Promise<AIModel | null> {
    const row = await queryFirst<ModelRow>("SELECT * FROM models WHERE id = ?", [id]);
    return row ? toModel(row) : null;
  },

  async seedInstallStates(states: InstalledModel[]): Promise<void> {
    const any = await queryFirst<{ c: number }>("SELECT COUNT(*) as c FROM installed_models");
    if (any && any.c > 0) return;
    for (const s of states) await this.setState(s.modelId, s.status, s.progress);
  },

  async listStates(): Promise<InstalledModel[]> {
    const rows = await queryAll<InstalledRow>("SELECT * FROM installed_models");
    return rows.map(toInstall);
  },

  async getState(modelId: string): Promise<InstalledModel> {
    const row = await queryFirst<InstalledRow>(
      "SELECT * FROM installed_models WHERE model_id = ?",
      [modelId],
    );
    return row ? toInstall(row) : { modelId, status: "not_installed", progress: 0 };
  },

  async setState(
    modelId: string,
    status: ModelDownloadStatus,
    progress: number,
  ): Promise<void> {
    const now = nowIso();
    const installedAt = status === "installed" ? now : null;
    await run(
      `INSERT INTO installed_models (id, model_id, status, progress, installed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(model_id) DO UPDATE SET status = excluded.status, progress = excluded.progress,
         installed_at = COALESCE(excluded.installed_at, installed_models.installed_at), updated_at = excluded.updated_at`,
      [uid("inst"), modelId, status, progress, installedAt, now],
    );
  },
};
