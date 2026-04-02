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

    // 斬撃エフェクト（slashAngle: 0→3.0 でスウィープ進行、slashAlpha: 1→0 で輝度）
    if (this.slashAlpha > 0) {
      this.slashAngle += 0.20;
      this.slashAlpha -= 0.055;
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

    // 斬撃エフェクト（ヒットボックスに合わせて描画）
    if (this.slashAlpha > 0) {
      this._drawSlash(ctx);
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

  _drawSlash(ctx) {
    if (this.slashAlpha <= 0) return;
    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    const alpha = this.slashAlpha;                        // 1 → 0（輝度）
    const t     = Math.min(this.slashAngle / 2.9, 1.0);  // 0 → 1（スウィープ進行）

    // ヒットボックスと同じ座標
    const hbX = this.x - PLAYER.ATTACK_RANGE_W * 0.1;
    const hbY = this.y - PLAYER.ATTACK_RANGE_H * 0.2;
    const hbW = this.w + PLAYER.ATTACK_RANGE_W;
    const hbH = this.h + PLAYER.ATTACK_RANGE_H * 0.4;

    // 剣の振り始め位置（プレイヤー右肩あたり）
    const originX = this.x + this.w * 0.75;
    const originY = this.y + this.h * 0.28;

    // ── ① 扇形スウィープ弧（上→下へ円弧がアニメーションする） ──
    const R1      = hbW * 0.80;           // 外弧の半径
    const R2      = hbW * 0.62;           // 内弧
    const startA  = -Math.PI * 0.58;      // -104°（振り始め）
    const endA    =  Math.PI * 0.46;      //  +83°（振り切り）
    const curA    = startA + (endA - startA) * t;

    // 外側メイン弧（白）
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 30;
    ctx.shadowColor = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.arc(originX, originY, R1, startA, curA);
    ctx.stroke();

    // 内側サブ弧（シアン）
    ctx.strokeStyle = '#7ecfff';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#7ecfff';
    ctx.globalAlpha = alpha * 0.75;
    ctx.beginPath();
    ctx.arc(originX, originY, R2, startA + 0.08, curA + 0.08);
    ctx.stroke();

    // 残像弧（少し位相遅れ・薄め）
    if (t > 0.12) {
      ctx.strokeStyle = 'rgba(126,207,255,0.35)';
      ctx.lineWidth   = 2.5;
      ctx.globalAlpha = alpha * 0.4;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(originX, originY, R1 * 1.10, startA, curA - 0.28);
      ctx.stroke();
    }

    // ── ② 弧の先端を追う発光球 ──
    const tipX = originX + Math.cos(curA) * R1;
    const tipY = originY + Math.sin(curA) * R1;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 40;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 7 * alpha, 0, Math.PI * 2);
    ctx.fill();
    // 後光リング
    ctx.shadowBlur  = 20;
    ctx.strokeStyle = '#7ecfff';
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 13 * alpha, 0, Math.PI * 2);
    ctx.stroke();

    // ── ③ 衝撃波（中盤以降に右へ飛ぶ三角波） ──
    if (t > 0.40) {
      const wt    = (t - 0.40) / 0.60;          // 0→1
      const wx    = originX + hbW * wt * 0.88;
      const halfH = hbH * 0.42 * (1 - wt * 0.35);
      const wA    = alpha * (1 - wt * 0.45);
      ctx.globalAlpha = wA;
      ctx.shadowBlur  = 18;
      ctx.shadowColor = '#7ecfff';
      ctx.strokeStyle = '#c8f0ff';
      ctx.lineWidth   = 2.8;
      ctx.beginPath();
      ctx.moveTo(wx - 8,  tipY - halfH);
      ctx.quadraticCurveTo(wx + 18, tipY, wx - 8, tipY + halfH);
      ctx.stroke();
      // 二重衝撃波
      ctx.strokeStyle = 'rgba(126,207,255,0.4)';
      ctx.lineWidth   = 1.5;
      const wx2   = originX + hbW * Math.min(wt + 0.12, 1) * 0.88;
      const halfH2 = halfH * 0.7;
      ctx.beginPath();
      ctx.moveTo(wx2 - 6,  tipY - halfH2);
      ctx.quadraticCurveTo(wx2 + 12, tipY, wx2 - 6, tipY + halfH2);
      ctx.stroke();
    }

    // ── ④ 速度線（tの進行に合わせて伸びる） ──
    const speedLines = [
      { yRatio: 0.15, lenRatio: 0.58, lw: 2.0, color: '#ffffff' },
      { yRatio: 0.38, lenRatio: 0.80, lw: 2.5, color: '#ffffff' },
      { yRatio: 0.60, lenRatio: 0.70, lw: 1.8, color: '#aaddff' },
      { yRatio: 0.82, lenRatio: 0.48, lw: 1.2, color: '#7ecfff' },
    ];
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#7ecfff';
    for (const sl of speedLines) {
      const ly      = hbY + hbH * sl.yRatio;
      const lineEnd = hbX + hbW * sl.lenRatio * t;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = sl.color;
      ctx.lineWidth   = sl.lw;
      ctx.beginPath();
      ctx.moveTo(hbX + 4, ly);
      ctx.lineTo(lineEnd,  ly);
      ctx.stroke();
    }

    // ── ⑤ 斬り始めの根本フラッシュ ──
    if (t < 0.35) {
      const ft = 1 - t / 0.35;
      ctx.globalAlpha = alpha * ft * 0.85;
      ctx.shadowBlur  = 25;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(originX, originY, 10 * ft, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();
  }
}
