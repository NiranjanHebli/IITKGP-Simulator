/**
 * @fileoverview Unified Input Manager for Keyboard, Mouse (PointerLock + Drag Orbit),
 * HTML5 Gamepad API, and Mobile Touch overlays (v4.0).
 */

export class InputManager {
  /**
   * @param {HTMLElement} domElement - Viewport canvas or container for pointer lock.
   */
  constructor(domElement) {
    this.domElement = domElement;

    /** @type {Set<string>} Active KeyboardEvent.code values */
    this.keysDown = new Set();
    /** @type {Set<string>} Keys pressed specifically on the current frame */
    this.keysJustPressed = new Set();

    this.mouseDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.isPointerLocked = false;
    this.isMouseDragging = false;
    this.lastMousePos = { x: 0, y: 0 };

    // Virtual touch state
    this.touchMove = { x: 0, y: 0 };
    this.touchLookDelta = { x: 0, y: 0 };
    this.touchButtons = {
      sprint: false,
      jump: false,
      bike: false,
      interact: false
    };

    // Configurable bindings (KeyboardEvent.code)
    this.bindings = {
      forward: ['KeyW', 'ArrowUp'],
      backward: ['KeyS', 'ArrowDown'],
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      jump: ['Space'],
      interact: ['KeyE'],
      toggleBike: ['KeyB'],
      toggleCamera: ['KeyV'],
      toggleMap: ['KeyM'],
      zoomIn: ['Equal', 'NumpadAdd'],
      zoomOut: ['Minus', 'NumpadSubtract'],
      debugOverlay: ['F3'],
      pause: ['Escape']
    };

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
      }
      if (!this.keysDown.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.keysJustPressed.clear();
      this.isMouseDragging = false;
    });

    // 3D Camera Mouse Look: Works with PointerLock OR Click-and-Drag
    this.domElement.addEventListener('mousedown', (e) => {
      this.isMouseDragging = true;
      this.lastMousePos.x = e.clientX;
      this.lastMousePos.y = e.clientY;
      if (!this.isPointerLocked && !this._isTouchDevice()) {
        this.domElement.requestPointerLock?.();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDragging = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDelta.x += e.movementX || 0;
        this.mouseDelta.y += e.movementY || 0;
      } else if (this.isMouseDragging) {
        const dx = e.movementX !== undefined ? e.movementX : (e.clientX - this.lastMousePos.x);
        const dy = e.movementY !== undefined ? e.movementY : (e.clientY - this.lastMousePos.y);
        this.mouseDelta.x += dx;
        this.mouseDelta.y += dy;
        this.lastMousePos.x = e.clientX;
        this.lastMousePos.y = e.clientY;
      }
    });

    window.addEventListener('wheel', (e) => {
      this.wheelDelta += Math.sign(e.deltaY);
    }, { passive: true });

    this._initTouchControls();
  }

  _isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  _initTouchControls() {
    if (!this._isTouchDevice()) return;
    const touchRoot = document.getElementById('touch-controls');
    if (touchRoot) touchRoot.classList.remove('hidden');

    const joyZone = document.getElementById('touch-joystick-zone');
    const lookZone = document.getElementById('touch-look-zone');
    let joyOrigin = null;
    let lookOrigin = null;

    if (joyZone) {
      joyZone.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        joyOrigin = { x: t.clientX, y: t.clientY };
      }, { passive: true });

      joyZone.addEventListener('touchmove', (e) => {
        if (!joyOrigin) return;
        const t = e.changedTouches[0];
        const dx = (t.clientX - joyOrigin.x) / 45;
        const dy = (t.clientY - joyOrigin.y) / 45;
        const len = Math.hypot(dx, dy);
        const scale = len > 1 ? 1 / len : 1;
        this.touchMove.x = dx * scale;
        this.touchMove.y = dy * scale;
      }, { passive: true });

      joyZone.addEventListener('touchend', () => {
        joyOrigin = null;
        this.touchMove.x = 0;
        this.touchMove.y = 0;
      }, { passive: true });
    }

    if (lookZone) {
      lookZone.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        lookOrigin = { x: t.clientX, y: t.clientY };
      }, { passive: true });

      lookZone.addEventListener('touchmove', (e) => {
        if (!lookOrigin) return;
        const t = e.changedTouches[0];
        this.touchLookDelta.x += (t.clientX - lookOrigin.x) * 1.5;
        this.touchLookDelta.y += (t.clientY - lookOrigin.y) * 1.5;
        lookOrigin = { x: t.clientX, y: t.clientY };
      }, { passive: true });

      lookZone.addEventListener('touchend', () => {
        lookOrigin = null;
      }, { passive: true });
    }

    const bindBtn = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', () => { this.touchButtons[key] = true; }, { passive: true });
      el.addEventListener('touchend', () => { this.touchButtons[key] = false; }, { passive: true });
    };
    bindBtn('btn-touch-sprint', 'sprint');
    bindBtn('btn-touch-jump', 'jump');
    bindBtn('btn-touch-bike', 'bike');
    bindBtn('btn-touch-interact', 'interact');
  }

  _pollGamepad() {
    const result = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprint: false, jump: false, interact: false, bike: false };
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) return result;

    const applyDeadzone = (v, dz = 0.15) => (Math.abs(v) < dz ? 0 : v);
    result.moveX = applyDeadzone(gp.axes[0] || 0);
    result.moveY = applyDeadzone(gp.axes[1] || 0);
    result.lookX = applyDeadzone(gp.axes[2] || 0) * 14;
    result.lookY = applyDeadzone(gp.axes[3] || 0) * 14;

    result.jump = Boolean(gp.buttons[0]?.pressed);
    result.interact = Boolean(gp.buttons[2]?.pressed);
    result.bike = Boolean(gp.buttons[3]?.pressed);
    result.sprint = Boolean(gp.buttons[10]?.pressed || gp.buttons[7]?.pressed);
    return result;
  }

  isActionActive(action) {
    const codes = this.bindings[action] || [];
    for (const c of codes) {
      if (this.keysDown.has(c)) return true;
    }
    return false;
  }

  wasActionJustPressed(action) {
    const codes = this.bindings[action] || [];
    for (const c of codes) {
      if (this.keysJustPressed.has(c)) return true;
    }
    return false;
  }

  getFrameState() {
    const gp = this._pollGamepad();

    let moveX = gp.moveX + this.touchMove.x;
    let moveZ = gp.moveY + this.touchMove.y;

    if (this.isActionActive('left')) moveX -= 1;
    if (this.isActionActive('right')) moveX += 1;
    if (this.isActionActive('forward')) moveZ -= 1;
    if (this.isActionActive('backward')) moveZ += 1;

    const mag = Math.hypot(moveX, moveZ);
    if (mag > 1) {
      moveX /= mag;
      moveZ /= mag;
    }

    const state = {
      moveX,
      moveZ,
      lookDeltaX: this.mouseDelta.x + this.touchLookDelta.x + gp.lookX,
      lookDeltaY: this.mouseDelta.y + this.touchLookDelta.y + gp.lookY,
      wheelDelta: this.wheelDelta,
      sprint: this.isActionActive('sprint') || gp.sprint || this.touchButtons.sprint,
      jump: this.wasActionJustPressed('jump') || gp.jump || this.touchButtons.jump,
      interact: this.wasActionJustPressed('interact') || gp.interact || this.touchButtons.interact,
      toggleBike: this.wasActionJustPressed('toggleBike') || gp.bike || this.touchButtons.bike,
      toggleCamera: this.wasActionJustPressed('toggleCamera'),
      toggleMap: this.wasActionJustPressed('toggleMap'),
      zoomIn: this.wasActionJustPressed('zoomIn'),
      zoomOut: this.wasActionJustPressed('zoomOut'),
      debugOverlay: this.wasActionJustPressed('debugOverlay'),
      pause: this.wasActionJustPressed('pause')
    };

    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.touchLookDelta.x = 0;
    this.touchLookDelta.y = 0;
    this.wheelDelta = 0;
    this.touchButtons.jump = false;
    this.touchButtons.bike = false;
    this.touchButtons.interact = false;
    this.keysJustPressed.clear();

    return state;
  }
}
