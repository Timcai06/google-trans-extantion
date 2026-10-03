import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { buildSync } from 'esbuild';
import { describe, expect, it, vi } from 'vitest';
import type { LearningProgress } from '../../packages/core/src/index.js';

const coreEntry = fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url));
const managerSource = readFileSync(
  new URL('../../extension/popup/modules/learning-manager.js', import.meta.url), 'utf8',
);
const coreBundle = buildSync({
  entryPoints: [coreEntry], bundle: true, write: false,
  format: 'iife', globalName: 'GoogleTransCore', platform: 'browser', target: 'es2022',
}).outputFiles[0]!.text;
const reviewedAt = 1_791_000_000_000;
const day = 86_400_000;

interface RuntimeManager {
  currentMode: string;
  currentFilter: string;
  sessionStats: { correct: number; mistakes: string[] };
  recordLearningResult(wordKey: string, isCorrect: boolean): Promise<void>;
}

interface CoreBridge {
  applyLearningResult(previous: unknown, correct: boolean, now: number): LearningProgress;
}

function createRuntime(initialProgress: Record<string, unknown> = {}, includeCore = true) {
  let stored = structuredClone(initialProgress);
  const get = vi.fn(async () => ({ learningProgress: structuredClone(stored) }));
  const set = vi.fn(async (data: { learningProgress: Record<string, unknown> }) => {
    stored = structuredClone(data.learningProgress);
  });
  const recordLearning = vi.fn(async () => undefined);
  const updateChallengeProgress = vi.fn(async () => undefined);
  const queueConstructor = vi.fn(() => { throw new Error('Historical queue must not be activated'); });
  const now = vi.fn(() => reviewedAt);
  const error = vi.fn();
  const context = createContext({
    Date: undefined, chrome: undefined, window: undefined, document: undefined, fetch: undefined,
  });
  // Execute the bundled shared package before adding any platform or clock globals.
  if (includeCore) runInContext(coreBundle, context);
  const core = context.GoogleTransCore as CoreBridge | undefined;
  const applyLearningResult = core ? vi.fn(core.applyLearningResult) : undefined;
  if (core) context.GoogleTransCore = { ...core, applyLearningResult };
  Object.assign(context, {
    Date: { now },
    chrome: { storage: { local: { get, set } } },
    window: { learningHistoryManager: { recordLearning, updateChallengeProgress } },
    console: { error },
    ReviewQueueManager: queueConstructor,
  });
  runInContext(managerSource, context);
  const Manager = context.window.LearningManager as new () => RuntimeManager;
  return {
    Manager, get, set, recordLearning, updateChallengeProgress, queueConstructor, now, error,
    applyLearningResult, progress: () => stored,
  };
}

describe('live LearningManager shared-core integration', () => {
  it('persists the actual bundled core result, retaining extra fields and unrelated words', async () => {
    const existing = {
      masteryLevel: 2, reviewCount: 6, correctCount: 4, difficulty: 1.75,
      lastReviewed: 4, nextReview: 10, annotation: 'keep me', custom: { source: 'import' },
    };
    const otherWord = { masteryLevel: 4, reviewCount: 8, correctCount: 7, notes: ['untouched'] };
    const runtime = createRuntime({ apple: existing, book: otherWord });
    const manager = new runtime.Manager();
    manager.currentMode = 'quiz';
    manager.currentFilter = 'daily';

    await manager.recordLearningResult('apple', true);

    expect(runtime.applyLearningResult).toHaveBeenCalledExactlyOnceWith(existing, true, reviewedAt);
    expect(runtime.progress()).toEqual({
      apple: {
        ...existing, masteryLevel: 3, reviewCount: 7, correctCount: 5,
        lastReviewed: reviewedAt, lastReviewTime: reviewedAt, nextReview: reviewedAt + 7 * day,
      },
      book: otherWord,
    });
    expect(runtime.set).toHaveBeenCalledTimes(1);
    expect(runtime.now).toHaveBeenCalledTimes(1);
    expect(manager.sessionStats.correct).toBe(1);
    expect(manager.sessionStats.mistakes).toEqual([]);
    expect(runtime.recordLearning).toHaveBeenCalledExactlyOnceWith('apple', 'quiz');
    expect(runtime.updateChallengeProgress).toHaveBeenCalledExactlyOnceWith('apple');
    expect(runtime.queueConstructor).not.toHaveBeenCalled();
    expect(runtime.error).not.toHaveBeenCalled();
  });

  it.each([true, false])('creates first-answer progress for correctness %s and retains session/history effects', async (correct) => {
    const runtime = createRuntime();
    const manager = new runtime.Manager();
    manager.currentMode = 'spelling';

    await manager.recordLearningResult('new word', correct);

    expect(runtime.applyLearningResult).toHaveBeenCalledExactlyOnceWith(undefined, correct, reviewedAt);
    expect(runtime.progress()['new word']).toEqual({
      masteryLevel: correct ? 1 : 0, reviewCount: 1, correctCount: correct ? 1 : 0,
      lastReviewed: reviewedAt, lastReviewTime: reviewedAt,
      nextReview: reviewedAt + (correct ? 2 : 1) * day, difficulty: 1,
    });
    expect(manager.sessionStats.correct).toBe(correct ? 1 : 0);
    expect(manager.sessionStats.mistakes).toEqual(correct ? [] : ['new word']);
    expect(runtime.recordLearning).toHaveBeenCalledExactlyOnceWith('new word', 'spelling');
    expect(runtime.updateChallengeProgress).not.toHaveBeenCalled();
    expect(runtime.queueConstructor).not.toHaveBeenCalled();
    expect(runtime.error).not.toHaveBeenCalled();
  });

  it('repairs malformed legacy fields through the shared core while retaining adapter metadata', async () => {
    const runtime = createRuntime({ apple: {
      masteryLevel: -8, reviewCount: 'broken', correctCount: 99, difficulty: Number.NaN, notes: 'keep',
    } });
    const manager = new runtime.Manager();
    await manager.recordLearningResult('apple', false);
    expect(runtime.progress().apple).toEqual({
      masteryLevel: 0, reviewCount: 1, correctCount: 0, difficulty: 1, notes: 'keep',
      lastReviewed: reviewedAt, lastReviewTime: reviewedAt, nextReview: reviewedAt + day,
    });
    expect(manager.sessionStats.mistakes).toEqual(['apple']);
  });

  it('fails clearly before storage work when the shared bridge is missing', () => {
    const runtime = createRuntime({}, false);
    expect(() => new runtime.Manager()).toThrow(
      'GoogleTransCore.applyLearningResult must load before LearningManager',
    );
    expect(runtime.get).not.toHaveBeenCalled();
    expect(runtime.set).not.toHaveBeenCalled();
  });
});
