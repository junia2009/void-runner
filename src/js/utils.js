// ===== utils.js =====

/** 2矩形の衝突判定 */
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** 範囲内ランダム整数 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 線形補間 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** タッチデバイス判定 */
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

/** 数値クランプ */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
