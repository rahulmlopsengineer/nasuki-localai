// SQLite client — single source of truth for local data. Opens the DB, runs
// pending migrations safely (idempotent, transactional), and exposes thin
// query helpers. Raw SQL lives only in repositories, never in UI.

import * as SQLite from "expo-sqlite";

import { migrations } from "./migrations";

const DB_NAME = "nasuki.db";

let db: SQLite.SQLiteDatabase | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;

export class DatabaseError extends Error {}

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) throw new DatabaseError("Database not initialized");
  return db;
};

export const isDbReady = (): boolean => ready;

/**
 * Open the database and apply migrations. Safe to call multiple times and safe
 * if the app restarts mid-initialization (migrations are transactional and the
 * PRAGMA user_version only advances after a migration fully commits).
 */
export const initDatabase = async (): Promise<void> => {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");

      const row = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version;",
      );
      let current = row?.user_version ?? 0;

      for (const migration of migrations) {
        if (migration.version <= current) continue;
        await db.withTransactionAsync(async () => {
          await db!.execAsync(migration.up);
        });
        // user_version cannot be parameterized; version is a trusted integer.
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
        current = migration.version;
      }

      ready = true;
    } catch (e) {
      initPromise = null;
      throw new DatabaseError(
        `Database initialization failed: ${(e as Error).message}`,
      );
    }
  })();

  return initPromise;
};

// ---- Query helpers (used only by repositories) -----------------------------

export const queryAll = async <T>(
  sql: string,
  params: SQLite.SQLiteBindValue[] = [],
): Promise<T[]> => getDb().getAllAsync<T>(sql, params);

export const queryFirst = async <T>(
  sql: string,
  params: SQLite.SQLiteBindValue[] = [],
): Promise<T | null> => getDb().getFirstAsync<T>(sql, params);

export const run = async (
  sql: string,
  params: SQLite.SQLiteBindValue[] = [],
): Promise<SQLite.SQLiteRunResult> => getDb().runAsync(sql, params);

export const withTransaction = async (
  fn: () => Promise<void>,
): Promise<void> => getDb().withTransactionAsync(fn);

// Test/support helper — never called in normal app flow.
export const _resetForTests = () => {
  db = null;
  ready = false;
  initPromise = null;
};
