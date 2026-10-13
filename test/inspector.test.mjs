import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const base = new URL("../io.github.andrew427dev.nanoleaf-mcp.sdPlugin/ui/", import.meta.url);
const script = await readFile(new URL("inspector.js", base), "utf8");
const html = await readFile(new URL("index.html", base), "utf8");
const ACTION = "io.github.andrew427dev.nanoleaf-mcp.scene";
const DEVICE_A = { id: "TEST-DEVICE-A", name: "Test light A", model: "TEST-MODEL" };
const DEVICE_B = { id: "TEST-DEVICE-B", name: "Test light B", model: "TEST-MODEL" };

class Element {
  constructor() {
    this.value = "";
    this.textContent = "";
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.disabled = true;
    this.hidden = false;
    this.checked = false;
  }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  replaceChildren(...children) { this.children = children; }
  dispatch(type) { this.listeners.get(type)?.({ target: this }); }
}

function inspector({ settings = {}, action = ACTION, language = "en" } = {}) {
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => [match[1], new Element()]));
  const translated = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => {
    const node = new Element();
    node.dataset.i18n = match[1];
    return node;
  });
  const timers = new Map();
  let nextTimer = 0;
  const document = {
    documentElement: {},
    getElementById: (id) => elements.get(id),
    querySelectorAll: () => translated,
    createElement: () => new Element(),
  };
  class Socket {
    static OPEN = 1;
    static instances = [];
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; Socket.instances.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    open() { this.readyState = 1; this.onopen?.(); }
    close() { this.readyState = 3; this.onclose?.(); }
    receive(message) { this.onmessage?.({ data: typeof message === "string" ? message : JSON.stringify(message) }); }
  }
  const window = {};
  vm.runInNewContext(script, {
    window, document, WebSocket: Socket,
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  window.connectElgatoStreamDeckSocket("12345", "TEST-PI-CONTEXT", "registerPropertyInspector",
    JSON.stringify({ application: { language } }),
    JSON.stringify({ action, context: "TEST-ACTION-CONTEXT", payload: { settings } }));
  const socket = Socket.instances.at(-1);
  socket.open();
  const commands = (event) => socket.sent.filter((message) => message.event === event);
  const requests = (event) => commands("sendToPlugin").filter((message) => message.payload.event === event);
  const respond = (event, body, request = requests(event).at(-1)) => socket.receive({
    event: "sendToPropertyInspector", action, context: "TEST-ACTION-CONTEXT",
    payload: { event, requestId: request.payload.requestId, ...body },
  });
  return {
    elements, document, translated, socket, timers, commands, requests, respond,
    change(id, value) {
      const node = elements.get(id);
      if (id === "auto-launch") node.checked = value;
      else node.value = value;
      node.dispatch("change");
    },
    click(id) { elements.get(id).dispatch("click"); },
    flushTimers() {
      for (const [id, timer] of [...timers]) { timers.delete(id); timer.callback(); }
    },
    settings(value, context = "TEST-ACTION-CONTEXT") {
      socket.receive({ event: "didReceiveSettings", action, context, payload: { settings: value } });
    },
  };
}

test("registers with the inspector UUID and requests lists without saving or controlling a light", () => {
  const ui = inspector();
  assert.equal(ui.socket.url, "ws://127.0.0.1:12345");
  assert.deepEqual(ui.socket.sent[0], { event: "registerPropertyInspector", uuid: "TEST-PI-CONTEXT" });
  const request = ui.requests("devices")[0];
  assert.equal(request.context, "TEST-PI-CONTEXT");
  assert.equal(request.action, ACTION);
  assert.match(request.payload.requestId, /^TEST-PI-CONTEXT:/);
  assert.equal(ui.commands("setSettings").length, 0);
  assert.equal(ui.elements.get("auto-launch").checked, false);
  assert.equal(ui.elements.get("scene-field").hidden, false);
  assert.equal(ui.elements.get("power-field").hidden, true);
  ui.respond("devices", { devices: [DEVICE_A] });
  assert.equal(ui.requests("scenes").length, 0);
  assert.equal(ui.elements.get("device").value, "");
  assert.equal(ui.commands("setSettings").length, 0);
});

test("loads saved selections without rewriting them or choosing a different item", () => {
  const ui = inspector({ settings: { deviceId: DEVICE_A.id, sceneName: "Test Scene" } });
  ui.respond("devices", { devices: [DEVICE_A, DEVICE_B] });
  assert.equal(ui.requests("scenes")[0].payload.deviceId, DEVICE_A.id);
  ui.respond("scenes", { scenes: ["Another Scene", "Test Scene"] });
  assert.equal(ui.elements.get("device").value, DEVICE_A.id);
  assert.equal(ui.elements.get("scene").value, "Test Scene");
  assert.equal(ui.elements.get("scene-hint").hidden, true);
  assert.equal(ui.commands("setSettings").length, 0);
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.elements.get("refresh").disabled, false);
});

