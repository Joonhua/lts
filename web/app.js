let SERVER_HTTP = localStorage.getItem("server_http") || getDefaultServerHttp()
let SERVER_WS = localStorage.getItem("server_ws") || getDefaultServerWs()
const RECENT_PM_TARGETS_KEY = "recent_pm_targets"
const MAX_RECENT_PM_TARGETS = 5
const PM_DRAFT_HISTORY_KEY = "pm_draft_history"
const MAX_PM_DRAFT_HISTORY = 8
const PM_INTERACTION_TS_KEY = "pm_interaction_times"
const PM_SUGGESTION_LIMIT = 6
const MAX_FILE_SHARE_BYTES = 1_500_000
const PTT_ENABLED_KEY = "ptt_enabled"
const PTT_KEY_CODE_KEY = "ptt_key_code"
const AUDIO_INPUT_DEVICE_KEY = "audio_input_device_id"
const AUDIO_OUTPUT_DEVICE_KEY = "audio_output_device_id"
const AUDIO_ACTIVE_PRESET_KEY = "audio_active_preset"
const AUDIO_CUSTOM_PRESET_KEY = "audio_custom_preset"
const AUDIO_ADVANCED_VISIBLE_KEY = "audio_advanced_visible"
const MIC_GAIN_KEY = "mic_gain"
const REMOTE_OUTPUT_GAIN_KEY = "remote_output_gain"
const REMOTE_SPEAKER_MUTED_KEY = "remote_speaker_muted"
const MIC_ENHANCE_ENABLED_KEY = "mic_enhance_enabled"
const NOISE_SUPPRESSION_ENABLED_KEY = "noise_suppression_enabled"
const ECHO_CANCELLATION_ENABLED_KEY = "echo_cancellation_enabled"
const ACCOMPANIMENT_ENABLED_KEY = "accompaniment_enabled"
const ACCOMPANIMENT_GAIN_KEY = "accompaniment_gain"
const ACCOMPANIMENT_LIMITER_ENABLED_KEY = "accompaniment_limiter_enabled"
const OUTPUT_TEST_GAIN_KEY = "output_test_gain"
const RTC_ICE_SERVERS_KEY = "rtc_ice_servers"
const OUTPUT_TEST_AUTO_STOP_MS = 8000
const OUTPUT_TEST_RECORD_MS = 1800
const AUDIO_SETTINGS_RECOVERY_KEY = "audio_settings_recovered_v1"
const DEFAULT_MIC_GAIN = 0.5
const DEFAULT_REMOTE_OUTPUT_GAIN = 0.5
const DEFAULT_ACCOMPANIMENT_GAIN = 0.78
const DEFAULT_OUTPUT_TEST_GAIN = 0.03
const DEFAULT_PTT_KEY_CODE = "F2"
const GLOBAL_MUTE_SHORTCUT_KEY = "global_mute_shortcut"
const GLOBAL_BUSY_SHORTCUT_KEY = "global_busy_shortcut"
const GLOBAL_RECONNECT_SHORTCUT_KEY = "global_reconnect_shortcut"
const SOCKET_RECONNECT_BASE_DELAY = 1200
const SOCKET_RECONNECT_MAX_DELAY = 12000
const SOCKET_HEARTBEAT_TIMEOUT = 45000
const LOGIN_REQUIRED_TOAST_COOLDOWN = 1500
const ZH_COLLATOR = new Intl.Collator("zh-CN")
const TOAST_DURATION_MS = 3200
const PRIVATE_SESSION_IDLE_TIMEOUT_MS = 8 * 60 * 1000
const PRIVATE_SESSION_RECOVERY_WINDOW_MS = 3 * 60 * 1000
const LIVE_STAGE_HEIGHT_KEY = "live_stage_height"
const LIVE_ROOM_LAYOUTS_KEY = "live_room_layouts"
const LAYOUT_SIDEBAR_WIDTH_KEY = "layout_sidebar_width"
const LAYOUT_RIGHTBAR_WIDTH_KEY = "layout_rightbar_width"
const LAYOUT_RIGHTBAR_TOP_RATIO_KEY = "layout_rightbar_top_ratio"
const LIVE_STAGE_HEIGHT_MIN = 300
const LIVE_STAGE_HEIGHT_MAX = 900
const LIVE_STAGE_HEIGHT_DEFAULT = 420
const LIVE_QUALITY_PROFILES = {
  low: { width: 320, height: 180, frameRate: 10, bitrate: 150000 },
  medium: { width: 640, height: 360, frameRate: 15, bitrate: 400000 },
  high: { width: 1280, height: 720, frameRate: 20, bitrate: 1000000 },
  fhd: { width: 1920, height: 1080, frameRate: 24, bitrate: 2500000 }
}
let toastLayerEl = null

function getDefaultRtcIceServers() {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ]
}

function normalizeRtcIceServers(value) {
  if (!Array.isArray(value)) return []
  const normalized = []
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index]
    if (!item || typeof item !== "object") continue
    const rawUrls = Array.isArray(item.urls) ? item.urls : [item.urls]
    const urls = rawUrls.map((entry) => String(entry || "").trim()).filter(Boolean)
    if (!urls.length) continue
    const nextItem = { urls: urls.length === 1 ? urls[0] : urls }
    const username = String(item.username || "").trim()
    const credential = String(item.credential || "").trim()
    if (username) nextItem.username = username
    if (credential) nextItem.credential = credential
    normalized.push(nextItem)
  }
  return normalized
}

function getStoredRtcIceServers() {
  try {
    const raw = JSON.parse(localStorage.getItem(RTC_ICE_SERVERS_KEY) || "[]")
    const normalized = normalizeRtcIceServers(raw)
    return normalized.length ? normalized : getDefaultRtcIceServers()
  } catch {
    return getDefaultRtcIceServers()
  }
}

function setRtcIceServers(value) {
  const normalized = normalizeRtcIceServers(value)
  state.rtcIceServers = normalized.length ? normalized : getDefaultRtcIceServers()
  localStorage.setItem(RTC_ICE_SERVERS_KEY, JSON.stringify(state.rtcIceServers))
}

function getDefaultServerHttp() {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:"
  const host = window.location.hostname || "localhost"
  return `${protocol}//${host}:3000`
}

function getDefaultServerWs() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = window.location.hostname || "localhost"
  return `${protocol}//${host}:3000`
}

function isValidHttpUrl(value) {
  return /^https?:\/\/.+/i.test(String(value || "").trim())
}

function isValidWsUrl(value) {
  return /^wss?:\/\/.+/i.test(String(value || "").trim())
}

function deriveWsUrlFromHttp(httpUrl) {
  if (!isValidHttpUrl(httpUrl)) return ""
  return String(httpUrl).trim().replace(/^http:/i, "ws:").replace(/^https:/i, "wss:")
}

function deriveHttpUrlFromWs(wsUrl) {
  if (!isValidWsUrl(wsUrl)) return ""
  return String(wsUrl).trim().replace(/^ws:/i, "http:").replace(/^wss:/i, "https:")
}

function resolveServerEndpoints(httpUrl, wsUrl) {
  const rawHttp = String(httpUrl || "").trim()
  const rawWs = String(wsUrl || "").trim()
  const resolvedHttp = isValidHttpUrl(rawHttp) ? rawHttp : deriveHttpUrlFromWs(rawWs)
  const resolvedWs = isValidWsUrl(rawWs) ? rawWs : deriveWsUrlFromHttp(rawHttp)
  if (!isValidHttpUrl(resolvedHttp) || !isValidWsUrl(resolvedWs)) {
    return { http: "", ws: "" }
  }
  return { http: resolvedHttp, ws: resolvedWs }
}

function resolveServerAlias(serverValue) {
  const raw = String(serverValue || "").trim()
  if (!raw) return { http: "", ws: "" }
  if (isValidHttpUrl(raw)) return resolveServerEndpoints(raw, "")
  if (isValidWsUrl(raw)) return resolveServerEndpoints("", raw)
  const sanitizedHost = raw
    .replace(/^\/\//, "")
    .replace(/^https?:\/\//i, "")
    .replace(/^wss?:\/\//i, "")
    .split("/")[0]
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(sanitizedHost)) {
    return { http: "", ws: "" }
  }
  const httpProtocol = window.location.protocol === "https:" ? "https:" : "http:"
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return {
    http: `${httpProtocol}//${sanitizedHost}`,
    ws: `${wsProtocol}//${sanitizedHost}`
  }
}

function applyServerEndpoints(httpUrl, wsUrl) {
  const endpoints = resolveServerEndpoints(httpUrl, wsUrl)
  if (!endpoints.http || !endpoints.ws) return false
  SERVER_HTTP = endpoints.http
  SERVER_WS = endpoints.ws
  localStorage.setItem("server_http", endpoints.http)
  localStorage.setItem("server_ws", endpoints.ws)
  return true
}

async function bootstrapServerEndpoints() {
  const query = new URLSearchParams(window.location.search)
  const queryServer = String(query.get("server") || "").trim()
  const queryHttp = String(query.get("server_http") || "").trim()
  const queryWs = String(query.get("server_ws") || "").trim()
  const hasQueryOverride = Boolean(queryServer) || isValidHttpUrl(queryHttp) || isValidWsUrl(queryWs)
  if (hasQueryOverride) {
    const alias = resolveServerAlias(queryServer)
    const appliedFromQuery = applyServerEndpoints(queryHttp || alias.http, queryWs || alias.ws)
    if (appliedFromQuery) return
  }
  const storedHttp = String(localStorage.getItem("server_http") || "").trim()
  const storedWs = String(localStorage.getItem("server_ws") || "").trim()
  const appliedFromStorage = applyServerEndpoints(storedHttp, storedWs)
  if (appliedFromStorage) return
  if (storedHttp || storedWs) {
    localStorage.removeItem("server_http")
    localStorage.removeItem("server_ws")
  }
  try {
    const response = await fetch(`${window.location.origin}/api/spec`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    })
    if (!response.ok) return
    const data = await response.json().catch(() => ({}))
    const discoveredHttp = String(data?.baseUrl || "").trim()
    const discoveredWs = String(data?.wsUrl || "").trim()
    applyServerEndpoints(discoveredHttp, discoveredWs)
    const discoveredIceServers = data?.rtc?.iceServers || data?.iceServers
    if (Array.isArray(discoveredIceServers) && discoveredIceServers.length) {
      setRtcIceServers(discoveredIceServers)
    }
  } catch {}
}

const WS_EVENTS = {
  AUTH: "auth",
  AUTH_OK: "auth_ok",
  AUTH_ERROR: "auth_error",
  ROOM_LIST: "room_list",
  ROOM_CREATE: "room_create",
  ROOM_JOIN: "room_join",
  ROOM_JOINED: "room_joined",
  ROOM_LEAVE: "room_leave",
  ROOM_USER_JOINED: "room_user_joined",
  ROOM_USER_LEFT: "room_user_left",
  CHAT_TEXT: "chat_text",
  PRIVATE_SESSION_INVITE: "private_session_invite",
  CHAT_FILE_META: "chat_file_meta",
  CHAT_FILE_DATA: "chat_file_data",
  WEBRTC_OFFER: "webrtc_offer",
  WEBRTC_ANSWER: "webrtc_answer",
  WEBRTC_ICE: "webrtc_ice",
  LIVE_STATE: "live_state",
  PRESENCE_UPDATE: "presence_update",
  HEARTBEAT: "heartbeat",
  ERROR: "error"
}

const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  roomId: "",
  preferredRoomId: localStorage.getItem("room_id") || "",
  joiningRoomId: "",
  ws: null,
  roomList: [],
  onlineUsers: [],
  localStream: null,
  outboundStream: null,
  outputDestinationNode: null,
  inputSourceNode: null,
  micOutputNode: null,
  enhancerNodeHighpass: null,
  enhancerNodePresence: null,
  enhancerCompressorNode: null,
  accompanimentStream: null,
  accompanimentSourceNode: null,
  accompanimentGainNode: null,
  accompanimentLimiterNode: null,
  accompanimentAnalyserNode: null,
  accompanimentTrackEndHandler: null,
  accompanimentActive: false,
  accompanimentTemporarilyMuted: false,
  accompanimentLimiterEnabled: getStoredBoolean(ACCOMPANIMENT_LIMITER_ENABLED_KEY, true),
  accompanimentLevelRafId: 0,
  accompanimentClipUntil: 0,
  outputTestActive: false,
  outputTestGain: getStoredNumber(OUTPUT_TEST_GAIN_KEY, DEFAULT_OUTPUT_TEST_GAIN, 0, 0.12),
  outputTestAudioElement: null,
  outputTestAudioUrl: "",
  outputTestRecorder: null,
  outputTestInputStream: null,
  outputTestProcessorNode: null,
  outputTestMonitorGainNode: null,
  outputTestDestinationNode: null,
  outputTestGainNode: null,
  outputTestOscillatorNode: null,
  outputTestAutoStopTimer: null,
  outputTestCountdownTimer: null,
  outputTestEndsAt: 0,
  remoteOutputGain: getStoredNumber(REMOTE_OUTPUT_GAIN_KEY, DEFAULT_REMOTE_OUTPUT_GAIN, 0, 1),
  remoteSpeakerMuted: getStoredBoolean(REMOTE_SPEAKER_MUTED_KEY, false),
  liveStream: null,
  liveTrack: null,
  liveSourceLabel: "",
  liveSourceId: "",
  liveActiveUserId: "",
  liveActiveUsername: "",
  liveSourceNameByUserId: new Map(),
  liveStageHeight: getStoredNumber(LIVE_STAGE_HEIGHT_KEY, LIVE_STAGE_HEIGHT_DEFAULT, LIVE_STAGE_HEIGHT_MIN, LIVE_STAGE_HEIGHT_MAX),
  liveTheaterMode: false,
  liveRoomLayouts: getStoredObject(LIVE_ROOM_LAYOUTS_KEY),
  liveLayoutByUserId: new Map(),
  livePreferredMainUserId: "",
  liveManualLayoutUsers: new Set(),
  liveDragUserId: "",
  liveDragOffsetX: 0,
  liveDragOffsetY: 0,
  liveStageResizeActive: false,
  liveStageResizeStartY: 0,
  liveStageResizeStartHeight: LIVE_STAGE_HEIGHT_DEFAULT,
  liveAutoTheaterApplied: false,
  liveSceneWatcherTimer: null,
  realtimeRecoveryTimer: null,
  layoutSidebarWidth: getStoredNumber(LAYOUT_SIDEBAR_WIDTH_KEY, 300, 240, 520),
  layoutRightbarWidth: getStoredNumber(LAYOUT_RIGHTBAR_WIDTH_KEY, 360, 300, 760),
  layoutRightbarTopRatio: getStoredNumber(LAYOUT_RIGHTBAR_TOP_RATIO_KEY, 0.62, 0.35, 0.8),
  layoutResizeMode: "",
  remoteLiveStreams: new Map(),
  pendingIceCandidates: new Map(),
  rtcIceServers: getStoredRtcIceServers(),
  forceRelay: getStoredBoolean("rtc_force_relay", false),
  activeAudioPresetKey: String(localStorage.getItem(AUDIO_ACTIVE_PRESET_KEY) || "manual"),
  applyingAudioPreset: false,
  audioAdvancedVisible: localStorage.getItem(AUDIO_ADVANCED_VISIBLE_KEY) === "1",
  remoteMutedByAccompaniment: false,
  audioPlaybackUnlockRegistered: false,
  audioPlaybackUnlocked: false,
  audioPlaybackHintAt: 0,
  remotePlaybackMutedHintAt: 0,
  audioContext: null,
  audioStreamUnlocked: false,
  gainNode: null,
  isMuted: false,
  peers: new Map(),
  remoteAudios: new Map(),
  voiceActivityMonitors: new Map(),
  voiceSpeakingUsers: new Set(),
  voiceSpeakingLevels: new Map(),
  voiceMediaFlowUntilByUserId: new Map(),
  voiceStatsPrevInboundBytesByUserId: new Map(),
  voiceStatsPrevOutboundBytesByPeerUserId: new Map(),
  voiceStatsTimer: null,
  micPeakPercent: 0,
  micPeakHoldUntil: 0,
  micPeakLastUpdateAt: 0,
  micClipUntil: 0,
  micAdvisorWindowStartedAt: 0,
  micAdvisorLevelTotal: 0,
  micAdvisorSampleCount: 0,
  micAdvisorType: "",
  micAdvisorUntil: 0,
  micAdvisorToastType: "",
  micAdvisorToastUntil: 0,
  micMutedHintAt: 0,
  micAccessFallbackHintAt: 0,
  micGain: getStoredNumber(MIC_GAIN_KEY, DEFAULT_MIC_GAIN, 0, 2),
  micEnhanceEnabled: getStoredBoolean(MIC_ENHANCE_ENABLED_KEY, true),
  noiseSuppressionEnabled: getStoredBoolean(NOISE_SUPPRESSION_ENABLED_KEY, true),
  echoCancellationEnabled: getStoredBoolean(ECHO_CANCELLATION_ENABLED_KEY, true),
  accompanimentEnabled: getStoredBoolean(ACCOMPANIMENT_ENABLED_KEY, false),
  accompanimentGain: getStoredNumber(ACCOMPANIMENT_GAIN_KEY, 0.78, 0, 1.5),
  pttEnabled: getStoredBoolean(PTT_ENABLED_KEY, false),
  pttKeyCode: getStoredPttKeyCode(),
  pttKeyCaptureActive: false,
  pttPressed: false,
  voicePeerStatuses: new Map(),
  voicePeerRetryTimers: new Map(),
  socketSeq: 0,
  reconnectAttempt: 0,
  reconnectAt: 0,
  reconnectTimer: null,
  reconnectCountdownTimer: null,
  socketHeartbeatTimer: null,
  lastServerHeartbeatAt: 0,
  onlineUsersSignature: "",
  pmOnlineCandidates: [],
  pmOnlineCandidateLowerNames: [],
  pmOnlineByUsername: new Map(),
  recentPmTargets: getStoredArray(RECENT_PM_TARGETS_KEY),
  pmDraftHistory: getStoredPmDraftHistory(),
  pmInteractionTimes: getStoredObject(PM_INTERACTION_TS_KEY),
  pmSuggestionCandidates: [],
  pmSuggestionIndex: -1,
  pmPendingConfirm: null,
  pmPreviewNoticeShown: false,
  pmGuidanceTimer: null,
  pmGuidanceLastRaw: "",
  pmHelpSignature: "hidden",
  pmHintPriority: 0,
  pmHintLockUntil: 0,
  pmSuggestionKeyword: "",
  pmSuggestionButtons: [],
  pmSuggestionLastActiveIndex: -1,
  pmSuggestionUsernames: [],
  pmSuggestionStatuses: [],
  pmSuggestionRoomIds: [],
  pmIsComposing: false,
  pmLastInputRaw: "",
  pmInCommandMode: false,
  pmSuggestionDataVersion: 0,
  pmSuggestionCacheKey: "",
  pmSuggestionCacheCandidates: [],
  pmRecentTargetsVersion: 0,
  pmRecentLowerCacheVersion: -1,
  pmRecentLowerCacheList: [],
  pmRecentRankCacheVersion: -1,
  pmRecentRankCacheMap: new Map(),
  isDesktopBridge: false,
  desktopConfig: null,
  globalMuteShortcut: getStoredShortcut(GLOBAL_MUTE_SHORTCUT_KEY, "CommandOrControl+Shift+M"),
  globalBusyShortcut: getStoredShortcut(GLOBAL_BUSY_SHORTCUT_KEY, "CommandOrControl+Shift+B"),
  globalReconnectShortcut: getStoredShortcut(GLOBAL_RECONNECT_SHORTCUT_KEY, "CommandOrControl+Shift+R"),
  pendingPresenceStatus: null,
  lastLoginRequiredToastAt: 0,
  isSettingsOpen: false,
  privateSessionUserId: "",
  privateSessionUsername: "",
  privateSessionExpireAt: 0,
  privateSessionRecovery: null,
  privateSessionTimer: null,
  actionDialogResolver: null,
  actionDialogCurrentMode: "",
  lastFailedUpload: null
}

const els = {
  app: byId("app"),
  sidebarResizeHandle: byId("sidebarResizeHandle"),
  rightbarResizeHandle: byId("rightbarResizeHandle"),
  rightbarSplitHandle: byId("rightbarSplitHandle"),
  rightbar: document.querySelector(".rightbar"),
  flowAuth: byId("flowAuth"),
  flowLobby: byId("flowLobby"),
  flowRoom: byId("flowRoom"),
  authPanel: byId("authPanel"),
  roomPanel: byId("roomPanel"),
  settingsPanel: byId("settingsPanel"),
  username: byId("username"),
  password: byId("password"),
  registerBtn: byId("registerBtn"),
  loginBtn: byId("loginBtn"),
  guestBtn: byId("guestBtn"),
  roomList: byId("roomList"),
  newRoomName: byId("newRoomName"),
  createRoomBtn: byId("createRoomBtn"),
  selfUser: byId("selfUser"),
  connectionState: byId("connectionState"),
  rtcStatusBadge: byId("rtcStatusBadge"),
  serverAliasInput: byId("serverAliasInput"),
  applyServerAliasBtn: byId("applyServerAliasBtn"),
  audioSettingsBtn: byId("audioSettingsBtn"),
  switchAuthBtn: byId("switchAuthBtn"),
  liveSourceSelect: byId("liveSourceSelect"),
  liveQualitySelect: byId("liveQualitySelect"),
  forceRelayWrap: byId("forceRelayWrap"),
  forceRelayCheck: byId("forceRelayCheck"),
  liveToggleBtn: byId("liveToggleBtn"),
  livePanel: byId("livePanel"),
  liveStatusText: byId("liveStatusText"),
  toggleLiveTheaterBtn: byId("toggleLiveTheaterBtn"),
  tileLiveCardsBtn: byId("tileLiveCardsBtn"),
  liveStageResizeHandle: byId("liveStageResizeHandle"),
  liveGrid: byId("liveGrid"),
  privateSessionBadge: byId("privateSessionBadge"),
  accompanimentBadge: byId("accompanimentBadge"),
  toggleAccompanimentMuteBtn: byId("toggleAccompanimentMuteBtn"),
  clearPrivateSessionBtn: byId("clearPrivateSessionBtn"),
  activeRoomName: byId("activeRoomName"),
  roomModeBadge: byId("roomModeBadge"),
  roomReadonlyBadge: byId("roomReadonlyBadge"),
  roomSpeakBadge: byId("roomSpeakBadge"),
  lobbyGuide: byId("lobbyGuide"),
  inRoomPanel: byId("inRoomPanel"),
  recentPmTargets: byId("recentPmTargets"),
  pmDraftHistory: byId("pmDraftHistory"),
  pmSuggestions: byId("pmSuggestions"),
  pmHint: byId("pmHint"),
  pmHelpPanel: byId("pmHelpPanel"),
  chatMessages: byId("chatMessages"),
  chatInput: byId("chatInput"),
  retryUploadBtn: byId("retryUploadBtn"),
  sendBtn: byId("sendBtn"),
  voiceRoomSummary: byId("voiceRoomSummary"),
  voiceRoomUsers: byId("voiceRoomUsers"),
  onlineUsersPanel: byId("onlineUsersPanel"),
  onlineUsers: byId("onlineUsers"),
  onlineUserSearch: byId("onlineUserSearch"),
  onlineStatusFilter: byId("onlineStatusFilter"),
  inRoomFirst: byId("inRoomFirst"),
  onlyCurrentRoom: byId("onlyCurrentRoom"),
  fileInput: byId("fileInput"),
  audioInput: byId("audioInput"),
  audioOutput: byId("audioOutput"),
  remoteOutputGain: byId("remoteOutputGain"),
  remoteOutputGainPercent: byId("remoteOutputGainPercent"),
  refreshAudioDevicesBtn: byId("refreshAudioDevicesBtn"),
  testAudioOutputBtn: byId("testAudioOutputBtn"),
  unlockAudioBtn: byId("unlockAudioBtn"),
  audioOutputTestState: byId("audioOutputTestState"),
  outputTestGain: byId("outputTestGain"),
  outputTestGainPercent: byId("outputTestGainPercent"),
  micGain: byId("micGain"),
  micGainPercent: byId("micGainPercent"),
  audioAdvancedToggleBtn: byId("audioAdvancedToggleBtn"),
  audioAdvancedWrap: byId("audioAdvancedWrap"),
  audioPresetVoiceBtn: byId("audioPresetVoiceBtn"),
  audioPresetMusicBtn: byId("audioPresetMusicBtn"),
  audioPresetTalkBtn: byId("audioPresetTalkBtn"),
  audioPresetCustomSaveBtn: byId("audioPresetCustomSaveBtn"),
  audioPresetCustomApplyBtn: byId("audioPresetCustomApplyBtn"),
  audioPresetStatus: byId("audioPresetStatus"),
  micEnhanceEnabled: byId("micEnhanceEnabled"),
  noiseSuppressionEnabled: byId("noiseSuppressionEnabled"),
  echoCancellationEnabled: byId("echoCancellationEnabled"),
  accompanimentEnabled: byId("accompanimentEnabled"),
  accompanimentGain: byId("accompanimentGain"),
  accompanimentGainPercent: byId("accompanimentGainPercent"),
  accompanimentLimiterEnabled: byId("accompanimentLimiterEnabled"),
  accompanimentLevelWrap: byId("accompanimentLevelWrap"),
  accompanimentLevelFill: byId("accompanimentLevelFill"),
  accompanimentLevelText: byId("accompanimentLevelText"),
  accompanimentClipText: byId("accompanimentClipText"),
  pttEnabled: byId("pttEnabled"),
  pttKey: byId("pttKey"),
  capturePttKeyBtn: byId("capturePttKeyBtn"),
  pttKeyHint: byId("pttKeyHint"),
  micLevelWrap: byId("micLevelWrap"),
  micLevelFill: byId("micLevelFill"),
  micLevelPeak: byId("micLevelPeak"),
  micLevelText: byId("micLevelText"),
  micClipText: byId("micClipText"),
  muteBtn: byId("muteBtn"),
  speakerBtn: byId("speakerBtn"),
  busyBtn: byId("busyBtn"),
  resetAudioSettingsBtn: byId("resetAudioSettingsBtn"),
  exportAudioSettingsBtn: byId("exportAudioSettingsBtn"),
  importAudioSettingsBtn: byId("importAudioSettingsBtn"),
  reconnectBtn: byId("reconnectBtn"),
  closeSettingsBtn: byId("closeSettingsBtn"),
  desktopShortcutPanel: byId("desktopShortcutPanel"),
  globalMuteShortcut: byId("globalMuteShortcut"),
  globalBusyShortcut: byId("globalBusyShortcut"),
  globalReconnectShortcut: byId("globalReconnectShortcut"),
  launchAtStartup: byId("launchAtStartup"),
  minimizeToTray: byId("minimizeToTray"),
  saveDesktopShortcutBtn: byId("saveDesktopShortcutBtn"),
  desktopShortcutState: byId("desktopShortcutState"),
  actionDialog: byId("actionDialog"),
  actionDialogBackdrop: byId("actionDialog")?.querySelector(".action-dialog-backdrop"),
  actionDialogTitle: byId("actionDialogTitle"),
  actionDialogMessage: byId("actionDialogMessage"),
  actionDialogInputWrap: byId("actionDialogInputWrap"),
  actionDialogInputLabel: byId("actionDialogInputLabel"),
  actionDialogInput: byId("actionDialogInput"),
  actionDialogCheckboxWrap: byId("actionDialogCheckboxWrap"),
  actionDialogCheckbox: byId("actionDialogCheckbox"),
  actionDialogCheckboxLabel: byId("actionDialogCheckboxLabel"),
  actionDialogCancelBtn: byId("actionDialogCancelBtn"),
  actionDialogConfirmBtn: byId("actionDialogConfirmBtn"),
  remoteAudioRack: byId("remoteAudioRack")
}

init()

async function init() {
  await bootstrapServerEndpoints()
  recoverAudioSettingsIfNeeded()
  if (els.serverAliasInput) {
    try {
      els.serverAliasInput.value = String(SERVER_HTTP || "")
    } catch {}
  }
  bindEvents()
  registerAudioPlaybackUnlock()
  applyLayoutSizing()
  applyLiveStageHeight()
  startLiveSceneWatcher()
  startRealtimeRecoveryMonitor()
  bindDesktopBridge()
  syncDesktopShortcutControls()
  await syncLiveSourceOptions()
  syncPttControls()
  syncAudioEnhancementControls()
  renderLocalMicLevel(0, true)
  renderRecentPmTargets()
  renderPmDraftHistory()
  startPrivateSessionMonitor()
  try {
    await loadDeviceList()
  } catch {
    toast("初始化音频设备失败，请检查麦克风权限")
  }
  syncUiFlow()
  renderVoiceRoomUsers()
  if (state.user && state.token) {
    showAuthState()
    await fetchRooms()
    connectSocket({ resetBackoff: true })
    return
  }
  syncSessionActionControls()
}

function recoverAudioSettingsIfNeeded() {
  const recovered = localStorage.getItem(AUDIO_SETTINGS_RECOVERY_KEY) === "1"
  if (recovered) return
  const storedMicGain = localStorage.getItem(MIC_GAIN_KEY)
  const storedRemoteOutputGain = localStorage.getItem(REMOTE_OUTPUT_GAIN_KEY)
  const storedOutputTestGain = localStorage.getItem(OUTPUT_TEST_GAIN_KEY)
  const micIsZero = storedMicGain !== null && Number(storedMicGain) === 0
  const remoteIsZero = storedRemoteOutputGain !== null && Number(storedRemoteOutputGain) === 0
  if (micIsZero && remoteIsZero) {
    state.micGain = DEFAULT_MIC_GAIN
    state.remoteOutputGain = DEFAULT_REMOTE_OUTPUT_GAIN
    localStorage.setItem(MIC_GAIN_KEY, String(DEFAULT_MIC_GAIN))
    localStorage.setItem(REMOTE_OUTPUT_GAIN_KEY, String(DEFAULT_REMOTE_OUTPUT_GAIN))
    if (storedOutputTestGain !== null && Number(storedOutputTestGain) === 0) {
      state.outputTestGain = DEFAULT_OUTPUT_TEST_GAIN
      localStorage.setItem(OUTPUT_TEST_GAIN_KEY, String(DEFAULT_OUTPUT_TEST_GAIN))
    }
  }
  localStorage.setItem(AUDIO_SETTINGS_RECOVERY_KEY, "1")
}

