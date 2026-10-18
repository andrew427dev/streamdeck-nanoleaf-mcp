import { MIRROR_MODES } from './nanoleaf.mjs';

const fail = code => Object.assign(new Error(code), { code });
const checkedState = state => {
  if (typeof state?.isRunning !== 'boolean' || !MIRROR_MODES.includes(state.mode)) throw fail('PROTOCOL_ERROR');
  return { status: state.isRunning ? 'running' : 'stopped', mode: state.mode };
};

/** Desktop-wide mirroring: guarded mutations and shared, read-only visible-key feedback. */
export class ScreenMirror {
  #watchers = new Map();
  #state = { status: 'unknown' };
  #revision = 0;
  #busy = false;
  #reading;
  #timer;
  constructor({ client, controller, intervalMs = 2000, schedule = setTimeout, cancel = clearTimeout,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => performance.now() }) {
    Object.assign(this, { client, controller, intervalMs, schedule, cancel, sleep, now });
  }
  get state() { return { ...this.#state }; }

  #publish(state) {
    this.#state = state;
    for (const render of this.#watchers.values()) {
      void Promise.resolve().then(() => render({ ...state })).catch(() => {});
    }
  }
  watch(context, render) {
    this.#watchers.set(context, render);
    void Promise.resolve().then(() => render(this.state)).catch(() => {});
    void this.#refresh();
  }
  forget(context) {
    this.#watchers.delete(context);
    if (!this.#watchers.size) {
      this.#revision++;
      this.cancel(this.#timer);
      // Never paint a previously visible profile's cached success as a fresh result.
      if (!this.#busy) this.#state = { status: 'unknown' };
    }
  }
  #schedule() {
    this.cancel(this.#timer);
    if (!this.#watchers.size || this.#busy) return;
    this.#timer = this.schedule(() => void this.#refresh(), this.intervalMs);
    this.#timer?.unref?.();
  }
  async #refresh() {
    if (this.#busy || this.#reading || !this.#watchers.size) return;
    this.cancel(this.#timer);
    const revision = this.#revision;
    this.#reading = true;
    let state = { status: 'unknown' };
    try { state = checkedState(await this.client.getScreenMirrorStatus()); } catch { /* Unknown is not stopped. */ }
    if (revision === this.#revision && !this.#busy && this.#watchers.size) this.#publish(state);
    this.#reading = false;
    this.#schedule();
  }
  async request(mode = 'toggle', { autoLaunch = false } = {}, { isCurrent } = {}) {
    if (!['start', 'stop', 'toggle'].includes(mode)
      || isCurrent !== undefined && typeof isCurrent !== 'function') throw fail('INVALID_ARGUMENT');
    const check = () => { if (isCurrent && !isCurrent()) throw fail('BUSY'); };
    check();
    return this.controller.withAppMutation(async () => {
      check();
      this.#busy = true;
      this.#revision++;
      this.cancel(this.#timer);
      this.#publish({ status: mode === 'stop' ? 'stopping' : 'starting' });
      try {
        const { launched } = await this.controller.prepareApp(mode !== 'stop' && autoLaunch === true);
        check();
        await this.client.requireScreenMirrorSupport({ isCurrent });
        check();
        const before = checkedState(await this.client.getScreenMirrorStatus({ isCurrent }));
        check();
        const running = mode === 'start' || mode === 'toggle' && (launched || before.status !== 'running');
        if ((before.status === 'running') === running) {
          this.#publish(before);
          return { ...before, changed: false };
        }
        this.#publish({ status: running ? 'starting' : 'stopping', mode: before.mode });
        // Exactly one mutation. An ambiguous response is resolved only by reads, never a replay.
        let commandError;
        try {
          if (running) await this.client.startScreenMirror(before.mode, { isCurrent });
          else await this.client.stopScreenMirror({ isCurrent });
        } catch (error) {
          if (error?.code === 'BUSY') throw error;
          commandError = error;
        }
        const deadline = this.now() + 4000;
        do {
          try {
            const after = checkedState(await this.client.getScreenMirrorStatus(
              { timeoutMs: Math.max(1, Math.min(1000, deadline - this.now())) }));
            if (this.now() < deadline && (after.status === 'running') === running) {
              this.#publish(after);
              return { ...after, changed: true, recovered: Boolean(commandError) };
            }
          } catch { /* A failed read is not proof that the mutation failed. */ }
          const remaining = deadline - this.now();
          if (remaining > 0) await this.sleep(Math.min(250, remaining));
        } while (this.now() < deadline);
        throw fail('MIRROR_UNKNOWN');
      } catch (error) {
        this.#publish({ status: 'unknown' });
        throw error;
      } finally {
        this.#busy = false;
        this.#revision++;
        this.#schedule();
      }
    });
  }
}
