// ===== player.js =====

import { GAME_HEIGHT, GRAVITY, GROUND_Y_RATIO, PLAYER, COLORS } from './constants.js';
import { clamp } from './utils.js';

const STATE = { IDLE: 'idle', RUN: 'run', JUMP: 'jump', FALL: 'fall', ATTACK: 'attack', HURT: 'hurt', DEAD: 'dead' };

export class Player {
  constructor(particles) {
    this.particles = particles;
    this.reset();
  }

  reset() {
    this.x  = 180;
    this.y  = 0;
    this.vx = 0;
    this.vy = 0;
    this.w  = PLAYER.WIDTH;
    this.h  = PLAYER.HEIGHT;
    this.hp = PLAYER.MAX_HP;
    this.maxHp = PLAYER.MAX_HP;

    this.jumpsLeft   = 2;
    this.isGrounded  = false;
    this.state       = STATE.RUN;
    this.facingRight = true;

    this.attackCooldown   = 0;
    this.attackActive     = false;
    this.attackTimer      = 0;
    this.invincible       = 0;
    this.hurtShake        = 0;

    // スキルレベル（ショップで強化）
    this.skills = {
      doubleJump: true,
      jumpBoost:  0,      // 0〜3
      attackPow:  0,      // 0〜3
      dashUnlock: false,
    };

    // アニメーション
    this.animFrame  = 0;
    this.animTimer  = 0;
    this.slashAngle = 0;
    this.slashAlpha = 0;

    // ダッシュ
    this.dashCooldown = 0;
    this.dashTimer    = 0;
    this.isDashing    = false;
  }

  get groundY() {
    return GAME_HEIGHT * GROUND_Y_RATIO - this.h;
  }

  get attackDamage() {
    return PLAYER.ATTACK_DAMAGE + this.skills.attackPow * 10;
  }

  get jumpForce() {
    return PLAYER.JUMP_FORCE - this.skills.jumpBoost * 1.5;
  }

  jump() {
    if (this.jumpsLeft > 0 && !this.isDashing) {
      const isDouble = !this.isGrounded;
      this.vy = isDouble ? PLAYER.DOUBLE_JUMP_FORCE - this.skills.jumpBoost : this.jumpForce;
      this.jumpsLeft--;
      this.state = STATE.JUMP;
      // 二段ジャンプ時パーティクル
      if (isDouble) {
        this.particles.emit(this.x + this.w / 2, this.y + this.h, 10, {
          angle: Math.PI / 2, spread: 0.6, speed: 4, life: 20,
          size: 3, color: '#7ecfff', gravity: 0.05,
        });
      }
      return true;
    }
    return false;
  }

  attack() {
    if (this.attackCooldown > 0 || this.isDashing) return false;
    this.attackCooldown = PLAYER.ATTACK_COOLDOWN;
    this.attackActive   = true;
    this.attackTimer    = 280; // ms（判定ウィンドウを延長）
    this.slashAngle     = 0;
    this.slashAlpha     = 1;
    this.state          = STATE.ATTACK;
    return true;
  }

  dash() {
    if (!this.skills.dashUnlock || this.dashCooldown > 0 || this.isDashing) return;
    this.isDashing    = true;
    this.dashTimer    = 180;
    this.dashCooldown = 800;
    this.invincible   = Math.max(this.invincible, 200);
    this.particles.emit(this.x + this.w / 2, this.y + this.h / 2, 15, {
      angle: Math.PI, spread: 0.4, speed: 5, life: 20, size: 4,
      color: '#3af', gravity: 0,
    });
  }

  getAttackHitbox() {
    if (!this.attackActive) return null;
    return {
      x: this.x - PLAYER.ATTACK_RANGE_W * 0.1,  // プレイヤー中心から前方へ広く
      y: this.y - PLAYER.ATTACK_RANGE_H * 0.2,  // 上下にも余裕を持たせる
      w: this.w + PLAYER.ATTACK_RANGE_W,
      h: this.h + PLAYER.ATTACK_RANGE_H * 0.4,
    };
  }

  takeDamage(dmg) {
    if (this.invincible > 0 || this.state === STATE.DEAD) return;
    this.hp       = clamp(this.hp - dmg, 0, this.maxHp);
    this.invincible = PLAYER.INVINCIBLE_TIME;
    this.hurtShake  = 12;
    this.vy = -6;
    if (this.hp <= 0) {
      this.state = STATE.DEAD;
      this.particles.emitExplosion(this.x + this.w / 2, this.y + this.h / 2);
    }
  }