test("keeps unavailable saved devices and scenes with an explanation", () => {
  const missingDevice = inspector({ settings: { deviceId: "TEST-MISSING", sceneName: "Missing scene" } });
  missingDevice.respond("devices", { devices: [DEVICE_A] });
  assert.equal(missingDevice.elements.get("device").value, "TEST-MISSING");
  assert.equal(missingDevice.elements.get("device-hint").hidden, false);
  assert.match(missingDevice.elements.get("device").children[1].textContent, /unavailable/);
  assert.equal(missingDevice.commands("setSettings").length, 0);

  const missingScene = inspector({ settings: { deviceId: DEVICE_A.id, sceneName: "Missing scene" } });
  missingScene.respond("devices", { devices: [DEVICE_A] });
  missingScene.respond("scenes", { scenes: ["Available scene"] });
  assert.equal(missingScene.elements.get("scene").value, "Missing scene");
  assert.equal(missingScene.elements.get("scene-hint").hidden, false);
  assert.equal(missingScene.commands("setSettings").length, 0);
  missingScene.change("scene", "Available scene");
  assert.equal(missingScene.elements.get("scene-hint").hidden, true);
});

test("manual selection saves settings through the inspector context and only reads scenes", () => {
  const ui = inspector();
  ui.respond("devices", { devices: [DEVICE_A] });
  ui.change("device", DEVICE_A.id);
  const saved = ui.commands("setSettings")[0];
  assert.equal(saved.context, "TEST-PI-CONTEXT");
  assert.deepEqual(saved.payload, { deviceId: DEVICE_A.id, sceneName: "", powerMode: "toggle", autoLaunch: false });
  ui.respond("scenes", { scenes: ["Synthetic scene"] });
  ui.change("scene", "Synthetic scene");
  ui.change("auto-launch", true);
  assert.deepEqual(ui.commands("setSettings").at(-1).payload,
    { deviceId: DEVICE_A.id, sceneName: "Synthetic scene", powerMode: "toggle", autoLaunch: true });
  assert.deepEqual(ui.commands("sendToPlugin").map((message) => message.payload.event), ["commandStatus", "devices", "scenes"]);
});

test("ignores unmatched and stale responses after the selected device changes", () => {
  const ui = inspector();
  ui.respond("devices", { devices: [DEVICE_A, DEVICE_B] });
  ui.change("device", DEVICE_A.id);
  const oldRequest = ui.requests("scenes").at(-1);
  ui.change("device", DEVICE_B.id);
  const currentRequest = ui.requests("scenes").at(-1);
  assert.notEqual(oldRequest.payload.requestId, currentRequest.payload.requestId);
  ui.respond("scenes", { scenes: ["Stale Scene"] }, oldRequest);
  assert.equal(ui.elements.get("scene").children.some((item) => item.value === "Stale Scene"), false);
  assert.equal(ui.elements.get("refresh").disabled, true);
  ui.respond("scenes", { scenes: ["Current Scene"] }, currentRequest);
  assert.equal(ui.elements.get("scene").children[1].value, "Current Scene");
  assert.equal(ui.elements.get("refresh").disabled, false);
  assert.equal(ui.commands("setSettings").length, 2);
});

test("a timed-out request recovers controls and ignores its late reply", () => {
  const ui = inspector();
  const oldRequest = ui.requests("devices")[0];
  assert.equal([...ui.timers.values()][0].delay, 15_000);
  ui.flushTimers();
  assert.equal(ui.elements.get("refresh").disabled, false);
  assert.equal(ui.elements.get("device").disabled, false);
  assert.match(ui.elements.get("status").textContent, /timed out/);
  ui.respond("devices", { devices: [DEVICE_A] }, oldRequest);
  assert.equal(ui.elements.get("device").children.length, 1);
  ui.click("refresh");
  assert.notEqual(ui.requests("devices").at(-1).payload.requestId, oldRequest.payload.requestId);
  ui.respond("devices", { devices: [DEVICE_B] });
  assert.equal(ui.elements.get("device").children[1].value, DEVICE_B.id);
});

