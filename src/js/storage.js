// ===== storage.js =====
// localStorageでのスコア・実績・コイン管理

const KEY_HIGHSCORE  = 'voidrunner_highscore';
const KEY_COINS_TOTAL = 'voidrunner_coins_total';
const KEY_ACHIEVEMENTS = 'voidrunner_achievements';
const KEY_SKILLS     = 'voidrunner_skills';

export const ACHIEVEMENTS = [
  { id: 'run500',    label: '500m到達',           threshold: 500,    type: 'distance' },
  { id: 'run2000',   label: '2000m到達',          threshold: 2000,   type: 'distance' },
  { id: 'run5000',   label: '5000m到達',          threshold: 5000,   type: 'distance' },
  { id: 'kill10',    label: '敵10体撃破',          threshold: 10,     type: 'kills' },
  { id: 'kill50',    label: '敵50体撃破',          threshold: 50,     type: 'kills' },
  { id: 'coin50',    label: 'コイン50枚収集',      threshold: 50,     type: 'coins' },
  { id: 'coin200',   label: 'コイン200枚収集',     threshold: 200,    type: 'coins' },
  { id: 'score10k',  label: 'スコア10,000',        threshold: 10000,  type: 'score' },
  { id: 'score100k', label: 'スコア100,000',       threshold: 100000, type: 'score' },
];

export function loadHighScore() {
  return parseInt(localStorage.getItem(KEY_HIGHSCORE) || '0', 10);
}

export function saveHighScore(score) {
  const prev = loadHighScore();
  if (score > prev) {
    localStorage.setItem(KEY_HIGHSCORE, String(score));
    return true; // 更新あり
  }
  return false;
}

export function loadTotalCoins() {
  return parseInt(localStorage.getItem(KEY_COINS_TOTAL) || '0', 10);
}

export function saveTotalCoins(add) {
  const total = loadTotalCoins() + add;
  localStorage.setItem(KEY_COINS_TOTAL, String(total));
  return total;
}

export function loadAchievements() {
  try {
    return JSON.parse(localStorage.getItem(KEY_ACHIEVEMENTS) || '[]');
  } catch {
    return [];
  }
}

export function checkAchievements(stats) {
  const unlocked = loadAchievements();
  const newUnlocks = [];
  for (const ach of ACHIEVEMENTS) {
    if (unlocked.includes(ach.id)) continue;
    let val = 0;
    if (ach.type === 'distance') val = stats.distance;
    if (ach.type === 'kills')    val = stats.kills;
    if (ach.type === 'coins')    val = stats.totalCoins;
    if (ach.type === 'score')    val = stats.score;
    if (val >= ach.threshold) {
      unlocked.push(ach.id);
      newUnlocks.push(ach.label);
    }
  }
  if (newUnlocks.length > 0) {
    localStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(unlocked));
  }
  return newUnlocks;
}

export function loadSkills() {
  try {
    return JSON.parse(localStorage.getItem(KEY_SKILLS) || 'null');
  } catch {
    return null;
  }
}

export function saveSkills(skills) {
  localStorage.setItem(KEY_SKILLS, JSON.stringify(skills));
}
