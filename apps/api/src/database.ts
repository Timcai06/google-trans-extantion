import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { compareMutations, type SyncMutation, type SyncRequest, type SyncResponse } from '@googletrans/core';
import { ApiError } from './errors';

export class Storage {
  readonly db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL,
        password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS mutations (
        user_id TEXT NOT NULL REFERENCES users(id), mutation_id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY (user_id, mutation_id)
      );
      CREATE TABLE IF NOT EXISTS records (
        user_id TEXT NOT NULL REFERENCES users(id), record_id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY (user_id, record_id)
      );
      CREATE TABLE IF NOT EXISTS review_values (
        user_id TEXT NOT NULL REFERENCES users(id), record_id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY (user_id, record_id)
      );
      CREATE TABLE IF NOT EXISTS changes (
        cursor INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id), payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS changes_user_cursor ON changes(user_id, cursor);
    `);
  }

  sync(userId: string, request: SyncRequest, pageSize: number): SyncResponse {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const head = this.db.prepare('SELECT COALESCE(MAX(cursor), 0) AS cursor FROM changes WHERE user_id = ?')
        .get(userId) as { cursor: number };
      if (request.cursor > head.cursor) throw new ApiError(400, 'INVALID_CURSOR', 'Cursor exceeds this account\'s sync history.');
      const acknowledged: string[] = [];
      for (const mutation of request.changes) {
        const payload = JSON.stringify(mutation);
        const duplicate = this.db.prepare('SELECT payload FROM mutations WHERE user_id = ? AND mutation_id = ?')
          .get(userId, mutation.mutationId) as { payload: string } | undefined;
        if (duplicate) {
          if (duplicate.payload !== payload) throw new ApiError(409, 'MUTATION_ID_REUSED', 'Mutation ID already belongs to a different change.');
          acknowledged.push(mutation.mutationId);
          continue;
        }
        const existing = this.db.prepare('SELECT payload FROM records WHERE user_id = ? AND record_id = ?')
          .get(userId, mutation.record.id) as { payload: string } | undefined;
        const previous = existing ? JSON.parse(existing.payload) as SyncMutation : undefined;
        if (previous && previous.record.kind !== mutation.record.kind) {
          throw new ApiError(409, 'RECORD_KIND_CHANGED', 'A record ID cannot change its kind.');
        }
        if (mutation.record.kind === 'review' && !mutation.record.deleted) {
          const reviewPayload = JSON.stringify(mutation.record.value);
          const original = this.db.prepare('SELECT payload FROM review_values WHERE user_id = ? AND record_id = ?')
            .get(userId, mutation.record.id) as { payload: string } | undefined;
          if (original && original.payload !== reviewPayload) {
            throw new ApiError(409, 'REVIEW_IMMUTABLE', 'Reviews are immutable events. Use a new review ID.');
          }
          if (!original) this.db.prepare('INSERT INTO review_values(user_id, record_id, payload) VALUES (?, ?, ?)')
            .run(userId, mutation.record.id, reviewPayload);
        }
        this.db.prepare('INSERT INTO mutations(user_id, mutation_id, payload) VALUES (?, ?, ?)')
          .run(userId, mutation.mutationId, payload);
        if (!previous || compareMutations(mutation, previous) > 0) {
          this.db.prepare('INSERT INTO records(user_id, record_id, payload) VALUES (?, ?, ?) ON CONFLICT(user_id, record_id) DO UPDATE SET payload = excluded.payload')
            .run(userId, mutation.record.id, payload);
          this.db.prepare('INSERT INTO changes(user_id, payload) VALUES (?, ?)').run(userId, payload);
        }
        acknowledged.push(mutation.mutationId);
      }
      const rows = this.db.prepare('SELECT cursor, payload FROM changes WHERE user_id = ? AND cursor > ? ORDER BY cursor LIMIT ?')
        .all(userId, request.cursor, pageSize + 1) as Array<{ cursor: number; payload: string }>;
      const hasMore = rows.length > pageSize;
      const page = rows.slice(0, pageSize);
      const latest = this.db.prepare('SELECT COALESCE(MAX(cursor), 0) AS cursor FROM changes WHERE user_id = ?')
        .get(userId) as { cursor: number };
      const response: SyncResponse = {
        cursor: page.at(-1)?.cursor ?? latest.cursor,
        changes: page.map(row => ({ cursor: row.cursor, mutation: JSON.parse(row.payload) as SyncMutation })),
        acknowledged: [...new Set(acknowledged)], hasMore,
      };
      this.db.exec('COMMIT');
      return response;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close() { this.db.close(); }
}