function bindEvents() {
  els.registerBtn.onclick = () => handleAuth("register")
  els.loginBtn.onclick = () => handleAuth("login")
  els.guestBtn.onclick = () => handleAuth("guest")
  els.audioSettingsBtn.onclick = () => {
    setSettingsPanelOpen(!state.isSettingsOpen)
  }
  els.closeSettingsBtn.onclick = () => {
    setSettingsPanelOpen(false)
  }
  els.switchAuthBtn.onclick = () => {
    showLoggedOutState("已退出当前会话，请重新登录")
  }
  if (els.applyServerAliasBtn) {
    els.applyServerAliasBtn.onclick = () => {
      const value = String(els.serverAliasInput?.value || "").trim()
      const alias = resolveServerAlias(value)
      const ok = applyServerEndpoints(alias.http, alias.ws)
      if (!ok) {
        toast("服务器地址无效，请输入主机:端口或完整URL")
        return
      }
      if (hasAuthenticatedSession()) {
        connectSocket({ resetBackoff: true })
      } else {
        toast("服务器已设置，登录后将自动连接")
      }
    }
  }
  els.clearPrivateSessionBtn.onclick = () => {
    clearPrivateSessionTarget(true, false)
  }
  if (els.toggleAccompanimentMuteBtn) {
    els.toggleAccompanimentMuteBtn.onclick = () => {
      setAccompanimentTemporarilyMuted(!state.accompanimentTemporarilyMuted, true)
    }
  }
  if (els.actionDialogBackdrop) {
    els.actionDialogBackdrop.onclick = () => {
      closeActionDialog({ confirmed: false })
    }
  }
  if (els.actionDialogCancelBtn) {
    els.actionDialogCancelBtn.onclick = () => {
      closeActionDialog({ confirmed: false })
    }
  }
  if (els.actionDialogConfirmBtn) {
    els.actionDialogConfirmBtn.onclick = () => {
      closeActionDialog({
        confirmed: true,
        inputValue: String(els.actionDialogInput?.value || "").trim(),
        checked: Boolean(els.actionDialogCheckbox?.checked)
      })
    }
  }
  els.createRoomBtn.onclick = createRoom
  els.sendBtn.onclick = sendChatMessage
  els.retryUploadBtn.onclick = () => {
    retryLastFailedUpload()
  }
  els.chatInput.onkeydown = (event) => {
    if (event.isComposing || state.pmIsComposing) {
      if (event.key === "Enter") {
        event.preventDefault()
      }
      return
    }
    if (event.key === "Escape") {
      state.pmInCommandMode = false
      clearPmSuggestions()
      clearPmPendingConfirm()
      cancelPmInputGuidance()
      setPmHint("")
      renderPmHelpPanel("")
      return
    }
    if (event.key === "ArrowDown" && state.pmSuggestionCandidates.length) {
      event.preventDefault()
      movePmSuggestionIndex(1)
      return
    }
    if (event.key === "ArrowUp" && state.pmSuggestionCandidates.length) {
      event.preventDefault()
      movePmSuggestionIndex(-1)
      return
    }
    if (event.key === "Tab" && state.pmSuggestionCandidates.length) {
      event.preventDefault()
      const selected = state.pmSuggestionCandidates[state.pmSuggestionIndex] || state.pmSuggestionCandidates[0]
      if (selected) applyPmTarget(selected.username)
      return
    }
    if (event.key === "Enter") {
      const hasPmContext = Boolean(getPmSuggestionContext(els.chatInput.value))
      if (hasPmContext && state.pmSuggestionCandidates.length) {
        event.preventDefault()
        const selected = state.pmSuggestionCandidates[state.pmSuggestionIndex] || state.pmSuggestionCandidates[0]
        if (selected) applyPmTarget(selected.username)
        return
      }
      sendChatMessage()
    }
  }
  els.chatInput.oninput = () => {
    const raw = els.chatInput.value
    if (state.pmIsComposing) return
    if (raw === state.pmLastInputRaw) return
    state.pmLastInputRaw = raw
    handlePmInputFrame(raw)
  }
  els.chatInput.onpaste = (event) => {
    handleClipboardImagePaste(event)
  }
  els.chatInput.oncompositionstart = () => {
    state.pmIsComposing = true
  }
  els.chatInput.oncompositionend = () => {
    state.pmIsComposing = false
    const raw = els.chatInput.value
    if (raw === state.pmLastInputRaw) return
    state.pmLastInputRaw = raw
    handlePmInputFrame(raw, true)
  }
  els.pmSuggestions.onclick = (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const btn = target.closest(".pm-suggestion-chip")
    if (!(btn instanceof HTMLButtonElement)) return
    const index = Number(btn.dataset.pmIndex || -1)
    if (!Number.isFinite(index) || index < 0) return
    const username = state.pmSuggestionUsernames[index]
    if (!username) return
    applyPmTarget(username)
  }
  document.addEventListener("click", (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target.closest("#pmSuggestions") || target.closest("#chatInput") || target.closest("#pmHelpPanel")) return
    if (!state.pmInCommandMode && !state.pmSuggestionCandidates.length && !state.pmPendingConfirm) return
    state.pmInCommandMode = false
    clearPmSuggestions()
    clearPmPendingConfirm()
    cancelPmInputGuidance()
    setPmHint("")
  })
  els.fileInput.onchange = async () => {
    const file = els.fileInput.files?.[0]
    try {
      await sendAttachmentFile(file, "文件")
    } finally {
      els.fileInput.value = ""
    }
  }
  if (els.inRoomPanel) {
    els.inRoomPanel.ondragover = (event) => {
      if (!hasAuthenticatedSession() || !state.roomId) return
      event.preventDefault()
      els.inRoomPanel.classList.add("drag-over")
    }
    els.inRoomPanel.ondragleave = () => {
      els.inRoomPanel.classList.remove("drag-over")
    }
    els.inRoomPanel.ondrop = async (event) => {
      event.preventDefault()
      els.inRoomPanel.classList.remove("drag-over")
      const files = [...(event.dataTransfer?.files || [])]
      if (!files.length) return
      await sendDroppedFiles(files)
    }
  }
  els.audioInput.onchange = async () => {
    localStorage.setItem(AUDIO_INPUT_DEVICE_KEY, String(els.audioInput.value || ""))
    await switchAudioInput()
  }
  els.audioOutput.onchange = async () => {
    localStorage.setItem(AUDIO_OUTPUT_DEVICE_KEY, String(els.audioOutput.value || ""))
    await applyAudioOutputToRemoteAudios()
    if (state.outputTestAudioElement?.setSinkId && els.audioOutput.value) {
      await state.outputTestAudioElement.setSinkId(els.audioOutput.value).catch(() => {})
    }
    toast("已切换输出设备")
  }
  if (els.remoteOutputGain) {
    els.remoteOutputGain.oninput = async () => {
      state.remoteOutputGain = clampNumber(els.remoteOutputGain.value, 0, 1, DEFAULT_REMOTE_OUTPUT_GAIN)
      localStorage.setItem(REMOTE_OUTPUT_GAIN_KEY, String(state.remoteOutputGain))
      await applyAudioOutputToRemoteAudios()
      renderVolumeSlider(els.remoteOutputGain, els.remoteOutputGainPercent)
    }
  }
  if (els.testAudioOutputBtn) {
    els.testAudioOutputBtn.onclick = async () => {
      await toggleAudioOutputTestTone()
    }
  }
  if (els.unlockAudioBtn) {
    els.unlockAudioBtn.onclick = async () => {
      await unlockAudioPlaybackNow(true)
    }
  }
  if (els.outputTestGain) {
    els.outputTestGain.oninput = () => {
      state.outputTestGain = clampOutputTestGain(els.outputTestGain.value)
      localStorage.setItem(OUTPUT_TEST_GAIN_KEY, String(state.outputTestGain))
      if (state.outputTestGainNode) {
        state.outputTestGainNode.gain.value = state.outputTestGain
      }
      markAudioPresetManual()
      renderVolumeSlider(els.outputTestGain, els.outputTestGainPercent)
    }
  }
  if (els.refreshAudioDevicesBtn) {
    els.refreshAudioDevicesBtn.onclick = async () => {
      try {
        await loadDeviceList()
        toast("已刷新音频设备列表")
      } catch {
        toast("音频设备刷新失败，请检查设备权限")
      }
    }
  }
  els.micGain.oninput = () => {
    state.micGain = clampNumber(els.micGain.value, 0, 2, DEFAULT_MIC_GAIN)
    if (state.gainNode) state.gainNode.gain.value = Number(state.micGain)
    localStorage.setItem(MIC_GAIN_KEY, String(state.micGain))
    markAudioPresetManual()
    renderVolumeSlider(els.micGain, els.micGainPercent)
    state.micAdvisorType = ""
    state.micAdvisorUntil = 0
    state.micAdvisorWindowStartedAt = 0
    state.micAdvisorLevelTotal = 0
    state.micAdvisorSampleCount = 0
    state.micAdvisorToastType = ""
    state.micAdvisorToastUntil = 0
  }
  if (els.audioPresetVoiceBtn) {
    els.audioPresetVoiceBtn.onclick = async () => {
      await applyAudioPreset("voice")
    }
  }
  if (els.audioPresetMusicBtn) {
    els.audioPresetMusicBtn.onclick = async () => {
      await applyAudioPreset("music")
    }
  }
  if (els.audioPresetTalkBtn) {
    els.audioPresetTalkBtn.onclick = async () => {
      await applyAudioPreset("talk")
    }
  }
  if (els.audioAdvancedToggleBtn) {
    els.audioAdvancedToggleBtn.onclick = () => {
      state.audioAdvancedVisible = !state.audioAdvancedVisible
      localStorage.setItem(AUDIO_ADVANCED_VISIBLE_KEY, state.audioAdvancedVisible ? "1" : "0")
      syncAudioEnhancementControls()
    }
  }
  if (els.liveToggleBtn) {
    els.liveToggleBtn.onclick = async () => {
      if (!hasAuthenticatedSession() || !state.roomId) return
      const occupiedByOther = Boolean(state.liveActiveUserId) && state.liveActiveUserId !== String(state.user?.id || "")
      if (occupiedByOther && !state.liveTrack) {
        toast("当前已有他人在直播，无法开始直播")
        return
      }
      if (state.liveTrack) {
        await stopLiveShare(true)
        return
      }
      await startLiveShare()
    }
  }
  if (els.liveQualitySelect) {
    els.liveQualitySelect.onchange = () => {
      if (state.liveTrack) {
        state.peers.forEach((peer) => {
          applyVideoSenderOptimization(peer)
        })
        const label = els.liveQualitySelect.options[els.liveQualitySelect.selectedIndex].textContent
        toast(`已动态调整直播码率上限：${label}`)
      }
    }
  }
  if (els.forceRelayCheck) {
    els.forceRelayCheck.checked = state.forceRelay
    els.forceRelayCheck.onchange = () => {
      state.forceRelay = els.forceRelayCheck.checked
      localStorage.setItem("rtc_force_relay", state.forceRelay ? "1" : "0")
      toast(`中继模式已${state.forceRelay ? "开启 (强制使用 TURN)" : "关闭 (优先使用 P2P)"}`)
      // Re-connect to all peers to apply new transport policy
      reconnectAllPeers()
    }
  }
  if (els.tileLiveCardsBtn) {
    els.tileLiveCardsBtn.onclick = () => {
      state.liveManualLayoutUsers.clear()
      tileLiveCards(true)
      persistLiveLayoutForRoom()
    }
  }
  if (els.toggleLiveTheaterBtn) {
    els.toggleLiveTheaterBtn.onclick = () => {
      toggleLiveTheaterMode()
    }
  }
  if (els.liveStageResizeHandle) {
    els.liveStageResizeHandle.onmousedown = (event) => {
      if (event.button !== 0) return
      state.liveStageResizeActive = true
      state.liveStageResizeStartY = event.clientY
      state.liveStageResizeStartHeight = state.liveStageHeight
      document.body.classList.add("live-stage-resizing")
      event.preventDefault()
    }
  }
  if (els.audioPresetCustomSaveBtn) {
    els.audioPresetCustomSaveBtn.onclick = () => {
      saveCustomAudioPreset()
    }
  }
  if (els.audioPresetCustomApplyBtn) {
    els.audioPresetCustomApplyBtn.onclick = async () => {
      await applyCustomAudioPreset()
    }
  }
  els.micEnhanceEnabled.onchange = () => {
    state.micEnhanceEnabled = Boolean(els.micEnhanceEnabled.checked)
    localStorage.setItem(MIC_ENHANCE_ENABLED_KEY, state.micEnhanceEnabled ? "1" : "0")
    markAudioPresetManual()
    rebuildAudioProcessingGraph()
  }
  els.noiseSuppressionEnabled.onchange = async () => {
    state.noiseSuppressionEnabled = Boolean(els.noiseSuppressionEnabled.checked)
    localStorage.setItem(NOISE_SUPPRESSION_ENABLED_KEY, state.noiseSuppressionEnabled ? "1" : "0")
    markAudioPresetManual()
    await refreshLocalInputCapture()
  }
  els.echoCancellationEnabled.onchange = async () => {
    state.echoCancellationEnabled = Boolean(els.echoCancellationEnabled.checked)
    localStorage.setItem(ECHO_CANCELLATION_ENABLED_KEY, state.echoCancellationEnabled ? "1" : "0")
    markAudioPresetManual()
    await refreshLocalInputCapture()
  }
  els.accompanimentEnabled.onchange = async () => {
    const targetEnabled = Boolean(els.accompanimentEnabled.checked)
    await setAccompanimentEnabled(targetEnabled, true)
  }
  els.accompanimentGain.oninput = () => {
    state.accompanimentGain = clampAccompanimentGain(els.accompanimentGain.value)
    localStorage.setItem(ACCOMPANIMENT_GAIN_KEY, String(state.accompanimentGain))
    applyAccompanimentGainToNode()
    markAudioPresetManual()
    renderVolumeSlider(els.accompanimentGain, els.accompanimentGainPercent)
  }
  if (els.accompanimentLimiterEnabled) {
    els.accompanimentLimiterEnabled.onchange = () => {
      state.accompanimentLimiterEnabled = Boolean(els.accompanimentLimiterEnabled.checked)
      localStorage.setItem(ACCOMPANIMENT_LIMITER_ENABLED_KEY, state.accompanimentLimiterEnabled ? "1" : "0")
      rebuildAccompanimentProcessingGraph()
      markAudioPresetManual()
      if (state.accompanimentActive) {
        toast(state.accompanimentLimiterEnabled ? "伴奏限幅保护已开启" : "伴奏限幅保护已关闭")
      }
    }
  }
  els.pttEnabled.onchange = () => {
    state.pttEnabled = Boolean(els.pttEnabled.checked)
    localStorage.setItem(PTT_ENABLED_KEY, state.pttEnabled ? "1" : "0")
    state.pttPressed = false
    markAudioPresetManual()
    applyEffectiveMuteState()
  }
  if (els.capturePttKeyBtn) {
    els.capturePttKeyBtn.onclick = () => {
      setPttKeyCaptureActive(!state.pttKeyCaptureActive)
    }
  }
  window.addEventListener("keydown", onGlobalKeyDown)
  window.addEventListener("keyup", onGlobalKeyUp)
  window.addEventListener("blur", () => {
    if (!state.pttPressed) return
    state.pttPressed = false
    applyEffectiveMuteState()
  })
  window.addEventListener("mousemove", onLiveCardDragMove)
  window.addEventListener("mouseup", stopLiveCardDrag)
  window.addEventListener("mousemove", onLiveStageResizeMove)
  window.addEventListener("mouseup", stopLiveStageResize)
  window.addEventListener("mousemove", onLayoutResizeMove)
  window.addEventListener("mouseup", stopLayoutResize)
  window.addEventListener("resize", () => {
    if (state.liveTheaterMode) {
      const viewportHeight = Math.max(680, window.innerHeight || 0)
      setLiveStageHeight(Math.floor(viewportHeight * 0.72), false)
    }
    tileLiveCards(false)
    applyLayoutSizing()
  })
  if (els.sidebarResizeHandle) {
    els.sidebarResizeHandle.onmousedown = (event) => {
      if (event.button !== 0) return
      startLayoutResize("sidebar", event)
    }
  }
  if (els.rightbarResizeHandle) {
    els.rightbarResizeHandle.onmousedown = (event) => {
      if (event.button !== 0) return
      startLayoutResize("rightbar", event)
    }
  }
  if (els.rightbarSplitHandle) {
    els.rightbarSplitHandle.onmousedown = (event) => {
      if (event.button !== 0) return
      startLayoutResize("rightbar-split", event)
    }
  }
  const bindIconAction = (element, handler) => {
    if (!element) return
    element.onclick = handler
    element.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      handler()
    }
  }
  bindIconAction(els.muteBtn, () => {
    if (!toggleMuteAction()) {
      notifyLoginRequired()
    }
  })
  bindIconAction(els.speakerBtn, () => {
    if (!hasAuthenticatedSession()) {
      notifyLoginRequired()
      return
    }
    setRemoteSpeakerMuted(!state.remoteSpeakerMuted, true)
  })
  els.busyBtn.onclick = () => {
    if (!toggleBusyAction(true)) {
      notifyLoginRequired()
    }
  }
  applyEffectiveMuteState()
  syncRemoteSpeakerButtonState()
  if (els.resetAudioSettingsBtn) {
    els.resetAudioSettingsBtn.onclick = async () => {
      await resetAudioSettingsToDefault()
    }
  }
  if (els.exportAudioSettingsBtn) {
    els.exportAudioSettingsBtn.onclick = async () => {
      await exportAudioSettingsConfig()
    }
  }
  if (els.importAudioSettingsBtn) {
    els.importAudioSettingsBtn.onclick = async () => {
      await importAudioSettingsConfig()
    }
  }
  els.reconnectBtn.onclick = () => {
    if (!forceSocketReconnect()) {
      notifyLoginRequired()
    }
  }
  els.saveDesktopShortcutBtn.onclick = async () => {
    await saveDesktopShortcutConfig()
  }
  els.onlineUserSearch.oninput = renderOnlineUsers
  els.onlineStatusFilter.onchange = renderOnlineUsers
  els.inRoomFirst.onchange = renderOnlineUsers
  els.onlyCurrentRoom.onchange = renderOnlineUsers
  if (els.liveSourceSelect) {
    els.liveSourceSelect.onchange = () => {
      state.liveSourceId = String(els.liveSourceSelect.value || "")
    }
  }
  navigator.mediaDevices.addEventListener("devicechange", async () => {
    try {
      await loadDeviceList()
      toast("检测到音频设备变更，已刷新设备列表")
    } catch {
      toast("音频设备刷新失败，请检查设备权限")
    }
  })
}

function onGlobalKeyDown(event) {
  if (state.pttKeyCaptureActive) {
    event.preventDefault()
    if (event.code === "Escape") {
      setPttKeyCaptureActive(false)
      return
    }
    const code = normalizePttKeyCode(event.code)
    if (!code) return
    state.pttKeyCode = code
    localStorage.setItem(PTT_KEY_CODE_KEY, state.pttKeyCode)
    markAudioPresetManual()
    syncPttControls()
    setPttKeyCaptureActive(false)
    toast(`按住说话按键已设置为 ${formatPttKeyCodeLabel(state.pttKeyCode)}`)
    return
  }
  if (handleWebShortcutKeydown(event)) return
  if (!hasAuthenticatedSession()) return
  if (!state.pttEnabled) return
  if (event.repeat) return
  if (event.code !== state.pttKeyCode) return
  if (event.target instanceof HTMLElement) {
    const tag = event.target.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return
  }
  state.pttPressed = true
  applyEffectiveMuteState()
}

function onGlobalKeyUp(event) {
  if (!hasAuthenticatedSession()) return
  if (!state.pttEnabled) return
  if (event.code !== state.pttKeyCode) return
  if (!state.pttPressed) return
  state.pttPressed = false
  applyEffectiveMuteState()
}

function syncPttControls() {
  state.pttKeyCode = normalizePttKeyCode(state.pttKeyCode) || "F2"
  if (els.pttEnabled) {
    els.pttEnabled.checked = state.pttEnabled
  }
  if (els.pttKey) {
    els.pttKey.value = formatPttKeyCodeLabel(state.pttKeyCode)
  }
  if (els.pttKeyHint) {
    els.pttKeyHint.textContent = state.pttKeyCaptureActive
      ? "请按下任意按键，按 Esc 取消"
      : `当前按键：${formatPttKeyCodeLabel(state.pttKeyCode)}`
  }
  if (els.capturePttKeyBtn) {
    els.capturePttKeyBtn.textContent = state.pttKeyCaptureActive ? "取消设置" : "设置按键"
  }
  applyEffectiveMuteState()
}

function setPttKeyCaptureActive(active) {
  state.pttKeyCaptureActive = Boolean(active)
  syncPttControls()
}

function normalizeAudioPresetKey(value) {
  const key = String(value || "").trim().toLowerCase()
  if (key === "voice" || key === "music" || key === "talk" || key === "custom") {
    return key
  }
  return "manual"
}

function getAudioPresetStatusText(presetKey) {
  const key = normalizeAudioPresetKey(presetKey)
  if (key === "voice") return "当前预设：语音清晰"
  if (key === "music") return "当前预设：音乐演唱"
  if (key === "talk") return "当前预设：低延迟对讲"
  if (key === "custom") return "当前预设：自定义"
  return "当前预设：手动"
}

function setActiveAudioPreset(presetKey) {
  state.activeAudioPresetKey = normalizeAudioPresetKey(presetKey)
  localStorage.setItem(AUDIO_ACTIVE_PRESET_KEY, state.activeAudioPresetKey)
}

function markAudioPresetManual() {
  if (state.applyingAudioPreset) return
  setActiveAudioPreset("manual")
  if (els.audioPresetStatus) {
    els.audioPresetStatus.textContent = getAudioPresetStatusText(state.activeAudioPresetKey)
  }
}

function setLiveStatus(text) {
  if (!els.liveStatusText) return
  els.liveStatusText.textContent = String(text || "当前无人直播")
  syncLiveSceneMode()
}

function getHasLiveContent() {
  return Boolean(state.liveTrack || state.remoteLiveStreams.size > 0 || state.liveActiveUserId)
}

function syncLiveSceneMode() {
  const hasLive = getHasLiveContent()
  document.body.classList.toggle("live-active", hasLive)
  document.body.classList.toggle("live-idle", !hasLive)
  if (!hasLive) {
    state.liveAutoTheaterApplied = false
    return
  }
  if (state.liveAutoTheaterApplied) return
  state.liveAutoTheaterApplied = true
  if (!state.liveTheaterMode) {
    state.liveTheaterMode = true
    const viewportHeight = Math.max(680, window.innerHeight || 0)
    setLiveStageHeight(Math.floor(viewportHeight * 0.72), false)
  }
}

function startLiveSceneWatcher() {
  if (state.liveSceneWatcherTimer) return
  syncLiveSceneMode()
  state.liveSceneWatcherTimer = setInterval(() => {
    syncLiveSceneMode()
  }, 1200)
}

function applyLayoutSizing() {
  if (els.app) {
    els.app.style.setProperty("--sidebar-width", `${Math.round(state.layoutSidebarWidth)}px`)
    els.app.style.setProperty("--rightbar-width", `${Math.round(state.layoutRightbarWidth)}px`)
  }
  if (els.rightbar) {
    const topRatio = Math.max(0.35, Math.min(0.8, Number(state.layoutRightbarTopRatio || 0.62)))
    const bottomRatio = Math.max(0.2, 1 - topRatio)
    els.rightbar.style.gridTemplateRows = `minmax(0, ${topRatio}fr) 8px minmax(0, ${bottomRatio}fr)`
  }
}

function startLayoutResize(mode, event) {
  if (!els.app) return
  state.layoutResizeMode = String(mode || "")
  document.body.classList.add("layout-resizing")
  event.preventDefault()
}

function onLayoutResizeMove(event) {
  if (!state.layoutResizeMode || !els.app) return
  const appRect = els.app.getBoundingClientRect()
  if (state.layoutResizeMode === "sidebar") {
    const nextWidth = clampNumber(event.clientX - appRect.left, 240, 520, state.layoutSidebarWidth)
    state.layoutSidebarWidth = nextWidth
    localStorage.setItem(LAYOUT_SIDEBAR_WIDTH_KEY, String(nextWidth))
    applyLayoutSizing()
    return
  }
  if (state.layoutResizeMode === "rightbar") {
    const nextWidth = clampNumber(appRect.right - event.clientX, 300, 760, state.layoutRightbarWidth)
    state.layoutRightbarWidth = nextWidth
    localStorage.setItem(LAYOUT_RIGHTBAR_WIDTH_KEY, String(nextWidth))
    applyLayoutSizing()
    return
  }
  if (state.layoutResizeMode === "rightbar-split" && els.rightbar) {
    const rightbarRect = els.rightbar.getBoundingClientRect()
    const offsetY = event.clientY - rightbarRect.top
    const ratio = clampNumber(offsetY / Math.max(1, rightbarRect.height), 0.35, 0.8, state.layoutRightbarTopRatio)
    state.layoutRightbarTopRatio = ratio
    localStorage.setItem(LAYOUT_RIGHTBAR_TOP_RATIO_KEY, String(ratio))
    applyLayoutSizing()
  }
}

function stopLayoutResize() {
  if (!state.layoutResizeMode) return
  state.layoutResizeMode = ""
  document.body.classList.remove("layout-resizing")
}

function recoverRealtimeState() {
  if (!hasAuthenticatedSession()) return
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    connectSocket({ resetBackoff: true })
    return
  }
  const stale = Date.now() - Number(state.lastServerHeartbeatAt || 0) > SOCKET_HEARTBEAT_TIMEOUT
  if (stale) {
    forceSocketReconnect()
    return
  }
  sendWs(WS_EVENTS.HEARTBEAT, { clientTime: Date.now() })
}

function startRealtimeRecoveryMonitor() {
  if (state.realtimeRecoveryTimer) return
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) recoverRealtimeState()
  })
  window.addEventListener("focus", () => {
    recoverRealtimeState()
  })
  window.addEventListener("pageshow", () => {
    recoverRealtimeState()
  })
  state.realtimeRecoveryTimer = setInterval(() => {
    if (document.hidden) return
    recoverRealtimeState()
  }, 25000)
}

function resolveLiveSourceLabel(mode, sourceName) {
  const normalizedMode = String(mode || "screen")
  const normalizedName = String(sourceName || "").trim()
  if (normalizedName) return normalizedName
  if (normalizedMode === "window") return "窗口"
  return "桌面"
}

function clampLiveStageHeight(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return LIVE_STAGE_HEIGHT_DEFAULT
  return Math.max(LIVE_STAGE_HEIGHT_MIN, Math.min(LIVE_STAGE_HEIGHT_MAX, Math.round(parsed)))
}

function applyLiveStageHeight() {
  if (els.liveGrid) {
    els.liveGrid.style.height = `${state.liveStageHeight}px`
  }
  if (els.toggleLiveTheaterBtn) {
    els.toggleLiveTheaterBtn.textContent = state.liveTheaterMode ? "退出剧场" : "剧场模式"
  }
  tileLiveCards(false)
}

function setLiveStageHeight(height, persist = true) {
  state.liveStageHeight = clampLiveStageHeight(height)
  if (persist) {
    localStorage.setItem(LIVE_STAGE_HEIGHT_KEY, String(state.liveStageHeight))
  }
  applyLiveStageHeight()
}

function persistLiveLayoutForRoom(roomId = state.roomId) {
  const normalizedRoomId = String(roomId || "")
  if (!normalizedRoomId) return
  const cards = {}
  for (const [userId, rect] of state.liveLayoutByUserId.entries()) {
    const normalizedUserId = String(userId || "")
    if (!normalizedUserId) continue
    cards[normalizedUserId] = {
      x: Number(rect?.x || 0),
      y: Number(rect?.y || 0),
      width: Number(rect?.width || 320),
      height: Number(rect?.height || 220),
      manual: state.liveManualLayoutUsers.has(normalizedUserId)
    }
  }
  state.liveRoomLayouts[normalizedRoomId] = {
    stageHeight: state.liveStageHeight,
    theaterMode: Boolean(state.liveTheaterMode),
    cards
  }
  localStorage.setItem(LIVE_ROOM_LAYOUTS_KEY, JSON.stringify(state.liveRoomLayouts))
}

function loadLiveLayoutForRoom(roomId) {
  const normalizedRoomId = String(roomId || "")
  state.liveLayoutByUserId.clear()
  state.liveManualLayoutUsers.clear()
  const raw = state.liveRoomLayouts?.[normalizedRoomId]
  if (!raw || typeof raw !== "object") {
    state.liveTheaterMode = false
    setLiveStageHeight(LIVE_STAGE_HEIGHT_DEFAULT, false)
    return
  }
  state.liveTheaterMode = Boolean(raw.theaterMode)
  setLiveStageHeight(clampLiveStageHeight(raw.stageHeight), false)
  const cards = raw.cards && typeof raw.cards === "object" ? raw.cards : {}
  for (const userId of Object.keys(cards)) {
    const normalizedUserId = String(userId || "")
    if (!normalizedUserId) continue
    const rect = cards[normalizedUserId]
    const normalizedRect = {
      x: Number(rect?.x || 0),
      y: Number(rect?.y || 0),
      width: Number(rect?.width || 320),
      height: Number(rect?.height || 220)
    }
    state.liveLayoutByUserId.set(normalizedUserId, normalizedRect)
    if (rect?.manual) {
      state.liveManualLayoutUsers.add(normalizedUserId)
    }
  }
}

function toggleLiveTheaterMode() {
  const viewportHeight = Math.max(680, window.innerHeight || 0)
  if (!state.liveTheaterMode) {
    state.liveTheaterMode = true
    setLiveStageHeight(Math.floor(viewportHeight * 0.72))
    persistLiveLayoutForRoom()
    return
  }
  state.liveTheaterMode = false
  setLiveStageHeight(LIVE_STAGE_HEIGHT_DEFAULT)
  persistLiveLayoutForRoom()
}

async function toggleLiveCardFullscreen(videoEl) {
  if (!(videoEl instanceof HTMLVideoElement)) return
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {})
    return
  }
  await videoEl.requestFullscreen?.().catch(() => {})
}

function getLiveStageSize() {
  const width = Math.max(320, Number(els.liveGrid?.clientWidth || 0))
  const height = Math.max(220, Number(els.liveGrid?.clientHeight || 0))
  return { width, height }
}

function clampLiveCardRect(rect, stageWidth, stageHeight) {
  const width = Math.max(240, Math.min(Number(rect?.width || 320), Math.max(240, stageWidth - 12)))
  const height = Math.max(170, Math.min(Number(rect?.height || 220), Math.max(170, stageHeight - 12)))
  const maxX = Math.max(0, stageWidth - width)
  const maxY = Math.max(0, stageHeight - height)
  const x = Math.max(0, Math.min(Number(rect?.x || 0), maxX))
  const y = Math.max(0, Math.min(Number(rect?.y || 0), maxY))
  return { x, y, width, height }
}

function applyLiveCardRect(card, rect) {
  if (!card || !rect) return
  card.style.left = `${Math.round(rect.x)}px`
  card.style.top = `${Math.round(rect.y)}px`
  card.style.width = `${Math.round(rect.width)}px`
  card.style.height = `${Math.round(rect.height)}px`
}

function getLiveCardTileRect(index, count, stageWidth) {
  const gap = 12
  const cols = count <= 1 ? 1 : count === 2 ? 2 : Math.min(3, Math.ceil(Math.sqrt(count)))
  const cardWidth = Math.max(260, Math.floor((stageWidth - gap * (cols + 1)) / cols))
  const cardHeight = Math.max(180, Math.floor(cardWidth * 9 / 16) + 44)
  const col = index % cols
  const row = Math.floor(index / cols)
  const x = gap + col * (cardWidth + gap)
  const y = gap + row * (cardHeight + gap)
  return { x, y, width: cardWidth, height: cardHeight }
}

function getLiveCardDockRect(index, count, stageWidth, stageHeight) {
  const gap = 12
  if (count <= 1) {
    return {
      x: gap,
      y: gap,
      width: stageWidth - gap * 2,
      height: stageHeight - gap * 2
    }
  }
  if (index === 0) {
    const sideWidth = Math.max(220, Math.min(300, Math.floor(stageWidth * 0.3)))
    return {
      x: gap,
      y: gap,
      width: stageWidth - sideWidth - gap * 3,
      height: stageHeight - gap * 2
    }
  }
  const sideCount = count - 1
  const sideWidth = Math.max(220, Math.min(300, Math.floor(stageWidth * 0.3)))
  const availableHeight = stageHeight - gap * (sideCount + 1)
  const cardHeight = Math.max(120, Math.min(220, Math.floor(availableHeight / sideCount)))
  return {
    x: stageWidth - sideWidth - gap,
    y: gap + (index - 1) * (cardHeight + gap),
    width: sideWidth,
    height: cardHeight
  }
}

function snapLiveCardRect(rect, stageWidth, stageHeight) {
  const safeRect = clampLiveCardRect(rect, stageWidth, stageHeight)
  const maxX = Math.max(0, stageWidth - safeRect.width)
  const maxY = Math.max(0, stageHeight - safeRect.height)
  const snapGap = 24
  const snapTargetsX = [0, 12, maxX]
  const snapTargetsY = [0, 12, maxY]
  let x = safeRect.x
  let y = safeRect.y
  for (let index = 0; index < snapTargetsX.length; index += 1) {
    if (Math.abs(x - snapTargetsX[index]) <= snapGap) {
      x = snapTargetsX[index]
      break
    }
  }
  for (let index = 0; index < snapTargetsY.length; index += 1) {
    if (Math.abs(y - snapTargetsY[index]) <= snapGap) {
      y = snapTargetsY[index]
      break
    }
  }
  return { ...safeRect, x, y }
}

function tileLiveCards(forceAll) {
  if (!els.liveGrid) return
  const cards = [...els.liveGrid.querySelectorAll(".live-card")]
  if (!cards.length) return
  const { width: stageWidth, height: stageHeight } = getLiveStageSize()
  const liveOwnerId = String(state.liveActiveUserId || "")
  const preferredId = String(state.livePreferredMainUserId || "")
  cards.sort((a, b) => {
    const aId = String(a.dataset.liveUserId || "")
    const bId = String(b.dataset.liveUserId || "")
    if (preferredId) {
      if (aId === preferredId && bId !== preferredId) return -1
      if (bId === preferredId && aId !== preferredId) return 1
    } else {
      if (aId === liveOwnerId && bId !== liveOwnerId) return -1
      if (bId === liveOwnerId && aId !== liveOwnerId) return 1
    }
    return 0
  })
  cards.forEach((card, index) => {
    const userId = String(card.dataset.liveUserId || "")
    if (!userId) return
    if (userId === liveOwnerId && liveOwnerId) {
      state.liveManualLayoutUsers.delete(userId)
      state.liveLayoutByUserId.set(userId, getLiveCardDockRect(index, cards.length, stageWidth, stageHeight))
    } else if (forceAll || !state.liveManualLayoutUsers.has(userId) || !state.liveLayoutByUserId.has(userId)) {
      state.liveLayoutByUserId.set(userId, getLiveCardDockRect(index, cards.length, stageWidth, stageHeight))
    }
    const nextRect = clampLiveCardRect(state.liveLayoutByUserId.get(userId), stageWidth, stageHeight)
    state.liveLayoutByUserId.set(userId, nextRect)
    applyLiveCardRect(card, nextRect)
    card.classList.toggle("live-card-main", index === 0)
    const mainBtn = card.querySelector(".live-card-main-btn")
    if (mainBtn instanceof HTMLButtonElement) {
      mainBtn.textContent = index === 0 ? "取消主画面" : "设为主画面"
    }
  })
}

function startLiveCardDrag(event, card, userId) {
  if (!els.liveGrid || !card || !userId) return
  if (String(userId) === String(state.liveActiveUserId || "")) return
  const stageRect = els.liveGrid.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  state.liveDragUserId = userId
  state.liveDragOffsetX = event.clientX - cardRect.left
  state.liveDragOffsetY = event.clientY - cardRect.top
  state.liveManualLayoutUsers.add(userId)
  card.classList.add("dragging")
  const prevRect = state.liveLayoutByUserId.get(userId) || {
    x: cardRect.left - stageRect.left,
    y: cardRect.top - stageRect.top,
    width: cardRect.width,
    height: cardRect.height
  }
  state.liveLayoutByUserId.set(userId, prevRect)
}

function onLiveCardDragMove(event) {
  if (!state.liveDragUserId || !els.liveGrid) return
  const userId = state.liveDragUserId
  const card = els.liveGrid.querySelector(`[data-live-user-id="${userId}"]`)
  if (!(card instanceof HTMLElement)) return
  const stageRect = els.liveGrid.getBoundingClientRect()
  const { width: stageWidth, height: stageHeight } = getLiveStageSize()
  const prev = state.liveLayoutByUserId.get(userId) || { width: card.offsetWidth || 320, height: card.offsetHeight || 220 }
  const nextRect = clampLiveCardRect({
    x: event.clientX - stageRect.left - state.liveDragOffsetX,
    y: event.clientY - stageRect.top - state.liveDragOffsetY,
    width: prev.width,
    height: prev.height
  }, stageWidth, stageHeight)
  state.liveLayoutByUserId.set(userId, nextRect)
  applyLiveCardRect(card, nextRect)
}

function stopLiveCardDrag() {
  if (!state.liveDragUserId || !els.liveGrid) return
  const userId = state.liveDragUserId
  const card = els.liveGrid.querySelector(`[data-live-user-id="${userId}"]`)
  if (state.liveLayoutByUserId.has(userId)) {
    const { width: stageWidth, height: stageHeight } = getLiveStageSize()
    const snapped = snapLiveCardRect(state.liveLayoutByUserId.get(userId), stageWidth, stageHeight)
    state.liveLayoutByUserId.set(userId, snapped)
    applyLiveCardRect(card, snapped)
  }
  card?.classList.remove("dragging")
  state.liveDragUserId = ""
  state.liveDragOffsetX = 0
  state.liveDragOffsetY = 0
  persistLiveLayoutForRoom()
}

function onLiveStageResizeMove(event) {
  if (!state.liveStageResizeActive) return
  const delta = event.clientY - state.liveStageResizeStartY
  const nextHeight = clampLiveStageHeight(state.liveStageResizeStartHeight + delta)
  state.liveTheaterMode = false
  setLiveStageHeight(nextHeight)
}

function stopLiveStageResize() {
  if (!state.liveStageResizeActive) return
  state.liveStageResizeActive = false
  state.liveStageResizeStartY = 0
  state.liveStageResizeStartHeight = state.liveStageHeight
  document.body.classList.remove("live-stage-resizing")
  persistLiveLayoutForRoom()
}

function removeRemoteLiveStream(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  const stream = state.remoteLiveStreams.get(normalizedUserId)
  if (stream) {
    const tracks = stream.getTracks()
    for (let index = 0; index < tracks.length; index += 1) {
      tracks[index].stop()
    }
  }
  state.remoteLiveStreams.delete(normalizedUserId)
  state.liveSourceNameByUserId.delete(normalizedUserId)
  state.liveLayoutByUserId.delete(normalizedUserId)
  state.liveManualLayoutUsers.delete(normalizedUserId)
  if (state.livePreferredMainUserId === normalizedUserId) {
    state.livePreferredMainUserId = ""
  }
  if (state.liveActiveUserId === normalizedUserId) {
    state.liveActiveUserId = ""
    state.liveActiveUsername = ""
  }
  if (els.liveGrid) {
    const target = els.liveGrid.querySelector(`[data-live-user-id="${normalizedUserId}"]`)
    target?.remove()
  }
}

