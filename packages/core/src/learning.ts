export const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const REVIEW_INTERVAL_DAYS = Object.freeze([1, 2, 4, 7, 14, 30] as const);

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** The scheduler owns these fields; adapters retain any other stored fields. */
export interface LearningProgress {
  masteryLevel: MasteryLevel;
  reviewCount: number;
  correctCount: number;
  lastReviewed: number;
  lastReviewTime: number;
  nextReview: number;
  difficulty: number;
}

function normalizeMasteryLevel(value: unknown): MasteryLevel {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(5, Math.max(0, Math.trunc(value))) as MasteryLevel;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * Repair incomplete stored records without coercing strings or mutating input.
 * Finite mastery is truncated and clamped to 0..5; other mastery defaults to 0.
 * Invalid counters/timestamps default to 0, and correctCount cannot exceed
 * reviewCount. A positive finite difficulty is retained; otherwise it is 1.
 * Non-object values and arrays are treated as new progress records.
 */
export function normalizeLearningProgress(input: unknown): LearningProgress {
  const record =
    input !== null && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const reviewCount = nonNegativeInteger(record.reviewCount);
  const difficulty = record.difficulty;

  return {
    masteryLevel: normalizeMasteryLevel(record.masteryLevel),
    reviewCount,
    correctCount: Math.min(nonNegativeInteger(record.correctCount), reviewCount),
    lastReviewed: nonNegativeInteger(record.lastReviewed),
    lastReviewTime: nonNegativeInteger(record.lastReviewTime),
    nextReview: nonNegativeInteger(record.nextReview),
    difficulty:
      typeof difficulty === 'number' && Number.isFinite(difficulty) && difficulty > 0
        ? difficulty
        : 1,
  };
}

/** Schedule in elapsed 24-hour days, independent of timezone and platform. */
export function calculateNextReview(masteryLevel: number, reviewedAt: number): number {
  if (!Number.isSafeInteger(reviewedAt) || reviewedAt < 0) {
    throw new RangeError('reviewedAt must be a non-negative safe integer timestamp');
  }
  const nextReview =
    reviewedAt + REVIEW_INTERVAL_DAYS[normalizeMasteryLevel(masteryLevel)] * DAY_IN_MS;
  if (!Number.isSafeInteger(nextReview)) {
    throw new RangeError('nextReview exceeds the safe integer timestamp range');
  }
  return nextReview;
}

/**
 * Apply one answer using the live popup's mastery scheduler. The clock belongs
 * to the caller. A first correct answer reaches level 1 (2 days); a first
 * incorrect answer stays at level 0 (1 day). Counter overflow is rejected.
 */
export function applyLearningResult(
  previous: unknown,
  isCorrect: boolean,
  reviewedAt: number,
): LearningProgress {
  if (typeof isCorrect !== 'boolean') {
    throw new TypeError('isCorrect must be a boolean');
  }
  const progress = normalizeLearningProgress(previous);
  if (progress.reviewCount === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('reviewCount exceeds the safe integer counter range');
  }
  const masteryLevel = normalizeMasteryLevel(progress.masteryLevel + (isCorrect ? 1 : -1));
  return {
    ...progress,
    masteryLevel,
    reviewCount: progress.reviewCount + 1,
    correctCount: progress.correctCount + (isCorrect ? 1 : 0),
    lastReviewed: reviewedAt,
    lastReviewTime: reviewedAt,
    nextReview: calculateNextReview(masteryLevel, reviewedAt),
  };
}
