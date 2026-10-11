import { safeError } from './controller.mjs';

const failure = code => Object.assign(new Error(code), { code });
const validScene = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 2048;

/** A dial's scene chooser: opening/selection is read-only; confirming sends one command. */
export class SceneBrowser {
  #settings;
  #readScenes;
  #playScene;
  #onChange;
  #initialScene;
  #active = true;
  #epoch = 0;
  #state = Object.freeze({ status: 'idle', scenes: Object.freeze([]), index: 0 });

  constructor({ settings = {}, readScenes, playScene, onChange = () => {}, initialScene }) {
    this.#settings = Object.freeze({ ...settings });
    this.#readScenes = readScenes;
    this.#playScene = playScene;
    this.#onChange = onChange;
    this.#initialScene = initialScene;
  }

  get state() { return this.#state; }

  #publish(next) {
    if (!this.#active) return;
    this.#state = Object.freeze({ ...next, scenes: Object.freeze([...next.scenes]) });
    // Feedback failures must neither replay a command nor turn a completed command into an error.
    try { Promise.resolve(this.#onChange(this.#state)).catch(() => {}); } catch { /* Feedback is best-effort. */ }
  }

  async press() {
    if (!this.#active || ['loading', 'applying'].includes(this.#state.status)) return this.#state;
    const epoch = ++this.#epoch;
    const isCurrent = () => this.#active && this.#epoch === epoch;
    if (this.#state.status !== 'browsing') {
      const selected = this.#state.scenes[this.#state.index] ?? this.#initialScene;
      this.#publish({ ...this.#state, status: 'loading', errorCode: undefined });
      if (!isCurrent()) return this.#state;
      try {
        const scenes = await this.#readScenes(this.#settings);
        if (!isCurrent()) return this.#state;
        if (!Array.isArray(scenes) || !scenes.every(validScene)) throw failure('PROTOCOL_ERROR');
        if (!scenes.length) throw failure('SCENE_NOT_READY');
        this.#publish({ status: 'browsing', scenes, index: Math.max(0, scenes.indexOf(selected)),
          ...(this.#state.lastApplied ? { lastApplied: this.#state.lastApplied } : {}) });
      } catch (error) {
        if (isCurrent()) {
          this.#publish({ ...this.#state, status: 'error', errorCode: safeError(error).code });
          throw error;
        }
      }
    } else {
      const sceneName = this.#state.scenes[this.#state.index];
      this.#publish({ ...this.#state, status: 'applying', errorCode: undefined });
      if (!isCurrent()) return this.#state;
      try {
        // The caller can also check this guard immediately before its network mutation.
        await this.#playScene({ ...this.#settings, sceneName }, { isCurrent });
        if (isCurrent()) this.#publish({ ...this.#state, status: 'browsing', lastApplied: sceneName });
      } catch (error) {
        // An ambiguous failure requires a fresh list request, never automatic replay.
        if (isCurrent()) {
          this.#publish({ ...this.#state, status: 'error', errorCode: safeError(error).code });
          throw error;
        }
      }
    }
    return this.#state;
  }

  touch() { return this.press(); }

  rotate(ticks) {
    if (!this.#active || this.#state.status !== 'browsing' || !Number.isSafeInteger(ticks) || ticks === 0) {
      return this.#state;
    }
    const count = this.#state.scenes.length;
    const index = ((this.#state.index + ticks % count) % count + count) % count;
    if (index !== this.#state.index) this.#publish({ ...this.#state, index });
    return this.#state;
  }

  dispose() {
    this.#active = false;
    this.#epoch++;
  }
}