test("device names are literal text and unknown backend failures remain private while allowing retry", () => {
  const ui = inspector();
  ui.respond("devices", { devices: [{ ...DEVICE_A, name: '<img src=x onerror="bad()">' }] });
  assert.equal(ui.elements.get("device").children[1].textContent, '<img src=x onerror="bad()"> (TEST-MODEL)');
  ui.click("refresh");
  ui.respond("devices", { error: "<b>Could not connect</b>" });
  assert.match(ui.elements.get("status").textContent, /Unable to load the lists/);
  assert.doesNotMatch(ui.elements.get("status").textContent, /<b>|Could not connect/);
  assert.equal(ui.elements.get("status").dataset.kind, "error");
  assert.equal(ui.elements.get("refresh").disabled, false);
  assert.doesNotMatch(script, /innerHTML|insertAdjacentHTML|eval\(/);
});

test("command feedback rejects other keys, stale outcomes, and unrecognized errors in both languages", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ language });
    const deliver = payload => ui.socket.receive({ event: "sendToPropertyInspector", context: "TEST-ACTION-CONTEXT",
      payload: { event: "commandStatus", actionContext: "TEST-ACTION-CONTEXT", ...payload } });
    const status = ui.elements.get("command-status");
    deliver({ state: "success", sequence: 10 });
    const success = status.textContent;
    for (const payload of [
      { state: "error", sequence: 11, actionContext: "OTHER-CONTEXT", errorCode: "DEVICE_ERROR" },
      { state: "error", sequence: 9, errorCode: "DEVICE_ERROR" },
      { state: "error", sequence: -1, errorCode: "DEVICE_ERROR" },
      { state: "unexpected", sequence: 11 },
    ]) {
      deliver(payload);
      assert.equal(status.textContent, success);
    }
    for (const errorCode of ["FUTURE_ERROR", "__proto__", "constructor"]) {
      deliver({ state: "error", sequence: 12, errorCode, error: "PRIVATE-DEVICE-ID <script>raw backend</script>" });
      assert.match(status.textContent, language === "ko" ? /요청을 처리하지 못했습니다/ : /request could not be completed/);
      assert.doesNotMatch(status.textContent, /PRIVATE|backend|script/);
    }
    deliver({ state: "error", sequence: 13, errorCode: "BUSY" });
    assert.match(status.textContent, language === "ko" ? /명령을 처리 중/ : /command is already running/);
  }
});

test("rejects malformed responses without crashing and recovers on a matching invalid reply", () => {
  const ui = inspector();
  ui.socket.receive("not json");
  ui.socket.receive("null");
  ui.respond("devices", { devices: null });
  assert.match(ui.elements.get("status").textContent, /Unable to load/);
  assert.equal(ui.elements.get("refresh").disabled, false);
});

test("updated settings do not save recursively or accept another action's context", () => {
  const ui = inspector({ settings: { deviceId: DEVICE_A.id } });
  ui.respond("devices", { devices: [DEVICE_A, DEVICE_B] });
  const oldRequest = ui.requests("scenes").at(-1);
  ui.settings({ deviceId: "WRONG-DEVICE" }, "OTHER-CONTEXT");
  assert.equal(ui.elements.get("device").value, DEVICE_A.id);
  ui.settings({ deviceId: DEVICE_B.id, sceneName: "Saved B" });
  ui.respond("scenes", { scenes: ["Wrong Scene"] }, oldRequest);
  ui.respond("scenes", { scenes: ["Saved B"] });
  assert.equal(ui.elements.get("device").value, DEVICE_B.id);
  assert.equal(ui.elements.get("scene").value, "Saved B");
  assert.equal(ui.commands("setSettings").length, 0);
});

test("power action uses the mode selector without requesting scenes", () => {
  const ui = inspector({ action: ACTION.replace(/scene$/, "power"), settings: { deviceId: DEVICE_A.id, powerMode: "off" } });
  ui.respond("devices", { devices: [DEVICE_A] });
  assert.equal(ui.elements.get("scene-field").hidden, true);
  assert.equal(ui.elements.get("power-field").hidden, false);
  assert.equal(ui.elements.get("power-mode").value, "off");
  ui.change("power-mode", "on");
  assert.equal(ui.commands("setSettings").at(-1).payload.powerMode, "on");
  assert.equal(ui.requests("scenes").length, 0);
});

