import test from "node:test"
import assert from "node:assert/strict"

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

function resolveServerAlias(serverValue, pageProtocol = "https:") {
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
  const httpProtocol = pageProtocol === "https:" ? "https:" : "http:"
  const wsProtocol = pageProtocol === "https:" ? "wss:" : "ws:"
  return {
    http: `${httpProtocol}//${sanitizedHost}`,
    ws: `${wsProtocol}//${sanitizedHost}`
  }
}

function resolveBootstrapEndpoints(input, pageProtocol = "https:") {
  const queryServer = String(input?.queryServer || "").trim()
  const queryHttp = String(input?.queryHttp || "").trim()
  const queryWs = String(input?.queryWs || "").trim()
  const storedHttp = String(input?.storedHttp || "").trim()
  const storedWs = String(input?.storedWs || "").trim()
  const hasQueryOverride = Boolean(queryServer) || isValidHttpUrl(queryHttp) || isValidWsUrl(queryWs)
  if (hasQueryOverride) {
    const alias = resolveServerAlias(queryServer, pageProtocol)
    const fromQuery = resolveServerEndpoints(queryHttp || alias.http, queryWs || alias.ws)
    if (fromQuery.http && fromQuery.ws) {
      return { source: "query", endpoints: fromQuery, clearStorage: false }
    }
  }
  const fromStorage = resolveServerEndpoints(storedHttp, storedWs)
  if (fromStorage.http && fromStorage.ws) {
    return { source: "storage", endpoints: fromStorage, clearStorage: false }
  }
  const hasAnyStoredValue = Boolean(storedHttp || storedWs)
  return { source: "spec", endpoints: { http: "", ws: "" }, clearStorage: hasAnyStoredValue }
}

function resolveUiStage(hasSession, roomId) {
  if (!hasSession) return "auth"
  if (!String(roomId || "").trim()) return "lobby"
  return "room"
}

function pickVoiceRoomUsers(users, roomId, selfId) {
  const normalizedRoomId = String(roomId || "")
  const normalizedSelfId = String(selfId || "")
  return [...users]
    .filter((user) => String(user?.roomId || "") === normalizedRoomId)
    .sort((a, b) => {
      const aId = String(a?.id || "")
      const bId = String(b?.id || "")
      if (aId === normalizedSelfId) return -1
      if (bId === normalizedSelfId) return 1
      return String(a?.username || "").localeCompare(String(b?.username || ""), "zh-CN")
    })
}

function resolveImageFileExtension(mimeType) {
  const type = String(mimeType || "").trim().toLowerCase()
  if (type === "image/jpeg") return "jpg"
  if (type === "image/gif") return "gif"
  if (type === "image/webp") return "webp"
  if (type === "image/bmp") return "bmp"
  return "png"
}

function resolveSessionControlState(hasSession, roomId) {
  const inRoom = Boolean(hasSession && String(roomId || "").trim())
  return {
    audioSettingsVisible: inRoom,
    chatInputEnabled: inRoom
  }
}

function canDeleteRoomOnClient(room, user) {
  const userId = String(user?.id || "")
  const role = String(user?.role || "")
  const createdBy = String(room?.created_by || "")
  if (!userId) return false
  if (role === "admin") return true
  return Boolean(createdBy && createdBy === userId)
}

function shouldClearPrivateSessionByTimeout(now, expireAt) {
  const current = Number(now || 0)
  const expires = Number(expireAt || 0)
  if (!expires) return false
  return current >= expires
}

function canRecoverPrivateSession(recovery, currentRoomId, users, now) {
  const recoveryUserId = String(recovery?.userId || "")
  if (!recoveryUserId) return false
  if (!String(currentRoomId || "")) return false
  if (Number(recovery?.expiresAt || 0) <= Number(now || 0)) return false
  return users.some((user) => String(user?.id || "") === recoveryUserId && String(user?.roomId || "") === String(currentRoomId))
}

