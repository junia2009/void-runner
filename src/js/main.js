// ===== main.js =====
// ゲームエントリーポイント・メインループ

import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { isTouchDevice } from './utils.js';
import { Input }         from './input.js';
import { Background }    from './background.js';
import { ParticleSystem } from './particles.js';
import { Player }        from './player.js';
import { World }         from './world.js';
import { EnemyManager }  from './enemies.js';
import { HUD }           from './hud.js';
import {
  loadHighScore, saveHighScore,
  loadTotalCoins, saveTotalCoins,
  checkAchievements, saveSkills, loadSkills,
} from './storage.js';
import { drawTitle, drawGameOver, drawShop, getShopItems } from './screens.js';

// ===== Canvas セットアップ =====
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

let scaleX = 1, scaleY = 1;

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width  = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  scaleX = w / GAME_WIDTH;
  scaleY = h / GAME_HEIGHT;

  // Canvasをウィンドウに合わせてCSSでスケール（アスペクト比維持）
  const aspect  = GAME_WIDTH / GAME_HEIGHT;
  const winAspect = w / h;
  if (winAspect > aspect) {
    const fitH = h;
    const fitW = h * aspect;
    canvas.style.width   = fitW + 'px';
    canvas.style.height  = fitH + 'px';
    canvas.style.left    = ((w - fitW) / 2) + 'px';
    canvas.style.top     = '0px';
  } else {
    const fitW = w;
    const fitH = w / aspect;
    canvas.style.width   = fitW + 'px';
    canvas.style.height  = fitH + 'px';
    canvas.style.left    = '0px';
    canvas.style.top     = ((h - fitH) / 2) + 'px';
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== 縦向き警告 =====
function checkOrientation() {
  const notice = document.getElementById('rotate-notice');
  if (window.innerWidth < window.innerHeight) {
    notice.classList.add('visible');
  } else {
    notice.classList.remove('visible');
  }
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

// ===== タッチボタン表示 =====
const touchControls = document.getElementById('touch-controls');
if (isTouchDevice()) {
  touchControls.classList.add('visible');
}

// ===== ゲーム状態 =====
const STATE = {
  TITLE:     'title',
  PLAYING:   'playing',
  SHOP:      'shop',       // ゲームオーバー後のショップ
  GAMEOVER:  'gameover',
};

let gameState = STATE.TITLE;

// ===== ゲームオブジェクト =====
const input     = new Input();
const bg        = new Background();
const particles = new ParticleSystem();
let   player, world, enemies, hud;

// ===== セッション統計 =====
let kills        = 0;
let score        = 0;
let gameOverData = null;
let titleFrame   = 0;
let totalCoins   = loadTotalCoins();
let shopItems    = [];

// ===== ゲーム初期化 =====
function initGame() {
  particles.particles.length = 0;
  const savedSkills = loadSkills();
  player  = new Player(particles);
  if (savedSkills) {
    player.skills = { ...player.skills, ...savedSkills };
    player.maxHp  = 100 + (savedSkills._hpUpCount || 0) * 25;
    player.hp     = player.maxHp;
  }
  world   = new World(particles);
  enemies = new EnemyManager(particles);
  hud     = new HUD();
  kills   = 0;
  score   = 0;
  world.score = 0;
  hud.notify('GO !', '#00ffcc');
}

// ===== 入力ハンドラ（タイトル・ゲームオーバーで使用） =====
function handleStateInput() {
  if (gameState === STATE.TITLE) {
    if (input.consumeJump() || input.consumeAttack()) {
      gameState = STATE.PLAYING;
      initGame();
    }
    return;
  }

  if (gameState === STATE.GAMEOVER) {
    if (input.consumeJump() || input.consumeAttack()) {
      gameState = STATE.SHOP;
      shopItems = getShopItems(player.skills);
      return;
    }
    return;
  }

  if (gameState === STATE.SHOP) {
    // ESC で閉じる
    if (input.keys['Escape']) {
      input.keys['Escape'] = false;
      gameState = STATE.TITLE;
      return;
    }
    return;
  }
}

// タイトル・GameOver画面のタップ
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchend', handleCanvasClick, { passive: true });

function handleCanvasClick(e) {
  if (gameState === STATE.TITLE || gameState === STATE.GAMEOVER) {
    if (gameState === STATE.TITLE) {
      gameState = STATE.PLAYING;
      initGame();
    } else {
      gameState = STATE.SHOP;
      shopItems = getShopItems(player.skills);
    }
    return;
  }

  if (gameState === STATE.SHOP) {
    // Canvasクリックでショップを閉じる（ボタン外）
    const rect = canvas.getBoundingClientRect();
    const cx   = (e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0) - rect.left;
    const cy   = (e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0) - rect.top;
    // 簡易：画面下25%をタップ → 閉じる
    if (cy / rect.height > 0.8) {
      gameState = STATE.TITLE;
    }
    return;
  }
}

// ショップキー入力
window.addEventListener('keydown', (e) => {
  if (gameState !== STATE.SHOP) return;
  const idx = parseInt(e.key) - 1;
  if (idx >= 0 && idx < shopItems.length) {
    tryBuyShopItem(idx);
  }
  if (e.key === 'Escape') {
    gameState = STATE.TITLE;
  }
});

// ショップタッチ（ボタン選択）
canvas.addEventListener('touchend', (e) => {
  if (gameState !== STATE.SHOP) return;
  const touch = e.changedTouches[0];
  const rect  = canvas.getBoundingClientRect();
  const tx    = (touch.clientX - rect.left) / rect.width  * GAME_WIDTH;
  const ty    = (touch.clientY - rect.top)  / rect.height * GAME_HEIGHT;
  identifyShopTouch(tx, ty);
}, { passive: true });

function identifyShopTouch(tx, ty) {
  const scale  = Math.min(1, GAME_WIDTH / 1280);
  const colW   = GAME_WIDTH * 0.42;
  const startX = GAME_WIDTH / 2 - colW;
  const itemH  = 72 * scale;
  const startY = GAME_HEIGHT * 0.30;

  shopItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix  = startX + col * (colW + GAME_WIDTH * 0.04);
    const iy  = startY + row * (itemH + 12 * scale);
    if (tx >= ix && tx <= ix + colW && ty >= iy && ty <= iy + itemH) {
      tryBuyShopItem(i);
    }
  });
}