function removeAllRemoteLiveStreams() {
  const userIds = [...state.remoteLiveStreams.keys()]
  for (let index = 0; index < userIds.length; index += 1) {
    removeRemoteLiveStream(userIds[index])
  }
  state.liveSourceNameByUserId.clear()
  state.liveLayoutByUserId.clear()
  state.liveManualLayoutUsers.clear()
  stopLiveCardDrag()
  state.liveActiveUserId = ""
  state.liveActiveUsername = ""
}

function renderRemoteLiveStream(userId, username, stream, sourceName) {
  if (!els.liveGrid || !stream) return
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  const isNewCard = !els.liveGrid.querySelector(`[data-live-user-id="${normalizedUserId}"]`)
  let card = els.liveGrid.querySelector(`[data-live-user-id="${normalizedUserId}"]`)
  if (!card) {
    card = document.createElement("article")
    card.className = "live-card"
    card.dataset.liveUserId = normalizedUserId
    const header = document.createElement("div")
    header.className = "live-card-header"
    const title = document.createElement("div")
    title.className = "live-card-title"
    const setMainBtn = document.createElement("button")
    setMainBtn.type = "button"
    setMainBtn.className = "live-card-btn live-card-main-btn"
    setMainBtn.textContent = "设为主画面"
    setMainBtn.onclick = () => {
      const currentMain = String(state.livePreferredMainUserId || "")
      if (currentMain === normalizedUserId) {
        state.livePreferredMainUserId = ""
      } else {
        state.livePreferredMainUserId = normalizedUserId
      }
      tileLiveCards(true)
      persistLiveLayoutForRoom()
    }
    const fullscreenBtn = document.createElement("button")
    fullscreenBtn.type = "button"
    fullscreenBtn.className = "live-card-btn"
    fullscreenBtn.textContent = "全屏"
    const video = document.createElement("video")
    video.className = "live-card-video"
    video.autoplay = true
    video.playsInline = true
    video.muted = true // Remote video should always be muted as audio is separate
    video.setAttribute("autoplay", "")
    video.setAttribute("playsinline", "")
    header.onmousedown = (event) => {
      if (event.button !== 0) return
      startLiveCardDrag(event, card, normalizedUserId)
      event.preventDefault()
    }
    fullscreenBtn.onclick = async () => {
      await toggleLiveCardFullscreen(video)
    }
    video.ondblclick = async () => {
      await toggleLiveCardFullscreen(video)
    }
    header.appendChild(title)
    header.appendChild(setMainBtn)
    header.appendChild(fullscreenBtn)
    card.appendChild(header)
    card.appendChild(video)
    els.liveGrid.appendChild(card)
  }
  const titleEl = card.querySelector(".live-card-title")
  const videoEl = card.querySelector(".live-card-video")
  if (titleEl) {
    titleEl.textContent = `${username || "用户"} · ${sourceName || "桌面"}`
  }
  if (videoEl instanceof HTMLVideoElement) {
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream
    }
    const playVideo = async () => {
      try {
        if (videoEl.paused) await videoEl.play()
      } catch (err) {
        // Fallback for some browsers
        videoEl.muted = true
        await videoEl.play().catch(() => {})
      }
    }
    playVideo()
    videoEl.onstalled = playVideo
    videoEl.onwaiting = playVideo
  }
  tileLiveCards(isNewCard)
}

function buildDesktopSourceOptionLabel(source) {
  const type = source?.type === "window" ? "窗口" : "桌面"
  const name = String(source?.name || "").trim() || "未命名"
  return `${type} · ${name}`
}

async function syncLiveSourceOptions() {
  if (!els.liveSourceSelect) return
  const previousValue = String(els.liveSourceSelect.value || state.liveSourceId || "")
  const options = [{ value: "auto", text: "直播源：自动选择" }]
  if (window.desktopBridge?.listDesktopSources) {
    try {
      const sources = await window.desktopBridge.listDesktopSources()
      for (let index = 0; index < sources.length; index += 1) {
        const item = sources[index]
        const sourceId = String(item?.id || "").trim()
        if (!sourceId) continue
        options.push({ value: sourceId, text: `直播源：${buildDesktopSourceOptionLabel(item)}` })
      }
    } catch {}
  }
  els.liveSourceSelect.innerHTML = ""
  for (let index = 0; index < options.length; index += 1) {
    const option = document.createElement("option")
    option.value = options[index].value
    option.textContent = options[index].text
    els.liveSourceSelect.appendChild(option)
  }
  const nextValue = options.some((item) => item.value === previousValue) ? previousValue : "auto"
  els.liveSourceSelect.value = nextValue
  state.liveSourceId = nextValue
}

function getAudioPresetConfig(presetKey) {
  const key = String(presetKey || "").trim()
  if (key === "voice") {
    return {
      label: "语音清晰",
      micGain: 1.1,
      micEnhanceEnabled: true,
      noiseSuppressionEnabled: true,
      echoCancellationEnabled: true,
      accompanimentLimiterEnabled: true,
      pttEnabled: false,
      outputTestGain: 0.03
    }
  }
  if (key === "music") {
    return {
      label: "音乐演唱",
      micGain: 1.25,
      micEnhanceEnabled: true,
      noiseSuppressionEnabled: false,
      echoCancellationEnabled: false,
      accompanimentLimiterEnabled: true,
      pttEnabled: false,
      outputTestGain: 0.04
    }
  }
  if (key === "talk") {
    return {
      label: "低延迟对讲",
      micGain: 1,
      micEnhanceEnabled: false,
      noiseSuppressionEnabled: true,
      echoCancellationEnabled: true,
      accompanimentLimiterEnabled: true,
      pttEnabled: true,
      outputTestGain: 0.03
    }
  }
  return null
}

async function applyAudioPreset(presetKey) {
  const preset = getAudioPresetConfig(presetKey)
  if (!preset) {
    toast("未知音频预设")
    return
  }
  state.applyingAudioPreset = true
  state.micGain = clampNumber(preset.micGain, 0, 2, DEFAULT_MIC_GAIN)
  state.micEnhanceEnabled = Boolean(preset.micEnhanceEnabled)
  state.noiseSuppressionEnabled = Boolean(preset.noiseSuppressionEnabled)
  state.echoCancellationEnabled = Boolean(preset.echoCancellationEnabled)
  state.accompanimentLimiterEnabled = Boolean(preset.accompanimentLimiterEnabled)
  state.pttEnabled = Boolean(preset.pttEnabled)
  state.outputTestGain = clampOutputTestGain(preset.outputTestGain)
  state.pttPressed = false
  localStorage.setItem(MIC_GAIN_KEY, String(state.micGain))
  localStorage.setItem(MIC_ENHANCE_ENABLED_KEY, state.micEnhanceEnabled ? "1" : "0")
  localStorage.setItem(NOISE_SUPPRESSION_ENABLED_KEY, state.noiseSuppressionEnabled ? "1" : "0")
  localStorage.setItem(ECHO_CANCELLATION_ENABLED_KEY, state.echoCancellationEnabled ? "1" : "0")
  localStorage.setItem(ACCOMPANIMENT_LIMITER_ENABLED_KEY, state.accompanimentLimiterEnabled ? "1" : "0")
  localStorage.setItem(PTT_ENABLED_KEY, state.pttEnabled ? "1" : "0")
  localStorage.setItem(OUTPUT_TEST_GAIN_KEY, String(state.outputTestGain))
  if (state.gainNode) {
    state.gainNode.gain.value = state.micGain
  }
  if (state.outputTestGainNode) {
    state.outputTestGainNode.gain.value = state.outputTestGain
  }
  rebuildAudioProcessingGraph()
  rebuildAccompanimentProcessingGraph()
  syncPttControls()
  setActiveAudioPreset(presetKey)
  state.applyingAudioPreset = false
  syncAudioEnhancementControls()
  try {
    await refreshLocalInputCapture()
  } catch {}
  toast(`已应用音频预设：${preset.label}`)
}

function getDefaultAudioSettings() {
  return {
    micGain: DEFAULT_MIC_GAIN,
    remoteOutputGain: DEFAULT_REMOTE_OUTPUT_GAIN,
    micEnhanceEnabled: true,
    noiseSuppressionEnabled: true,
    echoCancellationEnabled: true,
    accompanimentEnabled: false,
    accompanimentGain: DEFAULT_ACCOMPANIMENT_GAIN,
    outputTestGain: DEFAULT_OUTPUT_TEST_GAIN,
    accompanimentLimiterEnabled: true,
    pttEnabled: false,
    pttKeyCode: DEFAULT_PTT_KEY_CODE
  }
}

function buildAudioSettingsSnapshot() {
  return {
    version: 1,
    micGain: state.micGain,
    remoteOutputGain: state.remoteOutputGain,
    micEnhanceEnabled: state.micEnhanceEnabled,
    noiseSuppressionEnabled: state.noiseSuppressionEnabled,
    echoCancellationEnabled: state.echoCancellationEnabled,
    accompanimentEnabled: state.accompanimentEnabled,
    accompanimentGain: state.accompanimentGain,
    accompanimentLimiterEnabled: state.accompanimentLimiterEnabled,
    outputTestGain: state.outputTestGain,
    pttEnabled: state.pttEnabled,
    pttKeyCode: state.pttKeyCode,
    audioPreset: state.activeAudioPresetKey,
    audioInputDeviceId: String(els.audioInput.value || ""),
    audioOutputDeviceId: String(els.audioOutput.value || "")
  }
}

function saveCustomAudioPreset() {
  const snapshot = buildAudioSettingsSnapshot()
  localStorage.setItem(AUDIO_CUSTOM_PRESET_KEY, JSON.stringify(snapshot))
  setActiveAudioPreset("custom")
  syncAudioEnhancementControls()
  toast("已保存当前配置为自定义预设")
}

function getStoredCustomAudioPresetSettings() {
  const raw = String(localStorage.getItem(AUDIO_CUSTOM_PRESET_KEY) || "").trim()
  if (!raw) return null
  const defaults = getDefaultAudioSettings()
  try {
    return normalizeAudioSettingsPayload(JSON.parse(raw), defaults)
  } catch {
    return null
  }
}

async function applyCustomAudioPreset() {
  const settings = getStoredCustomAudioPresetSettings()
  if (!settings) {
    toast("尚未保存自定义预设")
    return
  }
  await applyAudioSettingsConfig(settings)
  setActiveAudioPreset("custom")
  syncAudioEnhancementControls()
  toast("已应用自定义预设")
}

function normalizeAudioSettingsPayload(payload, defaults) {
  if (!payload || typeof payload !== "object") {
    throw new Error("配置不是有效对象")
  }
  const normalized = {
    micGain: clampNumber(payload.micGain, 0, 2, defaults.micGain),
    remoteOutputGain: clampNumber(payload.remoteOutputGain, 0, 1, defaults.remoteOutputGain),
    micEnhanceEnabled: Boolean(payload.micEnhanceEnabled),
    noiseSuppressionEnabled: Boolean(payload.noiseSuppressionEnabled),
    echoCancellationEnabled: Boolean(payload.echoCancellationEnabled),
    accompanimentEnabled: Boolean(payload.accompanimentEnabled),
    accompanimentGain: clampAccompanimentGain(payload.accompanimentGain),
    accompanimentLimiterEnabled: Boolean(payload.accompanimentLimiterEnabled),
    outputTestGain: clampOutputTestGain(payload.outputTestGain),
    pttEnabled: Boolean(payload.pttEnabled),
    pttKeyCode: normalizePttKeyCode(payload.pttKeyCode) || defaults.pttKeyCode,
    audioInputDeviceId: String(payload.audioInputDeviceId || "").trim(),
    audioOutputDeviceId: String(payload.audioOutputDeviceId || "").trim()
  }
  return normalized
}

function parseAudioSettingsPayload(rawText) {
  const defaults = getDefaultAudioSettings()
  const raw = String(rawText || "").trim()
  if (!raw) {
    return { ok: false, error: "配置内容为空", settings: defaults }
  }
  try {
    const parsed = JSON.parse(raw)
    const payload = parsed?.audioSettings && typeof parsed.audioSettings === "object" ? parsed.audioSettings : parsed
    return {
      ok: true,
      error: "",
      settings: normalizeAudioSettingsPayload(payload, defaults)
    }
  } catch {
    return { ok: false, error: "配置 JSON 格式无效", settings: defaults }
  }
}

async function copyTextToClipboard(text) {
  const content = String(text || "")
  if (!content) return false
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch {}
  }
  const textarea = document.createElement("textarea")
  textarea.value = content
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  textarea.style.pointerEvents = "none"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand("copy")
  document.body.removeChild(textarea)
  return Boolean(copied)
}

function applySelectValue(selectEl, value) {
  const next = String(value || "").trim()
  if (!selectEl || !next) return false
  for (let index = 0; index < selectEl.options.length; index += 1) {
    if (selectEl.options[index].value === next) {
      selectEl.value = next
      return true
    }
  }
  return false
}

async function exportAudioSettingsConfig() {
  const payload = {
    exportedAt: new Date().toISOString(),
    audioSettings: buildAudioSettingsSnapshot()
  }
  const text = JSON.stringify(payload, null, 2)
  const copied = await copyTextToClipboard(text)
  if (copied) {
    toast("音频配置已复制到剪贴板")
    return
  }
  toast("复制失败，请手动复制弹窗内容")
  await openActionDialog({
    title: "音频配置导出",
    message: "请手动复制下方配置内容",
    inputLabel: "音频配置 JSON",
    inputValue: text,
    confirmText: "关闭",
    cancelText: "关闭"
  })
}

async function applyAudioSettingsConfig(settings) {
  const previousInput = String(els.audioInput.value || "")
  const previousOutput = String(els.audioOutput.value || "")
  state.micGain = settings.micGain
  state.remoteOutputGain = clampNumber(settings.remoteOutputGain, 0, 1, DEFAULT_REMOTE_OUTPUT_GAIN)
  state.micEnhanceEnabled = settings.micEnhanceEnabled
  state.noiseSuppressionEnabled = settings.noiseSuppressionEnabled
  state.echoCancellationEnabled = settings.echoCancellationEnabled
  state.accompanimentEnabled = settings.accompanimentEnabled
  state.accompanimentGain = settings.accompanimentGain
  state.accompanimentLimiterEnabled = settings.accompanimentLimiterEnabled
  state.outputTestGain = settings.outputTestGain
  state.pttEnabled = settings.pttEnabled
  state.pttKeyCode = settings.pttKeyCode
  stopAudioOutputTestTone(true)
  localStorage.setItem(MIC_GAIN_KEY, String(state.micGain))
  localStorage.setItem(REMOTE_OUTPUT_GAIN_KEY, String(state.remoteOutputGain))
  localStorage.setItem(MIC_ENHANCE_ENABLED_KEY, state.micEnhanceEnabled ? "1" : "0")
  localStorage.setItem(NOISE_SUPPRESSION_ENABLED_KEY, state.noiseSuppressionEnabled ? "1" : "0")
  localStorage.setItem(ECHO_CANCELLATION_ENABLED_KEY, state.echoCancellationEnabled ? "1" : "0")
  localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, state.accompanimentEnabled ? "1" : "0")
  localStorage.setItem(ACCOMPANIMENT_GAIN_KEY, String(state.accompanimentGain))
  localStorage.setItem(ACCOMPANIMENT_LIMITER_ENABLED_KEY, state.accompanimentLimiterEnabled ? "1" : "0")
  localStorage.setItem(OUTPUT_TEST_GAIN_KEY, String(state.outputTestGain))
  localStorage.setItem(PTT_ENABLED_KEY, state.pttEnabled ? "1" : "0")
  localStorage.setItem(PTT_KEY_CODE_KEY, state.pttKeyCode)
  applySelectValue(els.audioInput, settings.audioInputDeviceId)
  applySelectValue(els.audioOutput, settings.audioOutputDeviceId)
  localStorage.setItem(AUDIO_INPUT_DEVICE_KEY, String(els.audioInput.value || ""))
  localStorage.setItem(AUDIO_OUTPUT_DEVICE_KEY, String(els.audioOutput.value || ""))
  if (state.gainNode) {
    state.gainNode.gain.value = state.micGain
  }
  if (els.remoteOutputGain) {
    els.remoteOutputGain.value = String(state.remoteOutputGain)
    renderVolumeSlider(els.remoteOutputGain, els.remoteOutputGainPercent)
  }
  if (state.accompanimentActive && !state.accompanimentEnabled) {
    await setAccompanimentEnabled(false, false)
  }
  applyAccompanimentGainToNode()
  rebuildAudioProcessingGraph()
  rebuildAccompanimentProcessingGraph()
  setActiveAudioPreset("manual")
  syncPttControls()
  syncAudioEnhancementControls()
  if (state.localStream && previousInput !== String(els.audioInput.value || "")) {
    await switchAudioInput()
  }
  if (previousOutput !== String(els.audioOutput.value || "")) {
    await applyAudioOutputToRemoteAudios()
  }
  await applyAudioOutputToRemoteAudios()
  if (state.outputTestAudioElement?.setSinkId && els.audioOutput.value) {
    await state.outputTestAudioElement.setSinkId(els.audioOutput.value).catch(() => {})
  }
  setActiveAudioPreset("manual")
}

async function importAudioSettingsConfig() {
  const dialog = await openActionDialog({
    title: "导入音频配置",
    message: "粘贴音频配置 JSON 后确认导入",
    inputLabel: "音频配置 JSON",
    inputValue: "",
    confirmText: "导入",
    cancelText: "取消"
  })
  if (!dialog.confirmed) return
  const parsed = parseAudioSettingsPayload(dialog.inputValue)
  if (!parsed.ok) {
    toast(`导入失败：${parsed.error}`)
    return
  }
  try {
    await applyAudioSettingsConfig(parsed.settings)
    toast("音频配置导入成功")
  } catch {
    toast("导入失败：应用配置时出错")
  }
}

async function resetAudioSettingsToDefault() {
  const defaults = getDefaultAudioSettings()
  state.micEnhanceEnabled = defaults.micEnhanceEnabled
  state.noiseSuppressionEnabled = defaults.noiseSuppressionEnabled
  state.echoCancellationEnabled = defaults.echoCancellationEnabled
  state.accompanimentEnabled = defaults.accompanimentEnabled
  state.accompanimentGain = defaults.accompanimentGain
  state.outputTestGain = defaults.outputTestGain
  state.accompanimentLimiterEnabled = defaults.accompanimentLimiterEnabled
  state.pttEnabled = defaults.pttEnabled
  state.pttKeyCode = defaults.pttKeyCode
  state.micGain = defaults.micGain
  state.remoteOutputGain = defaults.remoteOutputGain
  state.pttPressed = false
  state.pttKeyCaptureActive = false
  stopAudioOutputTestTone(true)
  if (els.micGain) {
    els.micGain.value = String(defaults.micGain)
  }
  if (els.accompanimentGain) {
    els.accompanimentGain.value = String(defaults.accompanimentGain)
  }
  if (els.outputTestGain) {
    els.outputTestGain.value = String(defaults.outputTestGain)
  }
  if (els.remoteOutputGain) {
    els.remoteOutputGain.value = String(defaults.remoteOutputGain)
  }
  localStorage.setItem(MIC_ENHANCE_ENABLED_KEY, defaults.micEnhanceEnabled ? "1" : "0")
  localStorage.setItem(MIC_GAIN_KEY, String(defaults.micGain))
  localStorage.setItem(REMOTE_OUTPUT_GAIN_KEY, String(defaults.remoteOutputGain))
  localStorage.setItem(NOISE_SUPPRESSION_ENABLED_KEY, defaults.noiseSuppressionEnabled ? "1" : "0")
  localStorage.setItem(ECHO_CANCELLATION_ENABLED_KEY, defaults.echoCancellationEnabled ? "1" : "0")
  localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, defaults.accompanimentEnabled ? "1" : "0")
  localStorage.setItem(ACCOMPANIMENT_GAIN_KEY, String(defaults.accompanimentGain))
  localStorage.setItem(OUTPUT_TEST_GAIN_KEY, String(defaults.outputTestGain))
  localStorage.setItem(ACCOMPANIMENT_LIMITER_ENABLED_KEY, defaults.accompanimentLimiterEnabled ? "1" : "0")
  localStorage.setItem(PTT_ENABLED_KEY, defaults.pttEnabled ? "1" : "0")
  localStorage.setItem(PTT_KEY_CODE_KEY, defaults.pttKeyCode)
  if (state.gainNode) {
    state.gainNode.gain.value = defaults.micGain
  }
  if (defaults.accompanimentEnabled !== state.accompanimentActive && state.accompanimentActive) {
    await setAccompanimentEnabled(false, false)
  }
  applyAccompanimentGainToNode()
  rebuildAudioProcessingGraph()
  rebuildAccompanimentProcessingGraph()
  syncPttControls()
  syncAudioEnhancementControls()
  await applyAudioOutputToRemoteAudios()
  try {
    await refreshLocalInputCapture()
  } catch {}
  toast("音频设置已恢复默认")
}

function normalizePttKeyCode(value) {
  const code = String(value || "").trim()
  if (!code) return ""
  if (code === "Unidentified") return ""
  return code
}

function formatPttKeyCodeLabel(code) {
  const normalized = normalizePttKeyCode(code) || "F2"
  if (normalized === "Space") return "Space"
  if (normalized.startsWith("Key") && normalized.length === 4) return normalized.slice(3).toUpperCase()
  if (normalized.startsWith("Digit") && normalized.length === 6) return normalized.slice(5)
  if (normalized.startsWith("Numpad")) return `Num${normalized.slice(6)}`
  if (normalized === "ShiftLeft") return "左 Shift"
  if (normalized === "ShiftRight") return "右 Shift"
  if (normalized === "ControlLeft") return "左 Ctrl"
  if (normalized === "ControlRight") return "右 Ctrl"
  if (normalized === "AltLeft") return "左 Alt"
  if (normalized === "AltRight") return "右 Alt"
  if (normalized === "MetaLeft") return "左 Win/Cmd"
  if (normalized === "MetaRight") return "右 Win/Cmd"
  return normalized
}

function syncAudioEnhancementControls() {
  if (els.micEnhanceEnabled) {
    els.micEnhanceEnabled.checked = state.micEnhanceEnabled
  }
  if (els.noiseSuppressionEnabled) {
    els.noiseSuppressionEnabled.checked = state.noiseSuppressionEnabled
  }
  if (els.echoCancellationEnabled) {
    els.echoCancellationEnabled.checked = state.echoCancellationEnabled
  }
  if (els.accompanimentEnabled) {
    els.accompanimentEnabled.checked = state.accompanimentEnabled
  }
  if (els.accompanimentGain) {
    els.accompanimentGain.value = String(state.accompanimentGain)
  }
  if (els.accompanimentLimiterEnabled) {
    els.accompanimentLimiterEnabled.checked = state.accompanimentLimiterEnabled
  }
  if (els.micGain) {
    els.micGain.value = String(state.micGain)
  }
  if (els.remoteOutputGain) {
    els.remoteOutputGain.value = String(state.remoteOutputGain)
  }
  renderVolumeSlider(els.micGain, els.micGainPercent)
  renderVolumeSlider(els.remoteOutputGain, els.remoteOutputGainPercent)
  renderVolumeSlider(els.accompanimentGain, els.accompanimentGainPercent)
  if (els.outputTestGain) {
    els.outputTestGain.value = String(state.outputTestGain)
  }
  renderVolumeSlider(els.outputTestGain, els.outputTestGainPercent)
  renderAccompanimentLevel(0)
  if (els.testAudioOutputBtn) {
    els.testAudioOutputBtn.textContent = getOutputTestButtonLabel(state.outputTestActive)
  }
  if (els.audioOutputTestState && !state.outputTestActive) {
    els.audioOutputTestState.textContent = "未执行输出测试"
    els.audioOutputTestState.classList.remove("error")
  }
  if (els.audioPresetStatus) {
    els.audioPresetStatus.textContent = getAudioPresetStatusText(state.activeAudioPresetKey)
  }
  if (els.audioPresetCustomApplyBtn) {
    const hasCustomPreset = Boolean(String(localStorage.getItem(AUDIO_CUSTOM_PRESET_KEY) || "").trim())
    els.audioPresetCustomApplyBtn.disabled = !hasCustomPreset
  }
  if (els.audioAdvancedWrap) {
    els.audioAdvancedWrap.classList.toggle("hidden", !state.audioAdvancedVisible)
  }
  if (els.audioAdvancedToggleBtn) {
    els.audioAdvancedToggleBtn.textContent = state.audioAdvancedVisible ? "收起高级音频设置" : "显示高级音频设置"
  }
}

function getOutputTestButtonLabel(active) {
  return active ? "停止测试" : "录音并测试输出"
}

function clampOutputTestGain(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_OUTPUT_TEST_GAIN
  return Math.max(0, Math.min(0.12, parsed))
}

function clampNumber(value, minValue, maxValue, fallback) {
  const parsed = Number(value)
  const fallbackValue = Number(fallback)
  const candidate = Number.isFinite(parsed) ? parsed : fallbackValue
  return Math.max(Number(minValue), Math.min(Number(maxValue), candidate))
}

function formatOutputTestCountdownStatus(remainingSeconds) {
  const seconds = Math.max(0, Math.floor(Number(remainingSeconds || 0)))
  return `测试回放中，${seconds}s 后自动停止`
}

function setAudioOutputTestState(text, isError) {
  if (!els.audioOutputTestState) return
  els.audioOutputTestState.textContent = String(text || "")
  els.audioOutputTestState.classList.toggle("error", Boolean(isError))
}

function clearOutputTestTimers() {
  if (state.outputTestAutoStopTimer) {
    clearTimeout(state.outputTestAutoStopTimer)
    state.outputTestAutoStopTimer = null
  }
  if (state.outputTestCountdownTimer) {
    clearInterval(state.outputTestCountdownTimer)
    state.outputTestCountdownTimer = null
  }
  state.outputTestEndsAt = 0
}

function updateOutputTestCountdownState() {
  if (!state.outputTestActive || !state.outputTestEndsAt) return
  const remainingSeconds = Math.max(0, Math.ceil((state.outputTestEndsAt - Date.now()) / 1000))
  setAudioOutputTestState(formatOutputTestCountdownStatus(remainingSeconds), false)
}

async function toggleAudioOutputTestTone() {
  if (state.outputTestActive) {
    stopAudioOutputTestTone(false)
    return
  }
  await startAudioOutputTestTone()
}

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return ""
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac"
  ]
  for (let i = 0; i < candidates.length; i += 1) {
    if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i]
  }
  return ""
}

async function playOutputLegacyToneFallback() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    state.audioContext = new AudioContextClass()
  }
  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume()
  }
  stopAudioOutputTestTone(true)
  const destinationNode = state.audioContext.createMediaStreamDestination()
  const gainNode = state.audioContext.createGain()
  gainNode.gain.value = clampOutputTestGain(state.outputTestGain)
  const oscillatorNode = state.audioContext.createOscillator()
  oscillatorNode.type = "sine"
  oscillatorNode.frequency.value = 520
  oscillatorNode.connect(gainNode)
  gainNode.connect(destinationNode)
  const audio = new Audio()
  audio.autoplay = true
  audio.playsInline = true
  audio.srcObject = destinationNode.stream
  if (audio.setSinkId && els.audioOutput.value) {
    await audio.setSinkId(els.audioOutput.value).catch(() => {})
  }
  oscillatorNode.start()
  await audio.play()
  state.outputTestDestinationNode = destinationNode
  state.outputTestGainNode = gainNode
  state.outputTestOscillatorNode = oscillatorNode
  state.outputTestAudioElement = audio
  state.outputTestActive = true
  clearOutputTestTimers()
  state.outputTestEndsAt = Date.now() + OUTPUT_TEST_AUTO_STOP_MS
  updateOutputTestCountdownState()
  state.outputTestCountdownTimer = setInterval(() => {
    updateOutputTestCountdownState()
  }, 1000)
  state.outputTestAutoStopTimer = setTimeout(() => {
    stopAudioOutputTestTone(false, "测试音已自动停止")
  }, OUTPUT_TEST_AUTO_STOP_MS)
  if (els.testAudioOutputBtn) {
    els.testAudioOutputBtn.textContent = getOutputTestButtonLabel(true)
  }
}

function createWavBlobFromFloat32(chunks, sampleRate) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const pcm = new Int16Array(totalLength)
  let offset = 0
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    for (let j = 0; j < chunk.length; j += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[j]))
      pcm[offset] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      offset += 1
    }
  }
  const buffer = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(buffer)
  const writeString = (position, value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(position + i, value.charCodeAt(i))
    }
  }
  writeString(0, "RIFF")
  view.setUint32(4, 36 + pcm.length * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, pcm.length * 2, true)
  let pcmOffset = 44
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(pcmOffset, pcm[i], true)
    pcmOffset += 2
  }
  return new Blob([buffer], { type: "audio/wav" })
}

async function recordOutputTestAudioWithMediaRecorder(inputStream) {
  const recorderMimeType = getSupportedRecorderMimeType()
  const recorder = recorderMimeType ? new MediaRecorder(inputStream, { mimeType: recorderMimeType }) : new MediaRecorder(inputStream)
  state.outputTestRecorder = recorder
  const chunks = []
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  }
  recorder.start()
  await new Promise((resolve) => {
    state.outputTestAutoStopTimer = setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop()
    }, OUTPUT_TEST_RECORD_MS)
    recorder.onstop = () => resolve()
  })
  clearOutputTestTimers()
  return new Blob(chunks, { type: recorder.mimeType || "audio/webm" })
}

async function recordOutputTestAudioWithPcm(inputStream) {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    state.audioContext = new AudioContextClass()
  }
  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume()
  }
  const source = state.audioContext.createMediaStreamSource(inputStream)
  const processor = state.audioContext.createScriptProcessor(4096, 1, 1)
  const monitorGain = state.audioContext.createGain()
  monitorGain.gain.value = 0
  state.outputTestProcessorNode = processor
  state.outputTestMonitorGainNode = monitorGain
  const chunks = []
  processor.onaudioprocess = (event) => {
    const channel = event.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(channel))
  }
  source.connect(processor)
  processor.connect(monitorGain)
  monitorGain.connect(state.audioContext.destination)
  await new Promise((resolve) => {
    state.outputTestAutoStopTimer = setTimeout(() => resolve(), OUTPUT_TEST_RECORD_MS)
  })
  clearOutputTestTimers()
  processor.onaudioprocess = null
  source.disconnect()
  processor.disconnect()
  monitorGain.disconnect()
  state.outputTestProcessorNode = null
  state.outputTestMonitorGainNode = null
  return createWavBlobFromFloat32(chunks, state.audioContext.sampleRate || 48000)
}

async function startAudioOutputTestTone() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("当前浏览器不支持录音测试")
    }
    stopAudioOutputTestTone(true)
    const inputStream = await requestLocalInputStream()
    state.outputTestInputStream = inputStream
    state.outputTestActive = true
    clearOutputTestTimers()
    state.outputTestEndsAt = Date.now() + OUTPUT_TEST_AUTO_STOP_MS
    setAudioOutputTestState("正在录音，请说一句话…", false)
    let blob = null
    if (typeof MediaRecorder !== "undefined") {
      try {
        blob = await recordOutputTestAudioWithMediaRecorder(inputStream)
      } catch {
        blob = await recordOutputTestAudioWithPcm(inputStream)
      }
    } else {
      blob = await recordOutputTestAudioWithPcm(inputStream)
    }
    if (!blob.size) {
      throw new Error("录音内容为空，请检查麦克风权限")
    }
    const audio = new Audio()
    audio.autoplay = true
    audio.playsInline = true
    const audioUrl = URL.createObjectURL(blob)
    audio.src = audioUrl
    const testGainRatio = clampNumber(state.outputTestGain / DEFAULT_OUTPUT_TEST_GAIN, 0, 1, 1)
    audio.volume = clampNumber(state.remoteOutputGain * testGainRatio, 0, 1, DEFAULT_REMOTE_OUTPUT_GAIN)
    if (audio.setSinkId && els.audioOutput.value) {
      await audio.setSinkId(els.audioOutput.value).catch(() => {})
    }
    state.outputTestAudioElement = audio
    state.outputTestAudioUrl = audioUrl
    state.outputTestActive = true
    state.outputTestEndsAt = Date.now() + OUTPUT_TEST_AUTO_STOP_MS
    updateOutputTestCountdownState()
    state.outputTestCountdownTimer = setInterval(() => {
      updateOutputTestCountdownState()
    }, 1000)
    state.outputTestAutoStopTimer = setTimeout(() => {
      stopAudioOutputTestTone(false, "测试回放已自动停止")
    }, OUTPUT_TEST_AUTO_STOP_MS)
    audio.onended = () => {
      stopAudioOutputTestTone(false, "测试回放已完成")
    }
    try {
      await audio.play()
    } catch {
      await playOutputLegacyToneFallback()
      return
    }
    if (els.testAudioOutputBtn) {
      els.testAudioOutputBtn.textContent = getOutputTestButtonLabel(true)
    }
  } catch (error) {
    stopAudioOutputTestTone(true)
    setAudioOutputTestState(`测试失败：${error?.message || "请检查浏览器音频权限"}`, true)
  }
}

function stopAudioOutputTestTone(silent, stopReason = "") {
  clearOutputTestTimers()
  const oscillatorNode = state.outputTestOscillatorNode
  if (oscillatorNode) {
    try {
      oscillatorNode.stop()
    } catch {}
    oscillatorNode.disconnect()
  }
  state.outputTestGainNode?.disconnect()
  state.outputTestDestinationNode?.disconnect()
  state.outputTestProcessorNode?.disconnect()
  state.outputTestMonitorGainNode?.disconnect()
  if (state.outputTestRecorder && state.outputTestRecorder.state !== "inactive") {
    try {
      state.outputTestRecorder.stop()
    } catch {}
  }
  if (state.outputTestInputStream) {
    state.outputTestInputStream.getTracks().forEach((track) => track.stop())
  }
  if (state.outputTestAudioElement) {
    state.outputTestAudioElement.pause()
    state.outputTestAudioElement.srcObject = null
    state.outputTestAudioElement.src = ""
  }
  if (state.outputTestAudioUrl) {
    URL.revokeObjectURL(state.outputTestAudioUrl)
  }
  state.outputTestOscillatorNode = null
  state.outputTestGainNode = null
  state.outputTestDestinationNode = null
  state.outputTestRecorder = null
  state.outputTestInputStream = null
  state.outputTestProcessorNode = null
  state.outputTestMonitorGainNode = null
  state.outputTestAudioElement = null
  state.outputTestAudioUrl = ""
  state.outputTestActive = false
  if (els.testAudioOutputBtn) {
    els.testAudioOutputBtn.textContent = getOutputTestButtonLabel(false)
  }
  if (!silent) {
    setAudioOutputTestState(stopReason || "测试已停止", false)
  } else {
    setAudioOutputTestState("未执行输出测试", false)
  }
}

