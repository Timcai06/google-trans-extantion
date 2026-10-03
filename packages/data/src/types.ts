import type {
  LearningProgress,
  ReviewData,
  SyncMutation,
  SyncRequest,
  SyncResponse,
  WordData,
} from '@googletrans/core';

export interface LibraryState {
  records: Record<string, SyncMutation>;
  outbox: Record<string, SyncMutation>;
  cursor: number;
  meta: Record<string, unknown>;
}
/** The callback is synchronous. Adapters commit its mutations atomically or roll back on throw. */
export interface LibraryStore {
  transaction<R>(namespace: string, update: (state: LibraryState) => R): Promise<R>;
}
export interface WordInput {
  text: string;
  translation: string;
  context?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  starred?: boolean;
  createdAt?: number;
  legacy?: Record<string, unknown>;
}
export type LibraryWord = WordData & { id: string; progress: LearningProgress };
export type ReviewInput = Omit<ReviewData, 'reviewedAt'> & { reviewedAt?: number };
export interface LibraryBackup {
  version: 1;
  exportedAt: number;
  records: SyncMutation[];
  legacy: Record<string, unknown>;
  /** Original review payloads survive tombstones and validate later restoration. */
  reviewValues?: Record<string, ReviewData>;
}
export interface ImportReport {
  imported: number;
  skipped: number;
}
export interface SyncReport {
  pages: number;
  sent: number;
  received: number;
  pending: number;
}
export interface LibraryClient {
  readonly namespace: string;
  saveWord(input: WordInput): Promise<LibraryWord>;
  listWords(): Promise<LibraryWord[]>;
  deleteWord(id: string): Promise<void>;
  setStarred(id: string, starred: boolean): Promise<void>;
  submitReview(input: ReviewInput): Promise<LearningProgress>;
  recordReview(input: ReviewInput): Promise<LearningProgress>;
  getProgress(id: string): Promise<LearningProgress>;
  exportBackup(): Promise<LibraryBackup>;
  importBackup(input: unknown): Promise<ImportReport>;
  getPreImportBackup(): Promise<LibraryBackup | null>;
  restorePreImportBackup(): Promise<ImportReport>;
  importLegacy(input: unknown): Promise<ImportReport>;
  importAnonymous(): Promise<ImportReport>;
  sync(
    transport: (request: SyncRequest) => Promise<SyncResponse>,
    maxPages?: number,
  ): Promise<SyncReport>;
}
