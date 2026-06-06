// lib/thai-score-rule.ts
// Validation rule for THAI_P1_3 self-assessment scoring.
//
// In THAI_P1_3 (the semantics are intentionally reversed vs Q-Model):
//   score  = ระดับการประเมิน (rating, 1–4)
//   score2 = ค่าเป้าหมาย     (development target, 1–4)
//
// The development target must be at least ONE LEVEL ABOVE the current rating, capped at the
// maximum (4): rating 1 → target 2–4, 2 → 3–4, 3 → 4, and 4 → 4 (once you are at the top the
// only valid target is 4). Equivalent rule: target >= min(rating + 1, 4).
//
// Pure & dependency-free so it can run on both the client (live form feedback) and
// the server (authoritative enforcement in /api/evaluations/[id]/responses).

export const THAI_MAX_RATING = 4;

/**
 * Check the THAI_P1_3 rule: target >= min(rating + 1, 4) — at least one level above the
 * rating, capped at 4 (so a rating of 4 requires a target of exactly 4).
 * @param rating  ระดับการประเมิน — EvaluationResponse.score for THAI_P1_3
 * @param target  ค่าเป้าหมาย     — EvaluationResponse.score2 for THAI_P1_3
 * @returns a Thai error message when invalid, or null when valid.
 */
export function checkThaiTargetVsRating(
  rating: number | null | undefined,
  target: number | null | undefined,
): string | null {
  // Nothing to validate until both the rating and a target are present.
  if (rating == null || target == null) return null;
  // Minimum allowed target = one level above the rating, capped at the max (4):
  //   rating 1 → 2-4, 2 → 3-4, 3 → 4, 4 → 4 (only 4 once you are already at the top).
  const minTarget = Math.min(rating + 1, THAI_MAX_RATING);
  if (target < minTarget) {
    return rating >= THAI_MAX_RATING
      ? `ระดับการประเมินเท่ากับ ${THAI_MAX_RATING} แล้ว — ค่าเป้าหมายต้องเป็น ${THAI_MAX_RATING}`
      : `ค่าเป้าหมายต้องสูงกว่าระดับการประเมิน (ตั้งได้ตั้งแต่ระดับ ${minTarget} ขึ้นไป)`;
  }
  return null;
}

/** Convenience boolean form of {@link checkThaiTargetVsRating}. */
export function isThaiTargetValid(
  rating: number | null | undefined,
  target: number | null | undefined,
): boolean {
  return checkThaiTargetVsRating(rating, target) === null;
}