function renderVolumeSlider(rangeInput, percentText) {
  if (!(rangeInput instanceof HTMLInputElement)) return
  const minValue = Number(rangeInput.min || 0)
  const maxValue = Number(rangeInput.max || 1)
  const rawValue = Number(rangeInput.value || 0)
  const safeMin = Number.isFinite(minValue) ? minValue : 0
  const safeMax = Number.isFinite(maxValue) && maxValue > safeMin ? maxValue : safeMin + 1
  const clampedValue = Math.max(safeMin, Math.min(safeMax, rawValue))
  const fillPercent = Math.max(0, Math.min(100, ((clampedValue - safeMin) / (safeMax - safeMin)) * 100))
  rangeInput.style.background = `linear-gradient(90deg, #00a1d6 0%, #00a1d6 ${fillPercent}%, #f0f2f5 ${fillPercent}%, #f0f2f5 100%)`
  if (percentText instanceof HTMLElement) {
    const gainPercent = Math.max(0, Math.round(clampedValue * 100))
    percentText.textContent = `当前音量：${gainPercent}%`
  }
}

function resolveAccompanimentMeterState(levelPercent, active, muted, clipUntil, now) {
  if (!active) {
    return {
      text: "伴奏电平：0%",
      statusText: "伴奏状态：待开启",
      clipping: false
    }
  }
  if (muted) {
    return {
      text: "伴奏电平：已静音",
      statusText: "伴奏状态：临时静音",
      clipping: false
    }
  }
  const clipping = now <= clipUntil
  return {
    text: clipping ? `伴奏电平：${levelPercent}%（过载）` : `伴奏电平：${levelPercent}%`,
    statusText: clipping ? "伴奏状态：检测到过载，已自动限幅" : "伴奏状态：正常",
    clipping
  }
}

function renderAccompanimentLevel(rawLevel) {
  const now = Date.now()
  const level = Math.max(0, Math.min(1, Number(rawLevel || 0)))
  const levelPercent = Math.round(level * 100)
  if (!state.accompanimentTemporarilyMuted && state.accompanimentActive && level >= 0.94) {
    state.accompanimentClipUntil = now + 900
  }
  const meter = resolveAccompanimentMeterState(
    levelPercent,
    state.accompanimentActive,
    state.accompanimentTemporarilyMuted,
    state.accompanimentClipUntil,
    now
  )
  if (els.accompanimentLevelFill) {
    els.accompanimentLevelFill.style.width = `${state.accompanimentTemporarilyMuted ? 0 : levelPercent}%`
  }
  if (els.accompanimentLevelWrap) {
    els.accompanimentLevelWrap.classList.toggle("muted", state.accompanimentTemporarilyMuted || !state.accompanimentActive)
    els.accompanimentLevelWrap.classList.toggle("clipping", meter.clipping)
  }
  if (els.accompanimentLevelText) {
    els.accompanimentLevelText.textContent = meter.text
  }
  if (els.accompanimentClipText) {
    els.accompanimentClipText.textContent = meter.statusText
  }
}

function normalizePresenceStatus(status) {
  return String(status || "").trim() === "busy" ? "busy" : "online"
}

function updateSelfStatus(status) {
  if (!state.user) return
  const normalizedStatus = normalizePresenceStatus(status)
  if (state.user.status === normalizedStatus) return
  state.user = {
    ...state.user,
    status: normalizedStatus
  }
  localStorage.setItem("user", JSON.stringify(state.user))
}

function sendPresenceStatus(status) {
  const normalizedStatus = normalizePresenceStatus(status)
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    state.pendingPresenceStatus = normalizedStatus
    return false
  }
  sendWs(WS_EVENTS.PRESENCE_UPDATE, { status: normalizedStatus })
  if (state.pendingPresenceStatus === normalizedStatus) {
    state.pendingPresenceStatus = null
  }
  return true
}

function flushPendingPresenceStatus() {
  const status = state.pendingPresenceStatus || state.user?.status || els.busyBtn?.dataset.status || "online"
  sendPresenceStatus(status)
}

function applyPresenceStatus(status, shouldSend = true) {
  const normalizedStatus = normalizePresenceStatus(status)
  updateSelfStatus(normalizedStatus)
  els.busyBtn.dataset.status = normalizedStatus
  els.busyBtn.textContent = normalizedStatus === "busy" ? "设为在线" : "忙碌"
  syncDesktopRuntimeState()
  if (shouldSend) {
    sendPresenceStatus(normalizedStatus)
  }
}

function syncSelfPresenceStatus(users) {
  const selfId = String(state.user?.id || "")
  if (!selfId) return
  const me = users.find((user) => String(user?.id || "") === selfId)
  if (!me) return
  const status = normalizePresenceStatus(me.status)
  updateSelfStatus(status)
  if (state.pendingPresenceStatus === status) {
    state.pendingPresenceStatus = null
  }
  applyPresenceStatus(status, false)
}

function hasAuthenticatedSession() {
  return Boolean(state.token && state.user?.id)
}

function notifyLoginRequired() {
  const now = Date.now()
  if (now - state.lastLoginRequiredToastAt < LOGIN_REQUIRED_TOAST_COOLDOWN) return
  state.lastLoginRequiredToastAt = now
  toast("请先登录")
}

function registerAudioPlaybackUnlock() {
  if (state.audioPlaybackUnlockRegistered && state.audioPlaybackUnlocked) return
  state.audioPlaybackUnlockRegistered = true
  const unlock = async () => {
    if (state.audioPlaybackUnlocked) return
    state.audioPlaybackUnlocked = true
    await unlockAudioPlaybackNow(false)
  }
  window.addEventListener("pointerdown", unlock, { once: true })
  window.addEventListener("keydown", unlock, { once: true })
}

async function unlockAudioPlaybackNow(shouldToast) {
  if (state.audioContext?.state === "suspended") {
    await state.audioContext.resume().catch(() => {})
  }
  await syncOutgoingAudioTrack().catch(() => {})
  await applyAudioOutputToRemoteAudios()
  const audios = [...state.remoteAudios.values()]
  for (let i = 0; i < audios.length; i++) {
    const audio = audios[i]
    if (!audio) continue
    if (audio.srcObject instanceof MediaStream) {
      const tracks = audio.srcObject.getTracks()
      for (let j = 0; j < tracks.length; j++) {
        if (tracks[j].readyState === "live") tracks[j].enabled = true
      }
    }
    await audio.play().catch(() => {})
  }
  if (shouldToast) {
    toast("已尝试恢复声音播放")
  }
}

function syncSessionActionControls() {
  const canSession = hasAuthenticatedSession()
  const canInRoomAction = canSession && Boolean(state.roomId)
  els.newRoomName.disabled = !canSession
  els.createRoomBtn.disabled = !canSession
  els.chatInput.disabled = !canInRoomAction
  els.sendBtn.disabled = !canInRoomAction
  els.fileInput.disabled = !canInRoomAction
  if (els.muteBtn) {
    els.muteBtn.classList.toggle("is-disabled", !canSession)
    els.muteBtn.setAttribute("aria-disabled", String(!canSession))
    els.muteBtn.tabIndex = canSession ? 0 : -1
  }
  if (els.speakerBtn) {
    els.speakerBtn.classList.toggle("is-disabled", !canInRoomAction)
    els.speakerBtn.setAttribute("aria-disabled", String(!canInRoomAction))
    els.speakerBtn.tabIndex = canInRoomAction ? 0 : -1
  }
  els.busyBtn.disabled = !canSession
  if (els.reconnectBtn) {
    els.reconnectBtn.disabled = !canSession
    if (!canSession) {
      els.reconnectBtn.classList.add("hidden")
    }
  }
  if (els.audioSettingsBtn) {
    els.audioSettingsBtn.classList.toggle("hidden", !canInRoomAction)
    els.audioSettingsBtn.title = canInRoomAction ? "打开音频设置面板" : "加入房间后可使用"
  }
  if (els.switchAuthBtn) {
    els.switchAuthBtn.classList.toggle("hidden", !canSession)
  }
  if (els.clearPrivateSessionBtn) {
    const hasPrivateSession = canInRoomAction && Boolean(state.privateSessionUserId)
    els.clearPrivateSessionBtn.classList.toggle("hidden", !hasPrivateSession)
  }
  if (els.privateSessionBadge) {
    const hasPrivateSession = canInRoomAction && Boolean(state.privateSessionUserId)
    els.privateSessionBadge.classList.toggle("hidden", !hasPrivateSession)
    if (hasPrivateSession) {
      els.privateSessionBadge.textContent = `私聊：${state.privateSessionUsername || "未知用户"}`
      els.privateSessionBadge.className = "access-badge allow"
    } else {
      els.privateSessionBadge.textContent = ""
      els.privateSessionBadge.className = "access-badge hidden"
    }
  }
  if (els.accompanimentBadge) {
    const hasAccompaniment = canInRoomAction && state.accompanimentActive
    els.accompanimentBadge.classList.toggle("hidden", !hasAccompaniment)
    if (hasAccompaniment) {
      if (state.accompanimentTemporarilyMuted) {
        els.accompanimentBadge.textContent = "伴奏：已静音"
        els.accompanimentBadge.className = "access-badge warn"
      } else {
        const gainPercent = Math.round(clampAccompanimentGain(state.accompanimentGain) * 100)
        els.accompanimentBadge.textContent = `伴奏：开启（${gainPercent}%）`
        els.accompanimentBadge.className = "access-badge allow"
      }
    } else {
      els.accompanimentBadge.textContent = ""
      els.accompanimentBadge.className = "access-badge hidden"
    }
  }
  if (els.toggleAccompanimentMuteBtn) {
    const hasAccompaniment = canInRoomAction && state.accompanimentActive
    els.toggleAccompanimentMuteBtn.classList.toggle("hidden", !hasAccompaniment)
    els.toggleAccompanimentMuteBtn.disabled = !hasAccompaniment
    els.toggleAccompanimentMuteBtn.textContent = state.accompanimentTemporarilyMuted ? "恢复伴奏" : "伴奏静音"
  }
  if (els.retryUploadBtn) {
    const canRetry = canInRoomAction && Boolean(state.lastFailedUpload?.file)
    els.retryUploadBtn.classList.toggle("hidden", !canRetry)
  }
  if (els.liveSourceSelect) {
    els.liveSourceSelect.classList.toggle("hidden", !canInRoomAction)
    els.liveSourceSelect.disabled = !canInRoomAction
    els.liveSourceSelect.title = canInRoomAction ? "选择直播源（桌面/窗口）" : "加入房间后可使用"
  }
  if (els.liveQualitySelect) {
    els.liveQualitySelect.classList.toggle("hidden", !canInRoomAction)
    els.liveQualitySelect.disabled = !canInRoomAction
  }
  if (els.forceRelayWrap) {
    els.forceRelayWrap.classList.toggle("hidden", !canInRoomAction)
  }
  if (els.liveToggleBtn) {
    const occupiedByOther = Boolean(state.liveActiveUserId) && state.liveActiveUserId !== String(state.user?.id || "")
    const canStopLive = canInRoomAction && Boolean(state.liveTrack)
    const canStartLive = canInRoomAction && !state.liveTrack && !occupiedByOther
    els.liveToggleBtn.classList.toggle("hidden", !canInRoomAction)
    els.liveToggleBtn.disabled = !(canStartLive || canStopLive)
    if (occupiedByOther && !state.liveTrack) {
      els.liveToggleBtn.textContent = "他人直播中"
      els.liveToggleBtn.title = "当前房间已有其他人直播"
    } else {
      els.liveToggleBtn.textContent = state.liveTrack ? "停止直播" : "开始直播"
      els.liveToggleBtn.title = state.liveTrack ? "点击停止当前直播" : "点击开始直播"
    }
  }
  if (els.livePanel) {
    const hasLive = getHasLiveContent()
    els.livePanel.classList.toggle("hidden", !hasLive)
  }
  syncLiveSceneMode()
}

function toggleMuteAction() {
  if (!hasAuthenticatedSession()) return false
  state.isMuted = !state.isMuted
  state.pttPressed = false
  applyEffectiveMuteState()
  renderLocalMicLevel(0)
  return true
}

function toggleBusyAction(shouldNotify) {
  if (!hasAuthenticatedSession()) return false
  const status = els.busyBtn.dataset.status === "busy" ? "online" : "busy"
  applyPresenceStatus(status, true)
  if (shouldNotify) {
    toast(status === "busy" ? "已切换为忙碌状态" : "已切换为在线状态")
  }
  return true
}

function syncDesktopShortcutControls() {
  const hasDesktop = Boolean(window.desktopBridge?.getConfig)
  state.isDesktopBridge = hasDesktop
  applyShortcutInputs()
  applyDesktopConfigInputs(state.desktopConfig || {})
  syncDesktopOnlyOptionInputs(hasDesktop)
  if (!hasDesktop) {
    setDesktopShortcutState("网页端快捷键当前页面生效，桌面选项仅桌面端可用", false)
    return
  }
  syncDesktopRuntimeState()
  setDesktopShortcutState("正在读取桌面配置...", false)
  loadDesktopShortcutConfig()
}

async function loadDesktopShortcutConfig() {
  if (!window.desktopBridge?.getConfig) return
  try {
    const config = await window.desktopBridge.getConfig()
    state.desktopConfig = config
    state.globalMuteShortcut = normalizeShortcutText(config?.globalMuteShortcut, "CommandOrControl+Shift+M")
    state.globalBusyShortcut = normalizeShortcutText(config?.globalBusyShortcut, "CommandOrControl+Shift+B")
    state.globalReconnectShortcut = normalizeShortcutText(config?.globalReconnectShortcut, "CommandOrControl+Shift+R")
    localStorage.setItem(GLOBAL_MUTE_SHORTCUT_KEY, state.globalMuteShortcut)
    localStorage.setItem(GLOBAL_BUSY_SHORTCUT_KEY, state.globalBusyShortcut)
    localStorage.setItem(GLOBAL_RECONNECT_SHORTCUT_KEY, state.globalReconnectShortcut)
    applyShortcutInputs()
    applyDesktopConfigInputs(config)
    syncDesktopOnlyOptionInputs(true)
    const shortcutState = config?.shortcutState
    if (shortcutState) {
      const muteOk = Boolean(shortcutState.muteRegistered)
      const busyOk = Boolean(shortcutState.busyRegistered)
      const reconnectOk = Boolean(shortcutState.reconnectRegistered)
      if (muteOk && busyOk && reconnectOk) {
        setDesktopShortcutState("桌面快捷键已生效", false)
      } else {
        setDesktopShortcutState("部分快捷键未注册成功，请调整后保存", true)
      }
      return
    }
    setDesktopShortcutState("桌面配置已加载", false)
  } catch {
    setDesktopShortcutState("读取桌面配置失败", true)
  }
}

async function saveDesktopShortcutConfig() {
  const muteShortcut = normalizeShortcutText(els.globalMuteShortcut?.value, "CommandOrControl+Shift+M")
  const busyShortcut = normalizeShortcutText(els.globalBusyShortcut?.value, "CommandOrControl+Shift+B")
  const reconnectShortcut = normalizeShortcutText(els.globalReconnectShortcut?.value, "CommandOrControl+Shift+R")
  const launchAtStartup = Boolean(els.launchAtStartup?.checked)
  const minimizeToTray = Boolean(els.minimizeToTray?.checked)
  state.globalMuteShortcut = muteShortcut
  state.globalBusyShortcut = busyShortcut
  state.globalReconnectShortcut = reconnectShortcut
  localStorage.setItem(GLOBAL_MUTE_SHORTCUT_KEY, muteShortcut)
  localStorage.setItem(GLOBAL_BUSY_SHORTCUT_KEY, busyShortcut)
  localStorage.setItem(GLOBAL_RECONNECT_SHORTCUT_KEY, reconnectShortcut)
  applyShortcutInputs()
  if (!window.desktopBridge?.setConfig) {
    setDesktopShortcutState("网页端已保存，快捷键当前页面生效，桌面选项不会生效", false)
    toast("网页快捷键已保存")
    return
  }
  try {
    const config = await window.desktopBridge.setConfig({
      globalMuteShortcut: muteShortcut,
      globalBusyShortcut: busyShortcut,
      globalReconnectShortcut: reconnectShortcut,
      launchAtStartup,
      minimizeToTray
    })
    state.desktopConfig = config
    applyDesktopConfigInputs(config)
    const shortcutState = config?.shortcutState
    if (shortcutState?.muteRegistered && shortcutState?.busyRegistered && shortcutState?.reconnectRegistered) {
      setDesktopShortcutState("保存成功，快捷键已更新", false)
      toast("桌面快捷键已更新")
      return
    }
    setDesktopShortcutState("已保存，但存在未注册成功的快捷键", true)
    toast("部分桌面快捷键未注册成功，请更换组合键")
  } catch {
    setDesktopShortcutState("保存桌面快捷键失败", true)
    toast("保存桌面快捷键失败，请重试")
  }
}

function setDesktopShortcutState(text, isError) {
  if (!els.desktopShortcutState) return
  els.desktopShortcutState.textContent = String(text || "")
  els.desktopShortcutState.classList.toggle("error", Boolean(isError))
}

function applyShortcutInputs() {
  if (els.globalMuteShortcut) {
    els.globalMuteShortcut.value = state.globalMuteShortcut
  }
  if (els.globalBusyShortcut) {
    els.globalBusyShortcut.value = state.globalBusyShortcut
  }
  if (els.globalReconnectShortcut) {
    els.globalReconnectShortcut.value = state.globalReconnectShortcut
  }
}

function applyDesktopConfigInputs(config) {
  if (els.launchAtStartup) {
    els.launchAtStartup.checked = Boolean(config?.launchAtStartup)
  }
  if (els.minimizeToTray) {
    els.minimizeToTray.checked = config?.minimizeToTray !== false
  }
}

function syncDesktopOnlyOptionInputs(hasDesktop) {
  if (els.launchAtStartup) {
    els.launchAtStartup.disabled = !hasDesktop
  }
  if (els.minimizeToTray) {
    els.minimizeToTray.disabled = !hasDesktop
  }
}

function normalizeShortcutText(rawValue, fallback) {
  const value = String(rawValue || "").trim()
  return value || fallback
}

function handleWebShortcutKeydown(event) {
  if (state.isDesktopBridge) return false
  if (event.repeat) return false
  if (event.target instanceof HTMLElement) {
    const tag = event.target.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return false
  }
  if (matchShortcutEvent(event, state.globalMuteShortcut)) {
    event.preventDefault()
    if (!toggleMuteAction()) {
      notifyLoginRequired()
    }
    return true
  }
  if (matchShortcutEvent(event, state.globalBusyShortcut)) {
    event.preventDefault()
    if (!toggleBusyAction(true)) {
      notifyLoginRequired()
    }
    return true
  }
  if (matchShortcutEvent(event, state.globalReconnectShortcut)) {
    event.preventDefault()
    if (forceSocketReconnect()) {
      toast("已触发重连")
    } else {
      notifyLoginRequired()
    }
    return true
  }
  return false
}

function matchShortcutEvent(event, shortcut) {
  const parsed = parseShortcut(shortcut)
  if (!parsed.key) return false
  if (parsed.ctrl !== event.ctrlKey) return false
  if (parsed.alt !== event.altKey) return false
  if (parsed.shift !== event.shiftKey) return false
  if (parsed.meta !== event.metaKey) return false
  return String(event.key || "").toLowerCase() === parsed.key
}

function parseShortcut(shortcut) {
  const tokens = String(shortcut || "")
    .split("+")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  const parsed = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: ""
  }
  for (const token of tokens) {
    if (token === "commandorcontrol") {
      if (navigator.platform.toLowerCase().includes("mac")) {
        parsed.meta = true
      } else {
        parsed.ctrl = true
      }
      continue
    }
    if (token === "ctrl" || token === "control") {
      parsed.ctrl = true
      continue
    }
    if (token === "alt" || token === "option") {
      parsed.alt = true
      continue
    }
    if (token === "shift") {
      parsed.shift = true
      continue
    }
    if (token === "cmd" || token === "command" || token === "meta") {
      parsed.meta = true
      continue
    }
    parsed.key = normalizeShortcutKeyToken(token)
  }
  return parsed
}

function normalizeShortcutKeyToken(token) {
  if (token === "space" || token === "spacebar") return " "
  return token.length === 1 ? token : token
}

function getEffectiveMuted() {
  if (!state.pttEnabled) return state.isMuted
  return state.isMuted || !state.pttPressed
}

function applyEffectiveMuteState() {
  const effectiveMuted = getEffectiveMuted()
  if (state.micOutputNode) {
    state.micOutputNode.gain.value = effectiveMuted ? 0 : 1
  }
  if (state.localStream) {
    state.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !effectiveMuted
    })
  }
  if (els.muteBtn) {
    els.muteBtn.classList.toggle("is-off", effectiveMuted)
    const label = state.pttEnabled
      ? (effectiveMuted ? "麦克风已静音（按住说话）" : "麦克风开启（按住说话）")
      : (effectiveMuted ? "麦克风已静音" : "麦克风开启")
    els.muteBtn.setAttribute("aria-label", label)
    els.muteBtn.setAttribute("title", label)
  }
  syncDesktopRuntimeState()
}

function syncDesktopRuntimeState() {
  if (!window.desktopBridge?.updateRuntimeState) return
  const isAuthenticated = hasAuthenticatedSession()
  const isConnected = isAuthenticated && Boolean(state.ws && state.ws.readyState === WebSocket.OPEN)
  const isBusy = isAuthenticated && els.busyBtn?.dataset.status === "busy"
  const isMuted = isAuthenticated && getEffectiveMuted()
  window.desktopBridge.updateRuntimeState({
    muted: isMuted,
    busy: isBusy,
    connected: isConnected,
    authenticated: isAuthenticated
  }).catch(() => {})
}

async function handleAuth(type) {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    state.audioContext = new AudioContextClass()
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {})
  }
  try {
    const username = els.username.value.trim()
    const password = els.password.value.trim()
    let payload = {}
    let endpoint = "/auth/guest"
    if (type === "register") {
      endpoint = "/auth/register"
      payload = { username, password }
    } else if (type === "login") {
      endpoint = "/auth/login"
      payload = { username, password }
    } else {
      payload = { nickname: username || undefined }
    }
    const result = await request(endpoint, "POST", payload)
    state.token = result.token
    state.user = result.user
    localStorage.setItem("token", state.token)
    localStorage.setItem("user", JSON.stringify(state.user))
    showAuthState()
    await fetchRooms()
    connectSocket({ resetBackoff: true })
  } catch (error) {
    toast(`登录失败：${error.message}`)
  }
}

function showAuthState() {
  state.lastLoginRequiredToastAt = 0
  els.authPanel.classList.add("hidden")
  els.roomPanel.classList.remove("hidden")
  setSettingsPanelOpen(false)
  syncUiFlow()
  syncSessionActionControls()
  els.selfUser.textContent = state.user ? `${state.user.username}` : "未登录"
  applyPresenceStatus(state.user?.status || "online", false)
  updateRoomAccessBar()
  renderVoiceRoomUsers()
}

function showLoggedOutState(reason = "") {
  state.lastLoginRequiredToastAt = 0
  const ws = state.ws
  if (ws && ws.readyState <= WebSocket.OPEN) {
    ws.close()
  }
  state.ws = null
  state.token = ""
  state.user = null
  state.pendingPresenceStatus = null
  state.joiningRoomId = ""
  state.roomId = ""
  state.preferredRoomId = ""
  state.onlineUsers = []
  state.onlineUsersSignature = ""
  state.lastServerHeartbeatAt = 0
  state.isMuted = false
  state.pttPressed = false
  state.isSettingsOpen = false
  state.privateSessionUserId = ""
  state.privateSessionUsername = ""
  state.privateSessionExpireAt = 0
  state.privateSessionRecovery = null
  state.lastFailedUpload = null
  state.accompanimentEnabled = false
  localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, "0")
  if (els.accompanimentEnabled) {
    els.accompanimentEnabled.checked = false
  }
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  localStorage.removeItem("room_id")
  resetVoiceSessionState()
  cancelReconnectSchedule()
  stopSocketHeartbeatWatchdog()
  renderRooms()
  renderOnlineUsers()
  updateRoomAccessBar()
  renderVoiceRoomUsers()
  els.authPanel.classList.remove("hidden")
  els.roomPanel.classList.add("hidden")
  els.settingsPanel.classList.add("hidden")
  syncUiFlow()
  syncSessionActionControls()
  els.selfUser.textContent = "未登录"
  applyEffectiveMuteState()
  applyPresenceStatus("online", false)
  els.activeRoomName.textContent = "未加入房间"
  setConnectionState("error", reason || "登录已失效，请重新登录")
  els.reconnectBtn.classList.add("hidden")
  syncDesktopRuntimeState()
}

async function fetchRooms() {
  try {
    const result = await request("/rooms", "GET")
    state.roomList = (result.rooms || []).map(normalizeRoom)
    renderRooms()
  } catch (error) {
    toast(`获取房间失败：${error.message}`)
  }
}

async function createRoom() {
  if (!hasAuthenticatedSession()) {
    notifyLoginRequired()
    return
  }
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    state.audioContext = new AudioContextClass()
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {})
  }
  if (!state.audioStreamUnlocked) {
    state.audioStreamUnlocked = true
    const silent = document.createElement("audio")
    silent.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
    silent.play().catch(() => {})
  }
  const name = els.newRoomName.value.trim()
  if (!name) return
  try {
    await request("/rooms", "POST", { name })
    els.newRoomName.value = ""
    await fetchRooms()
  } catch (error) {
    toast(`创建房间失败：${error.message}`)
  }
}

function renderRooms() {
  els.roomList.innerHTML = ""
  const canSession = hasAuthenticatedSession()
  state.roomList.forEach((room) => {
    const li = document.createElement("li")
    const row = document.createElement("div")
    row.className = "room-row"
    const button = document.createElement("button")
    button.className = "room-join-btn"
    const status = formatRoomStatus(room)
    const roomLabel = `${room.name} (${room.onlineCount ?? 0})${status ? ` ${status}` : ""}`
    button.textContent = roomLabel
    const isActiveRoom = state.roomId === room.id
    button.classList.toggle("active-room", isActiveRoom)
    button.title = isActiveRoom ? `当前所在房间：${roomLabel}` : `切换到房间：${roomLabel}`
    button.disabled = !canSession || Boolean(room.is_locked)
    button.onclick = () => joinRoom(room)
    row.appendChild(button)
    const canDelete = canDeleteRoomOnClient(room)
    if (canDelete) {
      const deleteButton = document.createElement("button")
      deleteButton.type = "button"
      deleteButton.className = "room-delete-btn"
      deleteButton.textContent = "删除"
      deleteButton.disabled = !canSession
      deleteButton.onclick = () => {
        deleteRoomByUser(room).catch((error) => {
          toast(`删除房间失败：${error.message}`)
        })
      }
      row.appendChild(deleteButton)
    }
    li.appendChild(row)
    els.roomList.appendChild(li)
  })
}

function canDeleteRoomOnClient(room) {
  const userId = String(state.user?.id || "")
  const role = String(state.user?.role || "")
  const createdBy = String(room?.created_by || "")
  if (!userId) return false
  if (role === "admin") return true
  return Boolean(createdBy && createdBy === userId)
}

async function deleteRoomByUser(room) {
  if (!hasAuthenticatedSession()) {
    notifyLoginRequired()
    return
  }
  const roomId = String(room?.id || "")
  const roomName = String(room?.name || "")
  if (!roomId || !roomName) return
  const onlineCount = Number(room.onlineCount || 0)
  const dialogResult = await openActionDialog({
    title: "删除房间",
    message: onlineCount > 0
      ? `房间“${roomName}”当前仍有 ${onlineCount} 名在线成员。\n请输入房间名确认删除。`
      : `请输入房间名“${roomName}”确认删除。`,
    inputLabel: "确认房间名",
    checkboxLabel: onlineCount > 0 ? "强制删除并断开当前在线成员" : "",
    confirmText: "删除",
    cancelText: "取消"
  })
  if (!dialogResult.confirmed) return
  const normalizedConfirmation = dialogResult.inputValue
  if (!normalizedConfirmation) {
    toast("删除已取消：未输入房间名")
    return
  }
  if (normalizedConfirmation !== roomName) {
    toast("删除已取消：房间名不一致")
    return
  }
  const force = onlineCount > 0 ? Boolean(dialogResult.checked) : false
  if (onlineCount > 0 && !force) {
    toast("删除已取消：请勾选强制删除")
    return
  }
  await request(`/rooms/${roomId}`, "DELETE", {
    confirmationText: normalizedConfirmation,
    reason: "房主主动关闭房间",
    force
  })
  if (state.roomId === roomId) {
    clearActiveRoomState()
  }
  await fetchRooms()
  toast(`房间 ${roomName} 已删除`)
}

async function joinRoom(room) {
  if (!hasAuthenticatedSession()) {
    notifyLoginRequired()
    return
  }
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    state.audioContext = new AudioContextClass()
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {})
  }
  if (!state.audioStreamUnlocked) {
    state.audioStreamUnlocked = true
    const silent = document.createElement("audio")
    silent.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
    silent.play().catch(() => {})
  }
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    toast("连接未就绪，请稍后重试")
    return
  }
  if (room.is_locked) {
    toast("该房间已锁定")
    return
  }
  if (state.roomId === room.id || state.joiningRoomId === room.id) return
  if (state.roomId && state.roomId !== room.id) {
    await stopLiveShare(true, false).catch(() => {})
    removeAllRemoteLiveStreams()
    setLiveStatus("当前无人直播")
    closeAllPeers()
  }
  state.joiningRoomId = room.id
  state.preferredRoomId = room.id
  els.activeRoomName.textContent = `加入中：${room.name}`
  sendWs(WS_EVENTS.ROOM_JOIN, { roomId: room.id }, null)
}

function connectSocket(options = {}) {
  if (!hasAuthenticatedSession()) return
  const resetBackoff = Boolean(options.resetBackoff)
  if (resetBackoff) state.reconnectAttempt = 0
  cancelReconnectSchedule()
  stopSocketHeartbeatWatchdog()
  if (state.ws && state.ws.readyState <= 1) state.ws.close()
  const socketSeq = state.socketSeq + 1
  state.socketSeq = socketSeq
  state.ws = new WebSocket(SERVER_WS)
  setConnectionState("connecting", "连接中")
  state.ws.onopen = () => {
    if (socketSeq !== state.socketSeq) return
    state.reconnectAttempt = 0
    state.lastServerHeartbeatAt = Date.now()
    startSocketHeartbeatWatchdog()
    setConnectionState("connected", "已连接")
    sendWs(WS_EVENTS.AUTH, { token: state.token })
  }
  state.ws.onclose = () => {
    if (socketSeq !== state.socketSeq) return
    stopSocketHeartbeatWatchdog()
    handleSocketDisconnected()
    scheduleSocketReconnect()
  }
  state.ws.onerror = () => {
    if (socketSeq !== state.socketSeq) return
    setConnectionState("error", "连接错误")
  }
  state.ws.onmessage = async (event) => {
    if (socketSeq !== state.socketSeq) return
    const packet = JSON.parse(event.data)
    await handlePacket(packet)
  }
}

function setConnectionState(mode, text) {
  els.connectionState.classList.remove("connected", "connecting", "error")
  if (mode === "connected" || mode === "connecting" || mode === "error") {
    els.connectionState.classList.add(mode)
  }
  els.connectionState.textContent = text
  syncDesktopRuntimeState()
  if (!els.reconnectBtn) return
  const canReconnect = mode === "error" && hasAuthenticatedSession()
  els.reconnectBtn.classList.toggle("hidden", !canReconnect)
}

function forceSocketReconnect() {
  if (!hasAuthenticatedSession()) return false
  connectSocket({ resetBackoff: true })
  return true
}

function scheduleSocketReconnect() {
  if (!hasAuthenticatedSession()) return
  if (state.reconnectTimer) return
  state.reconnectAttempt += 1
  const jitter = Math.floor(Math.random() * 300)
  const delay = Math.min(
    SOCKET_RECONNECT_BASE_DELAY * Math.pow(2, Math.max(0, state.reconnectAttempt - 1)) + jitter,
    SOCKET_RECONNECT_MAX_DELAY
  )
  state.reconnectAt = Date.now() + delay
  updateReconnectCountdownState()
  state.reconnectCountdownTimer = setInterval(updateReconnectCountdownState, 1000)
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null
    connectSocket()
  }, delay)
}

function cancelReconnectSchedule() {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer)
    state.reconnectTimer = null
  }
  if (state.reconnectCountdownTimer) {
    clearInterval(state.reconnectCountdownTimer)
    state.reconnectCountdownTimer = null
  }
  state.reconnectAt = 0
}

function updateReconnectCountdownState() {
  if (!state.reconnectAt) {
    setConnectionState("connecting", "连接中")
    return
  }
  const remains = Math.max(0, state.reconnectAt - Date.now())
  const seconds = Math.max(1, Math.ceil(remains / 1000))
  setConnectionState("error", `断开，${seconds}s 后重连`)
}

function startSocketHeartbeatWatchdog() {
  stopSocketHeartbeatWatchdog()
  state.socketHeartbeatTimer = setInterval(() => {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return
    if (Date.now() - state.lastServerHeartbeatAt <= SOCKET_HEARTBEAT_TIMEOUT) return
    setConnectionState("error", "心跳超时，重新连接中")
    state.ws.close()
  }, 10000)
}

function stopSocketHeartbeatWatchdog() {
  if (!state.socketHeartbeatTimer) return
  clearInterval(state.socketHeartbeatTimer)
  state.socketHeartbeatTimer = null
}

