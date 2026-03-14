import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

function getForwardedHeaderValue(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  return raw.split(",")[0]?.trim() || ""
}

function sanitizeHost(value) {
  const host = String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
  if (!host) return ""
  if (/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return host
  if (/^\[[a-f0-9:.]+\](?::\d{1,5})?$/i.test(host)) return host
  return ""
}

function resolvePublicHost(reqLike, port = 3000) {
  const forwardedHost = getForwardedHeaderValue(reqLike.headers["x-forwarded-host"])
  const directHost = String(reqLike.host || "")
  const host = sanitizeHost(forwardedHost || directHost)
  return host || `localhost:${port}`
}

function resolveRequestHttpProtocol(reqLike) {
  const forwardedProto = getForwardedHeaderValue(reqLike.headers["x-forwarded-proto"])
  const protocol = String(forwardedProto || reqLike.protocol || "http").trim().toLowerCase()
  return protocol === "https" ? "https" : "http"
}

function parseConfiguredPublicBaseUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return null
  try {
    const normalized = normalizeConfiguredUrl(raw, "https://")
    const url = new URL(normalized)
    const httpProtocol = url.protocol === "https:" ? "https" : url.protocol === "http:" ? "http" : ""
    if (!httpProtocol) return null
    const wsProtocol = httpProtocol === "https" ? "wss" : "ws"
    const host = sanitizeHost(url.host)
    if (!host) return null
    return {
      baseUrl: `${httpProtocol}://${host}`,
      wsUrl: `${wsProtocol}://${host}`,
      httpProtocol,
      wsProtocol,
      host
    }
  } catch {
    return null
  }
}

function parseConfiguredPublicWsUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return null
  try {
    const normalized = normalizeConfiguredUrl(raw, "wss://")
    const url = new URL(normalized)
    const wsProtocol = url.protocol === "wss:" ? "wss" : url.protocol === "ws:" ? "ws" : ""
    if (!wsProtocol) return null
    const host = sanitizeHost(url.host)
    if (!host) return null
    return {
      wsUrl: `${wsProtocol}://${host}`,
      wsProtocol,
      host
    }
  } catch {
    return null
  }
}

function normalizeConfiguredUrl(raw, defaultPrefix) {
  const value = String(raw || "").trim()
  if (!value) return value
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value
  return `${defaultPrefix}${value.replace(/^\/\//, "")}`
}

function resolveWebAssetsDir(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const resolved = path.resolve(raw)
  try {
    if (!fs.statSync(resolved).isDirectory()) return ""
  } catch {
    return ""
  }
  try {
    if (!fs.statSync(path.join(resolved, "index.html")).isFile()) return ""
  } catch {
    return ""
  }
  return resolved
}

function normalizeInput(value) {
  if (typeof value !== "string") return ""
  const normalized = value.trim()
  return normalized.length ? normalized : ""
}

function resolveRoomDeletionDecision(roomName, onlineCount, payload) {
  const confirmation = normalizeInput(payload?.confirmationText)
  const reasonInput = normalizeInput(payload?.reason)
  const force = Boolean(payload?.force)
  if (!confirmation || confirmation !== roomName) {
    return { ok: false, status: 400, error: "删除确认失败：请输入完整房间名进行确认" }
  }
  if (onlineCount > 0 && !force) {
    return { ok: false, status: 409, error: "房间仍有在线成员，请确认后执行强制删除" }
  }
  const auditReason = reasonInput || "管理员手动删除房间"
  const reasonPrefix = onlineCount > 0 ? "房间已被管理员强制关闭" : "房间已被管理员关闭"
  return {
    ok: true,
    status: 200,
    force,
    reason: `${reasonPrefix}：${auditReason}`,
    auditReason
  }
}

function canDeleteRoom(room, user) {
  const role = String(user?.role || "")
  if (role === "admin") return true
  const ownerId = String(room?.created_by || "")
  const userId = String(user?.userId || "")
  return Boolean(ownerId && userId && ownerId === userId)
}

function canPrivateTextInSameRoom(senderRoomId, targetRoomId) {
  const sender = String(senderRoomId || "")
  const target = String(targetRoomId || "")
  return Boolean(sender && target && sender === target)
}

test("resolvePublicHost prefers forwarded host and strips invalid chars", () => {
  assert.equal(
    resolvePublicHost({
      headers: { "x-forwarded-host": "demo-123.ngrok-free.app, proxy.local" },
      host: "localhost:3000"
    }),
    "demo-123.ngrok-free.app"
  )
  assert.equal(
    resolvePublicHost({
      headers: { "x-forwarded-host": "evil.com/path?q=1" },
      host: "localhost:3000"
    }),
    "evil.com"
  )
})

