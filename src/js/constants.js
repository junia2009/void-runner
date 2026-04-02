// ===== constants.js =====
// ゲーム全体で使う定数

export const GAME_WIDTH  = 1280;
export const GAME_HEIGHT = 720;

export const GRAVITY = 0.55;
export const GROUND_Y_RATIO = 0.78; // 地面のY位置（高さ比率）

export const PLAYER = {
  WIDTH: 40,
  HEIGHT: 56,
  SPEED: 6,
  JUMP_FORCE: -14,
  DOUBLE_JUMP_FORCE: -12,
  MAX_HP: 100,
  ATTACK_DAMAGE: 25,
  ATTACK_RANGE_W: 160,  // 攻撃リーチを大幅拡大
  ATTACK_RANGE_H: 100,  // 上下方向も広く
  ATTACK_COOLDOWN: 300, // ms
  INVINCIBLE_TIME: 1000, // ms（被弾後の無敵時間）
};

export const COLORS = {
  BG_TOP:    '#000d1a',
  BG_BOTTOM: '#001a33',
  GROUND:    '#0a1628',
  GROUND_EDGE: '#1a3a6a',
  PLAYER_BODY: '#c8e8ff',
  PLAYER_SUIT: '#1e4a7a',
  PLAYER_VISOR:'#7ecfff',
  SLASH:     '#ffffff',
  HP_BAR:    '#00cfff',
  HP_BG:     '#0a2040',
  SCORE:     '#7ecfff',
  COIN:      '#ffd700',
};

export const SCROLL_SPEED_INIT  = 5;
export const SCROLL_SPEED_MAX   = 14;
export const SCROLL_ACCEL       = 0.0008; // 距離ごとに加速
