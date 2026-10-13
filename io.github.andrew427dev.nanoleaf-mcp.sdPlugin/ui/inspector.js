/* The property inspector uses only Stream Deck's local WebSocket bridge.
 * Protocol: https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/
 */
(() => {
  "use strict";

  const REQUEST_TIMEOUT_MS = 15_000;
  const translations = {
    en: {
      intro: "For the USB-only PC Screen Mirror Lightstrip (NL82K2), controlled through Nanoleaf Desktop. This beta does not support Wi-Fi/LAN models. Open the app and connect your light by USB before refreshing.",
      device: "Device", scene: "Scene", powerMode: "Power mode",
      brightnessStep: "Step (%p)",
      displayMode: "Display", displayBar: "Bar", displayRing: "Ring", displayNumber: "Number",
      displayHelp: "Turn: adjust brightness · Press the dial: toggle power · Tap the touch strip: switch display. Bar → Ring → Number. Display changes never change the light or open the app.",
      brightnessTextSize: "Brightness text size", brightnessTextSmall: "Small", brightnessTextMedium: "Medium", brightnessTextLarge: "Large (original size)",
      brightnessTextSizeHelp: "Size of the brightness percentage on the touch strip in all three display styles. Large keeps the original size. This changes only the display, not the light.",
      sceneBrowserHelp: "Press the dial or tap its touch-strip section to open the saved scene list. Turn to select a scene, then press or tap again to play it. Up to three scene names appear at a time. Selection is temporary and is not saved in your profile.",
      brightnessHelp: "Change per key press, in percentage points (1–100). Default: 5.",
      brightnessStepInvalid: "Enter a whole number from 1 to 100 for the brightness step.",
      brightnessArgumentError: "Check the selected device and brightness step, then try again.",
      toggle: "Toggle on / off", on: "On", off: "Off", refresh: "Refresh lists",
      autoLaunch: "Open Nanoleaf Desktop when a key is pressed",
      launchHelp: "Optional. Only key presses may open the app; refreshing does not. Leave this off if you already keep Nanoleaf Desktop running.",
      privacy: "Settings stay in your Stream Deck profile. No AI account or API key is needed.",
      connecting: "Connecting to Stream Deck…", loading: "Reading available devices and scenes…",
      selectDevice: "Select a device…", selectScene: "Select a scene…",
      savedDevice: "Saved device", saved: "saved", unavailable: "unavailable",
      missingDevice: "The saved device is not in the current list. Its setting is kept; reconnect it or select another device.",
      missingScene: "The saved scene is not in the current list. Its setting is kept; add it in Nanoleaf Desktop or select another scene.",
      noDevices: "No supported devices found. This beta supports only the USB PC Screen Mirror Lightstrip (NL82K2). Connect it by USB in Nanoleaf Desktop, then refresh.",
      noScenes: "No scenes found. Add a scene for this device in Nanoleaf Desktop, then refresh.",
      ready: "Lists updated. Settings are saved when you make a selection.",
      timeout: "The request timed out. Check that Nanoleaf Desktop is ready, then refresh.",
      disconnected: "Disconnected from Stream Deck. Select this key again to reconnect.",
      invalid: "Unable to load the lists. Check Nanoleaf Desktop, then refresh.",
      setupError: "Unable to open these settings. Select this key again in Stream Deck.",
      commandHeading: "Last key press",
      commandIdle: "No result for this key in this plugin session.",
      commandRunning: "Running this key’s command…",
      commandSuccess: "This key’s last command completed.",
      errors: {
        APP_CONNECTION: "Open Nanoleaf Desktop and enable its MCP server, then try again.",
        APP_TIMEOUT: "Nanoleaf Desktop did not respond in time. Check the app, then try again.",
        APP_ERROR: "Nanoleaf Desktop could not complete the request. Check the app, then try again.",
        PROTOCOL_ERROR: "Nanoleaf Desktop returned an unexpected response. Check that your app version is supported.",
        DEVICE_ERROR: "The light did not respond. Check its connection in Nanoleaf Desktop, then try again.",
        SCENE_NOT_READY: "The selected scene is not ready. Refresh the scene list and try again.",
        BRIGHTNESS_UNAVAILABLE: "The current brightness is unavailable. Check the light in Nanoleaf Desktop, then try again.",
        INVALID_ARGUMENT: "Check the device and scene selected for this key, then try again.",
        DEVICE_MISSING: "The selected device is unavailable. Refresh the device list.",
        DEVICE_UNSUPPORTED: "This beta supports only the PC Screen Mirror Lightstrip (NL82K2).",
        BUSY: "A command is already running for this light. Wait, then press again.",
        LAUNCH_FAILED: "Could not open Nanoleaf Desktop. Install and open it manually.",
        INTERNAL_ERROR: "The request could not be completed. Select this key again and retry.",
      },
    },
    ko: {
      intro: "Wi-Fi 없이 USB로 연결하는 PC Screen Mirror Lightstrip(NL82K2)을 Nanoleaf Desktop을 통해 제어합니다. 이번 베타는 Wi-Fi/LAN 모델을 지원하지 않습니다. 앱을 열고 조명을 USB로 연결한 뒤 새로고침해 주세요.",
      device: "장치", scene: "씬", powerMode: "전원 동작",
      brightnessStep: "조절 폭 (%p)",
      displayMode: "표시 방식", displayBar: "막대", displayRing: "원형", displayNumber: "숫자",
      displayHelp: "돌리기: 밝기 조절 · 다이얼 누르기: 전원 전환 · 터치 화면 누르기: 표시 방식 전환. 막대 → 원형 → 숫자 순서입니다. 표시 전환은 조명을 바꾸거나 앱을 실행하지 않습니다.",
      brightnessTextSize: "밝기 숫자 크기", brightnessTextSmall: "작게", brightnessTextMedium: "중간", brightnessTextLarge: "크게 (기존 크기)",
      brightnessTextSizeHelp: "터치 화면의 밝기 % 숫자 크기이며, 세 가지 표시 방식에 모두 적용됩니다. ‘크게’는 기존 크기입니다. 화면 표시만 바뀌며 실제 밝기는 바뀌지 않습니다.",
      sceneBrowserHelp: "다이얼을 누르거나 해당 터치 화면을 누르면 저장된 씬 목록이 열립니다. 다이얼을 돌려 씬을 선택하고 다시 누르거나 터치하면 재생합니다. 화면에는 씬 이름이 최대 세 개씩 표시됩니다. 선택 위치는 임시이며 프로필에 저장되지 않습니다.",
      brightnessHelp: "키를 한 번 누를 때 바뀌는 밝기입니다. 1–100%p 사이의 정수이며, 기본값은 5%p입니다.",
      brightnessStepInvalid: "밝기 조절 폭은 1부터 100까지의 정수로 입력해 주세요.",
      brightnessArgumentError: "선택한 장치와 밝기 조절 폭을 확인한 뒤 다시 시도해 주세요.",
      toggle: "켜기 / 끄기 전환", on: "켜기", off: "끄기", refresh: "목록 새로고침",
      autoLaunch: "키를 누르면 Nanoleaf Desktop 자동 실행",
      launchHelp: "선택 사항입니다. 키를 누를 때만 앱을 열며, 목록 새로고침은 앱을 열지 않습니다. 앱을 항상 켜두신다면 선택하지 않으셔도 됩니다.",
      privacy: "설정은 Stream Deck 프로필에 저장됩니다. AI 계정이나 API 키는 필요하지 않습니다.",
      connecting: "Stream Deck에 연결 중입니다…", loading: "장치와 씬 목록을 읽는 중입니다…",
      selectDevice: "장치를 선택해 주세요…", selectScene: "씬을 선택해 주세요…",
      savedDevice: "저장된 장치", saved: "저장됨", unavailable: "현재 없음",
      missingDevice: "저장된 장치가 현재 목록에 없습니다. 설정은 유지됩니다. 장치를 다시 연결하거나 다른 장치를 선택해 주세요.",
      missingScene: "저장된 씬이 현재 목록에 없습니다. 설정은 유지됩니다. Nanoleaf Desktop에서 씬을 추가하거나 다른 씬을 선택해 주세요.",
      noDevices: "지원되는 장치를 찾지 못했습니다. 이번 베타는 USB PC Screen Mirror Lightstrip(NL82K2)만 지원합니다. Nanoleaf Desktop에서 장치를 USB로 연결한 뒤 새로고침해 주세요.",
      noScenes: "씬을 찾지 못했습니다. Nanoleaf Desktop에서 이 장치에 씬을 추가한 뒤 새로고침해 주세요.",
      ready: "목록을 불러왔습니다. 항목을 선택하면 설정이 저장됩니다.",
      timeout: "응답 시간이 초과되었습니다. Nanoleaf Desktop이 준비되었는지 확인한 뒤 새로고침해 주세요.",
      disconnected: "Stream Deck 연결이 끊겼습니다. 이 키를 다시 선택해 주세요.",
      invalid: "목록을 불러오지 못했습니다. Nanoleaf Desktop을 확인한 뒤 새로고침해 주세요.",
      setupError: "설정을 열지 못했습니다. Stream Deck에서 이 키를 다시 선택해 주세요.",
      commandHeading: "이 키의 마지막 실행",
      commandIdle: "플러그인 실행 이후 이 키의 기록이 없습니다.",
      commandRunning: "이 키의 명령을 처리 중입니다…",
      commandSuccess: "이 키의 마지막 명령을 완료했습니다.",
      errors: {
        APP_CONNECTION: "Nanoleaf Desktop을 열고 MCP 서버를 활성화한 뒤 다시 시도해 주세요.",
        APP_TIMEOUT: "Nanoleaf Desktop의 응답 시간이 초과되었습니다. 앱 상태를 확인한 뒤 다시 시도해 주세요.",
        APP_ERROR: "Nanoleaf Desktop이 요청을 처리하지 못했습니다. 앱 상태를 확인한 뒤 다시 시도해 주세요.",
        PROTOCOL_ERROR: "Nanoleaf Desktop이 예상과 다른 형식으로 응답했습니다. 지원되는 앱 버전인지 확인해 주세요.",
        DEVICE_ERROR: "조명이 응답하지 않습니다. Nanoleaf Desktop에서 장치 연결을 확인한 뒤 다시 시도해 주세요.",
        SCENE_NOT_READY: "선택한 씬이 아직 준비되지 않았습니다. 씬 목록을 새로고침한 뒤 다시 시도해 주세요.",
        BRIGHTNESS_UNAVAILABLE: "현재 밝기를 읽을 수 없습니다. Nanoleaf Desktop에서 조명 상태를 확인한 뒤 다시 시도해 주세요.",
        INVALID_ARGUMENT: "이 키에 설정된 장치와 씬을 확인한 뒤 다시 시도해 주세요.",
        DEVICE_MISSING: "선택한 장치를 사용할 수 없습니다. 장치 목록을 새로고침해 주세요.",
        DEVICE_UNSUPPORTED: "이번 베타는 PC Screen Mirror Lightstrip(NL82K2)만 지원합니다.",
        BUSY: "이 조명에 대한 명령을 처리 중입니다. 잠시 기다린 뒤 다시 눌러 주세요.",
        LAUNCH_FAILED: "Nanoleaf Desktop을 열지 못했습니다. 앱을 설치하고 직접 실행해 주세요.",
        INTERNAL_ERROR: "요청을 처리하지 못했습니다. 이 키를 다시 선택한 뒤 재시도해 주세요.",
      },
    },
  };
  const dialTranslations = {
    en: {
      brightnessHelp: "Change per dial tick, in percentage points (1–100). Default: 2. Turn clockwise to increase and counterclockwise to decrease.",
      autoLaunch: "Open Nanoleaf Desktop when the dial is turned or pressed",
      launchHelp: "Optional. Turning or pressing the dial may open the app. Touching the display or refreshing never opens it. Leave this off if you already keep Nanoleaf Desktop running.",
      commandHeading: "Last dial command",
      commandIdle: "No result for this dial in this plugin session.",
      commandRunning: "Running this dial’s command…",
      commandSuccess: "This dial’s last command completed.",
      disconnected: "Disconnected from Stream Deck. Select this dial again to reconnect.",
      setupError: "Unable to open these settings. Select this dial again in Stream Deck.",
    },
    ko: {
      brightnessHelp: "다이얼 한 눈금당 바뀌는 밝기입니다. 1–100%p 사이의 정수이며, 기본값은 2%p입니다. 시계 방향으로 돌리면 증가하고 반대 방향이면 감소합니다.",
      autoLaunch: "다이얼을 돌리거나 누르면 Nanoleaf Desktop 자동 실행",
      launchHelp: "선택 사항입니다. 다이얼을 돌리거나 누를 때 앱을 열 수 있습니다. 터치 화면 누르기와 목록 새로고침은 앱을 열지 않습니다. 앱을 항상 켜두신다면 선택하지 않으셔도 됩니다.",
      commandHeading: "이 다이얼의 마지막 실행",
      commandIdle: "플러그인 실행 이후 이 다이얼의 기록이 없습니다.",
      commandRunning: "이 다이얼의 명령을 처리 중입니다…",
      commandSuccess: "이 다이얼의 마지막 명령을 완료했습니다.",
      disconnected: "Stream Deck 연결이 끊겼습니다. 이 다이얼을 다시 선택해 주세요.",
      setupError: "설정을 열지 못했습니다. Stream Deck에서 이 다이얼을 다시 선택해 주세요.",
    },
  };
  const sceneDialTranslations = {
    en: {
      autoLaunch: "Open Nanoleaf Desktop when the dial is pressed or its display is tapped",
      launchHelp: "Optional. Pressing the dial or tapping its touch-strip section may open the app to load scenes or play your selection. Turning only changes the selection; opening these settings or refreshing never opens the app.",
    },
    ko: {
      autoLaunch: "다이얼을 누르거나 터치하면 Nanoleaf Desktop 자동 실행",
      launchHelp: "선택 사항입니다. 다이얼을 누르거나 해당 터치 화면을 누를 때 씬 목록을 읽거나 선택한 씬을 재생하기 위해 앱을 열 수 있습니다. 돌리기는 선택만 바꾸며, 설정 화면을 열거나 목록을 새로고침해도 앱은 열리지 않습니다.",
    },
  };
  const element = (id) => document.getElementById(id);
  const ui = {
    device: element("device"), scene: element("scene"), mode: element("power-mode"),
    sceneField: element("scene-field"), powerField: element("power-field"),
    brightnessField: element("brightness-field"), brightnessStep: element("brightness-step"), brightnessHelp: element("brightness-help"),
    displayField: element("display-field"), displayMode: element("display-mode"), displayHelp: element("display-help"),
    brightnessTextSizeField: element("brightness-text-size-field"), brightnessTextSize: element("brightness-text-size"), brightnessTextSizeHelp: element("brightness-text-size-help"),
    sceneBrowserHelp: element("scene-browser-help"),
    deviceHint: element("device-hint"), sceneHint: element("scene-hint"),
    refresh: element("refresh"), autoLaunch: element("auto-launch"), status: element("status"),
    commandStatus: element("command-status"),
  };
  let words = translations.en;
  let socket;
  let registered = false;
  let uuid = "";
  let action = "";
  let actionContext = "";
  let sessionId = "";
  let sequence = 0;
  let commandSequence = -1;
  let isScene = false;
  let isBrightness = false;
  let isDial = false;
  let isBrightnessDial = false;
  let isSceneDial = false;
  let settings = normalizeSettings({});
  let devices = [];
  let scenes = [];
  let devicesLoaded = false;
  let scenesLoaded = false;
  const pending = new Map();

  function normalizeSettings(value) {
    const data = value && typeof value === "object" ? value : {};
    const normalized = {
      deviceId: typeof data.deviceId === "string" ? data.deviceId : "",
      autoLaunch: data.autoLaunch === true,
    };
    if (!isSceneDial) {
      normalized.sceneName = typeof data.sceneName === "string" ? data.sceneName : "";
      normalized.powerMode = ["on", "off", "toggle"].includes(data.powerMode) ? data.powerMode : "toggle";
    }
    if (isBrightness) normalized.brightnessStep = Number.isInteger(data.brightnessStep)
      && data.brightnessStep >= 1 && data.brightnessStep <= 100 ? data.brightnessStep : isDial ? 2 : 5;
    if (isBrightnessDial) {
      normalized.displayMode = ["bar", "ring", "number"].includes(data.displayMode) ? data.displayMode : "bar";
      normalized.brightnessTextSize = ["small", "medium", "large"].includes(data.brightnessTextSize) ? data.brightnessTextSize : "large";
    }
    return normalized;
  }

  function status(message, error = false) {
    ui.status.textContent = message;
    ui.status.dataset.kind = error ? "error" : "info";
  }

  function receiveCommandStatus(payload) {
    if (!payload || payload.event !== "commandStatus" || payload.actionContext !== actionContext
      || !Number.isSafeInteger(payload.sequence) || payload.sequence < 0 || payload.sequence < commandSequence
      || !["idle", "running", "success", "error"].includes(payload.state)) return;
    commandSequence = payload.sequence;
    const messages = { idle: words.commandIdle, running: words.commandRunning, success: words.commandSuccess };
    const knownCode = Object.prototype.hasOwnProperty.call(words.errors, payload.errorCode);
    ui.commandStatus.textContent = payload.state === "error"
      ? words.errors[knownCode ? payload.errorCode : "INTERNAL_ERROR"] : messages[payload.state];
    ui.commandStatus.dataset.kind = payload.state === "error" ? "error" : payload.state === "success" ? "success" : "info";
  }

  function connected() { return registered && socket?.readyState === WebSocket.OPEN; }

  function controls() {
    const ready = connected();
    ui.device.disabled = !ready || pending.has("devices");
    ui.scene.disabled = !ready || !settings.deviceId || pending.has("scenes") || pending.has("devices");
    ui.mode.disabled = !ready;
    ui.brightnessStep.disabled = !ready;
    ui.displayMode.disabled = !ready;
    ui.brightnessTextSize.disabled = !ready;
    ui.autoLaunch.disabled = !ready;
    ui.refresh.disabled = !ready || pending.size > 0;
  }

  function option(value, label) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    return node;
  }

  function fillSelect(select, entries, selected, placeholder, loaded, savedLabel) {
    const nodes = [option("", placeholder)];
    const missing = selected && !entries.some((entry) => entry.value === selected);
    if (missing) nodes.push(option(selected, `${savedLabel} (${loaded ? words.unavailable : words.saved})`));
    for (const entry of entries) nodes.push(option(entry.value, entry.label));
    select.replaceChildren(...nodes);
    select.value = selected;
    return Boolean(missing && loaded);
  }

  function render() {
    const unavailableDevice = fillSelect(ui.device, devices.map((device) => ({
      value: device.id,
      label: `${device.name || device.id}${device.model ? ` (${device.model})` : ""}`,
    })), settings.deviceId, words.selectDevice, devicesLoaded, words.savedDevice);
    ui.deviceHint.textContent = words.missingDevice;
    ui.deviceHint.hidden = !unavailableDevice;

    const unavailableScene = fillSelect(ui.scene, scenes.map((name) => ({ value: name, label: name })),
      settings.sceneName, words.selectScene, scenesLoaded, settings.sceneName);
    ui.sceneHint.textContent = words.missingScene;
    ui.sceneHint.hidden = !isScene || !unavailableScene;
    ui.mode.value = settings.powerMode;
    ui.autoLaunch.checked = settings.autoLaunch;
    ui.sceneField.hidden = !isScene;
    ui.powerField.hidden = isScene || isBrightness || isSceneDial;
    ui.brightnessField.hidden = !isBrightness;
    ui.brightnessHelp.hidden = !isBrightness;
    ui.brightnessStep.value = String(settings.brightnessStep ?? "");
    ui.displayField.hidden = !isBrightnessDial;
    ui.displayHelp.hidden = !isBrightnessDial;
    ui.brightnessTextSizeField.hidden = !isBrightnessDial;
    ui.brightnessTextSizeHelp.hidden = !isBrightnessDial;
    ui.brightnessTextSize.value = settings.brightnessTextSize ?? "large";
    ui.sceneBrowserHelp.hidden = !isSceneDial;
    ui.displayMode.value = settings.displayMode ?? "bar";
    controls();
  }

  function cancel(event) {
    const request = pending.get(event);
    if (request) clearTimeout(request.timer);
    pending.delete(event);
  }

  function cancelAll() {
    for (const event of pending.keys()) cancel(event);
    controls();
  }

  function send(event, payload) {
    if (!connected()) {
      status(words.disconnected, true);
      controls();
      return false;
    }
    try {
      // Stream Deck supplies the inspector UUID for commands sent by this UI.
      socket.send(JSON.stringify({ event, action, context: uuid, payload }));
      return true;
    } catch {
      status(words.disconnected, true);
      return false;
    }
  }

  function request(event, deviceId) {
    cancel(event);
    const requestId = `${sessionId}:${++sequence}`;
    const timer = setTimeout(() => {
      if (pending.get(event)?.requestId !== requestId) return;
      pending.delete(event);
      controls();
      status(words.timeout, true);
    }, REQUEST_TIMEOUT_MS);
    pending.set(event, { requestId, deviceId, timer });
    const payload = { event, requestId };
    if (deviceId) payload.deviceId = deviceId;
    if (!send("sendToPlugin", payload)) cancel(event);
    else status(words.loading);
    controls();
  }

  function refresh() {
    cancel("scenes");
    request("devices");
  }

  function save() { send("setSettings", { ...settings }); }

  function receiveLists(payload) {
    if (!payload || typeof payload !== "object") return;
    const requestState = pending.get(payload.event);
    if (!requestState || payload.requestId !== requestState.requestId) return;
    cancel(payload.event);
    if (payload.event === "scenes" && requestState.deviceId !== settings.deviceId) {
      controls();
      return;
    }
    if (typeof payload.error === "string" && payload.error) {
      const knownCode = Object.prototype.hasOwnProperty.call(words.errors, payload.errorCode);
      status(knownCode ? words.errors[payload.errorCode] : words.invalid, true);
      controls();
      return;
    }
    if (payload.event === "devices" && Array.isArray(payload.devices)) {
      devices = payload.devices.filter((item) => item && typeof item.id === "string" && item.id)
        .map((item) => ({ id: item.id, name: typeof item.name === "string" ? item.name : "", model: typeof item.model === "string" ? item.model : "" }));
      devicesLoaded = true;
      render();
      if (isScene && devices.some((device) => device.id === settings.deviceId)) {
        request("scenes", settings.deviceId);
      } else status(devices.length ? words.ready : words.noDevices);
    } else if (payload.event === "scenes" && Array.isArray(payload.scenes)) {
      scenes = [...new Set(payload.scenes.filter((name) => typeof name === "string" && name))];
      scenesLoaded = true;
      render();
      status(scenes.length ? words.ready : words.noScenes);
    } else {
      controls();
      status(words.invalid, true);
    }
  }

  function receiveSettings(value) {
    const next = normalizeSettings(value);
    const deviceChanged = settings.deviceId !== next.deviceId;
    settings = next;
    if (deviceChanged) {
      cancel("scenes");
      scenes = [];
      scenesLoaded = false;
    }
    render();
    if (deviceChanged && isScene && settings.deviceId && !pending.has("devices")) {
      request("scenes", settings.deviceId);
    } else if (deviceChanged && !pending.size) status(words.ready);
  }

  ui.refresh.addEventListener("click", refresh);
  ui.device.addEventListener("change", () => {
    if (ui.device.value === settings.deviceId) return;
    settings.deviceId = ui.device.value;
    if (!isSceneDial) settings.sceneName = "";
    scenes = [];
    scenesLoaded = false;
    cancel("scenes");
    save();
    render();
    if (isScene && settings.deviceId) request("scenes", settings.deviceId);
    else status(words.ready);
  });
  ui.scene.addEventListener("change", () => { if (isScene) { settings.sceneName = ui.scene.value; save(); render(); } });
  ui.mode.addEventListener("change", () => { if (!isScene && !isBrightness && !isSceneDial) { settings.powerMode = ui.mode.value; save(); } });
  ui.brightnessStep.addEventListener("change", () => {
    if (!isBrightness) return;
    const next = Number(ui.brightnessStep.value);
    if (!Number.isInteger(next) || next < 1 || next > 100) {
      ui.brightnessStep.value = String(settings.brightnessStep);
      status(words.brightnessStepInvalid, true);
      return;
    }
    settings.brightnessStep = next;
    save();
    status(words.ready);
  });
  ui.displayMode.addEventListener("change", () => {
    if (!isBrightnessDial) return;
    if (!["bar", "ring", "number"].includes(ui.displayMode.value)) {
      ui.displayMode.value = settings.displayMode;
      return;
    }
    if (ui.displayMode.value === settings.displayMode) return;
    settings.displayMode = ui.displayMode.value;
    save();
  });
  ui.brightnessTextSize.addEventListener("change", () => {
    if (!isBrightnessDial) return;
    if (!["small", "medium", "large"].includes(ui.brightnessTextSize.value)) {
      ui.brightnessTextSize.value = settings.brightnessTextSize;
      return;
    }
    if (ui.brightnessTextSize.value === settings.brightnessTextSize) return;
    settings.brightnessTextSize = ui.brightnessTextSize.value;
    save();
  });
  ui.autoLaunch.addEventListener("change", () => { settings.autoLaunch = ui.autoLaunch.checked; save(); });

  window.connectElgatoStreamDeckSocket = (port, inspectorId, registerEvent, info, actionInfo) => {
    registered = false;
    cancelAll();
    if (socket) { socket.onopen = null; socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.close(); }
    try {
      const appInfo = JSON.parse(info);
      const actionData = JSON.parse(actionInfo);
      const language = String(appInfo?.application?.language || "en").startsWith("ko") ? "ko" : "en";
      isBrightnessDial = typeof actionData?.action === "string" && actionData.action.endsWith(".brightness-dial");
      isSceneDial = typeof actionData?.action === "string" && actionData.action.endsWith(".scene-dial");
      isDial = isBrightnessDial || isSceneDial;
      words = { ...translations[language], ...(isDial ? dialTranslations[language] : {}),
        ...(isSceneDial ? sceneDialTranslations[language] : {}) };
      document.documentElement.lang = language;
      for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = words[node.dataset.i18n];
      if (!/^\d{1,5}$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535 || typeof inspectorId !== "string" || !inspectorId || typeof actionData?.action !== "string") throw new Error("Invalid registration");
      uuid = inspectorId;
      action = actionData.action;
      actionContext = actionData.context;
      sessionId = `${uuid}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
      sequence = 0;
      commandSequence = -1;
      ui.commandStatus.textContent = words.commandIdle;
      ui.commandStatus.dataset.kind = "info";
      isScene = action.endsWith(".scene");
      isBrightness = ["brightness-up", "brightness-down", "brightness-dial"].some((suffix) => action.endsWith(`.${suffix}`));
      if (isBrightness) words.errors = { ...words.errors, INVALID_ARGUMENT: words.brightnessArgumentError };
      settings = normalizeSettings(actionData.payload?.settings);
      devices = [];
      scenes = [];
      devicesLoaded = false;
      scenesLoaded = false;
      status(words.connecting);
      socket = new WebSocket(`ws://127.0.0.1:${port}`);
      socket.onopen = () => {
        try {
          socket.send(JSON.stringify({ event: registerEvent, uuid }));
          registered = true;
          send("sendToPlugin", { event: "commandStatus" });
          refresh();
        } catch {
          registered = false;
          status(words.disconnected, true);
          controls();
        }
      };
      socket.onmessage = ({ data }) => {
        let message;
        try { message = JSON.parse(data); } catch { return; }
        if (!message || typeof message !== "object") return;
        if (message.action && message.action !== action) return;
        if (message.context && message.context !== uuid && message.context !== actionContext) return;
        if (message.event === "sendToPropertyInspector") {
          if (message.payload?.event === "commandStatus") receiveCommandStatus(message.payload);
          else receiveLists(message.payload);
        }
        if (message.event === "didReceiveSettings") receiveSettings(message.payload?.settings);
      };
      socket.onclose = socket.onerror = () => { registered = false; cancelAll(); status(words.disconnected, true); controls(); };
      render();
    } catch {
      status(words.setupError, true);
      controls();
    }
  };
})();