test("resolvePublicHost falls back when host is invalid", () => {
  assert.equal(
    resolvePublicHost({
      headers: { "x-forwarded-host": "not valid host" },
      host: ""
    }),
    "localhost:3000"
  )
})

test("resolveRequestHttpProtocol supports forwarded proto", () => {
  assert.equal(
    resolveRequestHttpProtocol({
      headers: { "x-forwarded-proto": "https,http" },
      protocol: "http"
    }),
    "https"
  )
  assert.equal(
    resolveRequestHttpProtocol({
      headers: {},
      protocol: "http"
    }),
    "http"
  )
})

test("parseConfiguredPublicBaseUrl supports https host", () => {
  const endpoint = parseConfiguredPublicBaseUrl("https://demo-100.ngrok-free.app/path?q=1")
  assert.equal(endpoint?.baseUrl, "https://demo-100.ngrok-free.app")
  assert.equal(endpoint?.wsUrl, "wss://demo-100.ngrok-free.app")
})

test("parseConfiguredPublicBaseUrl rejects invalid protocol", () => {
  const endpoint = parseConfiguredPublicBaseUrl("ftp://demo-100.ngrok-free.app")
  assert.equal(endpoint, null)
})

test("parseConfiguredPublicBaseUrl supports host only", () => {
  const endpoint = parseConfiguredPublicBaseUrl("demo-100.ngrok-free.app:3000")
  assert.equal(endpoint?.baseUrl, "https://demo-100.ngrok-free.app:3000")
  assert.equal(endpoint?.wsUrl, "wss://demo-100.ngrok-free.app:3000")
})

test("parseConfiguredPublicWsUrl supports explicit wss host", () => {
  const endpoint = parseConfiguredPublicWsUrl("wss://ws-demo-100.ngrok-free.app/socket")
  assert.equal(endpoint?.wsUrl, "wss://ws-demo-100.ngrok-free.app")
  assert.equal(endpoint?.wsProtocol, "wss")
})

test("parseConfiguredPublicWsUrl rejects invalid protocol", () => {
  const endpoint = parseConfiguredPublicWsUrl("https://ws-demo-100.ngrok-free.app")
  assert.equal(endpoint, null)
})

test("parseConfiguredPublicWsUrl supports host only", () => {
  const endpoint = parseConfiguredPublicWsUrl("ws-demo-100.ngrok-free.app:8443")
  assert.equal(endpoint?.wsUrl, "wss://ws-demo-100.ngrok-free.app:8443")
  assert.equal(endpoint?.wsProtocol, "wss")
})

test("resolveWebAssetsDir returns empty when directory is missing", () => {
  const missing = resolveWebAssetsDir("f:/trae/chat/non-existent-web-assets")
  assert.equal(missing, "")
})

test("resolveWebAssetsDir returns directory when index exists", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-chat-web-"))
  try {
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><html></html>", "utf8")
    const resolved = resolveWebAssetsDir(dir)
    assert.equal(resolved, path.resolve(dir))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("resolveRoomDeletionDecision requires exact room name confirmation", () => {
  const result = resolveRoomDeletionDecision("技术讨论", 0, {
    confirmationText: "技术"
  })
  assert.equal(result.ok, false)
  assert.equal(result.status, 400)
})

test("resolveRoomDeletionDecision blocks non-force deletion with online users", () => {
  const result = resolveRoomDeletionDecision("技术讨论", 3, {
    confirmationText: "技术讨论",
    force: false
  })
  assert.equal(result.ok, false)
  assert.equal(result.status, 409)
})

test("resolveRoomDeletionDecision allows force deletion and preserves reason", () => {
  const result = resolveRoomDeletionDecision("技术讨论", 2, {
    confirmationText: "技术讨论",
    reason: "违规讨论",
    force: true
  })
  assert.equal(result.ok, true)
  assert.equal(result.force, true)
  assert.equal(result.reason, "房间已被管理员强制关闭：违规讨论")
  assert.equal(result.auditReason, "违规讨论")
})

test("canDeleteRoom allows owner or admin", () => {
  const room = { created_by: "u-owner" }
  assert.equal(canDeleteRoom(room, { userId: "u-owner", role: "user" }), true)
  assert.equal(canDeleteRoom(room, { userId: "u-other", role: "user" }), false)
  assert.equal(canDeleteRoom(room, { userId: "u-other", role: "admin" }), true)
})

test("canPrivateTextInSameRoom requires sender and target in same room", () => {
  assert.equal(canPrivateTextInSameRoom("r-1", "r-1"), true)
  assert.equal(canPrivateTextInSameRoom("r-1", "r-2"), false)
  assert.equal(canPrivateTextInSameRoom("", "r-1"), false)
})
