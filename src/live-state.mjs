/** Shared, read-only state for visible controls. Observing a light never launches Desktop. */
export class LiveState {
  #contexts = new Map();
  #devices = new Map();
  constructor({ read, intervalMs = 2000, schedule = setTimeout, cancel = clearTimeout }) {
    this.read = read;
    this.intervalMs = intervalMs;
    this.schedule = schedule;
    this.cancel = cancel;
  }

  watch(context, deviceId, render) {
    this.forget(context);
    // Clear the previous device's image immediately, even when configuration is incomplete.
    void Promise.resolve().then(() => render(undefined)).catch(() => {});
    if (typeof deviceId !== 'string' || !deviceId.trim() || deviceId.length > 2048) return;
    let device = this.#devices.get(deviceId);
    if (!device) {
      device = { id: deviceId, revision: 0, busy: 0, watchers: new Map() };
      this.#devices.set(deviceId, device);
    }
    device.watchers.set(context, render);
    this.#contexts.set(context, device);
    void this.#refresh(device);
  }

  forget(context) {
    const device = this.#contexts.get(context);
    if (!device) return;
    this.#contexts.delete(context);
    device.watchers.delete(context);
    if (!device.watchers.size) {
      this.cancel(device.timer);
      this.#devices.delete(device.id);
    }
  }

  begin(deviceId) {
    const device = this.#devices.get(deviceId);
    if (!device) return;
    device.busy++;
    device.revision++;
    this.cancel(device.timer);
  }

  end(deviceId) {
    const device = this.#devices.get(deviceId);
    if (!device) return;
    device.busy = Math.max(0, device.busy - 1);
    device.revision++;
    void this.#refresh(device);
  }

  async #refresh(device) {
    if (this.#devices.get(device.id) !== device || device.busy) return;
    if (device.reading) return;
    this.cancel(device.timer);
    device.reading = true;
    const revision = device.revision;
    let state;
    try { state = await this.read(device.id); } catch { /* Unknown is not OFF. */ }
    if (this.#devices.get(device.id) === device && !device.busy && device.revision === revision) {
      await Promise.allSettled([...device.watchers.values()].map(render => Promise.resolve().then(() => render(state))));
    }
    device.reading = false;
    if (this.#devices.get(device.id) !== device || device.busy) return;
    if (device.revision !== revision) void this.#refresh(device);
    else {
      device.timer = this.schedule(() => void this.#refresh(device), this.intervalMs);
      device.timer?.unref?.();
    }
  }
}

const invalid = code => Object.assign(new Error(code), { code });

/** Serialize brightness bursts per light; coalesce same-direction pending input only. */
export class BrightnessQueue {
  #devices = new Map();
  constructor({ execute, delayMs = 60, schedule = setTimeout, cancel = clearTimeout }) {
    this.execute = execute;
    this.delayMs = delayMs;
    this.schedule = schedule;
    this.cancel = cancel;
  }

  enqueue(context, settings, delta) {
    const deviceId = settings?.deviceId;
    if (typeof deviceId !== 'string' || !deviceId.trim() || deviceId.length > 2048
      || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100) {
      return Promise.reject(invalid('INVALID_ARGUMENT'));
    }
    let device = this.#devices.get(deviceId);
    if (!device) {
      device = { id: deviceId, pending: [], active: false };
      this.#devices.set(deviceId, device);
    }
    if (device.pending.length >= 64) return Promise.reject(invalid('BUSY'));
    return new Promise((resolve, reject) => {
      const previous = device.pending.at(-1);
      const autoLaunch = settings.autoLaunch === true;
      if (previous?.context === context && previous.settings.autoLaunch === autoLaunch
        && Math.sign(previous.delta) === Math.sign(delta)) {
        previous.delta = Math.max(-100, Math.min(100, previous.delta + delta));
        previous.waiters.push({ resolve, reject });
      } else {
        device.pending.push({ context, settings: { deviceId, autoLaunch }, delta, waiters: [{ resolve, reject }] });
      }
      if (!device.active && !device.timer) {
        device.timer = this.schedule(() => { device.timer = undefined; void this.#drain(device); }, this.delayMs);
      }
    });
  }

  cancelContext(context) {
    for (const device of this.#devices.values()) {
      const removed = device.pending.filter(job => job.context === context);
      device.pending = device.pending.filter(job => job.context !== context);
      for (const job of removed) for (const waiter of job.waiters) waiter.reject(invalid('BUSY'));
      if (!device.pending.length && !device.active) {
        this.cancel(device.timer);
        this.#devices.delete(device.id);
      }
    }
  }

  async #drain(device) {
    if (device.active || this.#devices.get(device.id) !== device) return;
    device.active = true;
    while (device.pending.length) {
      const job = device.pending.shift();
      try {
        await this.execute({ ...job.settings, brightnessDelta: job.delta });
        for (const waiter of job.waiters) waiter.resolve();
      } catch (error) {
        // A failed/ambiguous mutation is never replayed by pending dial movement.
        for (const cancelled of [job, ...device.pending.splice(0)]) {
          for (const waiter of cancelled.waiters) waiter.reject(error);
        }
        break;
      }
    }
    device.active = false;
    this.#devices.delete(device.id);
  }
}
