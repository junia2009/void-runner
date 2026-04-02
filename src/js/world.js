// ===== world.js =====
// 地形・障害物・コイン・背景オブジェクトの生成と管理

import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y_RATIO, COLORS, SCROLL_SPEED_INIT, SCROLL_SPEED_MAX, SCROLL_ACCEL } from './constants.js';
import { randInt, rectsOverlap } from './utils.js';

const GROUND_Y = GAME_HEIGHT * GROUND_Y_RATIO;

export class World {
  constructor(particles) {
    this.particles   = particles;
    this.scrollSpeed = SCROLL_SPEED_INIT;
    this.distance    = 0;
    this.coins       = 0;

    this.obstacles   = [];
    this.coinItems   = [];
    this.platforms   = []; // 空中プラットフォーム
    this.debris      = []; // 背景の宇宙デブリ

    this._spawnTimer   = 0;
    this._platformTimer = 0;
    this._coinTimer    = 0;
    this._debrisTimer  = 0;

    this._initGround();
    this._spawnInitialPlatforms();
  }

  _initGround() {
    // 地面セグメント（タイル）
    this.groundTiles = Array.from({ length: Math.ceil(GAME_WIDTH / 80) + 2 }, (_, i) => ({
      x: i * 80,
      y: GROUND_Y,
    }));
  }

  _spawnInitialPlatforms() {
    // ゲーム開始時に少し飛び出た場所へプラットフォームを配置
    for (let i = 0; i < 3; i++) {
      this._spawnPlatform(GAME_WIDTH + i * 500);
    }
  }

  _spawnPlatform(x) {
    const y = GAME_HEIGHT * (0.45 + Math.random() * 0.2);
    this.platforms.push({ x, y, w: randInt(80, 180), h: 14 });
  }

  _spawnObstacle(type) {
    const y = GROUND_Y;
    const baseW = 28;
    const baseH = 42;
    switch (type) {
      case 'rock':
        this.obstacles.push({ x: GAME_WIDTH + 20, y: y - 36, w: 36, h: 36, type: 'rock' });
        break;
      case 'spike':
        this.obstacles.push({ x: GAME_WIDTH + 20, y: y - 30, w: 30, h: 30, type: 'spike' });
        break;
      case 'tall':
        this.obstacles.push({ x: GAME_WIDTH + 20, y: y - 64, w: 28, h: 64, type: 'tall' });
        break;
      case 'drone':
        // 空中から飛んでくるドローン型障害
        this.obstacles.push({
          x: GAME_WIDTH + 20,
          y: GAME_HEIGHT * 0.3 + Math.random() * GAME_HEIGHT * 0.25,
          w: 40, h: 28, type: 'drone',
          vy: (Math.random() - 0.5) * 2,
        });
        break;
    }
  }

  _spawnCoin(x) {
    const onPlatform = this.platforms.find(p => p.x < x + 20 && p.x + p.w > x);
    const y = onPlatform ? onPlatform.y - 28 : GROUND_Y - 36;
    this.coinItems.push({ x, y, w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2 });
  }

  update(dt, player) {
    // 速度加速
    this.scrollSpeed = Math.min(SCROLL_SPEED_MAX, SCROLL_SPEED_INIT + this.distance * SCROLL_ACCEL);
    const spd = this.scrollSpeed;

    this.distance += spd * 0.016 * 60 / 60; // px/frame → 距離単位

    // 地面タイル
    for (const tile of this.groundTiles) {
      tile.x -= spd;
      if (tile.x + 80 < 0) tile.x += 80 * this.groundTiles.length;
    }

    // 障害物スポーン
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      const difficulty = Math.min(1, this.distance / 3000);
      const types = ['rock', 'spike'];
      if (difficulty > 0.3) types.push('tall');
      if (difficulty > 0.5) types.push('drone');
      this._spawnObstacle(types[randInt(0, types.length - 1)]);
      this._spawnTimer = randInt(900, 2200) * (1 - difficulty * 0.4);
    }

    // プラットフォームスポーン
    this._platformTimer -= dt;
    if (this._platformTimer <= 0) {
      this._spawnPlatform(GAME_WIDTH + 50);
      this._platformTimer = randInt(1200, 2500);
    }

    // コインスポーン
    this._coinTimer -= dt;
    if (this._coinTimer <= 0) {
      this._spawnCoin(GAME_WIDTH + randInt(10, 60));
      this._coinTimer = randInt(600, 1500);
    }

    // デブリスポーン（背景のオブジェクト）
    this._debrisTimer -= dt;
    if (this._debrisTimer <= 0) {
      this.debris.push({
        x: GAME_WIDTH + 20,
        y: Math.random() * GAME_HEIGHT * 0.6,
        w: randInt(15, 45),
        h: randInt(10, 30),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        alpha: 0.15 + Math.random() * 0.2,
      });
      this._debrisTimer = randInt(400, 1200);
    }