async function handlePacket(packet) {
  const { type, payload } = packet
  if (type === WS_EVENTS.AUTH_OK) {
    appendChat("WebSocket 鉴权成功", "系统")
    flushPendingPresenceStatus()
    return
  }
  if (type === WS_EVENTS.ROOM_LIST) {
    const nextRoomList = (payload.rooms || []).map(normalizeRoom)
    const previousActiveRoom = state.roomId ? state.roomList.find((item) => item.id === state.roomId) : null
    state.roomList = nextRoomList
    renderRooms()
    if (state.roomId) {
      const room = state.roomList.find((item) => item.id === state.roomId)
      if (!room) {
        clearActiveRoomState()
      } else if (room.is_locked) {
        clearActiveRoomState()
        toast("当前房间已被锁定，请重新选择房间")
      } else {
        notifyRoomPolicyChanges(previousActiveRoom, room)
        els.activeRoomName.textContent = room.name
      }
    }
    if (state.joiningRoomId) {
      const joiningRoom = state.roomList.find((item) => item.id === state.joiningRoomId)
      if (!joiningRoom || joiningRoom.is_locked) {
        state.joiningRoomId = ""
        if (!state.roomId) els.activeRoomName.textContent = "未加入房间"
      }
    }
    if (!state.roomId && state.preferredRoomId) {
      const room = state.roomList.find((item) => item.id === state.preferredRoomId)
      if (room) joinRoom(room)
    }
    updateRoomAccessBar()
    return
  }
  if (type === WS_EVENTS.ROOM_JOINED) {
    await onRoomJoined(payload)
    return
  }
  if (type === WS_EVENTS.PRESENCE_UPDATE) {
    const nextUsers = Array.isArray(payload.users) ? payload.users : []
    syncSelfPresenceStatus(nextUsers)
    pruneVoicePeerStatuses(nextUsers)
    pruneVoiceSpeakingUsers(nextUsers)
    const nextSignature = createOnlineUsersSignature(nextUsers)
    if (nextSignature === state.onlineUsersSignature) {
      refreshPmCommandUi(false)
      return
    }
    state.onlineUsers = nextUsers
    state.onlineUsersSignature = nextSignature
    rebuildPmOnlineIndexes()
    bumpPmSuggestionDataVersion()
    renderOnlineUsers()
    reconcilePrivateSessionRecovery()
    reconcilePrivateSessionTargetAvailability()
    refreshPmCommandUi(false)
    return
  }
  if (type === WS_EVENTS.CHAT_TEXT) {
    if (payload.scope === "private") {
      const sender = payload.sender?.username || "匿名"
      const target = payload.target?.username || "匿名"
      const isOutgoing = payload.sender?.id === state.user?.id
      const label = isOutgoing ? `🔒 私聊 -> ${target}` : `🔒 私聊 <- ${sender}`
      appendChat(payload.text, label, { kind: isOutgoing ? "private-out" : "private-in" })
      persistChat(payload.text, label, { kind: isOutgoing ? "private-out" : "private-in" })
      touchPrivateSessionActivity()
      if (!isOutgoing) {
        addRecentPmTarget(sender)
      } else {
        addRecentPmTarget(target)
      }
      updatePmInteraction(isOutgoing ? target : sender)
      refreshPmCommandUi(false)
      return
    }
    appendChat(payload.text, payload.sender?.username || "匿名")
    persistChat(payload.text, payload.sender?.username || "匿名")
    return
  }
  if (type === WS_EVENTS.CHAT_FILE_META) {
    appendChat(`📎 ${payload.sender?.username} 分享文件：${payload.fileName}`, "系统")
    return
  }
  if (type === WS_EVENTS.PRIVATE_SESSION_INVITE) {
    await handleIncomingPrivateSessionInvite(payload)
    return
  }
  if (type === WS_EVENTS.CHAT_FILE_DATA) {
    appendFileMessage(payload)
    const sender = payload.sender?.username || "匿名"
    const size = Number(payload.size || 0)
    persistChat(`📎 文件：${payload.fileName || "未命名文件"}（${formatFileSize(size)}）`, `文件 ${sender}`, { kind: "file" })
    return
  }
  if (type === WS_EVENTS.ROOM_USER_JOINED) {
    appendChat(`${payload.user?.username || "用户"} 加入房间`, "系统")
    applyRoomUserPresenceDelta(payload, true)
    renderOnlineUsers()
    reconcilePrivateSessionRecovery()
    if (payload.user?.id && payload.user.id !== state.user.id && canVoiceConnectUser(payload.user.id)) createOffer(payload.user.id)
    return
  }
  if (type === WS_EVENTS.ROOM_USER_LEFT) {
    appendChat(`${payload.user?.username || "用户"} 离开房间`, "系统")
    applyRoomUserPresenceDelta(payload, false)
    renderOnlineUsers()
    if (payload.user?.id) closePeer(payload.user.id)
    if (payload.user?.id) {
      removeRemoteLiveStream(payload.user.id)
      syncSessionActionControls()
    }
    if (String(payload.user?.id || "") === String(state.privateSessionUserId || "")) {
      clearPrivateSessionTarget(false)
      toast("私密会话对象已离开房间，已恢复公共语音")
    }
    return
  }
  if (type === WS_EVENTS.LIVE_STATE) {
    const senderUserId = String(payload.senderUserId || "")
    if (!senderUserId) return
    if (payload.forceStop && senderUserId === String(state.user?.id || "")) {
      await stopLiveShare(false)
      setLiveStatus("直播申请失败：当前房间已有他人在直播")
      syncSessionActionControls()
      renderOnlineUsers()
      return
    }
    if (!payload.active) {
      removeRemoteLiveStream(senderUserId)
      if (!state.liveActiveUserId) {
        setLiveStatus("当前无人直播")
      }
      syncSessionActionControls()
      renderOnlineUsers()
      return
    }
    const sourceName = resolveLiveSourceLabel(payload.mode, payload.sourceName)
    state.liveActiveUserId = senderUserId
    state.liveActiveUsername = String(payload.sender?.username || "")
    state.liveSourceNameByUserId.set(senderUserId, sourceName)
    setLiveStatus(`${payload.sender?.username || "用户"} 正在直播：${sourceName}`)
    syncSessionActionControls()
    renderOnlineUsers()
    return
  }
  if (type === WS_EVENTS.WEBRTC_OFFER) {
    await handleOffer(payload)
    return
  }
  if (type === WS_EVENTS.WEBRTC_ANSWER) {
    await handleAnswer(payload)
    return
  }
  if (type === WS_EVENTS.WEBRTC_ICE) {
    await handleIce(payload)
    return
  }
  if (type === WS_EVENTS.HEARTBEAT) {
    state.lastServerHeartbeatAt = Date.now()
    sendWs(WS_EVENTS.HEARTBEAT, { clientTime: Date.now() })
    return
  }
  if (type === WS_EVENTS.ERROR || type === WS_EVENTS.AUTH_ERROR) {
    if (type === WS_EVENTS.AUTH_ERROR) {
      const refreshed = await refreshTokenAndReconnect()
      if (!refreshed) {
        showLoggedOutState("鉴权失效，请重新登录")
      }
      return
    }
    state.joiningRoomId = ""
    if (!state.roomId) {
      els.activeRoomName.textContent = "未加入房间"
    }
    toast(payload.message || "服务器错误")
  }
}

function sendWs(type, payload = {}, roomId = state.roomId || null) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return
  state.ws.send(JSON.stringify({ type, payload, roomId }))
}

async function ensureLocalStream() {
  if (state.localStream) {
    rebuildAudioProcessingGraph()
    ensureLocalVoiceActivityMonitor()
    await syncOutgoingAudioTrack()
    return state.localStream
  }
  state.localStream = await requestLocalInputStream()
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    state.audioContext = new AudioContextClass()
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {})
  }
  if (!state.outputDestinationNode) {
    state.outputDestinationNode = state.audioContext.createMediaStreamDestination()
    state.outboundStream = state.outputDestinationNode.stream
  }
  rebuildAudioProcessingGraph()
  applyEffectiveMuteState()
  ensureLocalVoiceActivityMonitor()
  await syncOutgoingAudioTrack()
  await setAccompanimentEnabled(state.accompanimentEnabled, false)
  return state.localStream
}

async function tryEnsureLocalStreamForVoice() {
  try {
    await ensureLocalStream()
    return true
  } catch (error) {
    const now = Date.now()
    if (now - state.micAccessFallbackHintAt > 3500) {
      state.micAccessFallbackHintAt = now
      const name = String(error?.name || "").trim()
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast("未授予麦克风权限，已切换为仅收听模式（仍可接收他人声音）")
      } else {
        toast("麦克风初始化失败，已切换为仅收听模式")
      }
    }
    return false
  }
}

async function switchAudioInput() {
  if (!state.localStream) return
  try {
    await refreshLocalInputCapture()
  } catch {
    toast("切换输入设备失败，请检查麦克风权限")
  }
}

function isIosDevice() {
  const ua = String(navigator.userAgent || "")
  return /iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

function isSafariBrowser() {
  const ua = String(navigator.userAgent || "")
  return /Safari/i.test(ua) && !/CriOS|Chrome|EdgiOS|FxiOS|OPiOS|YaBrowser/i.test(ua)
}

function isIosSafari() {
  return isIosDevice() && isSafariBrowser()
}

function buildInputAudioConstraints() {
  const noiseSuppression = Boolean(state.noiseSuppressionEnabled)
  const echoCancellation = Boolean(state.echoCancellationEnabled)
  if (isIosSafari()) {
    return {
      deviceId: els.audioInput.value ? { exact: els.audioInput.value } : undefined,
      echoCancellation
    }
  }
  return {
    deviceId: els.audioInput.value ? { exact: els.audioInput.value } : undefined,
    noiseSuppression,
    echoCancellation,
    autoGainControl: noiseSuppression
  }
}

async function requestLocalInputStream() {
  const primary = buildInputAudioConstraints()
  const deviceIdConstraint = els.audioInput.value ? { deviceId: { exact: els.audioInput.value } } : {}
  const candidates = [primary, deviceIdConstraint, { echoCancellation: true }, true]
  let lastError = null
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: candidate, video: false })
    } catch (error) {
      lastError = error
    }
  }
  if (lastError) throw lastError
  throw new Error("麦克风初始化失败")
}

function clampAccompanimentGain(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.78
  return Math.max(0, Math.min(1.5, parsed))
}

function applyAccompanimentGainToNode() {
  if (!state.accompanimentGainNode) return
  const gainValue = state.accompanimentTemporarilyMuted ? 0 : clampAccompanimentGain(state.accompanimentGain)
  state.accompanimentGainNode.gain.value = gainValue
}

function rebuildAccompanimentProcessingGraph() {
  if (!state.audioContext || !state.outputDestinationNode || !state.accompanimentSourceNode || !state.accompanimentGainNode) return
  state.accompanimentSourceNode.disconnect()
  state.accompanimentGainNode.disconnect()
  state.accompanimentLimiterNode?.disconnect()
  const limiterNode = state.audioContext.createDynamicsCompressor()
  limiterNode.threshold.value = -10
  limiterNode.knee.value = 10
  limiterNode.ratio.value = 12
  limiterNode.attack.value = 0.001
  limiterNode.release.value = 0.12
  state.accompanimentSourceNode.connect(state.accompanimentGainNode)
  let postNode = state.accompanimentGainNode
  if (state.accompanimentLimiterEnabled) {
    state.accompanimentGainNode.connect(limiterNode)
    postNode = limiterNode
  }
  postNode.connect(state.outputDestinationNode)
  const analyserNode = state.audioContext.createAnalyser()
  analyserNode.fftSize = 512
  analyserNode.smoothingTimeConstant = 0.25
  postNode.connect(analyserNode)
  state.accompanimentLimiterNode = limiterNode
  state.accompanimentAnalyserNode = analyserNode
  applyAccompanimentGainToNode()
}

function startAccompanimentLevelMonitor() {
  stopAccompanimentLevelMonitor()
  const analyser = state.accompanimentAnalyserNode
  if (!analyser) {
    renderAccompanimentLevel(0)
    return
  }
  const data = new Uint8Array(analyser.fftSize)
  const tick = () => {
    analyser.getByteTimeDomainData(data)
    let maxAmplitude = 0
    for (let index = 0; index < data.length; index += 1) {
      const amplitude = Math.abs((data[index] - 128) / 128)
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude
      }
    }
    renderAccompanimentLevel(maxAmplitude)
    state.accompanimentLevelRafId = requestAnimationFrame(tick)
  }
  tick()
}

function stopAccompanimentLevelMonitor() {
  if (state.accompanimentLevelRafId) {
    cancelAnimationFrame(state.accompanimentLevelRafId)
    state.accompanimentLevelRafId = 0
  }
  state.accompanimentClipUntil = 0
}

function rebuildAudioProcessingGraph() {
  if (!state.audioContext || !state.localStream || !state.outputDestinationNode) return
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {})
  }
  state.inputSourceNode?.disconnect()
  state.enhancerNodeHighpass?.disconnect()
  state.enhancerNodePresence?.disconnect()
  state.enhancerCompressorNode?.disconnect()
  state.gainNode?.disconnect()
  state.micOutputNode?.disconnect()
  const inputSourceNode = state.audioContext.createMediaStreamSource(state.localStream)
  const gainNode = state.audioContext.createGain()
  gainNode.gain.value = clampNumber(state.micGain, 0, 2, DEFAULT_MIC_GAIN)
  const micOutputNode = state.audioContext.createGain()
  micOutputNode.gain.value = getEffectiveMuted() ? 0 : 1
  let currentNode = inputSourceNode
  let enhancerNodeHighpass = null
  let enhancerNodePresence = null
  let enhancerCompressorNode = null
  if (state.micEnhanceEnabled) {
    enhancerNodeHighpass = state.audioContext.createBiquadFilter()
    enhancerNodeHighpass.type = "highpass"
    enhancerNodeHighpass.frequency.value = 120
    enhancerNodePresence = state.audioContext.createBiquadFilter()
    enhancerNodePresence.type = "peaking"
    enhancerNodePresence.frequency.value = 3200
    enhancerNodePresence.Q.value = 0.8
    enhancerNodePresence.gain.value = 4.5
    enhancerCompressorNode = state.audioContext.createDynamicsCompressor()
    enhancerCompressorNode.threshold.value = -22
    enhancerCompressorNode.knee.value = 18
    enhancerCompressorNode.ratio.value = 3.2
    enhancerCompressorNode.attack.value = 0.004
    enhancerCompressorNode.release.value = 0.22
    currentNode.connect(enhancerNodeHighpass)
    enhancerNodeHighpass.connect(enhancerNodePresence)
    enhancerNodePresence.connect(enhancerCompressorNode)
    currentNode = enhancerCompressorNode
  }
  currentNode.connect(gainNode)
  gainNode.connect(micOutputNode)
  micOutputNode.connect(state.outputDestinationNode)
  state.inputSourceNode = inputSourceNode
  state.enhancerNodeHighpass = enhancerNodeHighpass
  state.enhancerNodePresence = enhancerNodePresence
  state.enhancerCompressorNode = enhancerCompressorNode
  state.gainNode = gainNode
  state.micOutputNode = micOutputNode
}

function resolveOutboundAudioTrackSource() {
  const localTrack = state.localStream?.getAudioTracks?.()[0] || null
  const graphTrack = state.outboundStream?.getAudioTracks?.()[0] || null
  const graphReady = Boolean(state.outputDestinationNode && graphTrack && state.audioContext?.state === "running")
  const preferLocalTrack = isIosSafari() && !state.accompanimentActive
  
  if (graphReady && !preferLocalTrack) {
    return { track: graphTrack, stream: state.outboundStream }
  }
  
  if (localTrack && state.localStream) {
    return { track: localTrack, stream: state.localStream }
  }
  
  return { track: null, stream: null }
}

async function refreshLocalInputCapture() {
  if (!state.localStream && !state.roomId) return
  stopVoiceActivityMonitor(state.user?.id)
  if (state.localStream) {
    state.localStream.getTracks().forEach((track) => track.stop())
  }
  state.localStream = null
  await ensureLocalStream()
}

function getOutboundAudioTrack() {
  return resolveOutboundAudioTrackSource().track
}

function getOutboundVideoTrack() {
  return state.liveTrack || null
}

async function syncOutgoingAudioTrack() {
  const source = resolveOutboundAudioTrackSource()
  const track = source.track
  if (!track) return
  for (const peer of state.peers.values()) {
    const sender = peer.getSenders().find((item) => item.track && item.track.kind === "audio")
    if (sender) {
      await sender.replaceTrack(track)
      continue
    }
    const transceiver = peer.getTransceivers?.().find((item) => item?.receiver?.track?.kind === "audio" && !item?.sender?.track)
    if (transceiver?.sender) {
      await transceiver.sender.replaceTrack(track).catch(() => {})
      if (transceiver.direction && transceiver.direction !== "inactive") {
        transceiver.direction = "sendrecv"
      }
      continue
    }
    if (source.stream) {
      peer.addTrack(track, source.stream)
    }
  }
}

async function syncOutgoingVideoTrack() {
  const track = getOutboundVideoTrack()
  for (const peer of state.peers.values()) {
    const sender = peer.getSenders().find((item) => item.track && item.track.kind === "video")
    if (track) {
      if (sender) {
        await sender.replaceTrack(track)
      } else {
        const transceiver = peer.getTransceivers?.().find((item) => item?.receiver?.track?.kind === "video" && !item?.sender?.track)
        if (transceiver?.sender) {
          await transceiver.sender.replaceTrack(track).catch(() => {})
          if (transceiver.direction && transceiver.direction !== "inactive") {
            transceiver.direction = "sendrecv"
          }
        } else if (state.liveStream) {
          peer.addTrack(track, state.liveStream)
        }
      }
      continue
    }
    if (sender) {
      await sender.replaceTrack(null)
      continue
    }
    const transceiver = peer.getTransceivers?.().find((item) => item?.receiver?.track?.kind === "video" && item?.sender?.track)
    if (transceiver?.sender) {
      await transceiver.sender.replaceTrack(null).catch(() => {})
      if (transceiver.direction && transceiver.direction !== "inactive") {
        transceiver.direction = "recvonly"
      }
    }
  }
}

async function renegotiatePeersForLiveTrack() {
  const userIds = [...state.peers.keys()]
  for (let index = 0; index < userIds.length; index += 1) {
    const userId = userIds[index]
    if (!canVoiceConnectUser(userId)) continue
    await createOffer(userId).catch(() => {})
  }
}

async function createLiveStreamFromDesktopSource(sourceId) {
  const desktopSourceId = String(sourceId || "").trim()
  if (!desktopSourceId) return null
  if (!navigator.mediaDevices?.getUserMedia) return null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: desktopSourceId,
          maxFrameRate: 20
        }
      }
    })
    return stream
  } catch {
    return null
  }
}

async function startLiveShare() {
  if (!hasAuthenticatedSession() || !state.roomId) {
    notifyLoginRequired()
    return
  }
  const occupiedByOther = Boolean(state.liveActiveUserId) && state.liveActiveUserId !== String(state.user?.id || "")
  if (occupiedByOther) {
    const ownerName = state.liveActiveUsername || "其他用户"
    toast(`当前已有 ${ownerName} 在直播`)
    return
  }
  await syncLiveSourceOptions()
  if (state.liveTrack) {
    toast("直播已开启")
    return
  }
  let stream = null
  let sourceLabel = "桌面"
  let sourceMode = "screen"
  const selectedSourceId = String(els.liveSourceSelect?.value || state.liveSourceId || "auto")
  if (selectedSourceId && selectedSourceId !== "auto") {
    stream = await createLiveStreamFromDesktopSource(selectedSourceId)
    sourceMode = "window"
    sourceLabel = String(els.liveSourceSelect?.selectedOptions?.[0]?.textContent || "窗口").replace(/^直播源：/, "").trim() || "窗口"
  }
  if (!stream) {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast("当前环境不支持直播共享")
      return
    }
    const qualityKey = els.liveQualitySelect?.value || "medium"
    const profile = LIVE_QUALITY_PROFILES[qualityKey] || LIVE_QUALITY_PROFILES.medium
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { 
        frameRate: profile.frameRate,
        width: { ideal: profile.width },
        height: { ideal: profile.height }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }).catch(async (err) => {
      if (err.name === "TypeError" || err.name === "NotSupportedError") {
        return await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: profile.frameRate },
          audio: false
        })
      }
      throw err
    })
    sourceMode = "screen"
    sourceLabel = "桌面"
  }
  const track = stream.getVideoTracks?.()[0]
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    toast("未获取到可用直播画面")
    return
  }
  track.onended = () => {
    stopLiveShare(true)
  }
  state.liveStream = stream
  state.liveTrack = track
  state.liveSourceLabel = sourceLabel
  state.liveActiveUserId = String(state.user?.id || "")
  state.liveActiveUsername = String(state.user?.username || "")
  state.liveSourceNameByUserId.set(String(state.user?.id || ""), sourceLabel)
  await syncOutgoingVideoTrack()
  await renegotiatePeersForLiveTrack()
  setLiveStatus(`你正在直播：${sourceLabel}（声音来自麦克风/伴奏）`)
  renderRemoteLiveStream(state.user?.id, state.user?.username, stream, sourceLabel)
  syncSessionActionControls()
  sendWs(WS_EVENTS.LIVE_STATE, {
    active: true,
    mode: sourceMode,
    sourceName: sourceLabel
  })
}

async function stopLiveShare(notifyServer, shouldRenegotiate = true) {
  if (state.liveTrack) {
    state.liveTrack.stop()
  }
  if (state.liveStream) {
    state.liveStream.getTracks().forEach((track) => track.stop())
  }
  state.liveTrack = null
  state.liveStream = null
  state.liveSourceLabel = ""
  await syncOutgoingVideoTrack()
  if (shouldRenegotiate) {
    await renegotiatePeersForLiveTrack()
  }
  removeRemoteLiveStream(state.user?.id)
  if (notifyServer && state.roomId) {
    sendWs(WS_EVENTS.LIVE_STATE, { active: false })
  }
  if (state.liveActiveUserId) {
    const sourceName = state.liveSourceNameByUserId.get(state.liveActiveUserId) || "桌面"
    setLiveStatus(`${state.liveActiveUsername || "用户"} 正在直播：${sourceName}（声音来自麦克风/伴奏）`)
  } else {
    setLiveStatus("当前无人直播")
  }
  syncSessionActionControls()
}

async function setAccompanimentEnabled(enabled, shouldToast) {
  const nextEnabled = Boolean(enabled)
  state.accompanimentEnabled = nextEnabled
  localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, nextEnabled ? "1" : "0")
  if (els.accompanimentEnabled && els.accompanimentEnabled.checked !== nextEnabled) {
    els.accompanimentEnabled.checked = nextEnabled
  }
  if (!nextEnabled) {
    setAccompanimentTemporarilyMuted(false, false)
    stopAccompanimentCapture()
    syncSessionActionControls()
    if (shouldToast) {
      toast("已关闭伴奏共享")
    }
    return
  }
  if (!hasAuthenticatedSession() || !state.roomId) {
    state.accompanimentEnabled = false
    localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, "0")
    if (els.accompanimentEnabled) {
      els.accompanimentEnabled.checked = false
    }
    syncSessionActionControls()
    toast("请先登录并进入房间后再开启伴奏")
    return
  }
  if (state.accompanimentActive && state.accompanimentStream) {
    setRemoteMonitorMutedByAccompaniment(true)
    syncSessionActionControls()
    if (shouldToast) {
      toast("伴奏已开启：正在共享系统输出音频")
    }
    return
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    state.accompanimentEnabled = false
    localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, "0")
    if (els.accompanimentEnabled) {
      els.accompanimentEnabled.checked = false
    }
    syncSessionActionControls()
    if (shouldToast) {
      toast("当前环境不支持系统音频共享（getDisplayMedia 不可用）")
    }
    return
  }
  try {
    await ensureLocalStream()
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
    stream.getVideoTracks().forEach((item) => item.stop())
    const track = stream.getAudioTracks?.()[0]
    if (!track) {
      stream.getTracks().forEach((item) => item.stop())
      throw new Error("未检测到系统音频轨道，请在系统共享弹窗里勾选“共享音频”")
    }
    stopAccompanimentCapture()
    state.accompanimentStream = stream
    const accompanimentSourceNode = state.audioContext.createMediaStreamSource(stream)
    const accompanimentGainNode = state.audioContext.createGain()
    accompanimentGainNode.gain.value = clampAccompanimentGain(state.accompanimentGain)
    const endHandler = () => {
      setAccompanimentEnabled(false, true).catch(() => {})
    }
    track.addEventListener("ended", endHandler)
    state.accompanimentTrackEndHandler = endHandler
    state.accompanimentSourceNode = accompanimentSourceNode
    state.accompanimentGainNode = accompanimentGainNode
    state.accompanimentActive = true
    rebuildAccompanimentProcessingGraph()
    startAccompanimentLevelMonitor()
    state.accompanimentTemporarilyMuted = false
    applyAccompanimentGainToNode()
    setRemoteMonitorMutedByAccompaniment(true)
    syncSessionActionControls()
    if (shouldToast) {
      toast("伴奏已开启：已共享系统输出音频，并自动抑制远端回放防止回音")
    }
  } catch (error) {
    setAccompanimentTemporarilyMuted(false, false)
    stopAccompanimentCapture()
    state.accompanimentEnabled = false
    localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, "0")
    if (els.accompanimentEnabled) {
      els.accompanimentEnabled.checked = false
    }
    syncSessionActionControls()
    if (shouldToast) {
      toast(`伴奏开启失败：${resolveAccompanimentErrorMessage(error)}`)
    }
  }
}

function stopAccompanimentCapture() {
  const track = state.accompanimentStream?.getAudioTracks?.()[0]
  if (track && state.accompanimentTrackEndHandler) {
    track.removeEventListener("ended", state.accompanimentTrackEndHandler)
  }
  state.accompanimentTrackEndHandler = null
  stopAccompanimentLevelMonitor()
  state.accompanimentSourceNode?.disconnect()
  state.accompanimentGainNode?.disconnect()
  state.accompanimentLimiterNode?.disconnect()
  state.accompanimentAnalyserNode?.disconnect()
  if (state.accompanimentStream) {
    state.accompanimentStream.getTracks().forEach((item) => item.stop())
  }
  state.accompanimentStream = null
  state.accompanimentSourceNode = null
  state.accompanimentGainNode = null
  state.accompanimentLimiterNode = null
  state.accompanimentAnalyserNode = null
  state.accompanimentActive = false
  state.accompanimentTemporarilyMuted = false
  setRemoteMonitorMutedByAccompaniment(false)
  renderAccompanimentLevel(0)
}

function setAccompanimentTemporarilyMuted(muted, shouldNotify) {
  state.accompanimentTemporarilyMuted = Boolean(muted)
  applyAccompanimentGainToNode()
  renderAccompanimentLevel(0)
  syncSessionActionControls()
  if (!shouldNotify || !state.accompanimentActive) return
  if (state.accompanimentTemporarilyMuted) {
    toast("伴奏已临时静音，系统音频不会上行")
  } else {
    toast("伴奏已恢复")
  }
}

function getEffectiveRemotePlaybackMuted() {
  return Boolean(state.remoteMutedByAccompaniment || state.remoteSpeakerMuted)
}

function syncRemoteSpeakerButtonState() {
  if (!els.speakerBtn) return
  els.speakerBtn.classList.toggle("is-off", Boolean(state.remoteSpeakerMuted))
  const label = state.remoteSpeakerMuted ? "扬声器已关闭" : "扬声器开启"
  els.speakerBtn.setAttribute("aria-label", label)
  els.speakerBtn.setAttribute("title", label)
}

function setRemoteSpeakerMuted(muted, shouldNotify) {
  state.remoteSpeakerMuted = Boolean(muted)
  localStorage.setItem(REMOTE_SPEAKER_MUTED_KEY, state.remoteSpeakerMuted ? "1" : "0")
  const effectiveMuted = getEffectiveRemotePlaybackMuted()
  for (const audio of state.remoteAudios.values()) {
    if (!audio) continue
    audio.muted = effectiveMuted
  }
  syncRemoteSpeakerButtonState()
  if (shouldNotify) {
    toast(state.remoteSpeakerMuted ? "已关闭扬声器回放" : "已开启扬声器回放")
  }
}

function setRemoteMonitorMutedByAccompaniment(enabled) {
  const muted = Boolean(enabled)
  state.remoteMutedByAccompaniment = muted
  const effectiveMuted = getEffectiveRemotePlaybackMuted()
  for (const audio of state.remoteAudios.values()) {
    if (!audio) continue
    audio.muted = effectiveMuted
  }
  const now = Date.now()
  if (muted) {
    if (now - state.remotePlaybackMutedHintAt > 5000) {
      state.remotePlaybackMutedHintAt = now
      toast("已开启伴奏：为防回声，已自动静音远端回放（别人仍能听到你）")
    }
  } else if (now - state.remotePlaybackMutedHintAt > 2000) {
    state.remotePlaybackMutedHintAt = now
    toast("已恢复远端回放")
  }
}

function resolveAccompanimentErrorMessage(error) {
  const name = String(error?.name || "").trim()
  const rawMessage = String(error?.message || "").trim()
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "你已拒绝屏幕/音频共享权限，请重新开启并授权"
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "未找到可共享的系统音频设备"
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "系统音频设备被占用或不可读，请关闭占用应用后重试"
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return "当前环境不支持该共享方式，请使用 Chromium/Electron 最新版并在共享窗口勾选系统音频"
  }
  if (rawMessage) {
    return rawMessage.replace(/^[:：\s]+/, "")
  }
  return "请检查系统录音权限并在共享弹窗中勾选系统音频"
}

async function createOffer(targetUserId) {
  if (!canVoiceConnectUser(targetUserId)) return
  await tryEnsureLocalStreamForVoice()
  const peer = getPeer(targetUserId)
  const offer = await peer.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true
  })
  const mungedSdp = mungeSdp(offer.sdp)
  await peer.setLocalDescription({ type: offer.type, sdp: mungedSdp })
  applyAudioSenderOptimization(peer)
  applyVideoSenderOptimization(peer)
  sendWs(WS_EVENTS.WEBRTC_OFFER, { targetUserId, sdp: mungedSdp, type: offer.type })
}

async function attachRemoteAudioPlayback(targetUserId, stream, track) {
  if (!stream && !track) return
  const audioTracks = stream?.getAudioTracks?.() || []
  if (!audioTracks.length && track?.kind !== "audio") return

  let audio = state.remoteAudios.get(targetUserId)
  if (!audio) {
    audio = document.createElement("audio")
    audio.autoplay = true
    audio.playsInline = true
    audio.className = "remote-audio-node"
    audio.dataset.userId = targetUserId
    if (els.remoteAudioRack) els.remoteAudioRack.appendChild(audio)
    state.remoteAudios.set(targetUserId, audio)
  }

  if (audio.srcObject !== stream) {
    audio.srcObject = stream
  }

  audio.volume = Math.max(0, Math.min(1, Number(state.remoteOutputGain ?? DEFAULT_REMOTE_OUTPUT_GAIN)))
  audio.muted = getEffectiveRemotePlaybackMuted()
  
  if (audio.setSinkId && els.audioOutput.value) {
    await audio.setSinkId(els.audioOutput.value).catch(() => {})
  }

  const playAudio = async () => {
    try {
      if (audio.paused) await audio.play()
    } catch (error) {
      state.audioPlaybackUnlocked = false
      state.audioPlaybackUnlockRegistered = false
      registerAudioPlaybackUnlock()
    }
  }

  await playAudio()
  
  if (track) {
    track.onunmute = playAudio
  }
  audioTracks.forEach(t => t.onunmute = playAudio)

  startVoiceActivityMonitor(targetUserId, stream)
}

function reconnectAllPeers() {
  const userIds = [...state.peers.keys()]
  userIds.forEach(userId => {
    closePeer(userId)
    createOffer(userId).catch(() => {})
  })
}

function getPeer(targetUserId) {
  if (state.peers.has(targetUserId)) return state.peers.get(targetUserId)
  
  console.log(`[WebRTC] Creating PeerConnection for ${targetUserId} with ${state.rtcIceServers?.length || 0} ICE servers, ForceRelay: ${state.forceRelay}`)
  
  const peer = new RTCPeerConnection({
    iceServers: state.rtcIceServers,
    iceTransportPolicy: state.forceRelay ? "relay" : "all",
    iceCandidatePoolSize: 10,
    sdpSemantics: "unified-plan",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require"
  })
  const outboundAudioSource = resolveOutboundAudioTrackSource()
  if (outboundAudioSource.track && outboundAudioSource.stream) {
    peer.addTrack(outboundAudioSource.track, outboundAudioSource.stream)
  } else {
    peer.addTransceiver("audio", { direction: "recvonly" })
  }
  const liveTrack = getOutboundVideoTrack()
  if (liveTrack && state.liveStream) {
    peer.addTrack(liveTrack, state.liveStream)
  } else {
    peer.addTransceiver("video", { direction: "recvonly" })
  }
  peer.onicecandidate = (event) => {
    if (!event.candidate) return
    sendWs(WS_EVENTS.WEBRTC_ICE, {
      targetUserId,
      candidate: event.candidate
    })
  }
  setVoicePeerStatus(targetUserId, "connecting")
  peer.ontrack = async (event) => {
    const primaryStream = event.streams?.[0] || null
    const track = event.track || null
    const stream = primaryStream || (track ? new MediaStream([track]) : null)
    if (!stream) return
    await attachRemoteAudioPlayback(targetUserId, stream, track)
    if (event.track?.kind === "video") {
      const sourceName = state.liveSourceNameByUserId.get(targetUserId) || "桌面"
      state.remoteLiveStreams.set(targetUserId, stream)
      renderRemoteLiveStream(targetUserId, resolveUserDisplayName(targetUserId), stream, sourceName)
      setLiveStatus(`${resolveUserDisplayName(targetUserId)} 正在直播（声音来自麦克风/伴奏）`)
      syncSessionActionControls()
      return
    }
  }
  peer.onconnectionstatechange = () => {
    const connectionState = String(peer.connectionState || "")
    const iceState = String(peer.iceConnectionState || "")
    if (connectionState === "connected" || iceState === "connected" || iceState === "completed") {
      clearVoicePeerRetryTimer(targetUserId)
      setVoicePeerStatus(targetUserId, "connected")
      return
    }
    if (connectionState === "new" || connectionState === "connecting" || iceState === "new" || iceState === "checking") {
      setVoicePeerStatus(targetUserId, "connecting")
      return
    }
    if (connectionState === "disconnected" || connectionState === "failed" || iceState === "failed" || iceState === "disconnected") {
      setVoicePeerStatus(targetUserId, "reconnecting")
      scheduleVoicePeerRecovery(targetUserId)
      return
    }
    if (connectionState === "closed" && state.peers.has(targetUserId)) {
      setVoicePeerStatus(targetUserId, "reconnecting")
      scheduleVoicePeerRecovery(targetUserId)
    }
  }
  peer.oniceconnectionstatechange = () => {
    const connectionState = String(peer.connectionState || "")
    const iceState = String(peer.iceConnectionState || "")
    if (connectionState === "connected" || iceState === "connected" || iceState === "completed") {
      clearVoicePeerRetryTimer(targetUserId)
      setVoicePeerStatus(targetUserId, "connected")
      return
    }
    if (iceState === "failed" || iceState === "disconnected") {
      setVoicePeerStatus(targetUserId, "reconnecting")
      scheduleVoicePeerRecovery(targetUserId)
    }
  }
  state.peers.set(targetUserId, peer)
  startVoiceStatsMonitor()
  return peer
}

async function applyAudioOutputToRemoteAudios() {
  const audios = state.remoteAudios.values()
  for (const audio of audios) {
    if (!audio) continue
    audio.muted = getEffectiveRemotePlaybackMuted()
    audio.volume = Math.max(0, Math.min(1, Number(state.remoteOutputGain ?? DEFAULT_REMOTE_OUTPUT_GAIN)))
    if (audio.setSinkId && els.audioOutput.value) {
      await audio.setSinkId(els.audioOutput.value).catch(() => {})
    }
  }
}

async function handleOffer(payload) {
  await tryEnsureLocalStreamForVoice()
  const senderUserId = payload.senderUserId
  if (!canVoiceConnectUser(senderUserId)) return
  const peer = getPeer(senderUserId)
  await peer.setRemoteDescription({ type: payload.type, sdp: payload.sdp })
  applyAudioSenderOptimization(peer)
  applyVideoSenderOptimization(peer)
  await processPendingIceCandidates(senderUserId)
  const answer = await peer.createAnswer()
  const mungedSdp = mungeSdp(answer.sdp)
  await peer.setLocalDescription({ type: answer.type, sdp: mungedSdp })
  applyAudioSenderOptimization(peer)
  applyVideoSenderOptimization(peer)
  sendWs(WS_EVENTS.WEBRTC_ANSWER, {
    targetUserId: senderUserId,
    sdp: mungedSdp,
    type: answer.type
  })
}

