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
    "SCENE_NOT_READY", "INVALID_ARGUMENT", "DEVICE_MISSING", "DEVICE_UNSUPPORTED", "BUSY", "LAUNCH_FAILED", "INTERNAL_ERROR"];
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
    assert.match(ui.elements.get("status").textContent, language === "ko" ? /만 지원합니다/ : /supports only/);
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