    // 障害物更新
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      ob.x -= spd;
      if (ob.type === 'drone' && ob.vy !== undefined) {
        ob.y += ob.vy;
        const minY = GAME_HEIGHT * 0.15;
        const maxY = GROUND_Y - ob.h - 10;
        if (ob.y < minY || ob.y > maxY) ob.vy *= -1;
      }
      if (ob.x + ob.w < -10) this.obstacles.splice(i, 1);
    }

    // プラットフォーム更新
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      this.platforms[i].x -= spd;
      if (this.platforms[i].x + this.platforms[i].w < -10) this.platforms.splice(i, 1);
    }

    // コイン更新
    for (let i = this.coinItems.length - 1; i >= 0; i--) {
      const c = this.coinItems[i];
      c.x -= spd;
      c.bobOffset += 0.05;
      if (!c.collected && rectsOverlap(
        { x: player.x, y: player.y, w: player.w, h: player.h },
        { x: c.x, y: c.y + Math.sin(c.bobOffset) * 5, w: c.w, h: c.h }
      )) {
        c.collected = true;
        this.coins++;
        this.particles.emitCoin(c.x + c.w / 2, c.y);
      }
      if (c.x < -20 || c.collected) this.coinItems.splice(i, 1);
    }

    // デブリ更新
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.x   -= spd * 0.5;
      d.rot += d.rotSpeed;
      if (d.x < -60) this.debris.splice(i, 1);
    }

    // プレイヤーとプラットフォーム衝突
    if (player.vy >= 0) {
      for (const pl of this.platforms) {
        const px = player.x, py = player.y, pw = player.w, ph = player.h;
        if (
          px + pw > pl.x && px < pl.x + pl.w &&
          py + ph > pl.y && py + ph < pl.y + pl.h + player.vy + 2
        ) {
          player.y  = pl.y - ph;
          player.vy = 0;
          player.isGrounded = true;
          player.jumpsLeft  = player.skills.doubleJump ? 2 : 1;
        }
      }
    }
  }

  drawGround(ctx) {
    // 地面本体
    const grad = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
    grad.addColorStop(0, '#0d2040');
    grad.addColorStop(1, '#060f1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

    // エッジライン
    ctx.save();
    ctx.strokeStyle = '#1a4a8a';
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#2a6acc';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GROUND_Y);
    ctx.stroke();

    // タイル区切り
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = '#0d2a50';
    ctx.lineWidth   = 1;
    for (const tile of this.groundTiles) {
      ctx.beginPath();
      ctx.moveTo(tile.x, GROUND_Y);
      ctx.lineTo(tile.x, GAME_HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDebris(ctx) {
    ctx.save();
    for (const d of this.debris) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
      ctx.rotate(d.rot);
      ctx.strokeStyle = '#2a4a7a';
      ctx.lineWidth   = 2;
      ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    }
    ctx.restore();
  }

  drawObstacles(ctx) {
    for (const ob of this.obstacles) {
      ctx.save();
      switch (ob.type) {
        case 'rock':
          ctx.fillStyle = '#1a2a4a';
          ctx.beginPath();
          ctx.moveTo(ob.x + ob.w / 2, ob.y);
          ctx.lineTo(ob.x + ob.w, ob.y + ob.h);
          ctx.lineTo(ob.x, ob.y + ob.h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#2a4a7a';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;

        case 'spike':
          ctx.fillStyle = '#2a1a4a';
          for (let s = 0; s < 3; s++) {
            const sx = ob.x + s * (ob.w / 3);
            ctx.beginPath();
            ctx.moveTo(sx + ob.w / 6, ob.y);
            ctx.lineTo(sx + ob.w / 3, ob.y + ob.h);
            ctx.lineTo(sx, ob.y + ob.h);
            ctx.closePath();
            ctx.fill();
          }
          ctx.strokeStyle = '#7a3aaa';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;

        case 'tall':
          ctx.fillStyle = '#0d1a30';
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
          ctx.strokeStyle = '#1a3a6a';
          ctx.lineWidth = 2;
          ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
          // 警告ライン
          ctx.strokeStyle = '#ff4400';
          ctx.lineWidth = 2;
          ctx.shadowBlur  = 6;
          ctx.shadowColor = '#ff4400';
          ctx.strokeRect(ob.x + 4, ob.y + 4, ob.w - 8, ob.h - 8);
          break;

        case 'drone': {
          const dcx = ob.x + ob.w / 2;
          const dcy = ob.y + ob.h / 2;
          ctx.shadowBlur  = 14;
          ctx.shadowColor = '#ff2200';
          ctx.fillStyle   = '#2a0a0a';
          ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
          // 目（赤いライト）
          ctx.fillStyle = '#ff2200';
          ctx.beginPath();
          ctx.arc(dcx - 8, dcy, 5, 0, Math.PI * 2);
          ctx.arc(dcx + 8, dcy, 5, 0, Math.PI * 2);
          ctx.fill();
          // プロペラ
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ob.x - 10, dcy - 4);
          ctx.lineTo(ob.x + ob.w + 10, dcy - 4);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  drawPlatforms(ctx) {
    for (const pl of this.platforms) {
      ctx.save();
      const grad = ctx.createLinearGradient(pl.x, pl.y, pl.x, pl.y + pl.h);
      grad.addColorStop(0, '#1a3a6a');
      grad.addColorStop(1, '#0d1e3a');
      ctx.fillStyle = grad;
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.strokeStyle = '#2a5a9a';
      ctx.lineWidth   = 1;
      ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
      // 上面グロー
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#4a8aff';
      ctx.strokeStyle = '#4a8aff';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(pl.x, pl.y);
      ctx.lineTo(pl.x + pl.w, pl.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCoins(ctx, now) {
    for (const c of this.coinItems) {
      if (c.collected) continue;
      const bob = Math.sin(c.bobOffset) * 5;
      ctx.save();
      ctx.shadowBlur  = 12;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle   = '#ffd700';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + bob, c.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe87a';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2 - 3, c.y + bob - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