function tryBuyShopItem(idx) {
  const item = shopItems[idx];
  if (!item || item.maxed || totalCoins < item.cost) return;

  totalCoins -= item.cost;
  applyShopItem(item.id);
  saveSkills(player.skills);
  shopItems = getShopItems(player.skills);
  hud && hud.notify(`${item.label} 購入！`, '#ffd700');

  // totalCoins をlocalStorageに反映（差し引いた後の値で上書き）
  localStorage.setItem('voidrunner_coins_total', String(totalCoins));
}

function applyShopItem(id) {
  switch (id) {
    case 'jumpBoost':
      if (player.skills.jumpBoost < 3) player.skills.jumpBoost++;
      break;
    case 'attackPow':
      if (player.skills.attackPow < 3) player.skills.attackPow++;
      break;
    case 'maxHp':
      player.skills._hpUpCount = (player.skills._hpUpCount || 0) + 1;
      player.maxHp += 25;
      player.hp    += 25;
      break;
    case 'dashUnlock':
      player.skills.dashUnlock = true;
      break;
    case 'doubleJump2':
      player.skills._tripleJump = true;
      player.skills.jumpsLeft   = 3;
      break;
    case 'hpRegen':
      player.skills.hpRegen = true;
      break;
  }
}

// Shiftキー / 2本指スワイプでダッシュ
window.addEventListener('keydown', (e) => {
  if (gameState === STATE.PLAYING && e.code === 'ShiftLeft') {
    player.dash();
  }
});

