import { AsyncLocalStorage } from 'node:async_hooks';

const fail = code => Object.assign(new Error(code), { code });

/** Explicit, instance-scoped suspension. No process termination or automatic resume. */
export class ControlSession {
  #scope = new AsyncLocalStorage();
  #generation = 0;
  #phase = 'starting';
  #requests = new Set();
  #uncertain = false;
  #persistenceError = false;
  #transition;
  constructor({ load, save, onPause = () => {}, onResume = () => {} }) {
    Object.assign(this, { load, save, onPause, onResume });
  }
  get status() {
    return { phase: this.#phase, uncertain: this.#uncertain,
      persistenceError: this.#persistenceError, activeRequests: this.#requests.size };
  }
  async initialize() {
    try {
      const paused = await this.load();
      this.#phase = paused ? 'paused' : 'active';
      // A restarted process cannot attest to requests from the previous one.
      this.#uncertain = paused;
    } catch {
      this.#phase = 'paused'; this.#uncertain = true; this.#persistenceError = true;
    }
    return this.status;
  }
  check() {
    if (this.#phase !== 'active') throw fail('CONTROL_PAUSED');
    const generation = this.#scope.getStore();
    if (generation !== undefined && generation !== this.#generation) throw fail('CONTROL_CANCELLED');
  }
  async run(task) {
    this.check();
    if (this.#scope.getStore() !== undefined) return await task();
    return await this.#scope.run(this.#generation, task);
  }
  // Only independently scheduled observation may discard an old command scope.
  detached(task) { return this.#scope.run(undefined, task); }
  async request(task) {
    this.check();
    // Register synchronously, before the transport/native launch starts. Pause
    // never aborts a dispatched request and never queues a later replay.
    const request = Promise.resolve().then(task);
    this.#requests.add(request);
    try { return await request; }
    catch (error) {
      // A local timeout/error is not evidence of completed backend work.
      if (error?.requestNotSent !== true) this.#uncertain = true;
      throw error;
    } finally { this.#requests.delete(request); }
  }
  pause() {
    if (this.#transition) return this.#transition;
    if (this.#phase === 'starting') return Promise.resolve(this.status);
    this.#phase = 'pausing';
    this.#generation++;
    this.onPause();
    this.#transition = (async () => {
      const persist = this.save(true).then(() => { this.#persistenceError = false; },
        () => { this.#persistenceError = true; });
      await Promise.allSettled([...this.#requests]);
      await persist;
      this.#phase = 'paused';
      return this.status;
    })().finally(() => { this.#transition = undefined; });
    return this.#transition;
  }
  resume() {
    if (this.#transition || this.#phase === 'starting') return Promise.resolve(this.status);
    if (this.#phase === 'active') return Promise.resolve(this.status);
    this.#phase = 'resuming';
    this.#transition = (async () => {
      try {
        await this.save(false);
        this.#persistenceError = false;
        this.#generation++;
        this.#phase = 'active';
        this.onResume();
      } catch { this.#persistenceError = true; this.#phase = 'paused'; }
      return this.status;
    })().finally(() => { this.#transition = undefined; });
    return this.#transition;
  }
}