test("supports Korean and clears pending work when the connection closes", () => {
  const ui = inspector({ language: "ko-KR" });
  assert.equal(ui.document.documentElement.lang, "ko");
  assert.equal(ui.translated.find((node) => node.dataset.i18n === "device").textContent, "장치");
  ui.socket.close();
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.elements.get("refresh").disabled, true);
  assert.equal(ui.elements.get("device").disabled, true);
  assert.match(ui.elements.get("status").textContent, /연결이 끊겼습니다/);
});

test("a transport error disables controls even before the socket close event", () => {
  const ui = inspector();
  ui.socket.onerror();
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.elements.get("refresh").disabled, true);
  assert.equal(ui.elements.get("auto-launch").disabled, true);
});

test("Korean settings translate all safe backend error codes and allow retry", () => {
  const codes = ["APP_CONNECTION", "APP_TIMEOUT", "APP_ERROR", "PROTOCOL_ERROR", "DEVICE_ERROR",
    "SCENE_NOT_READY", "BRIGHTNESS_UNAVAILABLE", "INVALID_ARGUMENT", "DEVICE_MISSING", "DEVICE_UNSUPPORTED", "BUSY", "LAUNCH_FAILED", "INTERNAL_ERROR"];
  for (const errorCode of codes) {
    const ui = inspector({ language: "ko" });
    ui.respond("devices", { errorCode, error: "English backend error" });
    assert.match(ui.elements.get("status").textContent, /[가-힣]/, errorCode);
    assert.doesNotMatch(ui.elements.get("status").textContent, /English backend error/, errorCode);
    assert.equal(ui.elements.get("status").dataset.kind, "error", errorCode);
    assert.equal(ui.elements.get("refresh").disabled, false, errorCode);
  }
});

test("unknown error codes have a Korean fallback without reading inherited object properties", () => {
  for (const errorCode of ["FUTURE_ERROR", "__proto__"]) {
    const ui = inspector({ language: "ko" });
    ui.respond("devices", { errorCode, error: "English backend error" });
    assert.match(ui.elements.get("status").textContent, /목록을 불러오지 못했습니다/);
    assert.equal(ui.elements.get("refresh").disabled, false);
  }
});

test("the empty device list states the beta's NL82K2-only scope in both languages", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ language });
    ui.respond("devices", { devices: [] });
    assert.match(ui.elements.get("status").textContent, /NL82K2/);
    assert.match(ui.elements.get("status").textContent, /USB/);
    assert.match(ui.elements.get("status").textContent, language === "ko" ? /만 지원합니다/ : /supports only/);
    const intro = ui.translated.find(node => node.dataset.i18n === "intro").textContent;
    assert.match(intro, /USB.*PC Screen Mirror Lightstrip|PC Screen Mirror Lightstrip.*USB/);
    assert.match(intro, /NL82K2/);
    assert.match(intro, language === "ko" ? /Wi-Fi\/LAN 모델을 지원하지 않습니다/ : /does not support Wi-Fi\/LAN models/);
  }
});

test("UI has no remote dependencies and restricts connections to the local Stream Deck bridge", () => {
  assert.match(html, /connect-src ws:\/\/127\.0\.0\.1:\*/);
  assert.doesNotMatch(html, /(?:src|href)="https?:/);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("button results are localized, separate from list refresh, and clear errors after success", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ language });
    assert.equal(ui.requests("commandStatus").length, 1, "opening a key requests its last result");
    const deliver = payload => ui.socket.receive({ event: "sendToPropertyInspector", context: "TEST-ACTION-CONTEXT",
      payload: { event: "commandStatus", actionContext: "TEST-ACTION-CONTEXT", ...payload } });
    deliver({ state: "running", sequence: 1 });
    assert.match(ui.elements.get("command-status").textContent, language === "ko" ? /처리 중/ : /Running/);
    deliver({ state: "error", sequence: 2, errorCode: "DEVICE_ERROR", error: "PRIVATE-DEVICE-ID raw backend" });
    assert.match(ui.elements.get("command-status").textContent, language === "ko" ? /조명이 응답하지/ : /light did not respond/);
    assert.equal(ui.elements.get("command-status").dataset.kind, "error");
    ui.respond("devices", { devices: [DEVICE_A] });
    assert.equal(ui.elements.get("command-status").dataset.kind, "error", "list completion must not replace command feedback");
    deliver({ state: "success", sequence: 3 });
    assert.match(ui.elements.get("command-status").textContent, language === "ko" ? /완료/ : /completed/);
    assert.equal(ui.elements.get("command-status").dataset.kind, "success");
    assert.doesNotMatch(ui.elements.get("command-status").textContent, /PRIVATE|backend|응답하지|did not respond/);
    assert.equal(ui.commands("setSettings").length, 0, "transient results must not be persisted in profiles");
  }
});

