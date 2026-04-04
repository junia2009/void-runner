// ===== screens.js =====
// タイトル・ゲームオーバー・ショップ画面の描画

import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { loadHighScore, loadAchievements, ACHIEVEMENTS } from './storage.js';

export function drawTitle(ctx, frame) {
  const W = GAME_WIDTH, H = GAME_HEIGHT;
  const scale = Math.min(W / 1280, H / 720);

  // 宇宙背景は game.js のBackground描画後に呼ばれる

  // タイトルロゴ
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.shadowBlur  = 30;
  ctx.shadowColor = '#7ecfff';

  // VOID
  ctx.font      = `bold ${Math.round(90 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#c8e8ff';
  ctx.fillText('VOID', W / 2, H * 0.35);

  // RUNNER
  ctx.font      = `bold ${Math.round(60 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#7ecfff';
  ctx.shadowColor = '#00aaff';
  ctx.fillText('RUNNER', W / 2, H * 0.35 + 72 * scale);

  // サブタイトル
  ctx.shadowBlur  = 0;
  ctx.font        = `${Math.round(13 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle   = '#4a8aaa';
  ctx.fillText('── Escape from the void between the stars ──', W / 2, H * 0.35 + 108 * scale);

  // バージョン表示
  ctx.fillText('ver 2.0.0', W / 2, H * 0.35 + 130 * scale);

  // 点滅プロンプト
  if (Math.floor(frame / 30) % 2 === 0) {
    ctx.font      = `bold ${Math.round(18 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#7ecfff';
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#7ecfff';
    ctx.fillText('PRESS SPACE / TAP TO START', W / 2, H * 0.72);
  }

  // ハイスコア
  const hi = loadHighScore();
  ctx.shadowBlur = 0;
  ctx.font      = `${Math.round(13 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#4a7aaa';
  ctx.fillText(`BEST: ${String(hi).padStart(8, '0')}`, W / 2, H * 0.82);

  // 操作説明
  ctx.font      = `${Math.round(11 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#2a4a6a';
  ctx.fillText('[SPACE / ↑]  Jump   [Z / J]  Attack', W / 2, H * 0.90);

  ctx.restore();
}

export function drawGameOver(ctx, stats) {
  const W = GAME_WIDTH, H = GAME_HEIGHT;
  const scale = Math.min(W / 1280, H / 720);

  // 半透明オーバーレイ
  ctx.save();
  ctx.fillStyle = 'rgba(0, 5, 15, 0.7)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // GAME OVER
  ctx.font      = `bold ${Math.round(72 * scale)}px 'Courier New', monospace`;
  ctx.shadowBlur  = 30;
  ctx.shadowColor = '#ff2200';
  ctx.fillStyle   = '#ff5533';
  ctx.fillText('GAME OVER', W / 2, H * 0.32);

  // 結果
  ctx.shadowBlur = 0;
  ctx.font      = `${Math.round(16 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#7ecfff';
  const lineH   = 32 * scale;
  const startY  = H * 0.48;
  ctx.fillText(`SCORE    ${String(stats.score).padStart(8, '0')}`, W / 2, startY);
  ctx.fillText(`DISTANCE ${Math.floor(stats.distance)} m`,         W / 2, startY + lineH);
  ctx.fillText(`KILLS    ${stats.kills}`,                           W / 2, startY + lineH * 2);
  ctx.fillText(`COINS    ${stats.coins}`,                           W / 2, startY + lineH * 3);

  // ハイスコア
  if (stats.isNewHighScore) {
    ctx.font        = `bold ${Math.round(15 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle   = '#ffd700';
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#ffd700';
    ctx.fillText('★  NEW HIGH SCORE!  ★', W / 2, startY + lineH * 4.5);
    ctx.shadowBlur = 0;
  }

  // リスタート
  if (Math.floor(stats.frame / 30) % 2 === 0) {
    ctx.font      = `bold ${Math.round(16 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#7ecfff';
    ctx.fillText('PRESS SPACE / TAP TO RETRY', W / 2, H * 0.85);
  }

  ctx.restore();
}

export function drawShop(ctx, totalCoins, playerSkills) {
  const W = GAME_WIDTH, H = GAME_HEIGHT;
  const scale = Math.min(W / 1280, H / 720);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 5, 20, 0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign   = 'center';
  ctx.font        = `bold ${Math.round(36 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle   = '#ffd700';
  ctx.shadowBlur  = 16;
  ctx.shadowColor = '#ffd700';
  ctx.fillText('UPGRADE SHOP', W / 2, H * 0.15);
  ctx.shadowBlur = 0;

  ctx.font      = `${Math.round(14 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#7ecfff';
  ctx.fillText(`◉  ${totalCoins} coins`, W / 2, H * 0.23);

  const items = getShopItems(playerSkills);
  const colW  = W * 0.42;
  const startX = W / 2 - colW;
  const itemH  = 72 * scale;
  const startY = H * 0.30;

  // アイテム座標リスト（クリック判定用に収集）
  const itemRects = [];

  items.forEach((item, i) => {
    const col  = i % 2;
    const row  = Math.floor(i / 2);
    const ix   = startX + col * (colW + W * 0.04);
    const iy   = startY + row * (itemH + 12 * scale);
    const canBuy = totalCoins >= item.cost && !item.maxed;

    // 座標を記録
    itemRects.push({ x: ix, y: iy, w: colW, h: itemH, idx: i });

    // ホバー感（canBuyの場合は枠を明るく）
    ctx.fillStyle = canBuy ? 'rgba(0, 30, 60, 0.8)' : 'rgba(10, 10, 20, 0.6)';
    ctx.fillRect(ix, iy, colW, itemH);
    ctx.strokeStyle = canBuy ? '#2a6acc' : '#1a2a3a';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(ix, iy, colW, itemH);

    ctx.textAlign = 'left';
    ctx.font      = `bold ${Math.round(13 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = item.maxed ? '#4a8aaa' : '#c8e8ff';
    ctx.fillText(item.label, ix + 12 * scale, iy + 22 * scale);

    ctx.font      = `${Math.round(11 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#4a7aaa';
    ctx.fillText(item.desc, ix + 12 * scale, iy + 40 * scale);

    ctx.textAlign = 'right';
    ctx.font      = `bold ${Math.round(13 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = item.maxed ? '#2a4a2a' : (canBuy ? '#ffd700' : '#4a4a2a');
    ctx.fillText(item.maxed ? 'MAX' : `◉ ${item.cost}`, ix + colW - 12 * scale, iy + 22 * scale);

    // キーガイド（PC向け）
    ctx.textAlign = 'right';
    ctx.font      = `${Math.round(11 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#2a4a6a';
    ctx.fillText(`[${i + 1}]`, ix + colW - 12 * scale, iy + 40 * scale);
  });

  // ===== PLAY AGAIN ボタン =====
  const btnW = 260 * scale;
  const btnH = 44  * scale;
  const btnX = W / 2 - btnW / 2;
  const btnY = H * 0.88;
  ctx.fillStyle   = 'rgba(0, 80, 160, 0.8)';
  ctx.strokeStyle = '#7ecfff';
  ctx.lineWidth   = 2;
  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#7ecfff';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur  = 0;

  ctx.font      = `bold ${Math.round(16 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#c8e8ff';
  ctx.textAlign = 'center';
  ctx.fillText('▶  PLAY AGAIN', W / 2, btnY + btnH * 0.65);

  ctx.font      = `${Math.round(11 * scale)}px 'Courier New', monospace`;
  ctx.fillStyle = '#2a4a6a';
  ctx.fillText('Press 1-6 to buy  /  ESC to close', W / 2, H * 0.97);

  ctx.restore();

  // 全ヒット領域を返す（クリック・タップ判定用）
  return { items, itemRects, playAgainBtn: { x: btnX, y: btnY, w: btnW, h: btnH } };
}

export function getShopItems(skills) {
  return [
    {
      id: 'jumpBoost',
      label: 'Jump Booster',
      desc:  `ジャンプ力強化 Lv${skills.jumpBoost}/3`,
      cost:  [80, 160, 300][skills.jumpBoost] || 0,
      maxed: skills.jumpBoost >= 3,
    },
    {
      id: 'attackPow',
      label: 'Blade Amplifier',
      desc:  `攻撃力強化 Lv${skills.attackPow}/3`,
      cost:  [100, 200, 400][skills.attackPow] || 0,
      maxed: skills.attackPow >= 3,
    },
    {
      id: 'maxHp',
      label: 'Shield Module',
      desc:  `最大HP+25`,
      cost:  150,
      maxed: skills._hpUpCount >= 4,
      _hpUpCount: skills._hpUpCount || 0,
    },
    {
      id: 'dashUnlock',
      label: 'Dash Drive',
      desc:  'ダッシュ解放 (Shift / 2本指)',
      cost:  250,
      maxed: skills.dashUnlock,
    },
    {
      id: 'doubleJump2',
      label: 'Triple Jump',
      desc:  '3段ジャンプ解放',
      cost:  350,
      maxed: skills._tripleJump || false,
    },
    {
      id: 'hpRegen',
      label: 'Nano Repair',
      desc:  '走行中にゆっくり回復',
      cost:  300,
      maxed: skills.hpRegen || false,
    },
  ];
}
