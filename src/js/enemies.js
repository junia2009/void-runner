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

      // ── 新空中敵 ──────────────────────────────────────
      case 'wasp':
        // ハチ型: 斜め突進。y座標が上下に波打ちながら高速接近
        this.w = 38; this.h = 26; this.hp = 1; this.maxHp = 1;
        this.speed = 4 + Math.random() * 2;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.wingFlap = 0;
        break;
      case 'bomber':
        // 爆撃機型: 上空を低速で横断しつつ爆弾を落とす
        this.w = 60; this.h = 30; this.hp = 3; this.maxHp = 3;
        this.speed = 0.8;
        this.bombCooldown = 1200 + Math.random() * 800;
        this.bombs = []; // 落下中の爆弾リスト
        break;
      case 'speeder':
        // 高速機型: 一直線に猛スピードで突っ込む
        this.w = 50; this.h = 20; this.hp = 1; this.maxHp = 1;
        this.speed = 8 + Math.random() * 3;
        this.trail = []; // 残像
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

    if (this.type === 'wasp') {
      // 上下に波打ちながら突進
      this.floatOffset += 0.10;
      this.y += Math.sin(this.floatOffset) * 2.8;
      this.wingFlap = (this.wingFlap + 0.35) % (Math.PI * 2);
    }

    if (this.type === 'bomber') {
      // 爆弾タイマー
      this.bombCooldown -= dt;
      if (this.bombCooldown <= 0) {
        this.bombs.push({ x: this.x + this.w / 2, y: this.y + this.h, vy: 1, r: 6 });
        this.bombCooldown = 1400 + Math.random() * 600;
      }
      // 爆弾の落下
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const b = this.bombs[i];
        b.x  -= scrollSpeed;
        b.vy += 0.25;
        b.y  += b.vy;
        if (b.y > GROUND_Y + 20) this.bombs.splice(i, 1);
      }
    }

    if (this.type === 'speeder') {
      // 残像を記録
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();
      for (const t of this.trail) t.x -= scrollSpeed;
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
      case 'wasp':    this._drawWasp(ctx);    break;
      case 'bomber':  this._drawBomber(ctx);  break;
      case 'speeder': this._drawSpeeder(ctx); break;
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

  // ── 新空中敵の描画 ────────────────────────────────────

  _drawWasp(ctx) {
    const { x, y, w, h } = this;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#aaff00';

    // 羽（上下にはためく）
    const flapY = Math.sin(this.wingFlap) * 8;
    ctx.fillStyle = 'rgba(180,255,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 10 + flapY, 18, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 10 + flapY, 18, 8,  0.4, 0, Math.PI * 2);
    ctx.fill();
    // 上翅
    ctx.fillStyle = 'rgba(200,255,80,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 6 + flapY * 0.5, 14, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 6 + flapY * 0.5, 14, 5,  0.3, 0, Math.PI * 2);
    ctx.fill();

    // 胴体（黄黒縞）
    ctx.fillStyle = '#1a1a00';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.38, h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    // 縞模様
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(200,200,0,${0.5 - i * 0.12})`;
      ctx.fillRect(x + w * 0.22 + i * 8, cy - h * 0.35, 5, h * 0.7);
    }
    // 目（赤い複眼）
    ctx.fillStyle   = '#ff4400';
    ctx.shadowColor = '#ff4400';
    ctx.beginPath();
    ctx.arc(cx + w * 0.28, cy - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // 針
    ctx.strokeStyle = '#ccff00';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x - 10, cy + 2);
    ctx.stroke();
  }

  _drawBomber(ctx) {
    const { x, y, w, h } = this;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#ff6600';

    // 爆弾の描画（先に）
    for (const b of this.bombs) {
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#ff4400';
      ctx.fillStyle   = '#cc2200';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      // 導火線
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - b.r);
      ctx.quadraticCurveTo(b.x + 4, b.y - b.r - 5, b.x + 2, b.y - b.r - 9);
      ctx.stroke();
      ctx.restore();
    }

    // 機体
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath();
    ctx.moveTo(x,       cy);
    ctx.lineTo(x + w,   cy - h * 0.25);
    ctx.lineTo(x + w,   cy + h * 0.25);
    ctx.closePath();
    ctx.fill();
    // 上面
    ctx.fillStyle = '#2a1500';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, cy - h * 0.1);
    ctx.lineTo(x + w * 0.9, cy - h * 0.28);
    ctx.lineTo(x + w * 0.85, cy + h * 0.05);
    ctx.lineTo(x + w * 0.1,  cy + h * 0.05);
    ctx.closePath();
    ctx.fill();
    // 主翼
    ctx.fillStyle = '#2a1500';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 5,  cy - h * 0.9);
    ctx.lineTo(cx + 15, cy - h * 0.5);
    ctx.lineTo(cx + 10, cy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 5,  cy + h * 0.9);
    ctx.lineTo(cx + 15, cy + h * 0.5);
    ctx.lineTo(cx + 10, cy);
    ctx.closePath();
    ctx.fill();
    // エンジン炎
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(x, cy - h * 0.1);
    ctx.lineTo(x - 10 - Math.random() * 8, cy);
    ctx.lineTo(x, cy + h * 0.1);
    ctx.closePath();
    ctx.fill();
    // コックピット
    ctx.fillStyle   = '#7ecfff';
    ctx.shadowColor = '#7ecfff';
    ctx.beginPath();
    ctx.arc(x + w * 0.78, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawSpeeder(ctx) {
    const { x, y, w, h } = this;
    const cy = y + h / 2;

    // 残像
    this.trail.forEach((t, i) => {
      const ta = (i / this.trail.length) * 0.4;
      ctx.save();
      ctx.globalAlpha = ta;
      ctx.fillStyle   = '#ff00aa';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#ff00aa';
      ctx.beginPath();
      ctx.moveTo(t.x + w, t.y + h / 2);
      ctx.lineTo(t.x, t.y);
      ctx.lineTo(t.x, t.y + h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#ff00aa';
    // 本体（矢印型）
    ctx.fillStyle = '#1a0015';
    ctx.beginPath();
    ctx.moveTo(x + w, cy);
    ctx.lineTo(x + w * 0.3, y);
    ctx.lineTo(x,     cy - h * 0.15);
    ctx.lineTo(x + w * 0.15, cy);
    ctx.lineTo(x,     cy + h * 0.15);
    ctx.lineTo(x + w * 0.3, y + h);
    ctx.closePath();
    ctx.fill();
    // 光のライン
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, cy);
    ctx.lineTo(x + w * 0.85, cy);
    ctx.stroke();
    // エンジン噴射
    const jetLen = 15 + Math.random() * 10;
    const jetGrad = ctx.createLinearGradient(x, 0, x - jetLen, 0);
    jetGrad.addColorStop(0,   '#ff00aa');
    jetGrad.addColorStop(1,   'rgba(255,0,170,0)');
    ctx.strokeStyle = jetGrad;
    ctx.lineWidth   = 4;
    ctx.shadowColor = '#ff00aa';
    ctx.beginPath();
    ctx.moveTo(x, cy - h * 0.1);
    ctx.lineTo(x - jetLen, cy - h * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, cy + h * 0.1);
    ctx.lineTo(x - jetLen, cy + h * 0.1);
    ctx.stroke();
    // 目（青い一つ目）
    ctx.fillStyle   = '#00eeff';
    ctx.shadowColor = '#00eeff';
    ctx.beginPath();
    ctx.arc(x + w * 0.72, cy, 4, 0, Math.PI * 2);
    ctx.fill();
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

      // 地上敵
      const groundTypes = ['crawler', 'crawler'];
      if (difficulty > 0.5) groundTypes.push('tank');

      // 空中敵（序盤から出現）
      const airTypes = ['wasp', 'floater'];
      if (difficulty > 0.35) airTypes.push('speeder');
      if (difficulty > 0.55) airTypes.push('bomber');

      // 空中・地上をランダムに選択（空中の割合を高める）
      const useAir = Math.random() < 0.5 + difficulty * 0.15;
      const pool   = useAir ? airTypes : groundTypes;
      const type   = pool[randInt(0, pool.length - 1)];

      // 出現Y座標
      let spawnY;
      if (type === 'wasp') {
        spawnY = GAME_HEIGHT * (0.18 + Math.random() * 0.35);
      } else if (type === 'floater') {
        spawnY = GAME_HEIGHT * (0.22 + Math.random() * 0.30);
      } else if (type === 'speeder') {
        spawnY = GAME_HEIGHT * (0.12 + Math.random() * 0.40);
      } else if (type === 'bomber') {
        spawnY = GAME_HEIGHT * (0.08 + Math.random() * 0.20);
      } else {
        spawnY = GROUND_Y - { crawler: 32, tank: 50 }[type];
      }

      // 難易度が上がると2体同時スポーン
      const spawnCount = (difficulty > 0.4 && Math.random() < 0.35) ? 2 : 1;
      for (let s = 0; s < spawnCount; s++) {
        this.enemies.push(new Enemy(GAME_WIDTH + 30 + s * 130, spawnY, type));
      }

      this._timer = randInt(700, 1800) * (1 - difficulty * 0.4);
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
          if (e.dead) scoreGain += { crawler: 100, floater: 200, tank: 500, wasp: 150, bomber: 300, speeder: 200 }[e.type] || 100;
        }
        // プレイヤーへの接触ダメージ
        if (rectsOverlap({ x: player.x, y: player.y, w: player.w, h: player.h }, e.hitbox)) {
          player.takeDamage({ crawler: 20, floater: 15, tank: 35, wasp: 18, bomber: 25, speeder: 30 }[e.type] || 20);
        }
        // bomber の爆弾との衝突
        if (e.type === 'bomber') {
          for (let bi = e.bombs.length - 1; bi >= 0; bi--) {
            const b  = e.bombs[bi];
            const pr = { x: player.x + 4, y: player.y + 4, w: player.w - 8, h: player.h - 8 };
            if (pr.x < b.x + b.r && pr.x + pr.w > b.x - b.r &&
                pr.y < b.y + b.r && pr.y + pr.h > b.y - b.r) {
              player.takeDamage(22);
              this.particles.emitExplosion(b.x, b.y);
              e.bombs.splice(bi, 1);
            }
          }
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