test("brightness actions show step and dial-only display settings without reading scenes", () => {
  for (const [suffix, defaultStep] of [["brightness-up", 5], ["brightness-down", 5], ["brightness-dial", 2]]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, suffix), settings: { deviceId: DEVICE_A.id, autoLaunch: true } });
    ui.respond("devices", { devices: [DEVICE_A] });
    assert.equal(ui.elements.get("scene-field").hidden, true);
    assert.equal(ui.elements.get("power-field").hidden, true);
    assert.equal(ui.elements.get("brightness-field").hidden, false);
    assert.equal(ui.elements.get("brightness-help").hidden, false);
    assert.equal(ui.elements.get("brightness-step").value, String(defaultStep));
    assert.equal(ui.elements.get("display-field").hidden, suffix !== "brightness-dial");
    assert.equal(ui.elements.get("display-help").hidden, suffix !== "brightness-dial");
    assert.equal(ui.elements.get("brightness-text-size-field").hidden, suffix !== "brightness-dial");
    assert.equal(ui.elements.get("brightness-text-size-help").hidden, suffix !== "brightness-dial");
    assert.equal(ui.elements.get("auto-launch").checked, true);
    assert.equal(ui.commands("setSettings").length, 0, "opening settings must not save defaults");
    assert.equal(ui.requests("scenes").length, 0);
    ui.change("brightness-step", "10");
    assert.deepEqual(ui.commands("setSettings").at(-1).payload,
      { deviceId: DEVICE_A.id, sceneName: "", powerMode: "toggle", autoLaunch: true, brightnessStep: 10,
        ...(suffix === "brightness-dial" ? { displayMode: "bar", brightnessTextSize: "large" } : {}) });
    ui.change("auto-launch", false);
    assert.equal(ui.commands("setSettings").at(-1).payload.brightnessStep, 10);
    ui.socket.close();
    assert.equal(ui.elements.get("brightness-step").disabled, true);
    assert.equal(ui.elements.get("display-mode").disabled, true);
    assert.equal(ui.elements.get("brightness-text-size").disabled, true);
  }
});

test("brightness settings accept only bounded integer steps without saving invalid input", () => {
  const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-up"), settings: { brightnessStep: 7 } });
  ui.respond("devices", { devices: [DEVICE_A] });
  assert.equal(ui.elements.get("brightness-step").value, "7");
  for (const value of ["", "0", "101", "1.5", "-2", "NaN", "Infinity"]) {
    ui.change("brightness-step", value);
    assert.equal(ui.commands("setSettings").length, 0, value);
    assert.equal(ui.elements.get("brightness-step").value, "7", value);
    assert.match(ui.elements.get("status").textContent, /whole number from 1 to 100/);
  }
  for (const value of ["1", "100"]) {
    ui.change("brightness-step", value);
    assert.equal(ui.commands("setSettings").at(-1).payload.brightnessStep, Number(value));
  }
  for (const value of [null, "9", 0, 101, 2.5, false]) {
    ui.settings({ brightnessStep: value });
    assert.equal(ui.elements.get("brightness-step").value, "5");
  }
});

test("power and scene settings retain their original shape and hide brightness controls", () => {
  for (const suffix of ["power", "scene"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, suffix), settings: { deviceId: DEVICE_A.id, autoLaunch: true } });
    assert.equal(ui.elements.get("brightness-field").hidden, true);
    assert.equal(ui.elements.get("brightness-help").hidden, true);
    assert.equal(ui.elements.get("display-field").hidden, true);
    assert.equal(ui.elements.get("display-help").hidden, true);
    assert.equal(ui.elements.get("brightness-text-size-field").hidden, true);
    assert.equal(ui.elements.get("brightness-text-size-help").hidden, true);
    ui.change("auto-launch", false);
    assert.deepEqual(ui.commands("setSettings").at(-1).payload,
      { deviceId: DEVICE_A.id, sceneName: "", powerMode: "toggle", autoLaunch: false });
  }
});