async function handleAnswer(payload) {
  const senderUserId = payload.senderUserId
  if (!canVoiceConnectUser(senderUserId)) return
  const peer = getPeer(senderUserId)
  const mungedSdp = mungeSdp(payload.sdp)
  await peer.setRemoteDescription({ type: payload.type, sdp: mungedSdp })
  applyAudioSenderOptimization(peer)
  applyVideoSenderOptimization(peer)
  await processPendingIceCandidates(senderUserId)
}

async function handleIce(payload) {
  const senderUserId = payload.senderUserId
  if (!canVoiceConnectUser(senderUserId)) return
  const peer = getPeer(senderUserId)
  if (!payload.candidate) {
    console.log(`[WebRTC] End of candidates from ${senderUserId}`)
    return
  }
  
  const candidate = payload.candidate
  console.log(`[WebRTC] Received ICE candidate from ${senderUserId}: ${candidate.candidate?.slice(0, 50)}...`)
  
  if (peer.remoteDescription) {
    await peer.addIceCandidate(candidate).catch(err => {
      console.warn(`[WebRTC] Failed to add ICE candidate: ${err.message}`)
    })
  } else {
    if (!state.pendingIceCandidates.has(senderUserId)) {
      state.pendingIceCandidates.set(senderUserId, [])
    }
    state.pendingIceCandidates.get(senderUserId).push(payload.candidate)
  }
}

async function processPendingIceCandidates(userId) {
  const candidates = state.pendingIceCandidates.get(userId)
  if (!candidates) return
  const peer = state.peers.get(userId)
  if (!peer) return
  for (const candidate of candidates) {
    await peer.addIceCandidate(candidate).catch(() => {})
  }
  state.pendingIceCandidates.delete(userId)
}

function markVoiceMediaFlow(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  state.voiceMediaFlowUntilByUserId.set(normalizedUserId, Date.now() + 2200)
}

function clearVoiceMediaFlow(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  state.voiceMediaFlowUntilByUserId.delete(normalizedUserId)
  state.voiceStatsPrevInboundBytesByUserId.delete(normalizedUserId)
  state.voiceStatsPrevOutboundBytesByPeerUserId.delete(normalizedUserId)
}

function stopVoiceStatsMonitor() {
  if (!state.voiceStatsTimer) return
  clearInterval(state.voiceStatsTimer)
  state.voiceStatsTimer = null
}

function startVoiceStatsMonitor() {
  if (state.voiceStatsTimer) return
  state.voiceStatsTimer = setInterval(() => {
    sampleVoicePeerStats().catch(() => {})
    checkRemoteAudioHealth().catch(() => {})
  }, 1200)
}

async function checkRemoteAudioHealth() {
  const audios = [...state.remoteAudios.entries()]
  for (let i = 0; i < audios.length; i++) {
    const [userId, audio] = audios[i]
    if (!audio || !audio.srcObject) continue
    if (audio.paused && !audio.muted && audio.volume > 0) {
      audio.play().catch(() => {})
      continue
    }
    const tracks = audio.srcObject.getAudioTracks()
    if (tracks.some(t => t.readyState === "live" && !t.enabled)) {
      tracks.forEach(t => { if (t.readyState === "live") t.enabled = true })
    }
  }
}

async function sampleVoicePeerStats() {
  const peerEntries = [...state.peers.entries()]
  if (!peerEntries.length) {
    if (els.rtcStatusBadge) els.rtcStatusBadge.classList.add("hidden")
    stopVoiceStatsMonitor()
    return
  }
  const localUserId = String(state.user?.id || "")
  let rtcSummary = "检查中..."
  let rtcType = "unknown"
  let rtcConnected = false

  for (let index = 0; index < peerEntries.length; index += 1) {
    const [peerUserId, peer] = peerEntries[index]
    if (!peer || peer.connectionState === "closed") continue
    const stats = await peer.getStats().catch(() => null)
    if (!stats) continue
    
    // Check ICE candidate pair type
    let activeCandidatePair = null
    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
        activeCandidatePair = report
      }
    })

    if (activeCandidatePair) {
      const localCandidate = stats.get(activeCandidatePair.localCandidateId)
      const remoteCandidate = stats.get(activeCandidatePair.remoteCandidateId)
      if (localCandidate) {
        rtcType = localCandidate.candidateType || localCandidate.type || "unknown"
        rtcConnected = true
        if (rtcType === "relay") {
          rtcSummary = "转发模式 (TURN)"
        } else if (rtcType === "srflx") {
          rtcSummary = "穿透模式 (STUN)"
        } else if (rtcType === "host") {
          rtcSummary = "直连模式 (Host)"
        } else if (rtcType === "prflx") {
          rtcSummary = "穿透模式 (Prflx)"
        } else {
          rtcSummary = `连接模式: ${rtcType}`
        }
      }
    }

    let inboundBytes = 0
    let outboundBytes = 0
    let videoInboundBytes = 0
    let videoOutboundBytes = 0
    
    stats.forEach((report) => {
      if (!report) return
      if (report.type === "inbound-rtp") {
        if (report.kind === "audio") inboundBytes += Number(report.bytesReceived || 0)
        if (report.kind === "video") videoInboundBytes += Number(report.bytesReceived || 0)
      }
      if (report.type === "outbound-rtp") {
        if (report.kind === "audio") outboundBytes += Number(report.bytesSent || 0)
        if (report.kind === "video") videoOutboundBytes += Number(report.bytesSent || 0)
      }
    })
    
    const normalizedPeerUserId = String(peerUserId || "")
    const previousInbound = Number(state.voiceStatsPrevInboundBytesByUserId.get(normalizedPeerUserId) || 0)
    if (inboundBytes > previousInbound || videoInboundBytes > 0) {
      markVoiceMediaFlow(normalizedPeerUserId)
    }
    state.voiceStatsPrevInboundBytesByUserId.set(normalizedPeerUserId, inboundBytes + videoInboundBytes)
    
    const previousOutbound = Number(state.voiceStatsPrevOutboundBytesByPeerUserId.get(normalizedPeerUserId) || 0)
    if (localUserId && (outboundBytes > previousOutbound || videoOutboundBytes > 0)) {
      markVoiceMediaFlow(localUserId)
    }
    state.voiceStatsPrevOutboundBytesByPeerUserId.set(normalizedPeerUserId, outboundBytes + videoOutboundBytes)
  }

  if (els.rtcStatusBadge) {
    els.rtcStatusBadge.classList.remove("hidden")
    els.rtcStatusBadge.textContent = `RTC: ${rtcSummary}`
    
    // Set class based on connection type
    els.rtcStatusBadge.classList.remove("allow", "warn", "error")
    if (rtcConnected) {
      if (rtcType === "relay") {
        els.rtcStatusBadge.classList.add("allow") // Green for stable relay
      } else {
        els.rtcStatusBadge.classList.add("warn") // Yellow for P2P (might be unstable on some NATs)
      }
    } else {
      els.rtcStatusBadge.classList.add("error") // Red if not connected
    }
  }

  renderVoiceRoomUsers()
}

function closePeer(userId) {
  const peer = state.peers.get(userId)
  clearVoicePeerRetryTimer(userId)
  stopVoiceActivityMonitor(userId)
  removeRemoteLiveStream(userId)
  if (!peer) {
    clearVoiceMediaFlow(userId)
    clearVoicePeerStatus(userId)
    return
  }
  const audio = state.remoteAudios.get(userId)
  if (audio) {
    audio.pause()
    audio.srcObject = null
    state.remoteAudios.delete(userId)
  }
  clearVoicePeerStatus(userId)
  peer.close()
  state.peers.delete(userId)
  clearVoiceMediaFlow(userId)
  if (state.peers.size === 0) {
    stopVoiceStatsMonitor()
  }
  syncSessionActionControls()
}

function closeAllPeers() {
  const userIds = [...state.peers.keys()]
  for (let index = 0; index < userIds.length; index += 1) {
    closePeer(userIds[index])
  }
}

function ensureLocalVoiceActivityMonitor() {
  if (!state.localStream || !state.user?.id) return
  const localUserId = String(state.user.id)
  if (state.voiceActivityMonitors.has(localUserId)) return
  startVoiceActivityMonitor(localUserId, state.localStream)
}

function startVoiceActivityMonitor(userId, stream) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId || !stream) return
  if (state.audioContext?.state === "suspended") {
    state.audioContext.resume().catch(() => {})
  }
  stopVoiceActivityMonitor(normalizedUserId)
  const context = state.audioContext
  if (!context) return
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.2
  source.connect(analyser)
  const data = new Uint8Array(analyser.fftSize)
  const localUserId = String(state.user?.id || "")
  let activeUntil = 0
  let activeLevel = ""
  let rafId = 0
  const tick = () => {
    analyser.getByteTimeDomainData(data)
    let maxAmplitude = 0
    for (let index = 0; index < data.length; index += 1) {
      const amplitude = Math.abs((data[index] - 128) / 128)
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude
      }
    }
    const now = Date.now()
    const isLocal = normalizedUserId === localUserId
    const effectiveMuted = isLocal ? getEffectiveMuted() : false
    if (isLocal) {
      renderLocalMicLevel(effectiveMuted ? 0 : maxAmplitude)
      if (effectiveMuted && maxAmplitude >= 0.06) {
        if (now - state.micMutedHintAt >= 4500) {
          state.micMutedHintAt = now
          if (state.isMuted) {
            toast("检测到你在说话，但当前已静音，别人听不到")
          } else if (state.pttEnabled && !state.pttPressed) {
            toast("检测到你在说话，但已开启按住说话：请按住按键后再说话")
          }
        }
      }
    }
    const speakingLevel = isLocal && effectiveMuted ? "" : getVoiceSpeakingLevel(maxAmplitude)
    if (speakingLevel) {
      activeUntil = now + 350
      activeLevel = speakingLevel
    }
    if (activeUntil > now && activeLevel) {
      setVoiceSpeakingLevel(normalizedUserId, activeLevel)
    } else {
      setVoiceSpeakingLevel(normalizedUserId, "")
    }
    rafId = requestAnimationFrame(tick)
  }
  tick()
  state.voiceActivityMonitors.set(normalizedUserId, {
    stop: () => {
      cancelAnimationFrame(rafId)
      source.disconnect()
      analyser.disconnect()
    }
  })
}

function stopVoiceActivityMonitor(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  const monitor = state.voiceActivityMonitors.get(normalizedUserId)
  if (monitor?.stop) {
    monitor.stop()
  }
  state.voiceActivityMonitors.delete(normalizedUserId)
  if (normalizedUserId === String(state.user?.id || "")) {
    renderLocalMicLevel(0, true)
  }
  setVoiceSpeakingLevel(normalizedUserId, "")
}

function renderLocalMicLevel(rawLevel, forceReset = false) {
  const effectiveMuted = getEffectiveMuted()
  const level = Math.max(0, Math.min(1, Number(rawLevel || 0)))
  const percent = effectiveMuted ? 0 : Math.round(level * 100)
  const now = Date.now()
  if (forceReset || effectiveMuted) {
    state.micPeakPercent = 0
    state.micPeakHoldUntil = 0
    state.micPeakLastUpdateAt = now
    state.micClipUntil = 0
    state.micAdvisorType = ""
    state.micAdvisorUntil = 0
    state.micAdvisorWindowStartedAt = 0
    state.micAdvisorLevelTotal = 0
    state.micAdvisorSampleCount = 0
    state.micAdvisorToastType = ""
    state.micAdvisorToastUntil = 0
  } else if (percent >= state.micPeakPercent) {
    state.micPeakPercent = percent
    state.micPeakHoldUntil = now + 450
    state.micPeakLastUpdateAt = now
  } else if (now > state.micPeakHoldUntil) {
    const elapsed = state.micPeakLastUpdateAt ? now - state.micPeakLastUpdateAt : 0
    const falloff = Math.max(1, Math.round(elapsed * 0.06))
    state.micPeakPercent = Math.max(percent, state.micPeakPercent - falloff)
    state.micPeakLastUpdateAt = now
  }
  const peakPercent = Math.max(percent, state.micPeakPercent)
  if (level >= 0.94 && !effectiveMuted) {
    state.micClipUntil = now + 800
  }
  updateMicGainAdvisor(now, percent)
  const clipping = !effectiveMuted && now <= state.micClipUntil
  const advisorType = now <= state.micAdvisorUntil ? state.micAdvisorType : ""
  if (els.micLevelFill) {
    els.micLevelFill.style.width = `${percent}%`
  }
  if (els.micLevelPeak) {
    els.micLevelPeak.style.left = `${peakPercent}%`
  }
  if (els.micLevelWrap) {
    els.micLevelWrap.classList.toggle("muted", effectiveMuted)
    els.micLevelWrap.classList.toggle("clipping", clipping)
    els.micLevelWrap.classList.toggle("suggest-low", advisorType === "low")
    els.micLevelWrap.classList.toggle("suggest-high", advisorType === "high")
  }
  if (els.micLevelText) {
    if (effectiveMuted) {
      els.micLevelText.textContent = "麦克风电平：已静音"
    } else if (clipping) {
      els.micLevelText.textContent = `麦克风电平：${percent}%（过载）`
    } else {
      els.micLevelText.textContent = `麦克风电平：${percent}%`
    }
  }
  if (els.micClipText) {
    if (effectiveMuted) {
      els.micClipText.textContent = "输入状态：静音"
    } else if (clipping) {
      els.micClipText.textContent = "输入状态：检测到削波，请降低输入音量"
    } else if (advisorType === "low") {
      els.micClipText.textContent = "输入状态：整体偏低，建议提高输入音量"
    } else if (advisorType === "high") {
      els.micClipText.textContent = "输入状态：整体偏高，建议降低输入音量"
    } else {
      els.micClipText.textContent = "输入状态正常"
    }
  }
}

function updateMicGainAdvisor(now, percent) {
  if (getEffectiveMuted()) return
  if (!state.micAdvisorWindowStartedAt) {
    state.micAdvisorWindowStartedAt = now
  }
  state.micAdvisorLevelTotal += percent
  state.micAdvisorSampleCount += 1
  if (now - state.micAdvisorWindowStartedAt < 1800) return
  if (!state.micAdvisorSampleCount) {
    state.micAdvisorWindowStartedAt = now
    return
  }
  const average = state.micAdvisorLevelTotal / state.micAdvisorSampleCount
  if (average < 10) {
    state.micAdvisorType = "low"
    state.micAdvisorUntil = now + 2200
    maybeToastMicAdvisor("low", now)
  } else if (average > 82) {
    state.micAdvisorType = "high"
    state.micAdvisorUntil = now + 2200
    maybeToastMicAdvisor("high", now)
  } else {
    state.micAdvisorType = ""
    state.micAdvisorUntil = 0
    state.micAdvisorToastType = ""
    state.micAdvisorToastUntil = 0
  }
  state.micAdvisorWindowStartedAt = now
  state.micAdvisorLevelTotal = 0
  state.micAdvisorSampleCount = 0
}

function maybeToastMicAdvisor(type, now) {
  const normalizedType = String(type || "")
  if (!normalizedType) return
  if (state.micAdvisorToastType === normalizedType && now <= state.micAdvisorToastUntil) return
  state.micAdvisorToastType = normalizedType
  state.micAdvisorToastUntil = now + 6000
  if (normalizedType === "low") {
    toast("麦克风输入偏低，建议提高输入音量")
    return
  }
  if (normalizedType === "high") {
    toast("麦克风输入偏高，建议降低输入音量")
  }
}

function setVoiceSpeakingLevel(userId, level) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  const normalizedLevel = String(level || "")
  if (normalizedLevel) {
    const previousLevel = state.voiceSpeakingLevels.get(normalizedUserId) || ""
    if (previousLevel === normalizedLevel && state.voiceSpeakingUsers.has(normalizedUserId)) return
    state.voiceSpeakingUsers.add(normalizedUserId)
    state.voiceSpeakingLevels.set(normalizedUserId, normalizedLevel)
    renderOnlineUsers()
    return
  }
  if (!state.voiceSpeakingUsers.has(normalizedUserId)) return
  state.voiceSpeakingUsers.delete(normalizedUserId)
  state.voiceSpeakingLevels.delete(normalizedUserId)
  renderOnlineUsers()
}

function getVoiceSpeakingLevel(amplitude) {
  const value = Number(amplitude || 0)
  if (value <= 0.08) return ""
  if (value >= 0.28) return "strong"
  if (value >= 0.16) return "medium"
  return "weak"
}

function setVoicePeerStatus(userId, status) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  const normalizedStatus = String(status || "")
  if (!normalizedStatus) {
    clearVoicePeerStatus(normalizedUserId)
    return
  }
  if (state.voicePeerStatuses.get(normalizedUserId) === normalizedStatus) return
  state.voicePeerStatuses.set(normalizedUserId, normalizedStatus)
  renderOnlineUsers()
}

function clearVoicePeerStatus(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return
  if (!state.voicePeerStatuses.has(normalizedUserId)) return
  state.voicePeerStatuses.delete(normalizedUserId)
  renderOnlineUsers()
}

function clearVoicePeerRetryTimer(userId) {
  const normalizedUserId = String(userId || "")
  const timer = state.voicePeerRetryTimers.get(normalizedUserId)
  if (!timer) return
  clearTimeout(timer)
  state.voicePeerRetryTimers.delete(normalizedUserId)
}

function scheduleVoicePeerRecovery(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId || state.voicePeerRetryTimers.has(normalizedUserId)) return
  const timer = setTimeout(async () => {
    state.voicePeerRetryTimers.delete(normalizedUserId)
    if (!shouldRecoverVoicePeer(normalizedUserId)) {
      clearVoicePeerStatus(normalizedUserId)
      return
    }
    closePeer(normalizedUserId)
    setVoicePeerStatus(normalizedUserId, "reconnecting")
    try {
      await createOffer(normalizedUserId)
    } catch {
      setVoicePeerStatus(normalizedUserId, "failed")
    }
  }, 1200)
  state.voicePeerRetryTimers.set(normalizedUserId, timer)
}

function shouldRecoverVoicePeer(userId) {
  if (!state.roomId || !state.ws || state.ws.readyState !== WebSocket.OPEN) return false
  if (!state.user || userId === state.user.id) return false
  if (!canVoiceConnectUser(userId)) return false
  const target = state.onlineUsers.find((item) => item.id === userId)
  if (!target) return false
  return target.roomId === state.roomId
}

function canVoiceConnectUser(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return false
  if (!state.privateSessionUserId) return true
  return normalizedUserId === state.privateSessionUserId
}

function resolveUserDisplayName(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return "用户"
  if (normalizedUserId === String(state.user?.id || "")) {
    return String(state.user?.username || "我")
  }
  const target = state.onlineUsers.find((item) => String(item.id || "") === normalizedUserId)
  return String(target?.username || "用户")
}

function resetVoiceSessionState() {
  stopAudioOutputTestTone(true)
  stopLiveShare(false, false)
  removeAllRemoteLiveStreams()
  setLiveStatus("当前无人直播")
  closeAllPeers()
  stopAccompanimentCapture()
  state.accompanimentEnabled = false
  localStorage.setItem(ACCOMPANIMENT_ENABLED_KEY, "0")
  if (els.accompanimentEnabled) {
    els.accompanimentEnabled.checked = false
  }
  state.pttPressed = false
  state.remoteMutedByAccompaniment = false
  stopVoiceActivityMonitor(state.user?.id)
  renderLocalMicLevel(0, true)
  state.voicePeerStatuses.clear()
  state.voiceSpeakingUsers.clear()
  state.voiceSpeakingLevels.clear()
  state.voiceMediaFlowUntilByUserId.clear()
  state.voiceStatsPrevInboundBytesByUserId.clear()
  state.voiceStatsPrevOutboundBytesByPeerUserId.clear()
  stopVoiceStatsMonitor()
  state.voicePeerRetryTimers.forEach((timer) => clearTimeout(timer))
  state.voicePeerRetryTimers.clear()
}

function pruneVoicePeerStatuses(nextUsers) {
  const inRoomUserIds = new Set()
  for (let index = 0; index < nextUsers.length; index += 1) {
    const user = nextUsers[index]
    if (!user?.id || user.id === state.user?.id) continue
    if (state.roomId && user.roomId === state.roomId) {
      inRoomUserIds.add(user.id)
    }
  }
  const statusUserIds = [...state.voicePeerStatuses.keys()]
  for (let index = 0; index < statusUserIds.length; index += 1) {
    const userId = statusUserIds[index]
    if (inRoomUserIds.has(userId)) continue
    clearVoicePeerRetryTimer(userId)
    clearVoicePeerStatus(userId)
  }
}

function pruneVoiceSpeakingUsers(nextUsers) {
  const inRoomUserIds = new Set()
  for (let index = 0; index < nextUsers.length; index += 1) {
    const user = nextUsers[index]
    if (!user?.id) continue
    if (state.roomId && user.roomId === state.roomId) {
      inRoomUserIds.add(user.id)
    }
  }
  const speakingUserIds = [...state.voiceSpeakingUsers]
  for (let index = 0; index < speakingUserIds.length; index += 1) {
    const userId = speakingUserIds[index]
    if (inRoomUserIds.has(userId)) continue
    stopVoiceActivityMonitor(userId)
    clearVoiceMediaFlow(userId)
  }
}

function sendChatMessage() {
  if (!hasAuthenticatedSession()) {
    notifyLoginRequired()
    return
  }
  const text = els.chatInput.value.trim()
  if (!text) return
  if (text === "/pm" || text === "/pm help" || text === "/pm ?" || text === "/pmr" || text === "/pmr help" || text === "/pmr ?") {
    setPmHint("私聊命令：/pm 用户名 消息内容；快速回复：/pmr 消息内容")
    renderPmHelpPanel(text)
    schedulePmInputGuidance(text, true)
    return
  }
  let privateDraft = parsePrivateMessageCommand(text)
  if (!privateDraft) {
    privateDraft = parsePrivateReplyCommand(text)
  }
  if (privateDraft) {
    if (!privateDraft.target || !privateDraft.content) return
    const targetUser = resolvePmTargetUser(privateDraft.target)
    if (!targetUser) {
      setPmHint("私聊目标用户不存在或不在线", "warn")
      return
    }
    if (targetUser.username.toLowerCase() !== privateDraft.target.toLowerCase()) {
      setPmHint(`已自动匹配私聊对象：${targetUser.username}`, "warn")
    } else {
      setPmHint("")
    }
    if (targetUser.id === state.user?.id) {
      setPmHint("不能给自己发送私聊草稿", "warn")
      return
    }
    const confirmKey = `${targetUser.id}|${privateDraft.content}`
    const now = Date.now()
    const inSameRoom = Boolean(state.roomId && targetUser.roomId === state.roomId)
    const status = targetUser.status || "online"
    if (!state.pmPendingConfirm || state.pmPendingConfirm.key !== confirmKey || state.pmPendingConfirm.expiresAt < now) {
      state.pmPendingConfirm = {
        key: confirmKey,
        expiresAt: now + 15_000
      }
      const roomLabel = inSameRoom ? "同房间" : "非同房间"
      setPmHint(`确认私聊对象：${targetUser.username}（${status}，${roomLabel}）。再次回车发送草稿`, "warn")
      return
    }
    const draftText = `[私聊草稿] -> ${targetUser.username}：${privateDraft.content}`
    sendWs(WS_EVENTS.CHAT_TEXT, {
      scope: "private",
      text: privateDraft.content,
      targetUserId: targetUser.id
    }, null)
    touchPrivateSessionActivity()
    addRecentPmTarget(targetUser.username)
    addPmDraftHistory(targetUser.username, privateDraft.content)
    updatePmInteraction(targetUser.username)
    els.chatInput.value = ""
    state.pmLastInputRaw = ""
    state.pmInCommandMode = false
    handlePmInputFrame("", true)
    setPmHint(`已发送私聊给 ${targetUser.username}`)
    return
  }
  clearPmPendingConfirm()
  if (!state.roomId) {
    toast("请先加入房间")
    return
  }
  const roomAccess = getCurrentRoomSendAccess()
  if (!roomAccess.allowed) {
    toast(roomAccess.reason)
    return
  }
  const privateTargetUserId = String(state.privateSessionUserId || "")
  if (privateTargetUserId) {
    const privateTarget = state.onlineUsers.find((item) => String(item.id || "") === privateTargetUserId)
    if (!privateTarget || privateTarget.roomId !== state.roomId) {
      clearPrivateSessionTarget(true)
      toast("私密会话对象已离开当前房间，已恢复公共聊天")
    } else {
      sendWs(WS_EVENTS.CHAT_TEXT, {
        scope: "private",
        text,
        targetUserId: privateTargetUserId
      }, null)
      touchPrivateSessionActivity()
      addRecentPmTarget(privateTarget.username || state.privateSessionUsername)
      updatePmInteraction(privateTarget.username || state.privateSessionUsername)
      els.chatInput.value = ""
      state.pmLastInputRaw = ""
      state.pmInCommandMode = false
      handlePmInputFrame("", true)
      return
    }
  }
  sendWs(WS_EVENTS.CHAT_TEXT, { text })
  els.chatInput.value = ""
  state.pmLastInputRaw = ""
  state.pmInCommandMode = false
  handlePmInputFrame("", true)
}

function appendChat(text, sender, options = {}) {
  const scrollContainer = els.chatMessages?.parentElement || null
  const li = document.createElement("li")
  if (options.kind === "private-draft") {
    li.classList.add("chat-private-draft")
  }
  if (options.kind === "private-in") {
    li.classList.add("chat-private-in")
  }
  if (options.kind === "private-out") {
    li.classList.add("chat-private-out")
  }
  li.innerHTML = `<strong>${escapeHtml(sender)}</strong>：${escapeHtml(text)}`
  els.chatMessages.appendChild(li)
  if (!options.skipAutoScroll && scrollContainer) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
  }
}

function appendFileMessage(payload) {
  const senderName = String(payload?.sender?.username || "匿名")
  const senderId = String(payload?.sender?.id || "")
  const fileName = String(payload?.fileName || "未命名文件")
  const dataUrl = String(payload?.dataUrl || "")
  const size = Number(payload?.size || 0)
  if (!dataUrl.startsWith("data:")) {
    appendChat(`📎 ${fileName}（文件数据无效）`, `文件 ${senderName}`)
    return
  }
  const li = document.createElement("li")
  li.className = senderId === state.user?.id ? "chat-file-out" : "chat-file-in"
  const title = document.createElement("strong")
  title.textContent = `文件 ${senderName}`
  const info = document.createElement("span")
  info.textContent = `：📎 ${fileName}（${formatFileSize(size)}）`
  const space = document.createTextNode(" ")
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = fileName
  link.rel = "noopener noreferrer"
  link.textContent = "下载"
  const previewImage = dataUrl.startsWith("data:image/") ? document.createElement("img") : null
  if (previewImage) {
    previewImage.src = dataUrl
    previewImage.alt = fileName
    previewImage.className = "chat-image-preview"
    previewImage.loading = "lazy"
  }
  li.appendChild(title)
  li.appendChild(info)
  li.appendChild(space)
  li.appendChild(link)
  if (previewImage) {
    li.appendChild(document.createElement("br"))
    li.appendChild(previewImage)
  }
  els.chatMessages.appendChild(li)
  const scrollContainer = els.chatMessages?.parentElement || null
  if (scrollContainer) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read_failed"))
    reader.onload = () => {
      const result = String(reader.result || "")
      if (!result.startsWith("data:")) {
        reject(new Error("invalid_data_url"))
        return
      }
      resolve(result)
    }
    reader.readAsDataURL(file)
  })
}

async function sendAttachmentFile(file, sourceLabel = "文件") {
  if (!hasAuthenticatedSession()) {
    notifyLoginRequired()
    return false
  }
  if (!file || !state.ws || !state.roomId) return false
  if (file.size <= 0 || file.size > MAX_FILE_SHARE_BYTES) {
    toast(`文件大小需在 1B ~ ${Math.round(MAX_FILE_SHARE_BYTES / 1024)}KB 之间`)
    return false
  }
  const roomAccess = getCurrentRoomSendAccess()
  if (!roomAccess.allowed) {
    toast(roomAccess.reason)
    return false
  }
  try {
    const dataUrl = await readFileAsDataUrl(file)
    sendWs(
      WS_EVENTS.CHAT_FILE_DATA,
      {
        fileName: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        dataUrl
      },
      state.roomId
    )
    appendChat(`📎 ${sourceLabel}发送中：${file.name}（${formatFileSize(file.size)}）`, "系统")
    state.lastFailedUpload = null
    syncSessionActionControls()
    return true
  } catch {
    state.lastFailedUpload = {
      file,
      sourceLabel: String(sourceLabel || "文件"),
      failedAt: Date.now()
    }
    syncSessionActionControls()
    toast(`${sourceLabel}读取失败，请重试`)
    return false
  }
}

function handleClipboardImagePaste(event) {
  const clipboardItems = event?.clipboardData?.items
  if (!clipboardItems || !clipboardItems.length) return
  const imageFiles = []
  for (const item of clipboardItems) {
    if (!item || item.kind !== "file") continue
    const mimeType = String(item.type || "")
    if (!mimeType.startsWith("image/")) continue
    const file = item.getAsFile()
    if (!file) continue
    imageFiles.push(file)
  }
  if (!imageFiles.length) return
  event.preventDefault()
  imageFiles.slice(0, 3).forEach((file, index) => {
    const extension = resolveImageFileExtension(file.type || "")
    const wrapped = new File([file], `clipboard-image-${Date.now()}-${index + 1}.${extension}`, { type: file.type || "image/png" })
    sendAttachmentFile(wrapped, "剪贴板图片").catch(() => {})
  })
}

async function sendDroppedFiles(files) {
  const list = Array.isArray(files) ? files : []
  if (!list.length) return
  const limited = list.slice(0, 5)
  for (let index = 0; index < limited.length; index += 1) {
    const file = limited[index]
    await sendAttachmentFile(file, "拖拽文件")
  }
}

function retryLastFailedUpload() {
  const failed = state.lastFailedUpload
  if (!failed?.file) return
  sendAttachmentFile(failed.file, `${failed.sourceLabel || "文件"}重试`).catch(() => {})
}

