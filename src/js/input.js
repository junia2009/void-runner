// ===== input.js =====
// キーボード・タッチ・マウス入力を統合管理

export class Input {
  constructor() {
    this.keys = {};
    this._jumpPressed  = false;
    this._attackPressed = false;
    this._dashPressed  = false;

    // キーボード
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this._jumpPressed = true;
      }
      if (e.code === 'KeyZ' || e.code === 'KeyJ') {
        this._attackPressed = true;
      }
      // スペースキーでページスクロールを防ぐ
      if (e.code === 'Space') e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // タッチボタン（UI要素経由）
    this._bindTouchBtn('btn-jump',   () => { this._jumpPressed   = true; });
    this._bindTouchBtn('btn-attack', () => { this._attackPressed = true; });
    this._bindTouchBtn('btn-dash',   () => { this._dashPressed   = true; });
  }

  _bindTouchBtn(id, cb) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); cb(); }, { passive: false });
    el.addEventListener('mousedown',  (e) => { e.preventDefault(); cb(); });
  }

  /** ジャンプ入力を消費（1フレームに1回だけtrueになる） */
  consumeJump() {
    if (this._jumpPressed) {
      this._jumpPressed = false;
      return true;
    }
    return false;
  }

  /** 攻撃入力を消費 */
  consumeAttack() {
    if (this._attackPressed) {
      this._attackPressed = false;
      return true;
    }
    return false;
  }

  /** ダッシュ入力を消費 */
  consumeDash() {
    if (this._dashPressed) {
      this._dashPressed = false;
      return true;
    }
    return false;
  }
}