test("dial display choices save locally without changing brightness or requesting control", () => {
  const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"),
    settings: { deviceId: DEVICE_A.id, brightnessStep: 3, autoLaunch: true } });
  ui.respond("devices", { devices: [DEVICE_A] });
  assert.equal(ui.elements.get("display-mode").value, "bar");
  assert.equal(ui.commands("setSettings").length, 0, "opening an old dial must not write default settings");
  const requestsBefore = ui.commands("sendToPlugin").length;
  for (const displayMode of ["ring", "number", "bar"]) {
    ui.change("display-mode", displayMode);
    assert.deepEqual(ui.commands("setSettings").at(-1).payload,
      { deviceId: DEVICE_A.id, sceneName: "", powerMode: "toggle", autoLaunch: true, brightnessStep: 3, displayMode, brightnessTextSize: "large" });
  }
  assert.equal(ui.commands("sendToPlugin").length, requestsBefore, "display changes must not send light commands or refresh lists");
  assert.equal(ui.commands("setSettings").length, 3);
  ui.change("display-mode", "bar");
  ui.change("display-mode", "invalid");
  assert.equal(ui.elements.get("display-mode").value, "bar");
  assert.equal(ui.commands("setSettings").length, 3, "unchanged or invalid values must not be written");
});

test("a touch-strip display change updates the open inspector without a recursive save", () => {
  const baseSettings = { deviceId: DEVICE_A.id, brightnessStep: 2, autoLaunch: true, displayMode: "bar", brightnessTextSize: "medium" };
  const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), settings: baseSettings });
  ui.respond("devices", { devices: [DEVICE_A] });
  const requestsBefore = ui.commands("sendToPlugin").length;
  ui.settings({ ...baseSettings, displayMode: "ring" }, "OTHER-CONTEXT");
  assert.equal(ui.elements.get("display-mode").value, "bar");
  ui.settings({ ...baseSettings, displayMode: "ring" });
  assert.equal(ui.elements.get("display-mode").value, "ring");
  ui.settings({ ...baseSettings, displayMode: "number" });
  assert.equal(ui.elements.get("display-mode").value, "number");
  assert.equal(ui.elements.get("brightness-text-size").value, "medium");
  assert.equal(ui.commands("setSettings").length, 0);
  assert.equal(ui.commands("sendToPlugin").length, requestsBefore);
  ui.change("brightness-step", "4");
  assert.equal(ui.commands("setSettings").at(-1).payload.displayMode, "number");
  assert.equal(ui.commands("setSettings").at(-1).payload.brightnessTextSize, "medium");
});

test("brightness text size offers three display-only choices while preserving dial settings", () => {
  const settings = { deviceId: DEVICE_A.id, sceneName: "Saved scene", powerMode: "toggle", autoLaunch: true,
    brightnessStep: 4, displayMode: "ring", brightnessTextSize: "large" };
  const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), settings });
  assert.equal(ui.elements.get("brightness-text-size").value, "large");
  assert.equal(ui.elements.get("brightness-text-size").disabled, false);
  const requestsBefore = ui.commands("sendToPlugin").length;
  for (const brightnessTextSize of ["small", "medium", "large"]) {
    ui.change("brightness-text-size", brightnessTextSize);
    assert.deepEqual(ui.commands("setSettings").at(-1).payload, { ...settings, brightnessTextSize });
  }
  assert.equal(ui.commands("sendToPlugin").length, requestsBefore, "text size must not control lights, launch the app, or refresh lists");
  assert.equal(ui.commands("setSettings").length, 3);
  for (const value of ["large", "", "invalid", "__proto__", "60", "SMALL"]) {
    ui.change("brightness-text-size", value);
    assert.equal(ui.elements.get("brightness-text-size").value, "large");
    assert.equal(ui.commands("setSettings").length, 3, "unchanged or invalid size must not be saved");
  }
  ui.settings({ ...settings, brightnessTextSize: "small" });
  assert.equal(ui.elements.get("brightness-text-size").value, "small");
  assert.equal(ui.commands("setSettings").length, 3, "received size settings must not save recursively");
  assert.equal(ui.commands("sendToPlugin").length, requestsBefore);
  ui.change("display-mode", "number");
  assert.deepEqual(ui.commands("setSettings").at(-1).payload, { ...settings, displayMode: "number", brightnessTextSize: "small" });
});