  update(dt, input) {
    if (this.state === STATE.DEAD) {
      this.vy += GRAVITY;
      this.y  += this.vy;
      return;
    }

    // クールダウン更新
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackTimer    = Math.max(0, this.attackTimer    - dt);
    this.invincible     = Math.max(0, this.invincible     - dt);
    this.dashCooldown   = Math.max(0, this.dashCooldown   - dt);
    this.dashTimer      = Math.max(0, this.dashTimer      - dt);
    if (this.hurtShake > 0) this.hurtShake--;

    if (this.attackTimer <= 0) this.attackActive = false;
    if (this.dashTimer   <= 0) this.isDashing    = false;

    // 入力
    if (input.consumeJump())   this.jump();
    if (input.consumeAttack()) this.attack();

    // 物理
    if (this.isDashing) {
      this.vx = 14;
      this.vy = 0;
    } else {
      this.vy += GRAVITY;
    }
    this.y += this.vy;

    // 地面判定
    if (this.y >= this.groundY) {
      this.y          = this.groundY;
      this.vy         = 0;
      this.isGrounded = true;
      this.jumpsLeft  = this.skills.doubleJump ? 2 : 1;
      if (this.state !== STATE.ATTACK) {
        this.state = STATE.RUN;
      }
      // 着地パーティクル
      if (!this._wasGrounded) {
        this.particles.emitFootDust(this.x + this.w / 2, this.y + this.h);
      }
    } else {
      this.isGrounded = false;
      if (this.state !== STATE.ATTACK && !this.isDashing) {
        this.state = this.vy < 0 ? STATE.JUMP : STATE.FALL;
      }
    }
    this._wasGrounded = this.isGrounded;

    // 足跡パーティクル
    this.animTimer += dt;
    if (this.isGrounded && this.animTimer > 120) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
      this.particles.emitFootDust(this.x + this.w * 0.2, this.y + this.h);
    }

    // 斬撃エフェクト
    if (this.slashAlpha > 0) {
      this.slashAngle += 0.18;
      this.slashAlpha -= 0.06;
      if (this.slashAlpha < 0) this.slashAlpha = 0;
    }
  }

  draw(ctx) {
    ctx.save();

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    // 無敵点滅
    if (this.invincible > 0 && Math.floor(this.invincible / 80) % 2 === 0) {
      ctx.restore();
      return;
    }

    // ダッシュ残像
    if (this.isDashing) {
      ctx.globalAlpha = 0.3;
      this._drawCharacter(ctx, this.x - 18, this.y);
      this._drawCharacter(ctx, this.x - 36, this.y);
      ctx.globalAlpha = 1;
    }

    // 被弾シェイク
    const shakeX = this.hurtShake > 0 ? (Math.random() - 0.5) * 4 : 0;
    ctx.translate(shakeX, 0);

    this._drawCharacter(ctx, this.x, this.y);

    // 斬撃エフェクト
    if (this.slashAlpha > 0) {
      this._drawSlash(ctx, cx + this.w, cy);
    }

    ctx.restore();
  }

  _drawCharacter(ctx, x, y) {
    const w = this.w;
    const h = this.h;
    const cx = x + w / 2;

    // 影
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, this.groundY + this.h + 4, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 体（宇宙服）
    const bodyGrad = ctx.createLinearGradient(x, y + h * 0.15, x + w, y + h * 0.15);
    bodyGrad.addColorStop(0, '#1e4a7a');
    bodyGrad.addColorStop(1, '#0d2a50');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.1, y + h * 0.22, w * 0.8, h * 0.65, [6, 6, 4, 4]);
    ctx.fill();

    // ヘルメット
    ctx.fillStyle = '#1e3a6a';
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.22, w * 0.42, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // バイザー（光る）
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = COLORS.PLAYER_VISOR;
    ctx.fillStyle   = COLORS.PLAYER_VISOR;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.18, w * 0.28, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // バイザー内の反射
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.07, y + h * 0.15, w * 0.1, h * 0.05, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 剣（腰に装備）
    if (!this.attackActive) {
      ctx.save();
      ctx.strokeStyle = '#8cf';
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#4af';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.85, y + h * 0.45);
      ctx.lineTo(x + w * 0.85, y + h * 0.80);
      ctx.stroke();
      ctx.restore();
    }

    // ブーツ
    ctx.fillStyle = '#0d2040';
    ctx.fillRect(x + w * 0.15, y + h * 0.85, w * 0.28, h * 0.15);
    ctx.fillRect(x + w * 0.57, y + h * 0.85, w * 0.28, h * 0.15);

    // 肩のLEDライト
    ctx.save();
    ctx.fillStyle = '#00ffcc';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#00ffcc';
    ctx.fillRect(x + w * 0.08, y + h * 0.28, 6, 6);
    ctx.fillRect(x + w * 0.84, y + h * 0.28, 6, 6);
    ctx.restore();

    // 走りアニメ（足）
    if (this.isGrounded) {
      const legOff = Math.sin(this.animFrame * Math.PI / 2) * 5;
      ctx.fillStyle = '#1e4a7a';
      ctx.fillRect(x + w * 0.18, y + h * 0.80 + legOff,     w * 0.25, h * 0.12);
      ctx.fillRect(x + w * 0.57, y + h * 0.80 - legOff,     w * 0.25, h * 0.12);
    }
  }

  _drawSlash(ctx, cx, cy) {
    ctx.save();
    ctx.globalAlpha = this.slashAlpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = 20;
    ctx.shadowColor = '#7ecfff';

    const len = 55 + this.skills.attackPow * 10;
    for (let i = 0; i < 3; i++) {
      const a = this.slashAngle + i * 0.25 - 0.3;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
