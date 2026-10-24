/* Minimal D1-shaped client interface. The real Cloudflare D1Database can be
   assigned to this structurally; tests plug in an in-memory SQLite emulation. */

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta?: unknown }>;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<{ results: T[]; columns: string[] }>;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: unknown;
}

export interface D1Like {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<D1Result[]>;
  exec(query: string): Promise<{ results: { results: unknown[]; success: boolean }[]; success: boolean }>;
}

export type Row = Record<string, unknown>;