test("missing or invalid brightness text sizes retain the original size without changing saved settings", () => {
  for (const brightnessTextSize of [undefined, null, 0, {}, [], false, "invalid", "__proto__"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), settings: { brightnessTextSize } });
    assert.equal(ui.elements.get("brightness-text-size").value, "large");
    assert.equal(ui.commands("setSettings").length, 0);
    ui.settings({ brightnessTextSize: "medium" });
    assert.equal(ui.elements.get("brightness-text-size").value, "medium");
    ui.settings({ brightnessTextSize });
    assert.equal(ui.elements.get("brightness-text-size").value, "large");
    assert.equal(ui.commands("setSettings").length, 0);
  }
  for (const suffix of ["power", "scene", "brightness-up", "brightness-down", "scene-dial"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, suffix), settings: { brightnessTextSize: "small" } });
    assert.equal(ui.elements.get("brightness-text-size-field").hidden, true);
    assert.equal(ui.elements.get("brightness-text-size-help").hidden, true);
    ui.change("brightness-text-size", "medium");
    assert.equal(ui.commands("setSettings").length, 0);
    ui.change("auto-launch", true);
    assert.equal(Object.hasOwn(ui.commands("setSettings").at(-1).payload, "brightnessTextSize"), false);
  }
});

test("brightness text size labels and original-size default are clear in both languages", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), language });
    const translated = key => ui.translated.find(node => node.dataset.i18n === key).textContent;
    assert.equal(translated("brightnessTextSize"), language === "ko" ? "밝기 숫자 크기" : "Brightness text size");
    assert.equal(translated("brightnessTextSmall"), language === "ko" ? "작게" : "Small");
    assert.equal(translated("brightnessTextMedium"), language === "ko" ? "중간" : "Medium");
    assert.equal(translated("brightnessTextLarge"), language === "ko" ? "크게 (기존 크기)" : "Large (original size)");
    assert.match(translated("brightnessTextSizeHelp"), language === "ko" ? /실제 밝기는 바뀌지 않습니다/ : /not the light/);
    assert.equal(ui.elements.get("brightness-text-size").value, "large");
  }
});

test("display settings default safely and remain exclusive to brightness dials", () => {
  for (const displayMode of [undefined, null, 0, {}, "invalid", "__proto__"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), settings: { displayMode } });
    assert.equal(ui.elements.get("display-mode").value, "bar");
    assert.equal(ui.commands("setSettings").length, 0);
  }
  for (const suffix of ["power", "scene", "brightness-up", "brightness-down", "scene-dial"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, suffix), settings: { displayMode: "ring" } });
    assert.equal(ui.elements.get("display-field").hidden, true);
    assert.equal(ui.elements.get("display-help").hidden, true);
    ui.change("display-mode", "number");
    assert.equal(ui.commands("setSettings").length, 0);
    ui.change("auto-launch", true);
    assert.equal(Object.hasOwn(ui.commands("setSettings").at(-1).payload, "displayMode"), false);
  }
});

test("display choices distinguish rotation, power press, and display touch in both languages", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), language });
    const translated = key => ui.translated.find(node => node.dataset.i18n === key).textContent;
    assert.equal(translated("displayBar"), language === "ko" ? "막대" : "Bar");
    assert.equal(translated("displayRing"), language === "ko" ? "원형" : "Ring");
    assert.equal(translated("displayNumber"), language === "ko" ? "숫자" : "Number");
    assert.match(translated("displayHelp"), language === "ko" ? /돌리기: 밝기 조절 · 다이얼 누르기: 전원 전환/ : /Turn: adjust brightness · Press the dial: toggle power/);
    assert.match(translated("displayHelp"), language === "ko" ? /터치 화면 누르기: 표시 방식 전환/ : /Tap the touch strip: switch display/);
    assert.match(translated("displayHelp"), language === "ko" ? /조명을 바꾸거나 앱을 실행하지 않습니다/ : /never change the light or open the app/);
    assert.match(translated("launchHelp"), language === "ko" ? /터치 화면 누르기와 목록 새로고침은 앱을 열지 않습니다/ : /Touching the display or refreshing never opens it/);
  }
});

test("dial wording and brightness unavailable results are localized without exposing backend details", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, "brightness-dial"), language });
    const translated = key => ui.translated.find(node => node.dataset.i18n === key).textContent;
    assert.match(translated("autoLaunch"), language === "ko" ? /다이얼을 돌리거나 누르면/ : /dial is turned or pressed/);
    assert.match(translated("brightnessHelp"), language === "ko" ? /기본값은 2%p/ : /Default: 2/);
    assert.doesNotMatch(translated("launchHelp"), language === "ko" ? /키를 누를/ : /key press/);
    ui.socket.receive({ event: "sendToPropertyInspector", context: "TEST-ACTION-CONTEXT", payload: {
      event: "commandStatus", actionContext: "TEST-ACTION-CONTEXT", state: "success", sequence: 1,
    } });
    assert.match(ui.elements.get("command-status").textContent, language === "ko" ? /다이얼/ : /dial/);
    ui.socket.receive({ event: "sendToPropertyInspector", context: "TEST-ACTION-CONTEXT", payload: {
      event: "commandStatus", actionContext: "TEST-ACTION-CONTEXT", state: "error", sequence: 2,
      errorCode: "BRIGHTNESS_UNAVAILABLE", error: "PRIVATE raw response",
    } });
    assert.match(ui.elements.get("command-status").textContent, language === "ko" ? /밝기를 읽을 수 없습니다/ : /brightness is unavailable/);
    assert.doesNotMatch(ui.elements.get("command-status").textContent, /PRIVATE|raw response/);
  }
});