function buildInputAudioConstraints(inputDeviceId, noiseSuppressionEnabled, echoCancellationEnabled) {
  return {
    deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
    noiseSuppression: Boolean(noiseSuppressionEnabled),
    echoCancellation: Boolean(echoCancellationEnabled),
    autoGainControl: Boolean(noiseSuppressionEnabled)
  }
}

function shouldMuteRemotePlaybackForAccompaniment(accompanimentActive) {
  return Boolean(accompanimentActive)
}

function clampAccompanimentGain(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.78
  return Math.max(0, Math.min(1.5, parsed))
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

function resolveAccompanimentBadge(active, muted, gainValue) {
  if (!active) return { visible: false, text: "" }
  if (muted) return { visible: true, text: "伴奏：已静音" }
  const gainPercent = Math.round(Math.max(0, Math.min(1.5, Number(gainValue || 0.78))) * 100)
  return { visible: true, text: `伴奏：开启（${gainPercent}%）` }
}

function resolveAccompanimentMeterState(levelPercent, active, muted, clipUntil, now) {
  if (!active) {
    return { text: "伴奏电平：0%", statusText: "伴奏状态：待开启", clipping: false }
  }
  if (muted) {
    return { text: "伴奏电平：已静音", statusText: "伴奏状态：临时静音", clipping: false }
  }
  const clipping = now <= clipUntil
  return {
    text: clipping ? `伴奏电平：${levelPercent}%（过载）` : `伴奏电平：${levelPercent}%`,
    statusText: clipping ? "伴奏状态：检测到过载，已自动限幅" : "伴奏状态：正常",
    clipping
  }
}

function normalizePttKeyCode(value) {
  const code = String(value || "").trim()
  if (!code || code === "Unidentified") return ""
  return code
}

function formatPttKeyCodeLabel(code) {
  const normalized = normalizePttKeyCode(code) || "F2"
  if (normalized === "Space") return "Space"
  if (normalized.startsWith("Key") && normalized.length === 4) return normalized.slice(3).toUpperCase()
  if (normalized.startsWith("Digit") && normalized.length === 6) return normalized.slice(5)
  if (normalized.startsWith("Numpad")) return `Num${normalized.slice(6)}`
  if (normalized === "ShiftLeft") return "左 Shift"
  return normalized
}

function getDefaultAudioSettings() {
  return {
    micGain: 0.5,
    remoteOutputGain: 0.5,
    micEnhanceEnabled: true,
    noiseSuppressionEnabled: true,
    echoCancellationEnabled: true,
    accompanimentEnabled: false,
    accompanimentGain: 0.78,
    outputTestGain: 0.03,
    accompanimentLimiterEnabled: true,
    pttEnabled: false,
    pttKeyCode: "F2"
  }
}

function clampOutputTestGain(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0.03
  return Math.max(0, Math.min(0.12, parsed))
}

function getOutputTestButtonLabel(active) {
  return active ? "停止测试音" : "测试输出设备"
}

function formatOutputTestCountdownStatus(remainingSeconds) {
  const seconds = Math.max(0, Math.floor(Number(remainingSeconds || 0)))
  return `测试音播放中，${seconds}s 后自动停止`
}

function resolvePreferredDeviceValue(currentValue, storedValue) {
  const current = String(currentValue || "").trim()
  if (current) return current
  return String(storedValue || "").trim()
}

function normalizeAudioSettingsPayload(payload, defaults) {
  if (!payload || typeof payload !== "object") {
    throw new Error("配置不是有效对象")
  }
  return {
    micGain: Math.max(0, Math.min(2, Number(payload.micGain))),
    remoteOutputGain: Math.max(0, Math.min(1, Number(payload.remoteOutputGain))),
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

function resolveLiveSourceLabel(mode, sourceName) {
  const normalizedMode = String(mode || "screen")
  const normalizedName = String(sourceName || "").trim()
  if (normalizedName) return normalizedName
  if (normalizedMode === "window") return "窗口"
  return "桌面"
}

function getLiveBadgeByUserId(userId, liveActiveUserId) {
  const normalizedUserId = String(userId || "")
  if (!normalizedUserId) return null
  if (normalizedUserId !== String(liveActiveUserId || "")) return null
  return { text: "直播中", type: "voice-connected" }
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

function clampLiveStageHeight(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 420
  return Math.max(300, Math.min(900, Math.round(parsed)))
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

function applyRoomUserPresenceDelta(users, signature, payload, joined) {
  const userId = String(payload?.user?.id || "")
  if (!userId) return { users, signature, changed: false }
  const roomId = String(payload?.roomId || "")
  const nextUsers = [...users]
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
    return { users, signature, changed: false }
  }
  const nextSignature = createOnlineUsersSignature(nextUsers)
  return { users: nextUsers, signature: nextSignature, changed: nextSignature !== signature }
}

function normalizePresenceStatus(value) {
  return String(value || "").trim().toLowerCase() === "busy" ? "busy" : "online"
}

function applyRoomUsersSnapshot(users, signature, roomId, roomUsers, selfUser) {
  const normalizedRoomId = String(roomId || "")
  if (!normalizedRoomId || !Array.isArray(roomUsers)) return { users, signature, changed: false }
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
  const selfId = String(selfUser?.id || "")
  if (selfId && !snapshotMap.has(selfId)) {
    snapshotMap.set(selfId, {
      id: selfId,
      username: String(selfUser?.username || "我"),
      roomId: normalizedRoomId,
      status: normalizePresenceStatus(selfUser?.status || "online"),
      role: "user",
      canSend: true
    })
  }
  const nextUsers = [...users]
  for (let index = 0; index < nextUsers.length; index += 1) {
    const user = nextUsers[index]
    const userId = String(user?.id || "")
    if (!userId) continue
    if (snapshotMap.has(userId)) {
      nextUsers[index] = { ...user, ...snapshotMap.get(userId) }
      snapshotMap.delete(userId)
      continue
    }
    if (String(user?.roomId || "") === normalizedRoomId) {
      nextUsers[index] = { ...user, roomId: "" }
    }
  }
  for (const item of snapshotMap.values()) {
    nextUsers.push(item)
  }
  const nextSignature = createOnlineUsersSignature(nextUsers)
  return { users: nextUsers, signature: nextSignature, changed: nextSignature !== signature }
}

test("resolveServerEndpoints supports both explicit urls", () => {
  const result = resolveServerEndpoints("https://abc.ngrok.app", "wss://abc.ngrok.app")
  assert.equal(result.http, "https://abc.ngrok.app")
  assert.equal(result.ws, "wss://abc.ngrok.app")
})

test("resolveServerEndpoints derives ws from http", () => {
  const result = resolveServerEndpoints("https://abc.ngrok.app", "")
  assert.equal(result.http, "https://abc.ngrok.app")
  assert.equal(result.ws, "wss://abc.ngrok.app")
})

test("resolveServerEndpoints derives http from ws", () => {
  const result = resolveServerEndpoints("", "ws://127.0.0.1:3000")
  assert.equal(result.http, "http://127.0.0.1:3000")
  assert.equal(result.ws, "ws://127.0.0.1:3000")
})

test("resolveServerEndpoints rejects invalid pair", () => {
  const result = resolveServerEndpoints("invalid", "")
  assert.equal(result.http, "")
  assert.equal(result.ws, "")
})

test("resolveServerAlias supports host only with https page", () => {
  const result = resolveServerAlias("demo-123.ngrok.app:3000", "https:")
  assert.equal(result.http, "https://demo-123.ngrok.app:3000")
  assert.equal(result.ws, "wss://demo-123.ngrok.app:3000")
})

test("resolveServerAlias supports explicit ws url", () => {
  const result = resolveServerAlias("ws://127.0.0.1:3000", "http:")
  assert.equal(result.http, "http://127.0.0.1:3000")
  assert.equal(result.ws, "ws://127.0.0.1:3000")
})

test("resolveServerAlias rejects invalid host", () => {
  const result = resolveServerAlias("bad host value", "https:")
  assert.equal(result.http, "")
  assert.equal(result.ws, "")
})

test("resolveBootstrapEndpoints falls back to storage when query is invalid", () => {
  const result = resolveBootstrapEndpoints({
    queryServer: "bad host value",
    storedHttp: "https://saved.ngrok.app",
    storedWs: "wss://saved.ngrok.app"
  })
  assert.equal(result.source, "storage")
  assert.equal(result.endpoints.http, "https://saved.ngrok.app")
  assert.equal(result.endpoints.ws, "wss://saved.ngrok.app")
  assert.equal(result.clearStorage, false)
})

test("resolveBootstrapEndpoints clears invalid storage and falls back to spec", () => {
  const result = resolveBootstrapEndpoints({
    queryServer: "",
    storedHttp: "invalid",
    storedWs: ""
  })
  assert.equal(result.source, "spec")
  assert.equal(result.clearStorage, true)
})

test("resolveUiStage follows auth lobby room progression", () => {
  assert.equal(resolveUiStage(false, ""), "auth")
  assert.equal(resolveUiStage(true, ""), "lobby")
  assert.equal(resolveUiStage(true, "room-1"), "room")
})

test("pickVoiceRoomUsers returns in-room users and self first", () => {
  const users = [
    { id: "u2", username: "李四", roomId: "room-1" },
    { id: "u1", username: "张三", roomId: "room-1" },
    { id: "u3", username: "王五", roomId: "room-2" }
  ]
  const result = pickVoiceRoomUsers(users, "room-1", "u1")
  assert.deepEqual(result.map((item) => item.id), ["u1", "u2"])
})

test("resolveImageFileExtension maps common image mime types", () => {
  assert.equal(resolveImageFileExtension("image/jpeg"), "jpg")
  assert.equal(resolveImageFileExtension("image/gif"), "gif")
  assert.equal(resolveImageFileExtension("image/webp"), "webp")
  assert.equal(resolveImageFileExtension("image/bmp"), "bmp")
  assert.equal(resolveImageFileExtension("image/png"), "png")
  assert.equal(resolveImageFileExtension(""), "png")
})

test("resolveSessionControlState enables room-only controls after join", () => {
  const beforeJoin = resolveSessionControlState(true, "")
  const afterJoin = resolveSessionControlState(true, "room-1")
  assert.equal(beforeJoin.audioSettingsVisible, false)
  assert.equal(beforeJoin.chatInputEnabled, false)
  assert.equal(afterJoin.audioSettingsVisible, true)
  assert.equal(afterJoin.chatInputEnabled, true)
})

test("canDeleteRoomOnClient follows owner/admin policy", () => {
  const room = { created_by: "u-1" }
  assert.equal(canDeleteRoomOnClient(room, { id: "u-1", role: "user" }), true)
  assert.equal(canDeleteRoomOnClient(room, { id: "u-2", role: "user" }), false)
  assert.equal(canDeleteRoomOnClient(room, { id: "u-2", role: "admin" }), true)
})

test("shouldClearPrivateSessionByTimeout follows expiry boundary", () => {
  assert.equal(shouldClearPrivateSessionByTimeout(1000, 1200), false)
  assert.equal(shouldClearPrivateSessionByTimeout(1200, 1200), true)
  assert.equal(shouldClearPrivateSessionByTimeout(1300, 1200), true)
})

test("canRecoverPrivateSession requires active recovery and same-room user", () => {
  const recovery = { userId: "u-2", expiresAt: 5000 }
  const users = [
    { id: "u-2", roomId: "room-1" },
    { id: "u-3", roomId: "room-2" }
  ]
  assert.equal(canRecoverPrivateSession(recovery, "room-1", users, 3000), true)
  assert.equal(canRecoverPrivateSession(recovery, "room-2", users, 3000), false)
  assert.equal(canRecoverPrivateSession(recovery, "room-1", users, 6000), false)
})

test("buildInputAudioConstraints follows denoise and echo toggles", () => {
  const enabled = buildInputAudioConstraints("mic-1", true, false)
  const disabled = buildInputAudioConstraints("", false, true)
  assert.deepEqual(enabled, {
    deviceId: { exact: "mic-1" },
    noiseSuppression: true,
    echoCancellation: false,
    autoGainControl: true
  })
  assert.deepEqual(disabled, {
    deviceId: undefined,
    noiseSuppression: false,
    echoCancellation: true,
    autoGainControl: false
  })
})

test("shouldMuteRemotePlaybackForAccompaniment follows accompaniment state", () => {
  assert.equal(shouldMuteRemotePlaybackForAccompaniment(true), true)
  assert.equal(shouldMuteRemotePlaybackForAccompaniment(false), false)
})

test("clampAccompanimentGain keeps value in allowed range", () => {
  assert.equal(clampAccompanimentGain(-1), 0)
  assert.equal(clampAccompanimentGain(0.66), 0.66)
  assert.equal(clampAccompanimentGain(5), 1.5)
  assert.equal(clampAccompanimentGain("bad"), 0.78)
})

test("resolveAccompanimentErrorMessage maps NotSupported and strips leading colon", () => {
  assert.equal(
    resolveAccompanimentErrorMessage({ name: "NotSupportedError", message: ": Not supported" }),
    "当前环境不支持该共享方式，请使用 Chromium/Electron 最新版并在共享窗口勾选系统音频"
  )
  assert.equal(
    resolveAccompanimentErrorMessage({ name: "", message: "：Not supported" }),
    "Not supported"
  )
})

test("resolveAccompanimentBadge returns hidden, muted and active labels", () => {
  assert.deepEqual(resolveAccompanimentBadge(false, false, 0.78), { visible: false, text: "" })
  assert.deepEqual(resolveAccompanimentBadge(true, true, 0.78), { visible: true, text: "伴奏：已静音" })
  assert.deepEqual(resolveAccompanimentBadge(true, false, 0.66), { visible: true, text: "伴奏：开启（66%）" })
})

test("normalizePttKeyCode rejects empty and Unidentified", () => {
  assert.equal(normalizePttKeyCode("F2"), "F2")
  assert.equal(normalizePttKeyCode(""), "")
  assert.equal(normalizePttKeyCode("Unidentified"), "")
})

test("formatPttKeyCodeLabel formats common key code labels", () => {
  assert.equal(formatPttKeyCodeLabel("F2"), "F2")
  assert.equal(formatPttKeyCodeLabel("KeyV"), "V")
  assert.equal(formatPttKeyCodeLabel("Digit3"), "3")
  assert.equal(formatPttKeyCodeLabel("ShiftLeft"), "左 Shift")
  assert.equal(formatPttKeyCodeLabel(""), "F2")
})

test("resolveAccompanimentMeterState handles inactive muted and clipping states", () => {
  assert.deepEqual(resolveAccompanimentMeterState(40, false, false, 0, 1000), {
    text: "伴奏电平：0%",
    statusText: "伴奏状态：待开启",
    clipping: false
  })
  assert.deepEqual(resolveAccompanimentMeterState(40, true, true, 0, 1000), {
    text: "伴奏电平：已静音",
    statusText: "伴奏状态：临时静音",
    clipping: false
  })
  assert.deepEqual(resolveAccompanimentMeterState(93, true, false, 1200, 1000), {
    text: "伴奏电平：93%（过载）",
    statusText: "伴奏状态：检测到过载，已自动限幅",
    clipping: true
  })
})

test("getDefaultAudioSettings returns expected defaults", () => {
  assert.deepEqual(getDefaultAudioSettings(), {
    micGain: 0.5,
    remoteOutputGain: 0.5,
    micEnhanceEnabled: true,
    noiseSuppressionEnabled: true,
    echoCancellationEnabled: true,
    accompanimentEnabled: false,
    accompanimentGain: 0.78,
    outputTestGain: 0.03,
    accompanimentLimiterEnabled: true,
    pttEnabled: false,
    pttKeyCode: "F2"
  })
})

test("clampOutputTestGain keeps output test gain in valid range", () => {
  assert.equal(clampOutputTestGain(-1), 0)
  assert.equal(clampOutputTestGain(0.06), 0.06)
  assert.equal(clampOutputTestGain(0.3), 0.12)
  assert.equal(clampOutputTestGain("bad"), 0.03)
})

test("getOutputTestButtonLabel switches text by active state", () => {
  assert.equal(getOutputTestButtonLabel(true), "停止测试音")
  assert.equal(getOutputTestButtonLabel(false), "测试输出设备")
})

test("formatOutputTestCountdownStatus clamps and formats seconds", () => {
  assert.equal(formatOutputTestCountdownStatus(8), "测试音播放中，8s 后自动停止")
  assert.equal(formatOutputTestCountdownStatus(2.9), "测试音播放中，2s 后自动停止")
  assert.equal(formatOutputTestCountdownStatus(-1), "测试音播放中，0s 后自动停止")
})

test("resolvePreferredDeviceValue prefers current then stored", () => {
  assert.equal(resolvePreferredDeviceValue("mic-live", "mic-saved"), "mic-live")
  assert.equal(resolvePreferredDeviceValue("", "mic-saved"), "mic-saved")
  assert.equal(resolvePreferredDeviceValue("   ", "spk-saved"), "spk-saved")
})

test("parseAudioSettingsPayload supports wrapped audioSettings payload", () => {
  const result = parseAudioSettingsPayload(
    JSON.stringify({
      audioSettings: {
        micGain: 1.2,
        micEnhanceEnabled: true,
        noiseSuppressionEnabled: false,
        echoCancellationEnabled: true,
        accompanimentEnabled: false,
        accompanimentGain: 0.66,
        accompanimentLimiterEnabled: true,
        outputTestGain: 0.05,
        pttEnabled: true,
        pttKeyCode: "KeyV",
        audioInputDeviceId: "mic-1",
        audioOutputDeviceId: "spk-1"
      }
    })
  )
  assert.equal(result.ok, true)
  assert.equal(result.settings.micGain, 1.2)
  assert.equal(result.settings.pttKeyCode, "KeyV")
  assert.equal(result.settings.audioInputDeviceId, "mic-1")
})

test("parseAudioSettingsPayload rejects invalid json", () => {
  const result = parseAudioSettingsPayload("{invalid")
  assert.equal(result.ok, false)
  assert.equal(result.error, "配置 JSON 格式无效")
})

test("getAudioPresetConfig returns expected preset profiles", () => {
  const voice = getAudioPresetConfig("voice")
  const music = getAudioPresetConfig("music")
  const talk = getAudioPresetConfig("talk")
  assert.equal(voice.label, "语音清晰")
  assert.equal(voice.noiseSuppressionEnabled, true)
  assert.equal(music.echoCancellationEnabled, false)
  assert.equal(music.outputTestGain, 0.04)
  assert.equal(talk.pttEnabled, true)
  assert.equal(getAudioPresetConfig("unknown"), null)
})

test("normalizeAudioPresetKey normalizes unknown to manual", () => {
  assert.equal(normalizeAudioPresetKey("voice"), "voice")
  assert.equal(normalizeAudioPresetKey("CUSTOM"), "custom")
  assert.equal(normalizeAudioPresetKey("invalid"), "manual")
})

test("getAudioPresetStatusText maps preset label text", () => {
  assert.equal(getAudioPresetStatusText("voice"), "当前预设：语音清晰")
  assert.equal(getAudioPresetStatusText("music"), "当前预设：音乐演唱")
  assert.equal(getAudioPresetStatusText("talk"), "当前预设：低延迟对讲")
  assert.equal(getAudioPresetStatusText("custom"), "当前预设：自定义")
  assert.equal(getAudioPresetStatusText("bad"), "当前预设：手动")
})

test("resolveLiveSourceLabel prefers name then mode fallback", () => {
  assert.equal(resolveLiveSourceLabel("screen", "Chrome 窗口"), "Chrome 窗口")
  assert.equal(resolveLiveSourceLabel("window", ""), "窗口")
  assert.equal(resolveLiveSourceLabel("screen", ""), "桌面")
})

test("getLiveBadgeByUserId only marks current live owner", () => {
  assert.deepEqual(getLiveBadgeByUserId("u1", "u1"), { text: "直播中", type: "voice-connected" })
  assert.equal(getLiveBadgeByUserId("u2", "u1"), null)
  assert.equal(getLiveBadgeByUserId("", "u1"), null)
})

test("clampLiveCardRect keeps card inside live stage", () => {
  const rect = clampLiveCardRect({ x: -20, y: 999, width: 700, height: 500 }, 600, 340)
  assert.equal(rect.x, 0)
  assert.equal(rect.y <= 170, true)
  assert.equal(rect.width <= 588, true)
  assert.equal(rect.height <= 328, true)
})

test("getLiveCardDockRect places main and side cards", () => {
  const main = getLiveCardDockRect(0, 3, 1200, 500)
  const side = getLiveCardDockRect(1, 3, 1200, 500)
  assert.equal(main.x, 12)
  assert.equal(main.width > side.width, true)
  assert.equal(side.x > main.x, true)
})

test("snapLiveCardRect snaps near stage edges", () => {
  const snapped = snapLiveCardRect({ x: 10, y: 13, width: 320, height: 200 }, 900, 460)
  assert.equal(snapped.x, 0)
  assert.equal(snapped.y, 0)
})

test("clampLiveStageHeight keeps stage height in range", () => {
  assert.equal(clampLiveStageHeight(250), 300)
  assert.equal(clampLiveStageHeight(420), 420)
  assert.equal(clampLiveStageHeight(1200), 900)
  assert.equal(clampLiveStageHeight("bad"), 420)
})

test("applyRoomUserPresenceDelta updates join and leave room membership", () => {
  const initialUsers = [
    { id: "u1", username: "A", roomId: "r1", status: "online", role: "user", canSend: true },
    { id: "u2", username: "B", roomId: "", status: "online", role: "user", canSend: true }
  ]
  const initialSignature = createOnlineUsersSignature(initialUsers)
  const joined = applyRoomUserPresenceDelta(initialUsers, initialSignature, {
    roomId: "r1",
    user: { id: "u2", username: "B" }
  }, true)
  assert.equal(joined.changed, true)
  assert.equal(joined.users.find((item) => item.id === "u2")?.roomId, "r1")
  const left = applyRoomUserPresenceDelta(joined.users, joined.signature, {
    roomId: "r1",
    user: { id: "u2", username: "B" }
  }, false)
  assert.equal(left.changed, true)
  assert.equal(left.users.find((item) => item.id === "u2")?.roomId, "")
})

test("applyRoomUsersSnapshot aligns room member list and keeps self", () => {
  const initialUsers = [
    { id: "u1", username: "A", roomId: "r1", status: "online", role: "user", canSend: true },
    { id: "u2", username: "B", roomId: "r1", status: "online", role: "user", canSend: true },
    { id: "u3", username: "C", roomId: "r1", status: "busy", role: "user", canSend: true }
  ]
  const initialSignature = createOnlineUsersSignature(initialUsers)
  const result = applyRoomUsersSnapshot(initialUsers, initialSignature, "r1", [
    { id: "u2", username: "B", roomId: "r1", status: "online", role: "user", canSend: true }
  ], { id: "u1", username: "A", status: "online" })
  assert.equal(result.changed, true)
  assert.equal(result.users.find((item) => item.id === "u1")?.roomId, "r1")
  assert.equal(result.users.find((item) => item.id === "u2")?.roomId, "r1")
  assert.equal(result.users.find((item) => item.id === "u3")?.roomId, "")
})