function resolveImageFileExtension(mimeType) {
  const type = String(mimeType || "").trim().toLowerCase()
  if (type === "image/jpeg") return "jpg"
  if (type === "image/gif") return "gif"
  if (type === "image/webp") return "webp"
  if (type === "image/bmp") return "bmp"
  return "png"
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0)
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`
  return `${(size / (1024 * 1024)).toFixed(2)}MB`
}

function renderOnlineUsers() {
  els.onlineUsers.innerHTML = ""
  const activeRoom = state.roomList.find((item) => item.id === state.roomId) || null
  const keyword = (els.onlineUserSearch.value || "").trim().toLowerCase()
  const filter = els.onlineStatusFilter.value || "all"
  const inRoomFirst = Boolean(els.inRoomFirst.checked)
  const onlyCurrentRoom = Boolean(els.onlyCurrentRoom.checked)
  const sortedUsers = [...state.onlineUsers]
    .filter((user) => {
      if (!onlyCurrentRoom) return true
      if (!activeRoom) return false
      return user.roomId === activeRoom.id
    })
    .filter((user) => (filter === "all" ? true : (user.status || "online") === filter))
    .filter((user) => {
      if (!keyword) return true
      return String(user.username || "").toLowerCase().includes(keyword)
    })
    .sort((a, b) => {
      if (inRoomFirst && activeRoom) {
        const aInRoom = a.roomId === activeRoom.id ? 1 : 0
        const bInRoom = b.roomId === activeRoom.id ? 1 : 0
        if (aInRoom !== bInRoom) return bInRoom - aInRoom
      }
      const statusOrder = { online: 0, busy: 1, offline: 2 }
      const aRank = statusOrder[a.status] ?? 3
      const bRank = statusOrder[b.status] ?? 3
      if (aRank !== bRank) return aRank - bRank
      return String(a.username || "").localeCompare(String(b.username || ""), "zh-CN")
    })
  if (sortedUsers.length === 0) {
    const li = document.createElement("li")
    li.className = "online-user-empty"
    li.textContent = "没有符合条件的在线用户"
    els.onlineUsers.appendChild(li)
    return
  }
  sortedUsers.forEach((user) => {
    const li = document.createElement("li")
    li.className = "online-user-item"
    const main = document.createElement("div")
    main.className = "online-user-main"
    const name = document.createElement("button")
    name.type = "button"
    name.className = "online-user-mention"
    name.textContent = `${user.username} [${user.status}] ${user.roomId ? "🟢" : "⚪"}`
    name.onclick = () => insertMention(user.username)
    const badges = document.createElement("span")
    badges.className = "online-user-badges"
    if ((user.role || "user") === "admin") {
      badges.appendChild(createOnlineBadge("管理员", "admin"))
    }
    if (activeRoom && user.roomId === activeRoom.id && activeRoom.host_user_id === user.id) {
      badges.appendChild(createOnlineBadge("主持人", "host"))
    }
    if (user.roomId && user.canSend === false) {
      badges.appendChild(createOnlineBadge("发言受限", "mute"))
    }
    const voiceBadge = getVoiceBadgeByUserId(user.id)
    if (voiceBadge) {
      badges.appendChild(createOnlineBadge(voiceBadge.text, voiceBadge.type))
    }
    const speakingDot = getVoiceSpeakingDotByUserId(user.id)
    if (speakingDot) {
      badges.appendChild(createOnlineBadge(speakingDot.text, speakingDot.type))
    }
    const speakingBadge = getVoiceSpeakingBadgeByUserId(user.id)
    if (speakingBadge) {
      badges.appendChild(createOnlineBadge(speakingBadge.text, speakingBadge.type))
    }
    const liveBadge = getLiveBadgeByUserId(user.id)
    if (liveBadge) {
      badges.appendChild(createOnlineBadge(liveBadge.text, liveBadge.type))
    }
    main.appendChild(name)
    main.appendChild(badges)
    const actions = document.createElement("div")
    actions.className = "online-user-actions"
    const privateBtn = document.createElement("button")
    privateBtn.type = "button"
    privateBtn.className = "online-user-pm"
    privateBtn.textContent = state.privateSessionUserId === user.id ? "私密会话中" : "私聊"
    privateBtn.disabled = user.id === state.user?.id
    privateBtn.onclick = () => startPrivateSession(user)
    actions.appendChild(privateBtn)
    li.appendChild(main)
    li.appendChild(actions)
    els.onlineUsers.appendChild(li)
  })
  renderVoiceRoomUsers()
}

function renderVoiceRoomUsers() {
  if (!els.voiceRoomUsers || !els.voiceRoomSummary) return
  els.voiceRoomUsers.innerHTML = ""
  const activeRoom = state.roomList.find((item) => item.id === state.roomId) || null
  if (!hasAuthenticatedSession()) {
    els.voiceRoomSummary.textContent = "请先登录"
    appendEmptyVoiceRoomMessage("登录后可查看房间语音成员")
    return
  }
  if (!activeRoom) {
    els.voiceRoomSummary.textContent = "未加入房间"
    appendEmptyVoiceRoomMessage("加入房间后可查看当前语音成员")
    return
  }
  const roomUsers = state.onlineUsers
    .filter((user) => user.roomId === activeRoom.id)
    .sort((a, b) => {
      if (String(a.id || "") === String(state.user?.id || "")) return -1
      if (String(b.id || "") === String(state.user?.id || "")) return 1
      return ZH_COLLATOR.compare(String(a.username || ""), String(b.username || ""))
    })
  const liveOwnerName = state.liveActiveUserId
    ? resolveUserDisplayName(state.liveActiveUserId)
    : ""
  const liveSuffix = liveOwnerName ? ` · 直播中：${liveOwnerName}` : ""
  els.voiceRoomSummary.textContent = `${activeRoom.name} · ${roomUsers.length} 人语音中${liveSuffix}`
  if (!roomUsers.length) {
    appendEmptyVoiceRoomMessage("当前房间暂无在线成员")
    return
  }
  roomUsers.forEach((user) => {
    const li = document.createElement("li")
    li.className = "online-user-item"
    const main = document.createElement("div")
    main.className = "online-user-main"
    const name = document.createElement("button")
    name.type = "button"
    name.className = "online-user-mention"
    const selfSuffix = user.id === state.user?.id ? "（你）" : ""
    name.textContent = `${user.username}${selfSuffix}`
    name.onclick = () => insertMention(user.username)
    const badges = document.createElement("span")
    badges.className = "online-user-badges"
    badges.appendChild(createOnlineBadge(user.status === "busy" ? "忙碌" : "在线", user.status === "busy" ? "mute" : "allow"))
    if ((user.role || "user") === "admin") {
      badges.appendChild(createOnlineBadge("管理员", "admin"))
    }
    if (activeRoom.host_user_id === user.id) {
      badges.appendChild(createOnlineBadge("主持人", "host"))
    }
    if (user.roomId && user.canSend === false) {
      badges.appendChild(createOnlineBadge("发言受限", "mute"))
    }
    const voiceBadge = getVoiceBadgeByUserId(user.id)
    if (voiceBadge) {
      badges.appendChild(createOnlineBadge(voiceBadge.text, voiceBadge.type))
    }
    const speakingBadge = getVoiceSpeakingBadgeByUserId(user.id)
    if (speakingBadge) {
      badges.appendChild(createOnlineBadge(speakingBadge.text, speakingBadge.type))
    }
    const liveBadge = getLiveBadgeByUserId(user.id)
    if (liveBadge) {
      badges.appendChild(createOnlineBadge(liveBadge.text, liveBadge.type))
    }
    main.appendChild(name)
    main.appendChild(badges)
    li.appendChild(main)
    els.voiceRoomUsers.appendChild(li)
  })
}

function appendEmptyVoiceRoomMessage(text) {
  const li = document.createElement("li")
  li.className = "online-user-empty"
  li.textContent = text
  els.voiceRoomUsers.appendChild(li)
}

function createOnlineBadge(text, type) {
  const badge = document.createElement("span")
  badge.className = `user-badge ${type}`
  badge.textContent = text
  return badge
}

function getVoiceBadgeByUserId(userId) {
  const status = state.voicePeerStatuses.get(String(userId || ""))
  if (status === "connected") return { text: "通话中", type: "voice-connected" }
  if (status === "connecting") return { text: "语音连接中", type: "voice-connecting" }
  if (status === "reconnecting") return { text: "语音重连中", type: "voice-reconnecting" }
  if (status === "failed") return { text: "语音重连失败", type: "voice-failed" }
  return null
}

function getLiveBadgeByUserId(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return null
  if (normalizedUserId !== String(state.liveActiveUserId || "")) return null
  return { text: "直播中", type: "voice-connected" }
}

function getVoiceSpeakingDotByUserId(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return null
  const flowUntil = Number(state.voiceMediaFlowUntilByUserId.get(normalizedUserId) || 0)
  if (flowUntil <= Date.now()) return null
  if (!state.voiceSpeakingUsers.has(normalizedUserId)) return null
  return { text: "●", type: "voice-speaking-strong" }
}

function getVoiceSpeakingBadgeByUserId(userId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId || !state.voiceSpeakingUsers.has(normalizedUserId)) return null
  const level = state.voiceSpeakingLevels.get(normalizedUserId) || "weak"
  if (level === "strong") return { text: "讲话强", type: "voice-speaking-strong" }
  if (level === "medium") return { text: "讲话中", type: "voice-speaking-medium" }
  return { text: "讲话弱", type: "voice-speaking-weak" }
}

function insertMention(username) {
  const mention = `@${username} `
  if (!els.chatInput.value.trim()) {
    els.chatInput.value = mention
  } else if (els.chatInput.value.endsWith(" ")) {
    els.chatInput.value += mention
  } else {
    els.chatInput.value += ` ${mention}`
  }
  els.chatInput.focus()
  els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length)
}

function preparePrivateMessageDraft(username) {
  els.chatInput.value = `/pm ${username} `
  state.pmLastInputRaw = els.chatInput.value
  state.pmInCommandMode = true
  els.chatInput.focus()
  els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length)
  addRecentPmTarget(username)
  renderPmSuggestions()
  setPmHint("已生成私聊草稿，输入内容后回车发送（仅本地预览）")
}

function startPrivateSession(user) {
  const userId = String(user?.id || "")
  const username = String(user?.username || "")
  if (!userId || !username) return
  if (!state.roomId) {
    toast("请先加入房间再发起私密会话")
    return
  }
  if (userId === state.user?.id) return
  if (state.privateSessionUserId === userId) {
    touchPrivateSessionActivity()
    preparePrivateMessageDraft(username)
    toast(`继续与 ${username} 的私密会话`)
    return
  }
  activatePrivateSession(userId, username, "manual")
  sendWs(WS_EVENTS.PRIVATE_SESSION_INVITE, {
    targetUserId: userId,
    text: `${state.user?.username || "用户"} 邀请你进入私密会话`
  }, null)
  enforcePrivateSessionPeerScope()
  preparePrivateMessageDraft(username)
  toast(`已向 ${username} 发送私密会话邀请`)
}

function clearPrivateSessionTarget(notify = false, createRecovery = true) {
  if (!state.privateSessionUserId) return
  const previousTarget = {
    userId: state.privateSessionUserId,
    username: state.privateSessionUsername
  }
  state.privateSessionUserId = ""
  state.privateSessionUsername = ""
  state.privateSessionExpireAt = 0
  syncSessionActionControls()
  renderOnlineUsers()
  if (createRecovery && previousTarget.userId) {
    state.privateSessionRecovery = {
      userId: previousTarget.userId,
      username: previousTarget.username || "未知用户",
      expiresAt: Date.now() + PRIVATE_SESSION_RECOVERY_WINDOW_MS
    }
  }
  if (notify) {
    toast("已退出私密会话，恢复房间语音")
  }
}

function activatePrivateSession(userId, username, source = "manual") {
  state.privateSessionUserId = String(userId || "")
  state.privateSessionUsername = String(username || "")
  state.privateSessionRecovery = null
  touchPrivateSessionActivity()
  syncSessionActionControls()
  renderOnlineUsers()
  if (source === "invite") {
    toast(`你已接受 ${state.privateSessionUsername} 的私密会话邀请`)
  } else if (source === "restore") {
    toast(`已恢复与 ${state.privateSessionUsername} 的私密会话`)
  } else {
    toast(`已切换为与 ${state.privateSessionUsername} 的私密语音+文字会话`)
  }
}

function touchPrivateSessionActivity() {
  if (!state.privateSessionUserId) return
  state.privateSessionExpireAt = Date.now() + PRIVATE_SESSION_IDLE_TIMEOUT_MS
}

function enforcePrivateSessionPeerScope() {
  if (!state.privateSessionUserId) return
  const userIds = [...state.peers.keys()]
  for (let index = 0; index < userIds.length; index += 1) {
    const peerUserId = userIds[index]
    if (peerUserId === state.privateSessionUserId) continue
    closePeer(peerUserId)
  }
  if (state.ws?.readyState === WebSocket.OPEN && state.privateSessionUserId) {
    createOffer(state.privateSessionUserId).catch(() => {})
  }
}

function startPrivateSessionMonitor() {
  if (state.privateSessionTimer) return
  state.privateSessionTimer = setInterval(() => {
    checkPrivateSessionTimeout()
    reconcilePrivateSessionTargetAvailability()
    reconcilePrivateSessionRecovery()
  }, 5000)
}

function checkPrivateSessionTimeout() {
  if (!state.privateSessionUserId || !state.privateSessionExpireAt) return
  if (Date.now() < state.privateSessionExpireAt) return
  clearPrivateSessionTarget(false, false)
  toast("私密会话已超时，已恢复房间语音")
}

function reconcilePrivateSessionRecovery() {
  const recovery = state.privateSessionRecovery
  if (!recovery?.userId) return
  if (Date.now() > Number(recovery.expiresAt || 0)) {
    state.privateSessionRecovery = null
    return
  }
  if (!state.roomId) return
  const target = state.onlineUsers.find((item) => String(item.id || "") === String(recovery.userId || ""))
  if (!target || target.roomId !== state.roomId) return
  activatePrivateSession(target.id, target.username || recovery.username || "未知用户", "restore")
  enforcePrivateSessionPeerScope()
  preparePrivateMessageDraft(target.username || recovery.username || "未知用户")
}

function reconcilePrivateSessionTargetAvailability() {
  if (!state.privateSessionUserId || !state.roomId) return
  const target = state.onlineUsers.find((item) => String(item.id || "") === String(state.privateSessionUserId || ""))
  if (target && target.roomId === state.roomId) return
  clearPrivateSessionTarget(false)
  toast("私密会话对象不在当前房间，已恢复公共语音")
}

async function handleIncomingPrivateSessionInvite(payload) {
  const senderId = String(payload?.sender?.id || "")
  const senderName = String(payload?.sender?.username || "匿名用户")
  if (!senderId || senderId === state.user?.id) return
  if (!state.roomId) return
  if (payload?.roomId && String(payload.roomId) !== String(state.roomId)) return
  const result = await openActionDialog({
    title: "私密会话邀请",
    message: `${senderName} 邀请你进入私密语音+私密文字会话，是否接受？`,
    confirmText: "接受",
    cancelText: "稍后"
  })
  if (!result.confirmed) {
    toast(`你已忽略 ${senderName} 的私密会话邀请`)
    return
  }
  activatePrivateSession(senderId, senderName, "invite")
  enforcePrivateSessionPeerScope()
  preparePrivateMessageDraft(senderName)
}

function parsePrivateMessageCommand(text) {
  const normalized = String(text || "").trim()
  if (!normalized.startsWith("/pm ")) return null
  const body = normalized.slice(4).trim()
  if (!body) {
    setPmHint("私聊格式：/pm 用户名 消息内容", "warn")
    return { target: null, content: null }
  }
  const firstSpaceIndex = body.indexOf(" ")
  if (firstSpaceIndex === -1) {
    setPmHint("私聊格式：/pm 用户名 消息内容", "warn")
    return { target: null, content: null }
  }
  const target = body.slice(0, firstSpaceIndex).trim()
  const content = body.slice(firstSpaceIndex + 1).trim()
  if (!target || !content) {
    setPmHint("私聊格式：/pm 用户名 消息内容", "warn")
    return { target: null, content: null }
  }
  return { target, content }
}

function parsePrivateReplyCommand(text) {
  const normalized = String(text || "").trim()
  if (!normalized.startsWith("/pmr")) return null
  if (!normalized.startsWith("/pmr ")) {
    setPmHint("快速回复格式：/pmr 消息内容", "warn")
    return { target: null, content: null }
  }
  const content = normalized.slice(5).trim()
  if (!content) {
    setPmHint("快速回复格式：/pmr 消息内容", "warn")
    return { target: null, content: null }
  }
  const latestTarget = resolveLatestPmTarget()
  if (!latestTarget) {
    setPmHint("暂无可回复对象，请先使用 /pm 用户名 消息内容", "warn")
    return { target: null, content: null }
  }
  return { target: latestTarget.username, content }
}

function resolvePmTargetUser(target) {
  const normalizedTarget = String(target || "").trim().toLowerCase()
  if (!normalizedTarget) return null
  const onlineCandidates = state.pmOnlineCandidates
  const onlineCandidatesLength = onlineCandidates.length
  const onlineCandidateLowerNames = state.pmOnlineCandidateLowerNames
  const exact = state.pmOnlineByUsername.get(normalizedTarget)
  if (exact) return exact
  const recentRankMap = getRecentPmTargetRankMap()
  const roomId = state.roomId
  const hasRoomId = Boolean(roomId)
  const fallbackRecentRank = Number.MAX_SAFE_INTEGER
  let bestUser = null
  let bestName = ""
  let bestRecentRank = fallbackRecentRank
  let bestInRoom = -1
  let bestStarts = false
  for (let index = 0; index < onlineCandidatesLength; index += 1) {
    const user = onlineCandidates[index]
    if (!user) continue
    const name = String(user.username || "")
    let lower = onlineCandidateLowerNames[index]
    if (!lower) {
      lower = name.toLowerCase()
      onlineCandidateLowerNames[index] = lower
    }
    const starts = lower.startsWith(normalizedTarget)
    if (!starts && !lower.includes(normalizedTarget)) continue
    const recentRank = recentRankMap.get(lower) ?? fallbackRecentRank
    const inRoom = hasRoomId && user.roomId === roomId ? 1 : 0
    const isBetter =
      !bestUser ||
      inRoom > bestInRoom ||
      (inRoom === bestInRoom &&
        (recentRank < bestRecentRank ||
          (recentRank === bestRecentRank &&
            ((starts && !bestStarts) || (starts === bestStarts && ZH_COLLATOR.compare(name, bestName) < 0))))
      )
    if (isBetter) {
      bestUser = user
      bestName = name
      bestRecentRank = recentRank
      bestInRoom = inRoom
      bestStarts = starts
    }
  }
  return bestUser
}

function resolveLatestPmTarget() {
  const onlineCandidates = state.pmOnlineCandidates
  const onlineCandidatesLength = onlineCandidates.length
  const onlineCandidateLowerNames = state.pmOnlineCandidateLowerNames
  if (!onlineCandidatesLength) return null
  const recentLowerTargets = getRecentPmTargetLowerList()
  for (let index = 0; index < recentLowerTargets.length; index += 1) {
    const matched = state.pmOnlineByUsername.get(recentLowerTargets[index])
    if (matched) return matched
  }
  let bestUser = null
  let bestTs = -1
  const interactionTimes = state.pmInteractionTimes
  for (let index = 0; index < onlineCandidatesLength; index += 1) {
    const user = onlineCandidates[index]
    if (!user) continue
    const name = String(user.username || "")
    let lower = onlineCandidateLowerNames[index]
    if (!lower) {
      lower = name.toLowerCase()
      onlineCandidateLowerNames[index] = lower
    }
    const ts = Number(interactionTimes[lower] || 0)
    if (ts <= bestTs) continue
    bestTs = ts
    bestUser = user
  }
  return bestUser || onlineCandidates[0] || null
}

function persistChat(text, sender, options = {}) {
  const key = `chat_history_${state.roomId || "global"}`
  const oldValue = JSON.parse(localStorage.getItem(key) || "[]")
  oldValue.push({ text, sender, kind: options.kind || "normal", ts: Date.now() })
  if (oldValue.length > 200) {
    oldValue.splice(0, oldValue.length - 200)
  }
  localStorage.setItem(key, JSON.stringify(oldValue))
}

async function loadDeviceList() {
  const previousInputValue = resolvePreferredDeviceValue(els.audioInput.value, localStorage.getItem(AUDIO_INPUT_DEVICE_KEY))
  const previousOutputValue = resolvePreferredDeviceValue(els.audioOutput.value, localStorage.getItem(AUDIO_OUTPUT_DEVICE_KEY))
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  const tracks = stream.getTracks()
  for (let index = 0; index < tracks.length; index += 1) {
    tracks[index].stop()
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  const inputs = []
  const outputs = []
  for (let index = 0; index < devices.length; index += 1) {
    const device = devices[index]
    if (device.kind === "audioinput") {
      inputs.push(device)
      continue
    }
    if (device.kind === "audiooutput") {
      outputs.push(device)
    }
  }
  bindDeviceOptions(els.audioInput, inputs)
  bindDeviceOptions(els.audioOutput, outputs)
  const nextInputValue = pickAvailableDeviceValue(inputs, previousInputValue)
  const nextOutputValue = pickAvailableDeviceValue(outputs, previousOutputValue)
  if (els.audioInput.value !== nextInputValue) {
    els.audioInput.value = nextInputValue
  }
  if (els.audioOutput.value !== nextOutputValue) {
    els.audioOutput.value = nextOutputValue
  }
  localStorage.setItem(AUDIO_INPUT_DEVICE_KEY, String(nextInputValue || ""))
  localStorage.setItem(AUDIO_OUTPUT_DEVICE_KEY, String(nextOutputValue || ""))
  if (state.localStream && previousInputValue && nextInputValue && previousInputValue !== nextInputValue) {
    await switchAudioInput()
  }
  if (previousOutputValue && nextOutputValue && previousOutputValue !== nextOutputValue) {
    await applyAudioOutputToRemoteAudios()
  }
}

function resolvePreferredDeviceValue(currentValue, storedValue) {
  const current = String(currentValue || "").trim()
  if (current) return current
  return String(storedValue || "").trim()
}

function bindDeviceOptions(select, devices) {
  select.innerHTML = ""
  const fragment = document.createDocumentFragment()
  for (let index = 0; index < devices.length; index += 1) {
    const device = devices[index]
    const option = document.createElement("option")
    option.value = device.deviceId
    option.textContent = device.label || `Device-${device.deviceId.slice(0, 5)}`
    fragment.appendChild(option)
  }
  select.appendChild(fragment)
}

function pickAvailableDeviceValue(devices, preferredValue) {
  const preferred = String(preferredValue || "")
  for (let index = 0; index < devices.length; index += 1) {
    if (devices[index].deviceId === preferred) return preferred
  }
  return devices[0]?.deviceId || ""
}

async function request(path, method, body) {
  const response = await fetch(`${SERVER_HTTP}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && path !== "/auth/refresh") {
    const refreshed = await refreshTokenAndReconnect()
    if (refreshed) {
      return request(path, method, body)
    }
    showLoggedOutState("登录已过期，请重新登录")
  }
  if (!response.ok) throw new Error(data.error || "请求失败")
  return data
}

function openActionDialog(options = {}) {
  if (!els.actionDialog || !els.actionDialogTitle || !els.actionDialogMessage) {
    return Promise.resolve({ confirmed: false, inputValue: "", checked: false })
  }
  if (state.actionDialogResolver) {
    state.actionDialogResolver({ confirmed: false, inputValue: "", checked: false })
    state.actionDialogResolver = null
  }
  const title = String(options.title || "确认操作").trim() || "确认操作"
  const message = String(options.message || "").trim()
  const inputLabel = String(options.inputLabel || "").trim()
  const inputValue = String(options.inputValue || "").trim()
  const checkboxLabel = String(options.checkboxLabel || "").trim()
  const confirmText = String(options.confirmText || "确认").trim() || "确认"
  const cancelText = String(options.cancelText || "取消").trim() || "取消"
  els.actionDialogTitle.textContent = title
  els.actionDialogMessage.textContent = message
  if (els.actionDialogInputWrap && els.actionDialogInputLabel && els.actionDialogInput) {
    const showInput = Boolean(inputLabel)
    els.actionDialogInputWrap.classList.toggle("hidden", !showInput)
    els.actionDialogInputLabel.textContent = inputLabel
    els.actionDialogInput.value = inputValue
  }
  if (els.actionDialogCheckboxWrap && els.actionDialogCheckboxLabel && els.actionDialogCheckbox) {
    const showCheckbox = Boolean(checkboxLabel)
    els.actionDialogCheckboxWrap.classList.toggle("hidden", !showCheckbox)
    els.actionDialogCheckboxLabel.textContent = checkboxLabel
    els.actionDialogCheckbox.checked = false
  }
  if (els.actionDialogConfirmBtn) {
    els.actionDialogConfirmBtn.textContent = confirmText
  }
  if (els.actionDialogCancelBtn) {
    els.actionDialogCancelBtn.textContent = cancelText
  }
  els.actionDialog.classList.remove("hidden")
  if (inputLabel && els.actionDialogInput) {
    window.setTimeout(() => els.actionDialogInput?.focus(), 0)
  }
  return new Promise((resolve) => {
    state.actionDialogResolver = resolve
  })
}

function closeActionDialog(result) {
  if (!els.actionDialog) return
  els.actionDialog.classList.add("hidden")
  const resolver = state.actionDialogResolver
  state.actionDialogResolver = null
  if (resolver) {
    resolver({
      confirmed: Boolean(result?.confirmed),
      inputValue: String(result?.inputValue || "").trim(),
      checked: Boolean(result?.checked)
    })
  }
}

function byId(id) {
  return document.getElementById(id)
}

function toast(message) {
  const text = String(message || "").trim()
  if (!text) return
  showFloatingToast(text)
  if (window.desktopBridge?.notify) {
    window.desktopBridge.notify({
      title: "Voice Chat",
      body: text
    }).catch(() => {})
  }
}

function showFloatingToast(message) {
  const layer = ensureToastLayer()
  const item = document.createElement("div")
  item.className = "toast-item"
  item.textContent = message
  layer.appendChild(item)
  window.setTimeout(() => {
    item.remove()
    if (!layer.children.length) {
      layer.classList.add("hidden")
    }
  }, TOAST_DURATION_MS)
  layer.classList.remove("hidden")
}

function ensureToastLayer() {
  if (toastLayerEl) return toastLayerEl
  const layer = document.createElement("div")
  layer.className = "toast-layer hidden"
  document.body.appendChild(layer)
  toastLayerEl = layer
  return layer
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

function getStoredPmDraftHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(PM_DRAFT_HISTORY_KEY) || "[]")
    if (!Array.isArray(value)) return []
    return value
      .map((item) => ({
        target: String(item?.target || "").trim(),
        content: String(item?.content || "").trim(),
        pinned: Boolean(item?.pinned),
        ts: Number(item?.ts || 0)
      }))
      .filter((item) => item.target && item.content)
      .sort((a, b) => {
        const aPinned = a.pinned ? 1 : 0
        const bPinned = b.pinned ? 1 : 0
        if (aPinned !== bPinned) return bPinned - aPinned
        return b.ts - a.ts
      })
      .slice(0, MAX_PM_DRAFT_HISTORY)
  } catch {
    return []
  }
}

function getStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}")
    return value && typeof value === "object" && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

function getStoredBoolean(key, defaultValue = false) {
  const value = localStorage.getItem(key)
  if (value === "1" || value === "true") return true
  if (value === "0" || value === "false") return false
  return Boolean(defaultValue)
}

function getStoredNumber(key, defaultValue, minValue, maxValue) {
  const stored = localStorage.getItem(key)
  const raw = stored !== null ? Number(stored) : NaN
  const fallback = Number(defaultValue)
  const value = Number.isFinite(raw) ? raw : fallback
  return Math.max(Number(minValue), Math.min(Number(maxValue), value))
}

function getStoredPttKeyCode() {
  const value = String(localStorage.getItem(PTT_KEY_CODE_KEY) || DEFAULT_PTT_KEY_CODE)
  return normalizePttKeyCode(value) || DEFAULT_PTT_KEY_CODE
}

function getStoredShortcut(key, fallback) {
  const value = String(localStorage.getItem(key) || "").trim()
  return value || String(fallback || "")
}

function createOnlineUsersSignature(users) {
  if (!Array.isArray(users) || !users.length) return "empty"
  const marks = users
    .map((user) => {
      const id = String(user?.id || "")
      const username = String(user?.username || "")
      const status = String(user?.status || "online")
      const roomId = String(user?.roomId || "")
      const role = String(user?.role || "user")
      const canSend = user?.canSend === false ? "0" : "1"
      return `${id}|${username}|${status}|${roomId}|${role}|${canSend}`
    })
    .sort()
  return marks.join(";")
}

function applyRoomUserPresenceDelta(payload, joined) {
  const userId = String(payload?.user?.id || "")
  if (!userId) return false
  const roomId = String(payload?.roomId || state.roomId || "")
  const nextUsers = [...state.onlineUsers]
  const index = nextUsers.findIndex((item) => String(item?.id || "") === userId)
  if (joined) {
    if (index >= 0) {
      nextUsers[index] = {
        ...nextUsers[index],
        username: payload?.user?.username || nextUsers[index].username || "用户",
        roomId,
        status: nextUsers[index].status || "online"
      }
    } else {
      nextUsers.push({
        id: userId,
        username: payload?.user?.username || "用户",
        roomId,
        status: "online",
        role: "user",
        canSend: true
      })
    }
  } else if (index >= 0) {
    nextUsers[index] = {
      ...nextUsers[index],
      roomId: ""
    }
  } else {
    return false
  }
  const nextSignature = createOnlineUsersSignature(nextUsers)
  if (nextSignature === state.onlineUsersSignature) return false
  state.onlineUsers = nextUsers
  state.onlineUsersSignature = nextSignature
  rebuildPmOnlineIndexes()
  bumpPmSuggestionDataVersion()
  return true
}

function applyRoomUsersSnapshot(roomId, roomUsers) {
  const normalizedRoomId = String(roomId || "")
  if (!normalizedRoomId || !Array.isArray(roomUsers)) return false
  const snapshotMap = new Map()
  for (let index = 0; index < roomUsers.length; index += 1) {
    const item = roomUsers[index]
    const userId = String(item?.id || "")
    if (!userId) continue
    snapshotMap.set(userId, {
      id: userId,
      username: String(item?.username || "用户"),
      roomId: normalizedRoomId,
      status: String(item?.status || "online"),
      role: String(item?.role || "user"),
      canSend: item?.canSend === false ? false : true
    })
  }
  const selfId = String(state.user?.id || "")
  if (selfId && !snapshotMap.has(selfId)) {
    snapshotMap.set(selfId, {
      id: selfId,
      username: String(state.user?.username || "我"),
      roomId: normalizedRoomId,
      status: normalizePresenceStatus(state.user?.status || "online"),
      role: "user",
      canSend: true
    })
  }
  const nextUsers = [...state.onlineUsers]
  for (let index = 0; index < nextUsers.length; index += 1) {
    const user = nextUsers[index]
    const userId = String(user?.id || "")
    if (!userId) continue
    if (snapshotMap.has(userId)) {
      nextUsers[index] = {
        ...user,
        ...snapshotMap.get(userId)
      }
      snapshotMap.delete(userId)
      continue
    }
    if (String(user?.roomId || "") === normalizedRoomId) {
      nextUsers[index] = {
        ...user,
        roomId: ""
      }
    }
  }
  for (const item of snapshotMap.values()) {
    nextUsers.push(item)
  }
  const nextSignature = createOnlineUsersSignature(nextUsers)
  if (nextSignature === state.onlineUsersSignature) return false
  state.onlineUsers = nextUsers
  state.onlineUsersSignature = nextSignature
  rebuildPmOnlineIndexes()
  bumpPmSuggestionDataVersion()
  return true
}

function rebuildPmOnlineIndexes() {
  const candidates = state.onlineUsers.filter((user) => user.id !== state.user?.id)
  const lowerNames = []
  const byUsername = new Map()
  candidates.forEach((user) => {
    const normalized = String(user?.username || "").toLowerCase()
    lowerNames.push(normalized)
    if (!normalized || byUsername.has(normalized)) return
    byUsername.set(normalized, user)
  })
  state.pmOnlineCandidates = candidates
  state.pmOnlineCandidateLowerNames = lowerNames
  state.pmOnlineByUsername = byUsername
}

function loadPersistedChat() {
  const key = `chat_history_${state.roomId || "global"}`
  const messages = JSON.parse(localStorage.getItem(key) || "[]")
  els.chatMessages.innerHTML = ""
  messages.forEach((item) => {
    appendChat(item.text, item.sender, { kind: item.kind || "normal", skipAutoScroll: true })
  })
  const scrollContainer = els.chatMessages?.parentElement || null
  if (scrollContainer) {
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    })
  }
}

function addRecentPmTarget(username) {
  const normalized = String(username || "").trim()
  if (!normalized) return
  const filtered = state.recentPmTargets.filter((item) => item.toLowerCase() !== normalized.toLowerCase())
  state.recentPmTargets = [normalized, ...filtered].slice(0, MAX_RECENT_PM_TARGETS)
  state.pmRecentTargetsVersion += 1
  bumpPmSuggestionDataVersion()
  localStorage.setItem(RECENT_PM_TARGETS_KEY, JSON.stringify(state.recentPmTargets))
  renderRecentPmTargets()
}

function renderRecentPmTargets() {
  if (!els.recentPmTargets) return
  els.recentPmTargets.innerHTML = ""
  if (!state.recentPmTargets.length) {
    els.recentPmTargets.classList.add("hidden")
    return
  }
  els.recentPmTargets.classList.remove("hidden")
  state.recentPmTargets.forEach((username) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "pm-target-chip"
    btn.textContent = `@${username}`
    btn.onclick = () => preparePrivateMessageDraft(username)
    els.recentPmTargets.appendChild(btn)
  })
  const clearBtn = document.createElement("button")
  clearBtn.type = "button"
  clearBtn.className = "pm-target-chip pm-target-clear"
  clearBtn.textContent = "清空最近"
  clearBtn.onclick = clearRecentPmTargets
  els.recentPmTargets.appendChild(clearBtn)
}

function addPmDraftHistory(target, content) {
  const normalizedTarget = String(target || "").trim()
  const normalizedContent = String(content || "").trim()
  if (!normalizedTarget || !normalizedContent) return
  const existing = state.pmDraftHistory.find((item) => {
    return item.target.toLowerCase() === normalizedTarget.toLowerCase() && item.content === normalizedContent
  })
  const dedup = state.pmDraftHistory.filter((item) => {
    return !(item.target.toLowerCase() === normalizedTarget.toLowerCase() && item.content === normalizedContent)
  })
  state.pmDraftHistory = [{ target: normalizedTarget, content: normalizedContent, pinned: Boolean(existing?.pinned), ts: Date.now() }, ...dedup]
    .sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0
      const bPinned = b.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return b.ts - a.ts
    })
    .slice(0, MAX_PM_DRAFT_HISTORY)
  localStorage.setItem(PM_DRAFT_HISTORY_KEY, JSON.stringify(state.pmDraftHistory))
  renderPmDraftHistory()
}

function renderPmDraftHistory() {
  if (!els.pmDraftHistory) return
  els.pmDraftHistory.innerHTML = ""
  if (!state.pmDraftHistory.length) {
    els.pmDraftHistory.classList.add("hidden")
    return
  }
  els.pmDraftHistory.classList.remove("hidden")
  state.pmDraftHistory.forEach((item, index) => {
    const row = document.createElement("div")
    row.className = "pm-draft-item"
    const applyBtn = document.createElement("button")
    applyBtn.type = "button"
    applyBtn.className = "pm-draft-chip"
    const preview = item.content.length > 8 ? `${item.content.slice(0, 8)}...` : item.content
    applyBtn.textContent = `↻ ${item.target}：${preview}`
    applyBtn.onclick = () => applyPmDraft(item)
    const pinBtn = document.createElement("button")
    pinBtn.type = "button"
    pinBtn.className = "pm-draft-chip pm-draft-pin"
    pinBtn.textContent = item.pinned ? "取消置顶" : "置顶"
    pinBtn.onclick = () => togglePmDraftPin(index)
    const removeBtn = document.createElement("button")
    removeBtn.type = "button"
    removeBtn.className = "pm-draft-chip pm-draft-remove"
    removeBtn.textContent = "删除"
    removeBtn.onclick = () => removePmDraft(index)
    row.appendChild(applyBtn)
    row.appendChild(pinBtn)
    row.appendChild(removeBtn)
    els.pmDraftHistory.appendChild(row)
  })
  const clearBtn = document.createElement("button")
  clearBtn.type = "button"
  clearBtn.className = "pm-draft-chip pm-draft-clear"
  clearBtn.textContent = "清空草稿"
  clearBtn.onclick = clearPmDraftHistory
  els.pmDraftHistory.appendChild(clearBtn)
}

function applyPmDraft(item) {
  if (!item?.target || !item?.content) return
  els.chatInput.value = `/pm ${item.target} ${item.content}`
  state.pmLastInputRaw = els.chatInput.value
  state.pmInCommandMode = true
  els.chatInput.focus()
  els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length)
  clearPmPendingConfirm()
  renderPmSuggestions()
  setPmHint("已填充历史草稿，回车后将进入目标确认")
}

function clearPmDraftHistory() {
  state.pmDraftHistory = []
  localStorage.removeItem(PM_DRAFT_HISTORY_KEY)
  renderPmDraftHistory()
  setPmHint("已清空私聊草稿历史")
}

function togglePmDraftPin(index) {
  const target = state.pmDraftHistory[index]
  if (!target) return
  target.pinned = !target.pinned
  state.pmDraftHistory = [...state.pmDraftHistory]
    .sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0
      const bPinned = b.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return b.ts - a.ts
    })
    .slice(0, MAX_PM_DRAFT_HISTORY)
  localStorage.setItem(PM_DRAFT_HISTORY_KEY, JSON.stringify(state.pmDraftHistory))
  renderPmDraftHistory()
  setPmHint(target.pinned ? "草稿已置顶" : "草稿已取消置顶")
}

function removePmDraft(index) {
  if (index < 0 || index >= state.pmDraftHistory.length) return
  state.pmDraftHistory.splice(index, 1)
  localStorage.setItem(PM_DRAFT_HISTORY_KEY, JSON.stringify(state.pmDraftHistory))
  renderPmDraftHistory()
  setPmHint("已删除草稿")
}

function updatePmInteraction(username) {
  const normalized = String(username || "").trim().toLowerCase()
  if (!normalized) return
  state.pmInteractionTimes[normalized] = Date.now()
  localStorage.setItem(PM_INTERACTION_TS_KEY, JSON.stringify(state.pmInteractionTimes))
}

function formatPmInteractionAgo(username) {
  const normalized = String(username || "").trim().toLowerCase()
  return formatPmInteractionAgoByLower(normalized, Date.now())
}

