// ===== hud.js =====
// HP・スコア・コイン・距離・実績通知などのUI描画

import { GAME_WIDTH, GAME_HEIGHT, COLORS, PLAYER } from './constants.js';

export class HUD {
  constructor() {
    this.notifications = []; // { text, life, maxLife, color }
  }

  notify(text, color = '#7ecfff') {
    this.notifications.push({ text, life: 180, maxLife: 180, color });
  }

  update() {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      this.notifications[i].life--;
      if (this.notifications[i].life <= 0) this.notifications.splice(i, 1);
    }
  }

  draw(ctx, player, world) {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const scale = Math.min(W / 1280, H / 720);

    ctx.save();

    // === HPバー ===
    const hpBarW = 220 * scale;
    const hpBarH = 14  * scale;
    const hpX    = 24  * scale;
    const hpY    = 24  * scale;

    ctx.fillStyle = '#050f20';
    ctx.fillRect(hpX - 2, hpY - 2, hpBarW + 4, hpBarH + 4);

    const hpRatio = Math.max(0, player.hp / player.maxHp);
    const hpColor = hpRatio > 0.5 ? '#00cfff' : hpRatio > 0.25 ? '#ffcc00' : '#ff3300';
    ctx.fillStyle = '#0a2040';
    ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);

    // HPバーグロー
    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = hpColor;
    ctx.strokeStyle = hpColor;
    ctx.lineWidth   = 1;
    ctx.strokeRect(hpX, hpY, hpBarW * hpRatio, hpBarH);
    ctx.restore();

    // HP ラベル
    ctx.font      = `bold ${Math.round(11 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#7ecfff';
    ctx.fillText(`HP  ${player.hp} / ${player.maxHp}`, hpX, hpY - 5);

    // === スコア ===
    ctx.font        = `bold ${Math.round(22 * scale)}px 'Courier New', monospace`;
    ctx.textAlign   = 'right';
    ctx.fillStyle   = '#7ecfff';
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#00aaff';
    ctx.fillText(String(world.score || 0).padStart(8, '0'), W - 24 * scale, 42 * scale);
    ctx.shadowBlur  = 0;

    ctx.font      = `${Math.round(11 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#4a8aaa';
    ctx.fillText('SCORE', W - 24 * scale, 24 * scale);

    // === 距離 ===
    ctx.font      = `${Math.round(12 * scale)}px 'Courier New', monospace`;
    ctx.fillStyle = '#4a8aaa';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(world.distance)}m`, W / 2, 24 * scale);

    // === コイン ===
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ffd700';
    ctx.font = `bold ${Math.round(13 * scale)}px 'Courier New', monospace`;
    ctx.fillText(`◉  ${world.coins}`, hpX, hpY + hpBarH + 22 * scale);
    ctx.shadowBlur = 0;

    // === 通知バナー ===
    ctx.textAlign = 'center';
    this.notifications.forEach((n, idx) => {
      const alpha = Math.min(1, n.life / 30);
      ctx.globalAlpha = alpha;
      ctx.font        = `bold ${Math.round(18 * scale)}px 'Courier New', monospace`;
      ctx.fillStyle   = n.color;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = n.color;
      const floatY = H * 0.35 - idx * 30 * scale - (1 - n.life / n.maxLife) * 30 * scale;
      ctx.fillText(n.text, W / 2, floatY);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    ctx.restore();
  }
}
