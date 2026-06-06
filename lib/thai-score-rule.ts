// lib/thai-score-rule.ts
// Validation rule for THAI_P1_3 self-assessment scoring.
//
// In THAI_P1_3 (the semantics are intentionally reversed vs Q-Model):
//   score  = ระดับการประเมิน (rating, 1–4)
//   score2 = ค่าเป้าหมาย     (development target, 1–4)
//
// The development target must be set HIGHER than the current rating, so it may NOT
// equal the rating — EXCEPT when the rating is already the maximum (4), where the
// only sensible target is 4 (maintain the top level).
//
// Pure & dependency-free so it can run on both the client (live form feedback) and
// the server (authoritative enforcement in /api/evaluations/[id]/responses).

export const THAI_MAX_RATING = 4;

/**
 * Check the THAI_P1_3 "target must differ from rating (unless rating = 4)" rule.
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
  if (target === rating && rating !== THAI_MAX_RATING) {
    return `ค่าเป้าหมายต้องไม่เท่ากับระดับการประเมิน — ตั้งเป้าหมายให้สูงกว่าระดับปัจจุบัน (ยกเว้นระดับ ${THAI_MAX_RATING} ที่ตั้งเป้าคงระดับได้)`;
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
