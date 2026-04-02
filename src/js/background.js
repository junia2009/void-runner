// ===== background.js =====
// 視差スクロール背景（星・惑星・宇宙ステーション残骸）

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './constants.js';
import { randInt } from './utils.js';

export class Background {
  constructor() {
    this._initStars();
    this._initPlanets();
    this.nebulaOffset = 0;
  }

  _initStars() {
    // 3レイヤーの星（遠 / 中 / 近）
    this.layers = [
      { stars: this._genStars(120, 0.8, 1),   speed: 0.2, size: [1, 1.5] },
      { stars: this._genStars(60,  1.5, 2),   speed: 0.5, size: [1.5, 2.5] },
      { stars: this._genStars(25,  2,   3.5), speed: 1.0, size: [2, 3] },
    ];
  }

  _genStars(count, minBright, maxBright) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT * 0.85,
      bright: minBright + Math.random() * (maxBright - minBright),
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  _initPlanets() {
    this.planets = [
      { x: GAME_WIDTH * 0.75, y: GAME_HEIGHT * 0.18, r: 90,  color: '#1a2a5e', ring: false, hue: 220 },
      { x: GAME_WIDTH * 0.25, y: GAME_HEIGHT * 0.12, r: 45,  color: '#2a1a3e', ring: true,  hue: 270 },
    ];
    this.planetOffset = 0;
  }

  update(scrollSpeed) {
    const delta = scrollSpeed * 0.016;
    // 星を左スクロール
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.twinkle += 0.03;
        star.x -= delta * layer.speed;
        if (star.x < 0) star.x += GAME_WIDTH;
      }
    }
    // 惑星スクロール（非常にゆっくり）
    this.planetOffset = (this.planetOffset + delta * 0.08) % GAME_WIDTH;
    this.nebulaOffset = (this.nebulaOffset + delta * 0.04) % (GAME_WIDTH * 2);
  }

  draw(ctx) {
    // グラデーション背景
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0,   '#000510');
    grad.addColorStop(0.5, '#000d1a');
    grad.addColorStop(1,   '#001228');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ネビュラ（星雲）
    this._drawNebula(ctx);

    // 惑星
    for (const pl of this.planets) {
      this._drawPlanet(ctx, pl);
    }

    // 星レイヤー
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(star.twinkle));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(210, 80%, ${70 + star.bright * 10}%)`;
        ctx.fillRect(
          star.x,
          star.y,
          layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
          layer.size[0] + Math.random() * (layer.size[1] - layer.size[0])
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawNebula(ctx) {
    ctx.save();
    const x = -this.nebulaOffset * 0.3 + GAME_WIDTH * 0.4;
    const grad = ctx.createRadialGradient(x, GAME_HEIGHT * 0.3, 0, x, GAME_HEIGHT * 0.3, 350);
    grad.addColorStop(0,   'rgba(30,  0, 80, 0.12)');
    grad.addColorStop(0.5, 'rgba(0,  20, 80, 0.07)');
    grad.addColorStop(1,   'rgba(0,   0,  0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.restore();
  }

  _drawPlanet(ctx, pl) {
    ctx.save();
    const ox = -this.planetOffset * 0.15;

    // 本体
    const pGrad = ctx.createRadialGradient(
      pl.x + ox - pl.r * 0.3, pl.y - pl.r * 0.3, pl.r * 0.1,
      pl.x + ox, pl.y, pl.r
    );
    pGrad.addColorStop(0, `hsl(${pl.hue}, 40%, 35%)`);
    pGrad.addColorStop(1, `hsl(${pl.hue}, 60%, 8%)`);
    ctx.beginPath();
    ctx.arc(pl.x + ox, pl.y, pl.r, 0, Math.PI * 2);
    ctx.fillStyle = pGrad;
    ctx.fill();

    // 大気光
    const atmGrad = ctx.createRadialGradient(pl.x + ox, pl.y, pl.r * 0.85, pl.x + ox, pl.y, pl.r * 1.2);
    atmGrad.addColorStop(0, `hsla(${pl.hue + 20}, 70%, 60%, 0.0)`);
    atmGrad.addColorStop(1, `hsla(${pl.hue + 20}, 70%, 60%, 0.0)`);
    ctx.beginPath();
    ctx.arc(pl.x + ox, pl.y, pl.r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = atmGrad;
    ctx.fill();

    // リング
    if (pl.ring) {
      ctx.strokeStyle = `hsla(${pl.hue}, 50%, 60%, 0.35)`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(pl.x + ox, pl.y, pl.r * 1.8, pl.r * 0.35, -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
