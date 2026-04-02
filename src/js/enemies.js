// ===== enemies.js =====
// 敵キャラクター管理

import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y_RATIO } from './constants.js';
import { rectsOverlap, randInt } from './utils.js';

const GROUND_Y = GAME_HEIGHT * GROUND_Y_RATIO;

class Enemy {
  constructor(x, y, type) {
    this.x    = x;
    this.y    = y;
    this.type = type;
    this.dead = false;
    this.hp   = 1;
    this.maxHp = 1;
    this.hurtTimer = 0;
    this.deathTimer = 0;
    this.vx = 0;
    this.vy = 0;

    switch (type) {
      case 'crawler':
        this.w = 44; this.h = 32; this.hp = 1; this.maxHp = 1;
        this.speed = 2.5 + Math.random();
        break;
      case 'floater':
        this.w = 36; this.h = 36; this.hp = 2; this.maxHp = 2;
        this.speed = 1.5;
        this.floatOffset = Math.random() * Math.PI * 2;
        break;
      case 'tank':
        this.w = 58; this.h = 50; this.hp = 4; this.maxHp = 4;
        this.speed = 1.2;
        break;
    }
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  takeDamage(dmg, particles) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hurtTimer = 200;
    particles.emitHit(this.x + this.w / 2, this.y + this.h / 2);
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTimer = 300;
      particles.emitExplosion(this.x + this.w / 2, this.y + this.h / 2);
    }
  }

  update(dt, scrollSpeed) {
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.dead)  {
      this.deathTimer -= dt;
      return;
    }

    this.x -= scrollSpeed + this.speed;

    if (this.type === 'floater') {
      this.floatOffset += 0.03;
      this.y += Math.sin(this.floatOffset) * 0.8;
    }
  }

  draw(ctx) {
    if (this.dead && this.deathTimer <= 0) return;

    ctx.save();
    const alpha = this.dead ? Math.max(0, this.deathTimer / 300) : 1;
    ctx.globalAlpha = alpha;

    if (this.hurtTimer > 0) {
      ctx.filter = 'brightness(3)';
    }

    switch (this.type) {
      case 'crawler': this._drawCrawler(ctx); break;
      case 'floater': this._drawFloater(ctx); break;
      case 'tank':    this._drawTank(ctx);    break;
    }

    // HPバー
    if (!this.dead && this.hp < this.maxHp) {
      this._drawHpBar(ctx);
    }

    ctx.restore();
  }

  _drawCrawler(ctx) {
    const { x, y, w, h } = this;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ff2200';
    // 体
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(x, y, w, h);
    // 目
    ctx.shadowColor = '#ff4400';
    ctx.fillStyle   = '#ff2200';
    ctx.beginPath();
    ctx.arc(x + w - 10, y + h * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
    // 脚（簡易）
    ctx.strokeStyle = '#3a1a1a';
    ctx.lineWidth   = 3;
    for (let i = 0; i < 3; i++) {
      const lx = x + 8 + i * 12;
      ctx.beginPath();
      ctx.moveTo(lx, y + h);
      ctx.lineTo(lx - 4, y + h + 10);
      ctx.stroke();
    }
  }

  _drawFloater(ctx) {
    const { x, y, w, h } = this;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.shadowBlur  = 16;
    ctx.shadowColor = '#aa00ff';
    // 本体
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, w / 2);
    grad.addColorStop(0, '#6a0aaa');
    grad.addColorStop(1, '#1a0020');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
    ctx.fill();
    // 目（2つ）
    ctx.fillStyle   = '#ff00cc';
    ctx.shadowColor = '#ff00cc';
    ctx.beginPath();
    ctx.arc(cx - 8, cy, 5, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    // 触手
    ctx.strokeStyle = '#6a0aaa';
    ctx.lineWidth   = 2;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.5 + i * Math.PI * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (w / 2), cy + Math.sin(a) * (h / 2));
      ctx.lineTo(
        cx + Math.cos(a) * (w / 2 + 14),
        cy + Math.sin(a) * (h / 2 + 14)
      );
      ctx.stroke();
    }
  }

  _drawTank(ctx) {
    const { x, y, w, h } = this;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#ff8800';
    // 車体
    ctx.fillStyle = '#2a1a00';
    ctx.fillRect(x, y + h * 0.3, w, h * 0.7);
    // 砲台
    ctx.fillStyle = '#3a2a00';
    ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.45);
    // 砲身
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth   = 6;
    ctx.shadowColor = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.2);
    ctx.lineTo(x + w + 10,  y + h * 0.2);
    ctx.stroke();
    // キャタピラ
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
    ctx.strokeStyle = '#444';
    ctx.lineWidth   = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * (w / 5), y + h * 0.82);
      ctx.lineTo(x + i * (w / 5), y + h);
      ctx.stroke();
    }
  }

  _drawHpBar(ctx) {
    const bw = this.w;
    const bh = 5;
    const bx = this.x;
    const by = this.y - 12;
    ctx.fillStyle = '#300';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#f44';
    ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
  }
}

export class EnemyManager {
  constructor(particles) {
    this.particles = particles;
    this.enemies   = [];
    this._timer    = 600; // 最初から早めにスポーン
  }

  reset() {
    this.enemies = [];
    this._timer  = 600;
  }

  update(dt, scrollSpeed, distance, player) {
    // スポーン
    this._timer -= dt;
    if (this._timer <= 0) {
      const difficulty = Math.min(1, distance / 4000);
      const types = ['crawler', 'crawler']; // crawlerを2倍の確率で
      if (difficulty > 0.2) types.push('floater');
      if (difficulty > 0.5) types.push('tank');

      // 1〜2体同時スポーン（難易度が上がると確率増加）
      const spawnCount = (difficulty > 0.4 && Math.random() < 0.35) ? 2 : 1;
      for (let s = 0; s < spawnCount; s++) {
        const type  = types[randInt(0, types.length - 1)];
        const groundY = GROUND_Y - (type === 'floater' ? 160 + Math.random() * 120 : 0);
        this.enemies.push(new Enemy(GAME_WIDTH + 30 + s * 120, groundY, type));
      }

      this._timer = randInt(700, 1800) * (1 - difficulty * 0.4); // 間隔を大幅短縮
    }

    // 更新・衝突
    const attackHitbox = player.getAttackHitbox();
    let scoreGain = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, scrollSpeed);

      if (!e.dead) {
        // プレイヤー攻撃ヒット
        if (attackHitbox && rectsOverlap(attackHitbox, e.hitbox)) {
          e.takeDamage(player.attackDamage, this.particles);
          if (e.dead) scoreGain += { crawler: 100, floater: 200, tank: 500 }[e.type] || 100;
        }
        // プレイヤーへのダメージ
        if (rectsOverlap({ x: player.x, y: player.y, w: player.w, h: player.h }, e.hitbox)) {
          player.takeDamage({ crawler: 20, floater: 15, tank: 35 }[e.type] || 20);
        }
      }

      // 画面外 & 死亡アニメ終了で削除
      if ((e.x + e.w < -10) || (e.dead && e.deathTimer <= 0)) {
        this.enemies.splice(i, 1);
      }
    }

    return scoreGain;
  }

  draw(ctx) {
    for (const e of this.enemies) {
      e.draw(ctx);
    }
  }
}
