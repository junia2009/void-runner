// ===== particles.js =====
// パーティクルエフェクト管理

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  /** 汎用エミット */
  emit(x, y, count, options = {}) {
    for (let i = 0; i < count; i++) {
      const angle  = options.angle  !== undefined ? options.angle + (Math.random() - 0.5) * (options.spread || Math.PI) : Math.random() * Math.PI * 2;
      const speed  = options.speed  !== undefined ? options.speed  * (0.5 + Math.random() * 0.8) : 2 + Math.random() * 3;
      const life   = options.life   !== undefined ? options.life   * (0.7 + Math.random() * 0.6) : 40;
      const size   = options.size   !== undefined ? options.size   * (0.5 + Math.random()) : 3 + Math.random() * 3;
      const color  = options.color  || `hsl(${200 + Math.random() * 40}, 100%, 70%)`;
      const glow   = options.glow   || false;

      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        size, color, glow,
        gravity: options.gravity !== undefined ? options.gravity : 0.1,
      });
    }
  }

  /** 足跡スパーク */
  emitFootDust(x, y) {
    this.emit(x, y, 2, {
      angle: -Math.PI / 2,
      spread: 0.8,
      speed: 1.5,
      life: 20,
      size: 2,
      color: 'rgba(100,180,255,0.6)',
      gravity: 0.05,
    });
  }

  /** ヒットスパーク */
  emitHit(x, y) {
    this.emit(x, y, 12, {
      speed: 5,
      life: 25,
      size: 4,
      color: '#ffffff',
      glow: true,
      gravity: 0.05,
    });
    this.emit(x, y, 8, {
      speed: 3,
      life: 35,
      size: 3,
      color: '#7ecfff',
      glow: true,
      gravity: 0.08,
    });
  }

  /** コイン取得エフェクト */
  emitCoin(x, y) {
    this.emit(x, y, 8, {
      speed: 3,
      life: 30,
      size: 3,
      color: '#ffd700',
      glow: true,
      gravity: 0.12,
    });
  }

  /** 爆発 */
  emitExplosion(x, y) {
    this.emit(x, y, 30, {
      speed: 6,
      life: 45,
      size: 5,
      color: '#ff6030',
      glow: true,
      gravity: 0.15,
    });
    this.emit(x, y, 20, {
      speed: 4,
      life: 55,
      size: 4,
      color: '#ffcc00',
      glow: true,
      gravity: 0.1,
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx, scaleX, scaleY) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      if (p.glow) {
        ctx.shadowBlur  = 12;
        ctx.shadowColor = p.color;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * scaleX, p.y * scaleY, p.size * Math.min(scaleX, scaleY) * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();
  }
}
