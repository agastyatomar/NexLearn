/* In-memory D1 emulation for tests — bun:sqlite implementing D1Like.
   Cloudflare's D1 is a managed SQLite; statements are identical, so the
   worker database layer runs unmodified against this shim. */

import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { D1Like, D1PreparedStatementLike, D1Result } from "../db/client";

class Stmt implements D1PreparedStatementLike {
  private db: Database;
  private sql: string;
  private values: unknown[] = [];

  constructor(db: Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  private bound(): unknown[] {
    // D1 JSON columns are TEXT; objects/arrays become strings, like D1 does.
    return this.values.map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v));
  }

  private stmt() {
    // bun:sqlite binds positionally at call time (.get/.all/.run accept args)
    const s = this.db.prepare(this.sql);
    const args = this.bound();
    return { s, args };
  }

  bind(...values: unknown[]): D1PreparedStatementLike {
    this.values = values;
    return this;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta?: unknown }> {
    try {
      const { s, args } = this.stmt();
      const rows = (args.length ? s.all(...(args as never[])) : s.all()) as T[];
      return { results: rows, success: true };
    } catch (e) {
      throw new Error(`all error: ${(e as Error).message.slice(0, 200)} — ${this.sql.slice(0, 160)}`);
    }
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    try {
      const { s, args } = this.stmt();
      const row = args.length ? (s.get(...(args as never[])) as T | undefined) : (s.get() as T | undefined);
      if (colName) return (row as Record<string, unknown>) == null ? null : (String((row as Record<string, unknown>)[colName]) as unknown as T);
      return (row ?? null) as T | null;
    } catch (e) {
      throw new Error(`first error: ${(e as Error).message.slice(0, 200)} — ${this.sql.slice(0, 160)}`);
    }
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    try {
      const { s, args } = this.stmt();
      args.length ? s.run(...(args as never[])) : s.run();
      return { results: [], success: true };
    } catch (e) {
      throw new Error(`run error: ${(e as Error).message.slice(0, 200)} — ${this.sql.slice(0, 160)}`);
    }
  }

  /** Runs inside a prepared transaction (batch). */
  execInsideTransaction(): void {
    const { s, args } = this.stmt();
    if (args.length) s.run(...(args as never[]));
    else s.run();
  }
}

class MemoryD1 implements D1Like {
  private db: Database;
  constructor(db: Database) {
    this.db = db;
  }
  prepare(query: string): D1PreparedStatementLike {
    return new Stmt(this.db, query);
  }
  async batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<D1Result<T>[]> {
    this.db.transaction(() => {
      for (const s of statements) {
        (s as unknown as Stmt).execInsideTransaction();
      }
    })();
    return statements.map(() => ({ results: [], success: true }) as D1Result<T>);
  }
  async exec(query: string): Promise<{ results: { results: unknown[]; success: boolean }[]; success: boolean }> {
    const parts = query.split(";").map((p) => p.trim()).filter(Boolean);
    const out: { results: unknown[]; success: boolean }[] = [];
    for (const p of parts) {
      this.db.prepare(p).run();
      out.push({ results: [], success: true });
    }
    return { results: out, success: true };
  }
}

const migrationsDir = join(dirname(import.meta.dir), "d1", "migrations");
const seedDir = join(dirname(import.meta.dir), "d1");

export function newMemoryDb(): D1Like {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const migration = readFileSync(join(migrationsDir, "0001_init.sql"), "utf8");
  db.exec(migration);

  /* Seed the curriculum from the deterministic content SQL (BEGIN/COMMIT
     wrapper is fine — bun:sqlite exec handles the whole batch). */
  try {
    db.exec(readFileSync(join(seedDir, "content-seed.sql"), "utf8"));
  } catch (e) {
    console.warn("content seed parse", e instanceof Error ? e.message : e);
  }

  return new MemoryD1(db);
}