function formatPmInteractionAgoByLower(normalizedUsername, nowTs) {
  const normalized = String(normalizedUsername || "")
  const ts = Number(state.pmInteractionTimes[normalized] || 0)
  if (!ts) return ""
  const currentTs = Number.isFinite(nowTs) ? nowTs : Date.now()
  const diff = currentTs - ts
  if (diff < 60_000) return "刚刚互动"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

function getPmSuggestionContext(text) {
  const raw = String(text || "")
  if (raw.length < 4) return null
  if (raw[0] !== "/" || raw[1] !== "p" || raw[2] !== "m" || raw[3] !== " ") return null
  const body = raw.slice(4)
  if (body.includes(" ")) return null
  return {
    keyword: body.toLowerCase()
  }
}

function getPmSuggestionCandidates(keyword) {
  const normalizedKeyword = String(keyword || "").toLowerCase()
  const cacheKey = `${normalizedKeyword}|${state.roomId || ""}|${state.pmSuggestionDataVersion}`
  if (cacheKey === state.pmSuggestionCacheKey) {
    return state.pmSuggestionCacheCandidates
  }
  const users = state.pmOnlineCandidates
  if (!users.length) {
    state.pmSuggestionCacheKey = cacheKey
    state.pmSuggestionCacheCandidates = []
    return []
  }
  const result = pickTopPmUsersByPriorityFromIndexes(normalizedKeyword, PM_SUGGESTION_LIMIT)
  state.pmSuggestionCacheKey = cacheKey
  state.pmSuggestionCacheCandidates = result
  return result
}

function getRecentPmTargetLowerList() {
  if (state.pmRecentLowerCacheVersion === state.pmRecentTargetsVersion) {
    return state.pmRecentLowerCacheList
  }
  const recentTargets = state.recentPmTargets
  const recentTargetsLength = recentTargets.length
  const lowerList = new Array(recentTargetsLength)
  for (let index = 0; index < recentTargetsLength; index += 1) {
    lowerList[index] = String(recentTargets[index] || "").toLowerCase()
  }
  state.pmRecentLowerCacheVersion = state.pmRecentTargetsVersion
  state.pmRecentLowerCacheList = lowerList
  return lowerList
}

function getRecentPmTargetRankMap() {
  if (state.pmRecentRankCacheVersion === state.pmRecentTargetsVersion) {
    return state.pmRecentRankCacheMap
  }
  const recentLowerTargets = getRecentPmTargetLowerList()
  const rankMap = new Map()
  for (let index = 0; index < recentLowerTargets.length; index += 1) {
    const normalized = recentLowerTargets[index]
    if (!normalized || rankMap.has(normalized)) continue
    rankMap.set(normalized, index)
  }
  state.pmRecentRankCacheVersion = state.pmRecentTargetsVersion
  state.pmRecentRankCacheMap = rankMap
  return rankMap
}

function isPmPriorityBetter(aInRoom, aRecentRank, aStarts, aName, bInRoom, bRecentRank, bStarts, bName) {
  if (aInRoom !== bInRoom) return aInRoom > bInRoom
  if (aRecentRank !== bRecentRank) return aRecentRank < bRecentRank
  if (aStarts !== bStarts) return aStarts
  return ZH_COLLATOR.compare(aName, bName) < 0
}

function pickTopPmUsersByPriorityFromIndexes(keyword = "", limit = PM_SUGGESTION_LIMIT) {
  if (limit <= 0) return []
  const users = state.pmOnlineCandidates
  const usersLength = users.length
  const lowerNames = state.pmOnlineCandidateLowerNames
  const normalizedKeyword = String(keyword || "").toLowerCase()
  const hasKeyword = Boolean(normalizedKeyword)
  const recentRankMap = getRecentPmTargetRankMap()
  const roomId = state.roomId
  const hasRoomId = Boolean(roomId)
  const fallbackRecentRank = Number.MAX_SAFE_INTEGER
  const top = new Array(limit)
  const lastIndex = limit - 1
  let topSize = 0
  for (let index = 0; index < usersLength; index += 1) {
    const user = users[index]
    if (!user) continue
    const name = String(user.username || "")
    let lower = lowerNames[index]
    if (!lower) {
      lower = name.toLowerCase()
      lowerNames[index] = lower
    }
    const starts = hasKeyword ? lower.startsWith(normalizedKeyword) : false
    if (hasKeyword && !starts && !lower.includes(normalizedKeyword)) continue
    const recentRank = recentRankMap.get(lower) ?? fallbackRecentRank
    const inRoom = hasRoomId && user.roomId === roomId ? 1 : 0
    if (topSize === limit) {
      const worst = top[lastIndex]
      if (!isPmPriorityBetter(inRoom, recentRank, starts, name, worst.inRoom, worst.recentRank, worst.starts, worst.name)) {
        continue
      }
    }
    let insertAt = topSize < limit ? topSize : lastIndex
    while (insertAt > 0) {
      const prev = top[insertAt - 1]
      if (!isPmPriorityBetter(inRoom, recentRank, starts, name, prev.inRoom, prev.recentRank, prev.starts, prev.name)) {
        break
      }
      insertAt -= 1
    }
    if (insertAt >= limit) continue
    if (topSize < limit) {
      topSize += 1
    }
    for (let shiftIndex = topSize - 1; shiftIndex > insertAt; shiftIndex -= 1) {
      top[shiftIndex] = top[shiftIndex - 1]
    }
    top[insertAt] = {
      user,
      name,
      recentRank,
      inRoom,
      starts
    }
  }
  const result = new Array(topSize)
  for (let index = 0; index < topSize; index += 1) {
    result[index] = top[index].user
  }
  return result
}

function applyPmTarget(username) {
  els.chatInput.value = `/pm ${username} `
  state.pmLastInputRaw = els.chatInput.value
  state.pmInCommandMode = true
  els.chatInput.focus()
  els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length)
  addRecentPmTarget(username)
  clearPmSuggestions()
  schedulePmInputGuidance(els.chatInput.value, true)
}

function renderPmSuggestions(providedContext = null) {
  const pmSuggestionsEl = els.pmSuggestions
  if (!pmSuggestionsEl) return
  const ctx = providedContext || getPmSuggestionContext(els.chatInput.value)
  if (!ctx) {
    clearPmSuggestions()
    setPmHint("")
    return
  }
  const prevCandidates = state.pmSuggestionCandidates
  const candidates = getPmSuggestionCandidates(ctx.keyword)
  const candidatesLength = candidates.length
  state.pmSuggestionCandidates = candidates
  if (!candidatesLength) {
    clearPmSuggestions()
    setPmHint("未匹配到在线用户，请检查用户名", "warn")
    return
  }
  if (state.pmSuggestionIndex < 0 || state.pmSuggestionIndex >= candidatesLength) {
    state.pmSuggestionIndex = 0
  }
  pmSuggestionsEl.classList.remove("hidden")
  setPmHint("↑/↓ 选择候选，Tab 或 Enter 填充用户名", "", { priority: 0, holdMs: 180 })
  if (canReusePmSuggestionButtons(ctx.keyword, candidates, prevCandidates)) {
    updatePmSuggestionActiveOnly()
    return
  }
  state.pmSuggestionKeyword = ctx.keyword
  state.pmSuggestionButtons = new Array(candidatesLength)
  state.pmSuggestionUsernames = new Array(candidatesLength)
  state.pmSuggestionStatuses = new Array(candidatesLength)
  state.pmSuggestionRoomIds = new Array(candidatesLength)
  const buttons = state.pmSuggestionButtons
  const usernames = state.pmSuggestionUsernames
  const statuses = state.pmSuggestionStatuses
  const roomIds = state.pmSuggestionRoomIds
  const activeIndex = state.pmSuggestionIndex
  const fragment = document.createDocumentFragment()
  const lowerKeyword = ctx.keyword
  const recentRankMap = getRecentPmTargetRankMap()
  const nowTs = Date.now()
  for (let index = 0; index < candidatesLength; index += 1) {
    const user = candidates[index]
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "pm-suggestion-chip"
    btn.dataset.pmIndex = String(index)
    if (index === activeIndex) {
      btn.classList.add("active")
    }
    btn.innerHTML = renderPmSuggestionLabel(user, lowerKeyword, recentRankMap, nowTs)
    fragment.appendChild(btn)
    buttons[index] = btn
    usernames[index] = user.username
    statuses[index] = user?.status || "online"
    roomIds[index] = user?.roomId || ""
  }
  pmSuggestionsEl.replaceChildren(fragment)
  state.pmSuggestionLastActiveIndex = activeIndex
}

function movePmSuggestionIndex(step) {
  const size = state.pmSuggestionCandidates.length
  if (!size) return
  const delta = step >= 0 ? 1 : -1
  const nextIndex = state.pmSuggestionIndex + delta
  state.pmSuggestionIndex = nextIndex >= size ? 0 : nextIndex < 0 ? size - 1 : nextIndex
  if (state.pmSuggestionButtons.length !== size) {
    renderPmSuggestions()
    return
  }
  updatePmSuggestionActiveOnly()
}

function canReusePmSuggestionButtons(keyword, candidates, prevCandidates) {
  if (state.pmSuggestionKeyword !== keyword) return false
  const size = candidates.length
  const buttons = state.pmSuggestionButtons
  const usernames = state.pmSuggestionUsernames
  const statuses = state.pmSuggestionStatuses
  const roomIds = state.pmSuggestionRoomIds
  if (buttons.length !== size) return false
  if (usernames.length !== size) return false
  if (statuses.length !== size) return false
  if (roomIds.length !== size) return false
  if (prevCandidates === candidates) return true
  for (let index = 0; index < size; index += 1) {
    const user = candidates[index]
    const username = user?.username || ""
    const status = user?.status || "online"
    const roomId = user?.roomId || ""
    if (usernames[index] !== username) return false
    if (statuses[index] !== status) return false
    if (roomIds[index] !== roomId) return false
  }
  return true
}

function updatePmSuggestionActiveOnly() {
  if (!state.pmSuggestionButtons.length) return
  const activeIndex = state.pmSuggestionIndex
  const prevIndex = state.pmSuggestionLastActiveIndex
  if (prevIndex === activeIndex) return
  if (prevIndex >= 0 && prevIndex < state.pmSuggestionButtons.length) {
    state.pmSuggestionButtons[prevIndex].classList.remove("active")
  }
  if (activeIndex >= 0 && activeIndex < state.pmSuggestionButtons.length) {
    state.pmSuggestionButtons[activeIndex].classList.add("active")
  }
  state.pmSuggestionLastActiveIndex = activeIndex
}

function renderPmHelpPanel(text) {
  if (!els.pmHelpPanel) return
  const raw = String(text || "")
  if (!raw.startsWith("/pm")) {
    if (state.pmHelpSignature === "hidden") return
    els.pmHelpPanel.innerHTML = ""
    els.pmHelpPanel.classList.add("hidden")
    state.pmHelpSignature = "hidden"
    return
  }
  const recentTarget = resolveLatestPmTarget()
  const nextSignature = `show|${recentTarget?.username || ""}`
  if (nextSignature === state.pmHelpSignature) return
  state.pmHelpSignature = nextSignature
  els.pmHelpPanel.classList.remove("hidden")
  els.pmHelpPanel.innerHTML = ""
  const title = document.createElement("span")
  title.className = "pm-help-title"
  title.textContent = "私聊：/pm 用户名 消息内容；快速回复：/pmr 消息内容"
  const exampleA = document.createElement("button")
  exampleA.type = "button"
  exampleA.className = "pm-help-chip"
  exampleA.textContent = "示例A"
  exampleA.onclick = () => fillPmExample("alice", "你好，在吗？")
  const exampleB = document.createElement("button")
  exampleB.type = "button"
  exampleB.className = "pm-help-chip"
  exampleB.textContent = "示例B"
  exampleB.onclick = () => fillPmExample("bob", "方便语音吗？")
  const tips = document.createElement("span")
  tips.className = "pm-help-tip"
  tips.textContent = "快捷键：↑↓ 选人，Tab/Enter 填充，回车二次确认发送草稿"
  const replyRecent = document.createElement("button")
  replyRecent.type = "button"
  replyRecent.className = "pm-help-chip"
  replyRecent.textContent = recentTarget ? `回复最近@${recentTarget.username}` : "回复最近"
  replyRecent.disabled = !recentTarget
  replyRecent.onclick = () => fillRecentReplyExample()
  els.pmHelpPanel.appendChild(title)
  els.pmHelpPanel.appendChild(exampleA)
  els.pmHelpPanel.appendChild(exampleB)
  els.pmHelpPanel.appendChild(replyRecent)
  els.pmHelpPanel.appendChild(tips)
}

function fillPmExample(target, content) {
  els.chatInput.value = `/pm ${target} ${content}`
  state.pmLastInputRaw = els.chatInput.value
  state.pmInCommandMode = true
  els.chatInput.focus()
  els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length)
  clearPmPendingConfirm()
  renderPmSuggestions()
  schedulePmInputGuidance(els.chatInput.value, true)
  setPmHint("已填充示例命令，可直接回车")
}

function fillRecentReplyExample() {
  const target = resolveLatestPmTarget()
  if (!target) {
    setPmHint("暂无可回复对象，请先发起一次 /pm", "warn")
    return
  }
  els.chatInput.value = `/pmr `
  state.pmLastInputRaw = els.chatInput.value
  state.pmInCommandMode = true
  els.chatInput.focus()
  els.chatInput.setSelectionRange(els.chatInput.value.length, els.chatInput.value.length)
  clearPmPendingConfirm()
  renderPmSuggestions()
  schedulePmInputGuidance(els.chatInput.value, true)
}

function schedulePmInputGuidance(text, immediate = false) {
  const raw = String(text || "")
  if (raw === state.pmGuidanceLastRaw && !immediate) return
  state.pmGuidanceLastRaw = raw
  if (state.pmGuidanceTimer) {
    clearTimeout(state.pmGuidanceTimer)
    state.pmGuidanceTimer = null
  }
  if (immediate) {
    renderPmInputGuidance(raw)
    return
  }
  state.pmGuidanceTimer = window.setTimeout(() => {
    state.pmGuidanceTimer = null
    renderPmInputGuidance(raw)
  }, 90)
}

function handlePmInputFrame(text, immediate = false) {
  const raw = String(text || "")
  if (!raw.startsWith("/pm")) {
    if (!state.pmInCommandMode) return
    state.pmInCommandMode = false
    clearPmPendingConfirm()
    clearPmSuggestions()
    renderPmHelpPanel("")
    cancelPmInputGuidance()
    setPmHint("", "", { priority: 0, force: true })
    return
  }
  state.pmInCommandMode = true
  clearPmPendingConfirm()
  renderPmHelpPanel(raw)
  const suggestionContext = getPmSuggestionContext(raw)
  if (suggestionContext) {
    renderPmSuggestions(suggestionContext)
  } else if (state.pmSuggestionCandidates.length) {
    clearPmSuggestions()
  }
  schedulePmInputGuidance(raw, immediate)
}

function refreshPmCommandUi(immediate = false) {
  if (!state.pmInCommandMode) return
  handlePmInputFrame(els.chatInput.value, immediate)
}

function cancelPmInputGuidance() {
  if (state.pmGuidanceTimer) {
    clearTimeout(state.pmGuidanceTimer)
    state.pmGuidanceTimer = null
  }
  state.pmGuidanceLastRaw = ""
}

function renderPmInputGuidance(text) {
  const raw = String(text || "")
  const inPmTargetSelect = Boolean(getPmSuggestionContext(raw))
  if (inPmTargetSelect) return
  if (raw.startsWith("/pmr")) {
    if (!raw.startsWith("/pmr ")) {
      setPmHint("快速回复格式：/pmr 消息内容", "", { priority: 1, holdMs: 300 })
      return
    }
    const target = resolveLatestPmTarget()
    if (!target) {
      setPmHint("暂无可回复对象，请先使用 /pm 用户名 消息内容", "warn")
      return
    }
    const status = String(target.status || "online")
    const roomLabel = state.roomId && target.roomId === state.roomId ? "同房间" : "非同房间"
    setPmHint(`快速回复目标：${target.username}（${status}，${roomLabel}）`)
    return
  }
  if (raw.startsWith("/pm ")) {
    const body = raw.slice(4).trim()
    const firstSpaceIndex = body.indexOf(" ")
    if (firstSpaceIndex === -1) return
    const targetName = body.slice(0, firstSpaceIndex).trim()
    if (!targetName) return
    const target = resolvePmTargetUser(targetName)
    if (!target) {
      setPmHint("私聊目标用户不存在或不在线", "warn", { holdMs: 1000 })
      return
    }
    const status = String(target.status || "online")
    const roomLabel = state.roomId && target.roomId === state.roomId ? "同房间" : "非同房间"
    setPmHint(`私聊目标：${target.username}（${status}，${roomLabel}）`)
    return
  }
  setPmHint("", "", { priority: 0 })
}

function clearPmSuggestions() {
  state.pmSuggestionCandidates = []
  state.pmSuggestionIndex = -1
  state.pmSuggestionKeyword = ""
  state.pmSuggestionButtons = []
  state.pmSuggestionLastActiveIndex = -1
  state.pmSuggestionUsernames = []
  state.pmSuggestionStatuses = []
  state.pmSuggestionRoomIds = []
  const pmSuggestionsEl = els.pmSuggestions
  if (!pmSuggestionsEl) return
  pmSuggestionsEl.replaceChildren()
  pmSuggestionsEl.classList.add("hidden")
}

function clearPmPendingConfirm() {
  state.pmPendingConfirm = null
}

function clearRecentPmTargets() {
  state.recentPmTargets = []
  state.pmRecentTargetsVersion += 1
  bumpPmSuggestionDataVersion()
  localStorage.removeItem(RECENT_PM_TARGETS_KEY)
  renderRecentPmTargets()
  clearPmSuggestions()
  clearPmPendingConfirm()
  setPmHint("已清空最近私聊对象")
}

function bumpPmSuggestionDataVersion() {
  state.pmSuggestionDataVersion += 1
  state.pmSuggestionCacheKey = ""
  state.pmSuggestionCacheCandidates = []
}

function setPmHint(message, tone = "", options = {}) {
  if (!els.pmHint) return
  const now = Date.now()
  const incomingPriority = Number(options?.priority ?? (tone === "warn" ? 2 : 1))
  const holdMs = Number(options?.holdMs ?? (tone === "warn" ? 1000 : 220))
  const force = Boolean(options?.force)
  const text = String(message || "").trim()
  if (!text) {
    if (!force && now < state.pmHintLockUntil && incomingPriority < state.pmHintPriority) return
    if (els.pmHint.classList.contains("hidden") && !els.pmHint.textContent) return
    els.pmHint.textContent = ""
    els.pmHint.className = "pm-hint hidden"
    state.pmHintPriority = 0
    state.pmHintLockUntil = 0
    return
  }
  if (!force && now < state.pmHintLockUntil && incomingPriority < state.pmHintPriority) return
  const nextClassName = tone ? `pm-hint ${tone}` : "pm-hint"
  if (els.pmHint.textContent === text && els.pmHint.className === nextClassName) return
  els.pmHint.textContent = text
  els.pmHint.className = nextClassName
  state.pmHintPriority = incomingPriority
  state.pmHintLockUntil = now + Math.max(0, holdMs)
}

function renderPmSuggestionLabel(user, lowerKeyword, recentRankMap, nowTs) {
  const safeName = String(user?.username || "")
  const lowerName = safeName.toLowerCase()
  let nameLabel = ""
  if (lowerKeyword) {
    const start = lowerName.indexOf(lowerKeyword)
    if (start !== -1) {
      const end = start + lowerKeyword.length
      const head = escapeHtml(safeName.slice(0, start))
      const hit = escapeHtml(safeName.slice(start, end))
      const tail = escapeHtml(safeName.slice(end))
      nameLabel = `${head}<mark>${hit}</mark>${tail}`
    }
  }
  if (!nameLabel) {
    nameLabel = escapeHtml(safeName)
  }
  const isRecent = recentRankMap.has(lowerName)
  const status = String(user?.status || "online")
  const inRoom = Boolean(state.roomId && user?.roomId === state.roomId)
  const lastInteraction = formatPmInteractionAgoByLower(lowerName, nowTs)
  const statusLabel = escapeHtml(status)
  const roomLabel = inRoom ? '<span class="pm-suggestion-room in-room">房内</span>' : '<span class="pm-suggestion-room out-room">房外</span>'
  const interactionLabel = lastInteraction ? `<span class="pm-suggestion-active">${escapeHtml(lastInteraction)}</span>` : ""
  const recentLabel = isRecent ? '<span class="pm-suggestion-recent">最近</span>' : ""
  const meta = `<span class="pm-suggestion-meta">[${statusLabel}]${roomLabel}${interactionLabel}${recentLabel}</span>`
  return `@${nameLabel}${meta}`
}

async function onRoomJoined(payload) {
  const roomId = String(payload?.roomId || "")
  if (!roomId) return
  const room = state.roomList.find((item) => item.id === roomId)
  state.joiningRoomId = ""
  if (state.roomId && state.roomId !== roomId) {
    persistLiveLayoutForRoom(state.roomId)
    clearPrivateSessionTarget(false, false)
  }
  state.roomId = roomId
  state.preferredRoomId = roomId
  localStorage.setItem("room_id", roomId)
  loadLiveLayoutForRoom(roomId)
  if (Array.isArray(payload?.roomUsers)) {
    applyRoomUsersSnapshot(roomId, payload.roomUsers)
  }
  syncUiFlow()
  syncSessionActionControls()
  renderRooms()
  renderOnlineUsers()
  els.activeRoomName.textContent = room?.name || payload?.roomName || roomId
  updateRoomAccessBar()
  appendChat(`已加入房间 ${room?.name || payload?.roomName || roomId}`, "系统")
  loadPersistedChat()
  await loadRoomHistory(roomId)
  await tryEnsureLocalStreamForVoice()
  for (const user of state.onlineUsers) {
    if (user.id !== state.user.id && user.roomId === roomId && canVoiceConnectUser(user.id)) {
      createOffer(user.id)
    }
  }
  refreshPmCommandUi(true)
  renderVoiceRoomUsers()
  fetchRooms().catch(() => {})
}

function clearActiveRoomState() {
  persistLiveLayoutForRoom()
  state.roomId = ""
  state.joiningRoomId = ""
  localStorage.removeItem("room_id")
  els.activeRoomName.textContent = "未加入房间"
  updateRoomAccessBar()
  syncUiFlow()
  syncSessionActionControls()
  clearPrivateSessionTarget(false, false)
  resetVoiceSessionState()
  renderRooms()
  renderVoiceRoomUsers()
  refreshPmCommandUi(true)
}

function handleSocketDisconnected() {
  if (!state.token || !state.user) {
    state.joiningRoomId = ""
    state.roomId = ""
    state.onlineUsers = []
    state.onlineUsersSignature = ""
    renderRooms()
    renderOnlineUsers()
    updateRoomAccessBar()
    syncUiFlow()
    syncSessionActionControls()
    clearPrivateSessionTarget(false, false)
    renderVoiceRoomUsers()
    refreshPmCommandUi(true)
    return
  }
  const previousRoomId = state.roomId
  const previousRoom = previousRoomId ? state.roomList.find((item) => item.id === previousRoomId) : null
  if (previousRoomId) {
    persistLiveLayoutForRoom(previousRoomId)
  }
  state.joiningRoomId = ""
  if (previousRoomId) {
    state.preferredRoomId = previousRoomId
    localStorage.setItem("room_id", previousRoomId)
  }
  state.roomId = ""
  updateRoomAccessBar()
  syncUiFlow()
  syncSessionActionControls()
  clearPrivateSessionTarget(false, false)
  renderRooms()
  if (previousRoom) {
    els.activeRoomName.textContent = `连接断开，重连后自动回到：${previousRoom.name}`
  } else {
    els.activeRoomName.textContent = "连接断开，重连后自动恢复"
  }
  resetVoiceSessionState()
  renderVoiceRoomUsers()
  refreshPmCommandUi(true)
}

function resolveUiStage() {
  if (!hasAuthenticatedSession()) return "auth"
  if (!state.roomId) return "lobby"
  return "room"
}

function syncUiFlow() {
  const stage = resolveUiStage()
  if (els.flowAuth) {
    els.flowAuth.classList.toggle("active", stage === "auth")
  }
  if (els.flowLobby) {
    els.flowLobby.classList.toggle("active", stage === "lobby")
  }
  if (els.flowRoom) {
    els.flowRoom.classList.toggle("active", stage === "room")
  }
  const inRoom = stage === "room"
  const loggedIn = stage !== "auth"
  if (els.lobbyGuide) {
    els.lobbyGuide.classList.toggle("hidden", !loggedIn || inRoom)
  }
  if (els.inRoomPanel) {
    els.inRoomPanel.classList.toggle("hidden", !inRoom)
  }
  setSettingsPanelOpen(inRoom && state.isSettingsOpen)
  if (els.onlineUsersPanel) {
    els.onlineUsersPanel.classList.toggle("hidden", !loggedIn)
  }
}

function setSettingsPanelOpen(open) {
  const shouldOpen = Boolean(open)
  state.isSettingsOpen = shouldOpen
  if (els.settingsPanel) {
    const canShow = shouldOpen && hasAuthenticatedSession() && Boolean(state.roomId)
    els.settingsPanel.classList.toggle("hidden", !canShow)
  }
}

function formatRoomStatus(room) {
  const tags = []
  if (room.is_locked) tags.push("[锁定]")
  if (room.is_readonly) tags.push("[只读]")
  if (room.speaking_mode === "host_only") tags.push("[主持人发言]")
  return tags.join("")
}

function normalizeRoom(room) {
  return {
    ...room,
    id: String(room.id || ""),
    is_locked: Boolean(room.is_locked),
    is_readonly: Boolean(room.is_readonly),
    speaking_mode: room.speaking_mode || "all",
    host_user_id: room.host_user_id || null,
    onlineCount: Number(room.onlineCount || 0)
  }
}

function notifyRoomPolicyChanges(previousRoom, currentRoom) {
  if (!previousRoom || !currentRoom) return
  if (Boolean(previousRoom.is_readonly) !== Boolean(currentRoom.is_readonly)) {
    appendChat(currentRoom.is_readonly ? "房间已切换为只读模式" : "房间已取消只读模式，可发送消息", "系统")
  }
  if ((previousRoom.speaking_mode || "all") !== (currentRoom.speaking_mode || "all")) {
    if (currentRoom.speaking_mode === "host_only") {
      if (currentRoom.host_user_id === state.user?.id) {
        appendChat("房间已切换为主持人发言模式，你当前是主持人", "系统")
      } else {
        appendChat("房间已切换为主持人发言模式，你当前不可发言", "系统")
      }
    } else {
      appendChat("房间已切换为全员发言模式", "系统")
    }
  }
  if ((previousRoom.host_user_id || null) !== (currentRoom.host_user_id || null) && currentRoom.speaking_mode === "host_only") {
    if (currentRoom.host_user_id === state.user?.id) {
      appendChat("你已被设置为该房间主持人", "系统")
    } else if (previousRoom.host_user_id === state.user?.id) {
      appendChat("你已被取消该房间主持人身份", "系统")
    }
  }
}

function updateRoomAccessBar() {
  const room = state.roomList.find((item) => item.id === state.roomId)
  if (!room) {
    els.roomModeBadge.textContent = "未加入房间"
    els.roomModeBadge.className = "access-badge mode"
    els.roomReadonlyBadge.classList.add("hidden")
    els.roomSpeakBadge.textContent = "不可发言"
    els.roomSpeakBadge.className = "access-badge deny"
    return
  }
  if (room.speaking_mode === "host_only") {
    els.roomModeBadge.textContent = room.host_user_id === state.user?.id ? "主持人模式（你是主持人）" : "主持人模式"
  } else {
    els.roomModeBadge.textContent = "全员发言模式"
  }
  els.roomModeBadge.className = "access-badge mode"
  if (room.is_readonly) {
    els.roomReadonlyBadge.textContent = "只读"
    els.roomReadonlyBadge.className = "access-badge deny"
  } else {
    els.roomReadonlyBadge.textContent = "可写"
    els.roomReadonlyBadge.className = "access-badge allow"
  }
  els.roomReadonlyBadge.classList.remove("hidden")
  const roomAccess = getCurrentRoomSendAccess()
  els.roomSpeakBadge.textContent = roomAccess.allowed ? "你可发言" : "你当前不可发言"
  els.roomSpeakBadge.className = roomAccess.allowed ? "access-badge allow" : "access-badge deny"
}

function getCurrentRoomSendAccess() {
  const room = state.roomList.find((item) => item.id === state.roomId)
  if (!room) return { allowed: false, reason: "房间信息不存在，请重新加入房间" }
  if (room.is_readonly && state.user?.role !== "admin") {
    return { allowed: false, reason: "当前房间为只读模式" }
  }
  if (room.speaking_mode === "host_only" && room.host_user_id && room.host_user_id !== state.user?.id && state.user?.role !== "admin") {
    return { allowed: false, reason: "当前仅主持人可发言" }
  }
  return { allowed: true, reason: "" }
}

function bindDesktopBridge() {
  const bridge = window.desktopBridge
  if (!bridge) return
  if (bridge.onToggleMute) {
    bridge.onToggleMute(() => {
      if (!toggleMuteAction()) {
        notifyLoginRequired()
      }
    })
  }
  if (bridge.onToggleBusy) {
    bridge.onToggleBusy(() => {
      if (!toggleBusyAction(true)) {
        notifyLoginRequired()
      }
    })
  }
  if (bridge.onForceReconnect) {
    bridge.onForceReconnect(() => {
      if (forceSocketReconnect()) {
        toast("已触发重连")
      } else {
        notifyLoginRequired()
      }
    })
  }
}

async function loadRoomHistory(roomId) {
  try {
    const result = await request(`/rooms/${roomId}/messages`, "GET")
    const localKey = `chat_history_${roomId}`
    const localHistory = JSON.parse(localStorage.getItem(localKey) || "[]")
    const merged = [
      ...result.messages.map((item) => ({
        text: item.text,
        sender: item.sender.username,
        ts: item.createdAt
      })),
      ...localHistory
    ]
    const dedup = []
    const keySet = new Set()
    for (const row of merged) {
      const id = `${row.sender}-${row.text}-${row.ts}`
      if (keySet.has(id)) continue
      keySet.add(id)
      dedup.push(row)
    }
    const finalHistory = dedup.sort((a, b) => a.ts - b.ts).slice(-200)
    localStorage.setItem(localKey, JSON.stringify(finalHistory))
    loadPersistedChat()
  } catch {
    loadPersistedChat()
  }
}

async function refreshTokenAndReconnect() {
  if (!state.token) return false
  try {
    const result = await fetch(`${SERVER_HTTP}/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${state.token}`
      }
    })
    const data = await result.json().catch(() => ({}))
    if (!result.ok || !data.token) return false
    state.token = data.token
    localStorage.setItem("token", state.token)
    connectSocket({ resetBackoff: true })
    return true
  } catch {
    return false
  }
}

function applyAudioSenderOptimization(peer) {
  const audioSender = peer.getSenders().find((sender) => sender.track?.kind === "audio")
  if (!audioSender || !audioSender.getParameters) return
  const params = audioSender.getParameters()
  if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
  params.encodings[0].maxBitrate = 48000
  params.encodings[0].priority = "high"
  audioSender.setParameters(params).catch(() => {})
}

function applyVideoSenderOptimization(peer) {
  const videoSender = peer.getSenders().find((sender) => sender.track?.kind === "video")
  if (!videoSender || !videoSender.getParameters) return
  const params = videoSender.getParameters()
  if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
  
  const qualityKey = els.liveQualitySelect?.value || "medium"
  const profile = LIVE_QUALITY_PROFILES[qualityKey] || LIVE_QUALITY_PROFILES.medium
  
  params.encodings[0].maxBitrate = profile.bitrate
  params.encodings[0].priority = "low" // 视频优先级低于音频，保证弱网下音频优先
  videoSender.setParameters(params).catch(() => {})
}

function mungeSdp(sdp) {
  if (!sdp) return sdp
  let lines = sdp.split("\r\n")
  
  // 1. Prioritize H.264 for Video (Better hardware acceleration and NAT traversal)
  let videoMLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("m=video ")) {
      videoMLineIndex = i
      break
    }
  }
  
  if (videoMLineIndex !== -1) {
    const mLine = lines[videoMLineIndex]
    const parts = mLine.split(" ")
    const payloadTypes = parts.slice(3)
    let h264Payloads = []
    let otherPayloads = []
    
    for (const pt of payloadTypes) {
      let isH264 = false
      for (const line of lines) {
        if (line.startsWith(`a=rtpmap:${pt} H264/90000`)) {
          isH264 = true
          break
        }
      }
      if (isH264) h264Payloads.push(pt)
      else otherPayloads.push(pt)
    }
    
    if (h264Payloads.length > 0) {
      // Reconstruct m-line with H.264 first
      lines[videoMLineIndex] = parts.slice(0, 3).concat(h264Payloads).concat(otherPayloads).join(" ")
      
      // Add x-google-bitrate parameters for the selected H.264 payload types
      const qualityKey = els.liveQualitySelect?.value || "medium"
      const profile = LIVE_QUALITY_PROFILES[qualityKey] || LIVE_QUALITY_PROFILES.medium
      const minKbps = Math.floor(profile.bitrate / 1000 / 2) // Half of target
      const startKbps = Math.floor(profile.bitrate / 1000)
      
      for (const pt of h264Payloads) {
        let fmtpIndex = -1
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith(`a=fmtp:${pt}`)) {
            fmtpIndex = i
            break
          }
        }
        if (fmtpIndex !== -1) {
          lines[fmtpIndex] += `;x-google-min-bitrate=${minKbps};x-google-start-bitrate=${startKbps}`
        }
      }
    }
    
    // 2. Add Bitrate Limit to Video (b=AS)
    const qualityKey = els.liveQualitySelect?.value || "medium"
    const profile = LIVE_QUALITY_PROFILES[qualityKey] || LIVE_QUALITY_PROFILES.medium
    const kbps = Math.floor(profile.bitrate / 1000)
    
    // Check if b=AS already exists for video
    let bAsExists = false
    for (let i = videoMLineIndex + 1; i < lines.length && !lines[i].startsWith("m="); i++) {
      if (lines[i].startsWith("b=AS:")) {
        lines[i] = `b=AS:${kbps}`
        bAsExists = true
        break
      }
    }
    if (!bAsExists) {
      lines.splice(videoMLineIndex + 1, 0, `b=AS:${kbps}`)
    }
  }

  // 3. Audio Optimization (Stereo Opus)
  let opusPayloadType = null
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("a=rtpmap:") && lines[i].includes("opus/48000/2")) {
      opusPayloadType = lines[i].match(/a=rtpmap:(\d+) opus\/48000\/2/)[1]
      break
    }
  }
  if (opusPayloadType) {
    let fmtpLineIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`a=fmtp:${opusPayloadType}`)) {
        fmtpLineIndex = i
        break
      }
    }
    if (fmtpLineIndex !== -1) {
      if (!lines[fmtpLineIndex].includes("stereo=1")) lines[fmtpLineIndex] += ";stereo=1"
      if (!lines[fmtpLineIndex].includes("sprop-stereo=1")) lines[fmtpLineIndex] += ";sprop-stereo=1"
      if (!lines[fmtpLineIndex].includes("useinbandfec=1")) lines[fmtpLineIndex] += ";useinbandfec=1"
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`a=rtpmap:${opusPayloadType}`)) {
          lines.splice(i + 1, 0, `a=fmtp:${opusPayloadType} stereo=1;sprop-stereo=1;useinbandfec=1`)
          break
        }
      }
    }
  }
  return lines.join("\r\n")
}