test("scene browser shows only device, launch, and instructions without reading or persisting scene selection", () => {
  const ui = inspector({ action: ACTION.replace(/scene$/, "scene-dial"),
    settings: { deviceId: DEVICE_A.id, autoLaunch: true, sceneName: "Old scene", brightnessStep: 9, displayMode: "ring", selectedIndex: 4 } });
  for (const id of ["scene-field", "power-field", "brightness-field", "brightness-help", "display-field", "display-help"]) {
    assert.equal(ui.elements.get(id).hidden, true, id);
  }
  assert.equal(ui.elements.get("scene-browser-help").hidden, false);
  assert.equal(ui.elements.get("auto-launch").checked, true);
  assert.equal(ui.commands("setSettings").length, 0);
  ui.respond("devices", { devices: [DEVICE_A, DEVICE_B] });
  assert.equal(ui.requests("scenes").length, 0, "opening the browser inspector only reads devices");
  for (const [id, value] of [["scene", "Unwanted scene"], ["power-mode", "off"], ["brightness-step", "4"], ["display-mode", "number"]]) {
    ui.change(id, value);
  }
  assert.equal(ui.commands("setSettings").length, 0, "hidden fields must not save unsupported browser settings");
  ui.change("auto-launch", false);
  assert.deepEqual(ui.commands("setSettings").at(-1).payload, { deviceId: DEVICE_A.id, autoLaunch: false });
  ui.change("device", DEVICE_B.id);
  assert.deepEqual(ui.commands("setSettings").at(-1).payload, { deviceId: DEVICE_B.id, autoLaunch: false });
  assert.equal(ui.requests("scenes").length, 0, "changing the device must not fetch scenes from the inspector");
  ui.click("refresh");
  ui.respond("devices", { devices: [DEVICE_A, DEVICE_B] });
  assert.deepEqual(ui.commands("sendToPlugin").map(message => message.payload.event), ["commandStatus", "devices", "devices"]);
  ui.settings({ deviceId: DEVICE_A.id, autoLaunch: true, sceneName: "Ignored selection" });
  assert.equal(ui.requests("scenes").length, 0, "receiving settings must not fetch scene choices");
  assert.equal(ui.commands("setSettings").length, 2);
});

test("scene browser instructions distinguish opening, selection, and play in both languages", () => {
  for (const language of ["en", "ko"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, "scene-dial"), language });
    const translated = key => ui.translated.find(node => node.dataset.i18n === key).textContent;
    assert.match(translated("sceneBrowserHelp"), language === "ko" ? /다이얼을 누르거나 해당 터치 화면을 누르면 저장된 씬 목록이 열립니다/ : /Press the dial or tap its touch-strip section to open the saved scene list/);
    assert.match(translated("sceneBrowserHelp"), language === "ko" ? /돌려 씬을 선택하고 다시 누르거나 터치하면 재생/ : /Turn to select a scene, then press or tap again to play/);
    assert.match(translated("sceneBrowserHelp"), language === "ko" ? /프로필에 저장되지 않습니다/ : /not saved in your profile/);
    assert.match(translated("autoLaunch"), language === "ko" ? /다이얼을 누르거나 터치하면/ : /dial is pressed or its display is tapped/);
    assert.match(translated("launchHelp"), language === "ko" ? /돌리기는 선택만 바꾸며/ : /Turning only changes the selection/);
    assert.match(translated("launchHelp"), language === "ko" ? /설정 화면을 열거나 목록을 새로고침해도 앱은 열리지 않습니다/ : /opening these settings or refreshing never opens the app/);
    assert.match(translated("commandHeading"), language === "ko" ? /다이얼/ : /dial/);
  }
  for (const suffix of ["power", "scene", "brightness-up", "brightness-down", "brightness-dial"]) {
    const ui = inspector({ action: ACTION.replace(/scene$/, suffix) });
    assert.equal(ui.elements.get("scene-browser-help").hidden, true);
  }
});