// ===== 実績チェック =====
let _lastAchievementCheck = 0;
function checkAchievementsThrottled() {
  const now = Date.now();
  if (now - _lastAchievementCheck < 1000) return;
  _lastAchievementCheck = now;

  const newUnlocks = checkAchievements({
    distance:   world.distance,
    kills,
    totalCoins,
    score,
  });
  for (const label of newUnlocks) {
    hud.notify(`★ 実績解除: ${label}`, '#ffd700');
  }
}

// ===== HP自然回復 =====
let _regenTimer = 0;
function updateHpRegen(dt) {
  if (!player.skills.hpRegen) return;
  _regenTimer += dt;
  if (_regenTimer >= 3000) {
    _regenTimer = 0;
    if (player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + 5);
    }
  }
}

// ===== メインループ =====
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50); // 最大50msでキャップ
  lastTime = timestamp;

  // ===== UPDATE =====
  handleStateInput();

  if (gameState === STATE.TITLE) {
    titleFrame++;
    bg.update(3);
    particles.update();

  } else if (gameState === STATE.PLAYING) {
    bg.update(world.scrollSpeed);
    world.update(dt, player);
    player.update(dt, input);

    const scoreGain = enemies.update(dt, world.scrollSpeed, world.distance, player);
    if (scoreGain > 0) {
      kills += Math.round(scoreGain / 150); // 大まかなkill数
      score += scoreGain;
      world.score = score;
    }

    // 距離スコア加算
    score += world.scrollSpeed * 0.03;
    world.score = Math.floor(score);

    particles.update();
    hud.update();
    updateHpRegen(dt);
    checkAchievementsThrottled();

    // 障害物との衝突
    for (const ob of world.obstacles) {
      const pr = { x: player.x + 4, y: player.y + 4, w: player.w - 8, h: player.h - 8 };
      const or = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
      if (
        pr.x < or.x + or.w && pr.x + pr.w > or.x &&
        pr.y < or.y + or.h && pr.y + pr.h > or.y
      ) {
        player.takeDamage(ob.type === 'spike' ? 30 : ob.type === 'drone' ? 25 : 20);
      }
    }

    // ゲームオーバー判定
    if (player.state === 'dead' && player.y > GAME_HEIGHT + 50) {
      const isNewHS = saveHighScore(Math.floor(score));
      totalCoins    = saveTotalCoins(world.coins);
      gameOverData  = {
        score:          Math.floor(score),
        distance:       Math.floor(world.distance),
        kills,
        coins:          world.coins,
        isNewHighScore: isNewHS,
        frame:          0,
      };
      gameState = STATE.GAMEOVER;
    }

  } else if (gameState === STATE.GAMEOVER) {
    bg.update(1);
    if (gameOverData) gameOverData.frame++;
    particles.update();

  } else if (gameState === STATE.SHOP) {
    bg.update(1);
    particles.update();
  }

  // ===== DRAW =====
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  bg.draw(ctx);

  if (gameState === STATE.TITLE) {
    particles.draw(ctx, 1, 1);
    drawTitle(ctx, titleFrame);

  } else if (gameState === STATE.PLAYING) {
    world.drawDebris(ctx);
    world.drawPlatforms(ctx);
    world.drawGround(ctx);
    world.drawObstacles(ctx);
    world.drawCoins(ctx, lastTime);
    enemies.draw(ctx);
    player.draw(ctx);
    particles.draw(ctx, 1, 1);
    hud.draw(ctx, player, world);

  } else if (gameState === STATE.GAMEOVER) {
    // 最後のゲーム状態を薄く映す
    world.drawGround(ctx);
    player.draw(ctx);
    particles.draw(ctx, 1, 1);
    if (gameOverData) drawGameOver(ctx, gameOverData);

  } else if (gameState === STATE.SHOP) {
    particles.draw(ctx, 1, 1);
    drawShop(ctx, totalCoins, player.skills);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame((ts) => {
  lastTime = ts;
  loop(ts);
});
