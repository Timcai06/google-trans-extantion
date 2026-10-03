import { describe, expect, it } from 'vitest';
import {
  DAY_IN_MS,
  REVIEW_INTERVAL_DAYS,
  applyLearningResult,
  calculateNextReview,
  normalizeLearningProgress,
} from '../../packages/core/src/index.js';

const reviewedAt = 1_791_000_000_000;

describe('shared mastery scheduler', () => {
  it('keeps the live six intervals and first-answer behavior', () => {
    expect(REVIEW_INTERVAL_DAYS).toEqual([1, 2, 4, 7, 14, 30]);
    expect(applyLearningResult(undefined, true, reviewedAt)).toEqual({
      masteryLevel: 1,
      reviewCount: 1,
      correctCount: 1,
      lastReviewed: reviewedAt,
      lastReviewTime: reviewedAt,
      nextReview: reviewedAt + 2 * DAY_IN_MS,
      difficulty: 1,
    });
    expect(applyLearningResult(undefined, false, reviewedAt)).toEqual({
      masteryLevel: 0,
      reviewCount: 1,
      correctCount: 0,
      lastReviewed: reviewedAt,
      lastReviewTime: reviewedAt,
      nextReview: reviewedAt + DAY_IN_MS,
      difficulty: 1,
    });
  });

  it.each([0, 1, 2, 3, 4, 5])('schedules every mastery level %i after both outcomes', (level) => {
    const previous = { masteryLevel: level, reviewCount: 8, correctCount: 6, difficulty: 2.5 };
    for (const correct of [true, false]) {
      const expectedLevel = Math.min(5, Math.max(0, level + (correct ? 1 : -1)));
      const result = applyLearningResult(previous, correct, reviewedAt);
      expect(result.masteryLevel).toBe(expectedLevel);
      expect(result.reviewCount).toBe(9);
      expect(result.correctCount).toBe(correct ? 7 : 6);
      expect(result.difficulty).toBe(2.5);
      expect(result.nextReview).toBe(reviewedAt + REVIEW_INTERVAL_DAYS[expectedLevel]! * DAY_IN_MS);
    }
    expect(previous).toEqual({
      masteryLevel: level,
      reviewCount: 8,
      correctCount: 6,
      difficulty: 2.5,
    });
  });

  it('uses only the supplied clock and stays deterministic across a review sequence', () => {
    const initial = Object.freeze({
      masteryLevel: 2,
      reviewCount: 4,
      correctCount: 3,
      difficulty: 1.2,
    });
    const result = applyLearningResult(initial, false, 0);
    expect(result).toEqual(applyLearningResult(initial, false, 0));
    expect(result.lastReviewed).toBe(0);
    expect(result.lastReviewTime).toBe(0);
    expect(result.nextReview).toBe(2 * DAY_IN_MS);
    expect(applyLearningResult(result, true, DAY_IN_MS)).toMatchObject({
      masteryLevel: 2,
      reviewCount: 6,
      correctCount: 4,
      nextReview: 5 * DAY_IN_MS,
    });
  });

  it.each([undefined, null, false, 'bad', [], 15])('defaults non-record progress %j', (input) => {
    expect(normalizeLearningProgress(input)).toEqual({
      masteryLevel: 0,
      reviewCount: 0,
      correctCount: 0,
      lastReviewed: 0,
      lastReviewTime: 0,
      nextReview: 0,
      difficulty: 1,
    });
  });

  it('repairs malformed fields without coercing strings or mutating the input', () => {
    const malformed = Object.freeze({
      masteryLevel: 12.8,
      reviewCount: '7',
      correctCount: 5,
      lastReviewed: -1,
      lastReviewTime: Number.NaN,
      nextReview: Number.POSITIVE_INFINITY,
      difficulty: 0,
      annotation: 'retained by the adapter',
    });
    expect(normalizeLearningProgress(malformed)).toEqual({
      masteryLevel: 5,
      reviewCount: 0,
      correctCount: 0,
      lastReviewed: 0,
      lastReviewTime: 0,
      nextReview: 0,
      difficulty: 1,
    });
    expect(applyLearningResult(malformed, false, reviewedAt)).toMatchObject({
      masteryLevel: 4,
      reviewCount: 1,
      correctCount: 0,
      nextReview: reviewedAt + 14 * DAY_IN_MS,
    });
    expect(malformed.reviewCount).toBe('7');
  });

  it.each([
    [-100, 0],
    [2.9, 2],
    [100, 5],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])('normalizes mastery %s to %i before scheduling', (input, expectedLevel) => {
    expect(calculateNextReview(input, reviewedAt)).toBe(
      reviewedAt + REVIEW_INTERVAL_DAYS[expectedLevel]! * DAY_IN_MS,
    );
  });

  it('repairs invalid counters and caps correct answers at the reviewed count', () => {
    expect(normalizeLearningProgress({ reviewCount: 2, correctCount: 12 })).toMatchObject({
      reviewCount: 2,
      correctCount: 2,
    });
    expect(normalizeLearningProgress({ reviewCount: 1.5, correctCount: -1 })).toMatchObject({
      reviewCount: 0,
      correctCount: 0,
    });
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER])(
    'rejects invalid or overflowing review timestamp %s',
    (timestamp) => {
      expect(() => applyLearningResult(undefined, true, timestamp)).toThrow(RangeError);
    },
  );

  it('rejects counter overflow and non-boolean outcomes at the boundary', () => {
    expect(() =>
      applyLearningResult({ reviewCount: Number.MAX_SAFE_INTEGER }, false, reviewedAt),
    ).toThrow(/reviewCount/);
    expect(() => applyLearningResult(undefined, 'true' as unknown as boolean, reviewedAt)).toThrow(
      TypeError,
    );
  });
});
