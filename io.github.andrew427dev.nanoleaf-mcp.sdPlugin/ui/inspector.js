/* The property inspector uses only Stream Deck's local WebSocket bridge.
 * Protocol: https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/
 */
(() => {
  "use strict";

  const REQUEST_TIMEOUT_MS = 15_000;
  const translations = {
    en: {
      controlHeading: "Before quitting Desktop", prepareQuit: "Prepare app quit", resumeControl: "Resume control",
      controlHelp: "Prepare app quit pauses this plugin's requests; wait for the result before quitting Desktop yourself. It does not intercept ⌘Q, close the app, or pause other plugins, including a separately installed QA/original copy. Pause survives Stream Deck restart. After Desktop finishes quitting, choose Resume control, then press a key. Resume never launches the app or replays old inputs.",
      controlActive: "Control enabled.", controlWaiting: "Blocking new inputs and waiting for already accepted requests… Do not quit Desktop yet.",
      controlResuming: "Restoring control…", controlUnknown: "Unable to confirm pause status. Do not assume quit preparation is complete; reopen these settings.",
      controlPaused: "This plugin is paused; responses to its requests were received. Other clients and Desktop's internal cleanup are outside this check.",
      controlUncertain: "This plugin is paused, but some request outcomes are unconfirmed (or it restarted while paused). App quit readiness is not confirmed. Check Desktop before quitting.",
      controlSaveError: "Pause state could not be saved or verified. Current requests remain blocked; do not rely on pause surviving restart. Reopen settings and retry.",
      diagnosticsHeading: "Connection check", diagnosticsRun: "Check connection", diagnosticsCopy: "Copy summary",
      diagnosticsHelp: "Read-only check. It never launches Desktop or changes the light. The summary excludes device identifiers, scene names and personal paths.",
      diagnosticsLoading: "Checking the local connection…", diagnosticsReady: "Connection check complete.",
      diagnosticsCopied: "Summary copied.", diagnosticsCopyManual: "Automatic copy is unavailable. Select the summary below and copy it manually.",
      diagnosticsInvalid: "The connection summary could not be read. Run the check again.",
      diagnosticsNotChecked: "Not checked", diagnosticsAvailable: "Available", diagnosticsMissing: "Missing",
      diagnosticsPlatform: "Platform", diagnosticsServer: "MCP server version", diagnosticsConnection: "Connection",
      diagnosticsProtocol: "MCP protocol", diagnosticsLightTools: "Light commands", diagnosticsMirrorTools: "Mac mirror commands",
      diagnosticsDevices: "Supported USB devices", diagnosticsConnected: "Ready", diagnosticsUnavailable: "Unavailable",
      intro: "For the USB-only PC Screen Mirror Lightstrip (NL82K2), controlled through Nanoleaf Desktop. This beta does not support Wi-Fi/LAN models. Open the app and connect your light by USB before refreshing.",
      device: "Device", scene: "Scene", powerMode: "Power mode",
      mirrorMode: "Screen mirror action", mirrorToggle: "Toggle screen mirror", mirrorStart: "Start screen mirror", mirrorStop: "Stop screen mirror",
      mirrorHelp: "Uses all mirror targets and the current mode, display and layout selected in Nanoleaf Desktop. Set screen-recording permission in Desktop first. Starting can stop other streaming. Desktop restores previous light settings when stopping; this can change power or cause a brief flash. This known limitation is unresolved. Status describes the capture engine, not successful output from every light.",
      mirrorRunning: "Screen mirror engine is running", mirrorStopped: "Screen mirror engine is stopped",
      brightnessStep: "Step (%p)",
      brightnessPreset: "Brightness (%)", presetWhenOff: "When the light is off",
      presetKeepOff: "Keep off; skip the preset", presetApply: "Apply preset; turn on above 0%",
      presetHelp: "Set a fixed brightness from 0 to 100%. Default: 50%. By default an OFF light stays off. Applying 0% may turn the light off. This policy applies only to this preset key.",
      presetInvalid: "Enter a whole brightness percentage from 0 to 100.",
      diagnosticsTimeout: "Desktop did not respond in time. Check the app, then run the connection check again.",
      displayMode: "Display", displayBar: "Bar", displayRing: "Ring", displayNumber: "Number",
      displayHelp: "Turn: adjust brightness · Press the dial: toggle power · Tap the touch strip: switch display. Bar → Ring → Number. Display changes never change the light or open the app.",
      brightnessTextSize: "Brightness text size", brightnessTextSmall: "Small", brightnessTextMedium: "Medium", brightnessTextLarge: "Large (original size)",
      brightnessTextSizeHelp: "Size of the brightness percentage on the touch strip in all three display styles. Large keeps the original size. This changes only the display, not the light.",
      sceneBrowserHelp: "Press the dial or tap its touch-strip section to open the saved scene list. Turn to select, then press or tap again to play. Hold the touch strip to refresh the list without playing a scene, keeping the selected name when available. Refresh follows this dial’s app-launch setting. Selection is temporary.",
      brightnessHelp: "Change per key press, in percentage points (1–100). Default: 5. Desktop may switch the light off at 0% or on when increasing brightness from OFF.",
      brightnessStepInvalid: "Enter a whole number from 1 to 100 for the brightness step.",
      brightnessArgumentError: "Check the selected device and brightness step, then try again.",
      toggle: "Toggle on / off", on: "On", off: "Off", refresh: "Refresh lists",
      autoLaunch: "Launch the app if closed, then control the light",
      launchHelp: "When you press this key, launch Nanoleaf Desktop if it is closed, then perform the requested light action. Applies only to this key; off by default. If this option is off and the app is closed, light control is unavailable. Opening these settings or refreshing never opens the app.",
      privacy: "Action settings stay in your Stream Deck profile; pause status is saved in local plugin settings. No AI account or API key is needed.",
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
      commandUnavailable: "Last result is unavailable. Select this key again to reconnect.",
      commandRunning: "Running this key’s command…",
      commandSuccess: "This key’s last command completed.",
      errors: {
        CONTROL_PAUSED: "Control is paused for app quit preparation. Choose Resume control after Desktop has finished quitting.",
        CONTROL_CANCELLED: "Quit preparation cancelled this earlier input. Press again after explicitly resuming control.",
        APP_NOT_READY: "Desktop was not ready in time; no light-changing command was sent by this input. If you just quit the app, wait for it to fully exit before retrying. A closed window does not prove the process exited.",
        LIGHT_OFF: "Light is off; brightness was not applied.",
        APP_BUSY: "Another light or screen-mirror command is running. Wait before pressing again.",
        MIRROR_UNSUPPORTED: "This Desktop version does not provide all screen-mirror commands.",
        MIRROR_UNKNOWN: "Screen-mirror status is uncertain. Check Desktop permissions, display, devices and layout. Do not repeatedly press the key.",
        APP_CONNECTION: "Open Nanoleaf Desktop and enable its MCP server, then try again.",
        APP_TIMEOUT: "Nanoleaf Desktop timed out. The command may already have been applied. Check the actual light state before pressing again.",
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
        LAUNCH_NOT_FOUND: "No registered Nanoleaf Desktop installation was found. Open the app manually, then try again.",
        LAUNCH_AMBIGUOUS: "Multiple Nanoleaf Desktop installations were found. Open the intended app manually.",
        PLATFORM_UNSUPPORTED: "This operating system is not supported by this preview.",
        MIRROR_PLATFORM_UNSUPPORTED: "Screen mirroring is not supported on Windows in this preview.",
        INTERNAL_ERROR: "The request could not be completed. Select this key again and retry.",
      },
    },
    ko: {
      controlHeading: "Desktop 앱을 종료하기 전에", prepareQuit: "앱 종료 준비", resumeControl: "제어 재개",
      controlHelp: "‘앱 종료 준비’는 이 플러그인의 요청을 멈춥니다. 결과를 확인한 뒤 Desktop을 직접 종료해 주세요. ⌘Q를 자동 감지하거나 앱을 종료하지 않으며, 별도 설치된 QA·기존 플러그인 등 다른 프로그램의 조회는 멈추지 않습니다. 일시중지는 Stream Deck 재시작 후에도 유지됩니다. Desktop 종료가 끝나면 ‘제어 재개’ 후 버튼을 새로 눌러 주세요. 재개 자체는 앱을 실행하거나 이전 입력을 다시 실행하지 않습니다.",
      controlActive: "제어가 활성화되어 있습니다.", controlWaiting: "새 입력을 막고 이미 접수한 요청의 응답을 기다리고 있습니다. 아직 Desktop을 종료하지 마세요.",
      controlResuming: "제어를 재개하는 중입니다…", controlUnknown: "일시중지 상태를 확인하지 못했습니다. 종료 준비가 끝났다고 판단하지 마시고 설정 화면을 다시 열어 주세요.",
      controlPaused: "이 플러그인은 일시중지되었으며 요청 응답을 모두 받았습니다. 다른 프로그램의 조회와 Desktop 내부 정리 완료는 확인 범위에 포함되지 않습니다.",
      controlUncertain: "이 플러그인은 일시중지되었지만 일부 요청 결과를 확인하지 못했거나 중지 상태에서 재시작되었습니다. 앱 종료 준비 완료를 확인할 수 없으니 Desktop 상태를 먼저 확인해 주세요.",
      controlSaveError: "일시중지 상태를 저장·확인하지 못했습니다. 현재 요청은 차단되어 있지만 재시작 후 유지 여부는 보장할 수 없습니다. 설정을 다시 열어 재시도해 주세요.",
      diagnosticsHeading: "연결 진단", diagnosticsRun: "연결 확인", diagnosticsCopy: "요약 복사",
      diagnosticsHelp: "앱을 실행하거나 조명을 바꾸지 않는 조회입니다. 요약에는 장치 식별자·씬 이름·개인 경로를 포함하지 않습니다.",
      diagnosticsLoading: "로컬 연결을 확인하는 중입니다…", diagnosticsReady: "연결 진단을 마쳤습니다.",
      diagnosticsCopied: "요약을 복사했습니다.", diagnosticsCopyManual: "자동 복사를 사용할 수 없습니다. 아래 요약을 선택해 직접 복사해 주세요.",
      diagnosticsInvalid: "진단 요약을 읽지 못했습니다. 다시 확인해 주세요.",
      diagnosticsNotChecked: "미확인", diagnosticsAvailable: "사용 가능", diagnosticsMissing: "지원 도구 누락",
      diagnosticsPlatform: "운영체제", diagnosticsServer: "MCP 서버 버전", diagnosticsConnection: "연결",
      diagnosticsProtocol: "MCP 프로토콜", diagnosticsLightTools: "조명 제어 도구", diagnosticsMirrorTools: "Mac 미러링 도구",
      diagnosticsDevices: "지원 USB 장치 수", diagnosticsConnected: "준비됨", diagnosticsUnavailable: "사용 불가",
      intro: "Wi-Fi 없이 USB로 연결하는 PC Screen Mirror Lightstrip(NL82K2)을 Nanoleaf Desktop을 통해 제어합니다. 이번 베타는 Wi-Fi/LAN 모델을 지원하지 않습니다. 앱을 열고 조명을 USB로 연결한 뒤 새로고침해 주세요.",
      device: "장치", scene: "씬", powerMode: "전원 동작",
      mirrorMode: "화면 미러링 동작", mirrorToggle: "미러링 시작 / 정지 전환", mirrorStart: "미러링 시작", mirrorStop: "미러링 정지",
      mirrorHelp: "Nanoleaf Desktop에서 선택한 미러링 장치 전체와 현재 모드·화면·배치를 사용합니다. 화면 기록 권한은 Desktop에서 먼저 설정해 주세요. 시작하면 다른 스트리밍이 중지될 수 있습니다. 정지하면 Desktop이 이전 조명 상태를 복원하면서 전원이 바뀌거나 잠깐 깜빡일 수 있습니다. 아직 해결되지 않은 한계입니다. 실행 중 표시는 캡처 엔진 상태이며 모든 조명의 출력 성공을 뜻하지 않습니다.",
      mirrorRunning: "화면 미러링 엔진 실행 중", mirrorStopped: "화면 미러링 엔진 정지 상태",
      brightnessStep: "조절 폭 (%p)",
      brightnessPreset: "지정 밝기 (%)", presetWhenOff: "조명이 꺼져 있을 때",
      presetKeepOff: "꺼짐 유지 · 밝기 적용하지 않기", presetApply: "밝기 적용 · 0%보다 크면 켜기",
      presetHelp: "0–100% 중 지정한 밝기로 바로 맞춥니다. 기본값은 50%이며 꺼진 조명은 기본적으로 유지합니다. 0%를 적용하면 조명이 꺼질 수 있습니다. 이 정책은 이 프리셋 버튼에만 적용됩니다.",
      presetInvalid: "밝기는 0부터 100까지의 정수로 입력해 주세요.",
      diagnosticsTimeout: "Desktop이 응답하지 않았습니다. 앱을 확인한 뒤 연결 진단을 다시 실행해 주세요.",
      displayMode: "표시 방식", displayBar: "막대", displayRing: "원형", displayNumber: "숫자",
      displayHelp: "돌리기: 밝기 조절 · 다이얼 누르기: 전원 전환 · 터치 화면 누르기: 표시 방식 전환. 막대 → 원형 → 숫자 순서입니다. 표시 전환은 조명을 바꾸거나 앱을 실행하지 않습니다.",
      brightnessTextSize: "밝기 숫자 크기", brightnessTextSmall: "작게", brightnessTextMedium: "중간", brightnessTextLarge: "크게 (기존 크기)",
      brightnessTextSizeHelp: "터치 화면의 밝기 % 숫자 크기이며, 세 가지 표시 방식에 모두 적용됩니다. ‘크게’는 기존 크기입니다. 화면 표시만 바뀌며 실제 밝기는 바뀌지 않습니다.",
      sceneBrowserHelp: "다이얼을 누르거나 해당 터치 화면을 누르면 씬 목록이 열립니다. 돌려 선택하고 다시 누르거나 터치하면 재생합니다. 터치 화면을 길게 누르면 씬을 재생하지 않고 목록을 새로 읽으며, 같은 이름이 있으면 선택을 유지합니다. 새로고침은 이 다이얼의 앱 실행 옵션을 따릅니다. 선택 위치는 임시입니다.",
      brightnessHelp: "키를 한 번 누를 때 바뀌는 밝기입니다. 1–100%p 사이의 정수이며, 기본값은 5%p입니다. Desktop이 0%에서 조명을 끄거나 꺼진 조명의 밝기를 올릴 때 켤 수 있습니다.",
      brightnessStepInvalid: "밝기 조절 폭은 1부터 100까지의 정수로 입력해 주세요.",
      brightnessArgumentError: "선택한 장치와 밝기 조절 폭을 확인한 뒤 다시 시도해 주세요.",
      toggle: "켜기 / 끄기 전환", on: "켜기", off: "끄기", refresh: "목록 새로고침",
      autoLaunch: "앱이 꺼져 있으면 실행 후 제어",
      launchHelp: "키를 누를 때 Nanoleaf Desktop이 꺼져 있으면 앱을 실행한 뒤 요청한 조명 동작을 수행합니다. 이 버튼에만 적용되며 기본값은 꺼짐입니다. 이 옵션을 끈 상태에서 앱도 종료되어 있으면 제어할 수 없습니다. 설정 화면을 열거나 목록을 새로고침해도 앱은 열리지 않습니다.",
      privacy: "일시중지 여부는 로컬 플러그인 공통 설정에 저장됩니다. 설정은 Stream Deck 프로필에 저장됩니다. AI 계정이나 API 키는 필요하지 않습니다.",
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
      commandUnavailable: "마지막 결과를 확인할 수 없습니다. 이 버튼을 다시 선택해 연결해 주세요.",
      commandIdle: "플러그인 실행 이후 이 키의 기록이 없습니다.",
      commandRunning: "이 키의 명령을 처리 중입니다…",
      commandSuccess: "이 키의 마지막 명령을 완료했습니다.",
      errors: {
        CONTROL_PAUSED: "앱 종료 준비로 제어가 일시중지되어 있습니다. Desktop 종료가 끝난 뒤 ‘제어 재개’를 눌러 주세요.",
        CONTROL_CANCELLED: "종료 준비로 이전 입력이 취소되었습니다. ‘제어 재개’ 후 버튼을 새로 눌러 주세요.",
        APP_NOT_READY: "앱 준비 시간이 초과되어 이번 입력의 조명 변경 명령은 전송하지 않았습니다. 방금 앱을 종료했다면 완전히 종료될 때까지 기다린 뒤 다시 시도해 주세요. 창이 닫혔다고 앱 프로세스까지 종료된 것은 아닙니다.",
        LIGHT_OFF: "조명이 꺼져 있어 밝기를 적용하지 않았습니다.",
        APP_BUSY: "조명 또는 화면 미러링 명령을 처리 중입니다. 잠시 기다린 뒤 다시 눌러 주세요.",
        MIRROR_UNSUPPORTED: "현재 Desktop 버전은 필요한 화면 미러링 명령을 모두 제공하지 않습니다.",
        MIRROR_UNKNOWN: "화면 미러링 결과를 확인하지 못했습니다. 반복해서 누르지 말고 Desktop의 권한·화면·장치·배치를 확인해 주세요.",
        APP_CONNECTION: "Nanoleaf Desktop을 열고 MCP 서버를 활성화한 뒤 다시 시도해 주세요.",
        APP_TIMEOUT: "Nanoleaf Desktop의 응답 시간이 초과되었습니다. 명령이 이미 적용되었을 수 있습니다. 다시 누르기 전에 실제 조명 상태를 확인해 주세요.",
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
        LAUNCH_NOT_FOUND: "등록된 Nanoleaf Desktop 설치 경로를 확인하지 못했습니다. 앱을 직접 연 뒤 다시 시도해 주세요.",
        LAUNCH_AMBIGUOUS: "Nanoleaf Desktop 설치 경로가 여러 개입니다. 사용할 앱을 직접 실행해 주세요.",
        PLATFORM_UNSUPPORTED: "이번 시험판에서 지원하지 않는 운영체제입니다.",
        MIRROR_PLATFORM_UNSUPPORTED: "이번 Windows 시험판은 화면 미러링을 지원하지 않습니다.",
        INTERNAL_ERROR: "요청을 처리하지 못했습니다. 이 키를 다시 선택한 뒤 재시도해 주세요.",
      },
    },
  };
  const dialTranslations = {
    en: {
      brightnessHelp: "Change per dial tick, in percentage points (1–100). Default: 2. Turn clockwise to increase and counterclockwise to decrease.",
      autoLaunch: "Launch the app if closed, then control the light",
      launchHelp: "When you turn or press this dial, launch Nanoleaf Desktop if it is closed, then adjust brightness or toggle power. Applies only to this dial; off by default. If this option is off and the app is closed, light control is unavailable. Touching the display, opening these settings, or refreshing never opens the app.",
      commandHeading: "Last dial command",
      commandIdle: "No result for this dial in this plugin session.",
      commandRunning: "Running this dial’s command…",
      commandSuccess: "This dial’s last command completed.",
      disconnected: "Disconnected from Stream Deck. Select this dial again to reconnect.",
      setupError: "Unable to open these settings. Select this dial again in Stream Deck.",
    },
    ko: {
      brightnessHelp: "다이얼 한 눈금당 바뀌는 밝기입니다. 1–100%p 사이의 정수이며, 기본값은 2%p입니다. 시계 방향으로 돌리면 증가하고 반대 방향이면 감소합니다.",
      autoLaunch: "앱이 꺼져 있으면 실행 후 제어",
      launchHelp: "다이얼을 돌리거나 누를 때 Nanoleaf Desktop이 꺼져 있으면 앱을 실행한 뒤 밝기를 조절하거나 전원을 전환합니다. 이 다이얼에만 적용되며 기본값은 꺼짐입니다. 이 옵션을 끈 상태에서 앱도 종료되어 있으면 제어할 수 없습니다. 터치 화면 누르기, 설정 화면 열기, 목록 새로고침은 앱을 실행하지 않습니다.",
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
      autoLaunch: "Launch the app if closed, then control the light",
      launchHelp: "When you press this dial or tap its touch-strip section, launch Nanoleaf Desktop if it is closed, then load scenes or play your selection. Holding the touch strip refreshes the list with the same launch setting. Applies only to this dial; off by default. If this option is off and the app is closed, light control is unavailable. Turning only changes the selection. Opening or refreshing this settings screen never opens the app.",
    },
    ko: {
      autoLaunch: "앱이 꺼져 있으면 실행 후 제어",
      launchHelp: "다이얼을 누르거나 해당 터치 화면을 누를 때 Nanoleaf Desktop이 꺼져 있으면 앱을 실행한 뒤 씬 목록을 읽거나 선택한 씬을 재생합니다. 길게 터치해 목록을 새로 읽을 때도 이 실행 옵션을 따릅니다. 이 다이얼에만 적용되며 기본값은 꺼짐입니다. 이 옵션을 끈 상태에서 앱도 종료되어 있으면 제어할 수 없습니다. 돌리기는 선택만 바꾸며, 이 설정 화면을 열거나 여기서 새로고침해도 앱은 열리지 않습니다.",
    },
  };
  const mirrorTranslations = {
    en: {
      intro: "Screen mirroring uses Nanoleaf Desktop's configured targets. USB NL82K2 is the validation target; other models are not validated. No display capture is performed by this plugin.",
      refresh: "Refresh mirror status", loading: "Reading screen-mirror status…",
      ready: "Setting saved. Refresh to read screen-mirror status.",
      launchHelp: "For Start or Toggle, launch Desktop if closed, then start mirroring. A toggle that opens the app means Start, even if Desktop starts mirroring automatically. Stop never opens the app. This key only; off by default. Settings and refresh never open the app.",
      commandSuccess: "The requested capture-engine state was confirmed. If lights do not mirror, check Desktop permissions, targets and layout.",
    },
    ko: {
      intro: "Nanoleaf Desktop에 설정된 대상 전체의 화면 미러링을 제어합니다. 검증 대상은 USB NL82K2이며 다른 모델은 미검증입니다. 플러그인이 화면을 직접 캡처하지는 않습니다.",
      refresh: "미러링 상태 새로고침", loading: "화면 미러링 상태를 읽는 중입니다…",
      ready: "설정을 저장했습니다. 새로고침으로 미러링 상태를 확인할 수 있습니다.",
      launchHelp: "시작·전환 키를 누를 때 앱이 꺼져 있으면 실행한 뒤 미러링을 켭니다. 앱을 새로 연 첫 전환은 켜기로 처리하여 Desktop이 자동 시작한 미러링을 다시 끄지 않습니다. 정지 키는 앱을 열지 않습니다. 이 버튼에만 적용되며 기본값은 꺼짐입니다. 옵션 OFF와 앱 종료 상태에서는 제어할 수 없으며 설정·새로고침은 앱을 실행하지 않습니다.",
      commandSuccess: "요청한 캡처 엔진 상태를 확인했습니다. 조명에 반영되지 않으면 Desktop의 권한·대상·배치를 확인해 주세요.",
    },
  };
  const element = (id) => document.getElementById(id);
  const ui = {
    prepareQuit: element("prepare-quit"), resumeControl: element("resume-control"), controlStatus: element("control-status"),
    device: element("device"), scene: element("scene"), mode: element("power-mode"),
    sceneField: element("scene-field"), powerField: element("power-field"),
    brightnessField: element("brightness-field"), brightnessStep: element("brightness-step"), brightnessHelp: element("brightness-help"),
    presetField: element("preset-field"), brightnessPreset: element("brightness-preset"),
    presetOffField: element("preset-off-field"), presetWhenOff: element("preset-when-off"), presetHelp: element("preset-help"),
    displayField: element("display-field"), displayMode: element("display-mode"), displayHelp: element("display-help"),
    brightnessTextSizeField: element("brightness-text-size-field"), brightnessTextSize: element("brightness-text-size"), brightnessTextSizeHelp: element("brightness-text-size-help"),
    sceneBrowserHelp: element("scene-browser-help"),
    deviceHint: element("device-hint"), sceneHint: element("scene-hint"),
    refresh: element("refresh"), autoLaunch: element("auto-launch"), status: element("status"),
    commandStatus: element("command-status"),
    diagnosticsRun: element("diagnostics-run"), diagnosticsCopy: element("diagnostics-copy"),
    diagnosticsSummary: element("diagnostics-summary"), diagnosticsStatus: element("diagnostics-status"),
    deviceField: element("device-field"), mirrorField: element("mirror-field"),
    mirrorMode: element("mirror-mode"), mirrorHelp: element("mirror-help"),
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
  let commandSession = "";
  let commandHandshake;
  let isScene = false;
  let isBrightness = false;
  let isPreset = false;
  let isDial = false;
  let isBrightnessDial = false;
  let isSceneDial = false;
  let isMirror = false;
  let settings = normalizeSettings({});
  let devices = [];
  let scenes = [];
  let devicesLoaded = false;
  let scenesLoaded = false;
  const pending = new Map();
  let controlPhase = "starting";
  const controlEvents = ["controlStatus", "prepareQuit", "resumeControl"];

  function normalizeSettings(value) {
    const data = value && typeof value === "object" ? value : {};
    if (isMirror) return {
      mirrorMode: ["start", "stop", "toggle"].includes(data.mirrorMode) ? data.mirrorMode : "toggle",
      autoLaunch: data.autoLaunch === true,
    };
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
    if (isPreset) {
      normalized.brightnessPreset = Number.isInteger(data.brightnessPreset)
        && data.brightnessPreset >= 0 && data.brightnessPreset <= 100 ? data.brightnessPreset : 50;
      normalized.presetWhenOff = data.presetWhenOff === "apply" ? "apply" : "keep-off";
    }
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

  function requestCommandStatus(observedSession) {
    if (commandHandshake?.session === observedSession) return;
    if (commandHandshake) clearTimeout(commandHandshake.timer);
    const requestId = `${sessionId}:status:${++sequence}`;
    const timer = setTimeout(() => {
      if (commandHandshake?.requestId !== requestId) return;
      commandHandshake = undefined;
      ui.commandStatus.textContent = words.commandUnavailable;
      ui.commandStatus.dataset.kind = "info";
    }, REQUEST_TIMEOUT_MS);
    commandHandshake = { requestId, session: observedSession, timer };
    if (!send("sendToPlugin", { event: "commandStatus", requestId })) {
      clearTimeout(timer);
      commandHandshake = undefined;
    }
  }

  function receiveCommandStatus(payload) {
    if (!payload || payload.event !== "commandStatus" || payload.actionContext !== actionContext
      || typeof payload.session !== "string" || !/^[A-Za-z0-9:_-]{1,128}$/.test(payload.session)
      || !Number.isSafeInteger(payload.sequence) || payload.sequence < 0
      || !["idle", "running", "success", "error", "skipped"].includes(payload.state)) return;
    if (payload.requestId !== undefined) {
      // Only a current, correlated read can confirm a changed plugin process.
      if (payload.requestId !== commandHandshake?.requestId) return;
      clearTimeout(commandHandshake.timer);
      commandHandshake = undefined;
      if (payload.session !== commandSession) commandSequence = -1;
      commandSession = payload.session;
    } else if (!commandSession) {
      commandSession = payload.session;
      if (commandHandshake) clearTimeout(commandHandshake.timer);
      commandHandshake = undefined;
    } else if (payload.session !== commandSession) {
      requestCommandStatus(payload.session);
      return;
    }
    if (payload.sequence < commandSequence) return;
    commandSequence = payload.sequence;
    const messages = { idle: words.commandIdle, running: words.commandRunning, success: words.commandSuccess };
    const knownCode = Object.prototype.hasOwnProperty.call(words.errors, payload.errorCode);
    ui.commandStatus.textContent = payload.state === "error" || payload.state === "skipped"
      ? words.errors[knownCode ? payload.errorCode : "INTERNAL_ERROR"] : messages[payload.state];
    ui.commandStatus.dataset.kind = payload.state === "error" ? "error" : payload.state === "success" ? "success" : "info";
  }

  function connected() { return registered && socket?.readyState === WebSocket.OPEN; }

  function controls() {
    const ready = connected();
    const controlPending = controlEvents.some(event => pending.has(event));
    ui.prepareQuit.disabled = !ready || controlPending || ["starting", "pausing", "resuming"].includes(controlPhase);
    ui.resumeControl.disabled = !ready || controlPending || controlPhase !== "paused";
    ui.device.disabled = !ready || pending.has("devices");
    ui.scene.disabled = !ready || !settings.deviceId || pending.has("scenes") || pending.has("devices");
    ui.mode.disabled = !ready;
    ui.brightnessStep.disabled = !ready;
    ui.brightnessPreset.disabled = !ready;
    ui.presetWhenOff.disabled = !ready;
    ui.displayMode.disabled = !ready;
    ui.brightnessTextSize.disabled = !ready;
    ui.autoLaunch.disabled = !ready || isMirror && settings.mirrorMode === "stop";
    ui.mirrorMode.disabled = !ready;
    ui.refresh.disabled = !ready || pending.size > 0;
    ui.diagnosticsRun.disabled = !ready || pending.has("diagnostics");
    ui.diagnosticsCopy.disabled = !ui.diagnosticsSummary.value;
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
    ui.deviceField.hidden = isMirror;
    ui.mirrorField.hidden = !isMirror;
    ui.mirrorHelp.hidden = !isMirror;
    ui.mirrorMode.value = settings.mirrorMode ?? "toggle";
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
    ui.powerField.hidden = isScene || isBrightness || isSceneDial || isMirror || isPreset;
    ui.presetField.hidden = !isPreset;
    ui.presetOffField.hidden = !isPreset;
    ui.presetHelp.hidden = !isPreset;
    ui.brightnessPreset.value = String(settings.brightnessPreset ?? "");
    ui.presetWhenOff.value = settings.presetWhenOff ?? "keep-off";
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
      if (controlEvents.includes(event)) { controlPhase = "unknown"; ui.controlStatus.textContent = words.controlUnknown; }
      else if (event === "diagnostics") ui.diagnosticsStatus.textContent = words.timeout;
      else status(words.timeout, true);
      controls();
    }, controlEvents.includes(event) ? 30_000 : REQUEST_TIMEOUT_MS);
    pending.set(event, { requestId, deviceId, timer });
    const payload = { event, requestId };
    if (deviceId) payload.deviceId = deviceId;
    if (!send("sendToPlugin", payload)) cancel(event);
    else if (controlEvents.includes(event)) ui.controlStatus.textContent = event === "prepareQuit" ? words.controlWaiting
      : event === "resumeControl" ? words.controlResuming : words.controlUnknown;
    else if (event === "diagnostics") ui.diagnosticsStatus.textContent = words.diagnosticsLoading;
    else status(words.loading);
    controls();
  }

  function refresh() {
    if (isMirror) { request("mirrorStatus"); return; }
    cancel("scenes");
    request("devices");
  }

  function save() { send("setSettings", { ...settings }); }

  function receiveLists(payload) {
    if (!payload || typeof payload !== "object") return;
    const requestState = pending.get(payload.event);
    if (!requestState || payload.requestId !== requestState.requestId) return;
    cancel(payload.event);
    if (controlEvents.includes(payload.event)) {
      const state = payload.control;
      if (!state || !["starting", "active", "pausing", "paused", "resuming"].includes(state.phase)
        || typeof state.uncertain !== "boolean" || typeof state.persistenceError !== "boolean"
        || !Number.isSafeInteger(state.activeRequests) || state.activeRequests < 0
        || state.phase === "paused" && state.activeRequests !== 0) {
        controlPhase = "unknown"; ui.controlStatus.textContent = words.controlUnknown;
      } else {
        controlPhase = state.phase;
        ui.controlStatus.textContent = state.persistenceError ? words.controlSaveError
          : state.phase === "active" ? words.controlActive
          : state.phase === "pausing" ? words.controlWaiting
          : state.phase === "resuming" ? words.controlResuming
          : state.phase === "paused" ? state.uncertain ? words.controlUncertain : words.controlPaused : words.controlUnknown;
      }
      controls(); return;
    }
    if (payload.event === "diagnostics") { receiveDiagnostics(payload.diagnostics); return; }
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
    if (isMirror && payload.event === "mirrorStatus") {
      const mirror = payload.mirror;
      if (typeof mirror?.isRunning === "boolean" && ["4D", "Tranquility", "Flow", "Chameleon"].includes(mirror.mode)) {
        status(`${mirror.isRunning ? words.mirrorRunning : words.mirrorStopped} · ${mirror.mode}`);
      } else status(words.invalid, true);
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

  function receiveDiagnostics(value) {
    const version = text => typeof text === "string" && /^\d{1,5}(?:\.\d{1,5}){0,3}(?:-beta\.\d{1,5})?$/.test(text)
      ? text : words.diagnosticsNotChecked;
    if (!value || !["ready", "unavailable"].includes(value.connection)
      || !["macOS", "Windows", "Other"].includes(value.platform)) {
      ui.diagnosticsStatus.textContent = words.diagnosticsInvalid;
      controls();
      return;
    }
    const availability = value => value === true ? words.diagnosticsAvailable
      : value === false ? words.diagnosticsMissing : words.diagnosticsNotChecked;
    const rows = [
      `Plugin: ${version(value.pluginVersion)}`,
      `${words.diagnosticsPlatform}: ${value.platform}`,
      `${words.diagnosticsServer}: ${version(value.serverVersion)}`,
      `${words.diagnosticsConnection}: ${value.connection === "ready" ? words.diagnosticsConnected : words.diagnosticsUnavailable}`,
      `${words.diagnosticsProtocol}: ${["2025-03-26", "2025-06-18", "2025-11-25"].includes(value.protocolVersion) ? value.protocolVersion : words.diagnosticsNotChecked}`,
      `${words.diagnosticsLightTools}: ${availability(value.lightTools)}`,
      `${words.diagnosticsMirrorTools}: ${availability(value.mirrorTools)}`,
      `${words.diagnosticsDevices}: ${Number.isSafeInteger(value.supportedDevices) && value.supportedDevices >= 0 && value.supportedDevices <= 10000 ? value.supportedDevices : words.diagnosticsNotChecked}`,
    ];
    if (value.connection === "unavailable") {
      const code = Object.prototype.hasOwnProperty.call(words.errors, value.errorCode) ? value.errorCode : "INTERNAL_ERROR";
      rows.push(`${code}: ${code === "APP_TIMEOUT" ? words.diagnosticsTimeout : words.errors[code]}`);
    }
    ui.diagnosticsSummary.value = rows.join("\n");
    ui.diagnosticsSummary.hidden = false;
    ui.diagnosticsStatus.textContent = words.diagnosticsReady;
    controls();
  }

  for (const [button, event] of [[ui.prepareQuit, "prepareQuit"], [ui.resumeControl, "resumeControl"]]) {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      for (const previous of controlEvents) cancel(previous);
      request(event);
    });
  }
  ui.diagnosticsRun.addEventListener("click", () => {
    if (ui.diagnosticsRun.disabled) return;
    ui.diagnosticsSummary.value = "";
    ui.diagnosticsSummary.hidden = true;
    request("diagnostics");
  });
  ui.diagnosticsCopy.addEventListener("click", async () => {
    const summary = ui.diagnosticsSummary.value;
    if (!summary) return;
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await globalThis.navigator.clipboard.writeText(summary);
      if (ui.diagnosticsSummary.value === summary) ui.diagnosticsStatus.textContent = words.diagnosticsCopied;
    } catch {
      if (ui.diagnosticsSummary.value !== summary) return;
      ui.diagnosticsSummary.focus?.();
      ui.diagnosticsSummary.select?.();
      ui.diagnosticsStatus.textContent = words.diagnosticsCopyManual;
    }
  });

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
  ui.mode.addEventListener("change", () => { if (!isScene && !isBrightness && !isSceneDial && !isMirror && !isPreset) { settings.powerMode = ui.mode.value; save(); } });
  ui.brightnessPreset.addEventListener("change", () => {
    if (!isPreset) return;
    const value = ui.brightnessPreset.value;
    const next = Number(value);
    if (!/^\d{1,3}$/.test(value) || !Number.isInteger(next) || next < 0 || next > 100) {
      ui.brightnessPreset.value = String(settings.brightnessPreset);
      status(words.presetInvalid, true);
      return;
    }
    settings.brightnessPreset = next;
    save();
    status(words.ready);
  });
  ui.presetWhenOff.addEventListener("change", () => {
    if (!isPreset || !["keep-off", "apply"].includes(ui.presetWhenOff.value)) return;
    settings.presetWhenOff = ui.presetWhenOff.value;
    save();
  });
  ui.mirrorMode.addEventListener("change", () => {
    if (!isMirror || !["start", "stop", "toggle"].includes(ui.mirrorMode.value)) return;
    settings.mirrorMode = ui.mirrorMode.value;
    save();
    render();
  });
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
      isMirror = typeof actionData?.action === "string" && actionData.action.endsWith(".screen-mirror");
      words = { ...translations[language], ...(isDial ? dialTranslations[language] : {}),
        ...(isSceneDial ? sceneDialTranslations[language] : {}), ...(isMirror ? mirrorTranslations[language] : {}) };
      document.documentElement.lang = language;
      for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = words[node.dataset.i18n];
      if (!/^\d{1,5}$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535 || typeof inspectorId !== "string" || !inspectorId || typeof actionData?.action !== "string") throw new Error("Invalid registration");
      uuid = inspectorId;
      action = actionData.action;
      actionContext = actionData.context;
      sessionId = `${uuid}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
      sequence = 0;
      ui.diagnosticsSummary.value = "";
      ui.diagnosticsSummary.hidden = true;
      ui.diagnosticsStatus.textContent = "";
      commandSequence = -1;
      commandSession = "";
      if (commandHandshake) clearTimeout(commandHandshake.timer);
      commandHandshake = undefined;
      ui.commandStatus.textContent = words.commandIdle;
      ui.commandStatus.dataset.kind = "info";
      isScene = action.endsWith(".scene");
      isPreset = action.endsWith(".brightness-preset");
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
          requestCommandStatus("");
          request("controlStatus");
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
      socket.onclose = socket.onerror = () => {
        registered = false;
        if (commandHandshake) clearTimeout(commandHandshake.timer);
        commandHandshake = undefined;
        cancelAll(); status(words.disconnected, true); controls();
      };
      render();
    } catch {
      status(words.setupError, true);
      controls();
    }
  };
})();
