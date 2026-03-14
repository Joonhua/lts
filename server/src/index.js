import "dotenv/config"
import path from "node:path"
import fs from "node:fs"
import http from "node:http"
import https from "node:https"
import { fileURLToPath } from "node:url"
import express from "express"
import helmet from "helmet"
import cors from "cors"
import morgan from "morgan"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import Database from "better-sqlite3"
import { WebSocketServer } from "ws"
import {
  WS_EVENTS,
  USER_STATUS,
  ROOM_LIMITS,
  createPacket,
  isValidRoomName,
  cryptoRandomId
} from "@voice-chat/shared"

const PORT = Number(process.env.PORT || 3000)
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h"
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456"
const DATA_DIR = path.resolve(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "voice_chat.sqlite")
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*"
const DEFAULT_TUNNEL_ORIGIN_REGEX = "^https://([a-z0-9-]+\\.(ngrok-free\\.app|ngrok\\.app)|[a-z0-9-]+\\.trycloudflare\\.com)$"
const CLIENT_ORIGIN_REGEX = process.env.CLIENT_ORIGIN_REGEX || DEFAULT_TUNNEL_ORIGIN_REGEX
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || ""
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || ""
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "").trim()
const PUBLIC_WS_URL = String(process.env.PUBLIC_WS_URL || "").trim()
const RTC_ICE_SERVERS_ENV_JSON = String(process.env.RTC_ICE_SERVERS_JSON || "").trim()
const MAX_FILE_SHARE_BYTES = Number(process.env.MAX_FILE_SHARE_BYTES || 1_500_000)
const GUEST_OFFLINE_RETENTION_MS = Number(process.env.GUEST_OFFLINE_RETENTION_MS || 10 * 60 * 1000)
const RTC_ICE_SETTING_KEY = "rtc_ice_servers_json"
const DEFAULT_RTC_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" }
]
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ADMIN_ASSETS_DIR = path.join(__dirname, "admin")
const WEB_ASSETS_DIR = resolveWebAssetsDir(process.env.WEB_ASSETS_DIR || path.join(__dirname, "..", "..", "web"))
const CORS_EXACT_ORIGINS = parseOriginList(CLIENT_ORIGIN)
const CORS_ORIGIN_PATTERN = buildOriginPattern(CLIENT_ORIGIN_REGEX)
let rtcIceServersCurrent = parseRtcIceServers(RTC_ICE_SERVERS_ENV_JSON, DEFAULT_RTC_ICE_SERVERS)
let rtcIceServersSource = RTC_ICE_SERVERS_ENV_JSON ? "env" : "default"
let rtcIceServersRaw = RTC_ICE_SERVERS_ENV_JSON || ""

fs.mkdirSync(DATA_DIR, { recursive: true })
const db = new Database(DB_PATH)
initDb(db)
ensureAdminUser()
loadRtcIceServersFromDb()

const app = express()
app.disable("x-powered-by")
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    callback(null, isCorsOriginAllowed(origin))
  }
}))
app.use(express.json({ limit: "2mb" }))
app.use(morgan("combined"))
app.use("/auth", authRateLimit)
app.use("/admin/assets", express.static(ADMIN_ASSETS_DIR))

const server = createHttpServer(app)
const wss = new WebSocketServer({ server })

const onlineConnections = new Map()
const roomSockets = new Map()
const roomLiveOwners = new Map()
let lastGuestCleanupAt = 0
const API_SPEC = {
  name: "voice-chat-api",
  version: "1.1.0",
  auth: [
    { method: "POST", path: "/auth/register" },
    { method: "POST", path: "/auth/login" },
    { method: "POST", path: "/auth/guest" },
    { method: "POST", path: "/auth/refresh" }
  ],
  rooms: [
    { method: "GET", path: "/rooms" },
    { method: "POST", path: "/rooms" },
    { method: "DELETE", path: "/rooms/:roomId" },
    { method: "GET", path: "/rooms/:roomId/messages" }
  ],
  users: [{ method: "GET", path: "/users/online" }],
  admin: [
    { method: "GET", path: "/admin/me" },
    { method: "GET", path: "/admin/stats" },
    { method: "GET", path: "/admin/users" },
    { method: "POST", path: "/admin/users/:userId/ban" },
    { method: "POST", path: "/admin/users/:userId/kick" },
    { method: "POST", path: "/admin/users/:userId/usage-limit" },
    { method: "POST", path: "/admin/users/:userId/reset-usage" },
    { method: "GET", path: "/admin/rooms" },
    { method: "POST", path: "/admin/rooms/:roomId/settings" },
    { method: "GET", path: "/admin/rooms/:roomId/members" },
    { method: "POST", path: "/admin/rooms/:roomId/members/:userId/permissions" },
    { method: "GET", path: "/admin/rooms/:roomId/messages" },
    { method: "DELETE", path: "/admin/rooms/:roomId/messages" },
    { method: "DELETE", path: "/admin/rooms/:roomId" },
    { method: "POST", path: "/admin/rtc-config" },
    { method: "GET", path: "/admin/audit-logs" }
  ],
  websocket: {
    path: "/",
    events: Object.values(WS_EVENTS)
  },
  constraints: {
    maxFileShareBytes: MAX_FILE_SHARE_BYTES
  },
  security: {
    cors: {
      exactOrigins: CORS_EXACT_ORIGINS,
      wildcard: CLIENT_ORIGIN === "*",
      regex: CORS_ORIGIN_PATTERN ? CLIENT_ORIGIN_REGEX : ""
    }
  }
}

app.get("/health", (_, res) => {
  res.json({ ok: true, timestamp: Date.now() })
})

app.get("/admin", (_, res) => {
  res.sendFile(path.join(ADMIN_ASSETS_DIR, "index.html"))
})

app.get("/api/spec", (req, res) => {
  const endpoint = resolvePublicEndpoint(req)
  res.json({
    ...API_SPEC,
    rtc: {
      iceServers: rtcIceServersCurrent
    },
    baseUrl: endpoint.baseUrl,
    wsUrl: endpoint.wsUrl,
    protocol: {
      http: endpoint.httpProtocol,
      ws: endpoint.wsProtocol
    }
  })
})

app.post("/auth/register", (req, res) => {
  const username = normalizeInput(req.body?.username)
  const password = String(req.body?.password || "")
  if (!isValidUsername(username) || password.length < 6) {
    return res.status(400).json({ error: "用户名或密码不合法" })
  }
  const existed = db.prepare("SELECT id FROM users WHERE username = ?").get(username)
  if (existed) {
    return res.status(409).json({ error: "用户名已存在" })
  }
  const passwordHash = bcrypt.hashSync(password, 10)
  const id = cryptoRandomId()
  db.prepare("INSERT INTO users (id, username, password_hash, is_guest, role, created_at, last_seen_at) VALUES (?, ?, ?, 0, 'user', ?, ?)")
    .run(id, username, passwordHash, Date.now(), Date.now())
  const token = signToken({ userId: id, username, guest: false, role: "user" })
  return res.json({ token, user: { id, username, guest: false, role: "user" } })
})

app.post("/auth/login", (req, res) => {
  const username = normalizeInput(req.body?.username)
  const password = String(req.body?.password || "")
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: "用户名不合法" })
  }
  const user = db.prepare("SELECT id, username, password_hash, is_guest, role FROM users WHERE username = ?").get(username)
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "账号或密码错误" })
  }
  const token = signToken({ userId: user.id, username: user.username, guest: Boolean(user.is_guest), role: user.role || "user" })
  return res.json({ token, user: { id: user.id, username: user.username, guest: Boolean(user.is_guest), role: user.role || "user" } })
})

app.post("/auth/guest", (req, res) => {
  const nickname = normalizeInput(req.body?.nickname) || `Guest-${Math.random().toString(36).slice(2, 6)}`
  if (nickname.length > 24) {
    return res.status(400).json({ error: "访客名过长" })
  }
  purgeOfflineGuestUsersByUsername(nickname)
  const existed = db.prepare("SELECT id, is_guest FROM users WHERE username = ?").get(nickname)
  if (existed && !existed.is_guest) {
    return res.status(409).json({ error: "该用户名已被注册用户占用" })
  }
  if (existed && existed.is_guest) {
    return res.status(409).json({ error: "该访客名正在使用中，请稍后再试" })
  }
  const id = cryptoRandomId()
  db.prepare("INSERT INTO users (id, username, password_hash, is_guest, role, created_at, last_seen_at) VALUES (?, ?, NULL, 1, 'guest', ?, ?)")
    .run(id, nickname, Date.now(), Date.now())
  const token = signToken({ userId: id, username: nickname, guest: true, role: "guest" })
  return res.json({ token, user: { id, username: nickname, guest: true, role: "guest" } })
})

app.post("/auth/refresh", (req, res) => {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : String(req.body?.token || "")
  if (!token) return res.status(401).json({ error: "缺少token" })
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true })
    const user = db.prepare("SELECT id, username, is_guest, role FROM users WHERE id = ?").get(decoded.userId)
    if (!user) return res.status(404).json({ error: "用户不存在" })
    const newToken = signToken({ userId: user.id, username: user.username, guest: Boolean(user.is_guest), role: user.role || "user" })
    return res.json({ token: newToken })
  } catch {
    return res.status(401).json({ error: "token无效" })
  }
})

app.get("/rooms", authMiddleware, (_, res) => {
  res.json({ rooms: getRoomList() })
})

app.post("/rooms", authMiddleware, (req, res) => {
  const name = normalizeInput(req.body?.name)
  if (!isValidRoomName(name)) {
    return res.status(400).json({ error: "房间名需为2-32字符" })
  }
  const id = cryptoRandomId()
  db.prepare("INSERT INTO rooms (id, name, created_by, created_at, is_locked, is_readonly, speaking_mode, host_user_id) VALUES (?, ?, ?, ?, 0, 0, 'all', ?)")
    .run(id, name, req.user.userId, Date.now(), req.user.userId)
  broadcastRoomList()
  res.status(201).json({ id, name })
})

app.delete("/rooms/:roomId", authMiddleware, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const room = db.prepare("SELECT id, name, created_by FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  if (!canDeleteRoom(room, req.user)) {
    return res.status(403).json({ error: "仅建房者或管理员可删除房间" })
  }
  const onlineCount = Number(roomSockets.get(roomId)?.size || 0)
  const deletionDecision = resolveRoomDeletionDecision(room.name, onlineCount, req.body)
  if (!deletionDecision.ok) {
    return res.status(deletionDecision.status).json({
      error: deletionDecision.error,
      roomName: room.name,
      onlineCount
    })
  }
  disconnectRoomMembers(roomId, deletionDecision.reason)
  const messageCount = Number(db.prepare("SELECT COUNT(1) AS total FROM messages WHERE room_id = ?").get(roomId)?.total || 0)
  db.prepare("DELETE FROM messages WHERE room_id = ?").run(roomId)
  db.prepare("DELETE FROM room_user_permissions WHERE room_id = ?").run(roomId)
  db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId)
  roomSockets.delete(roomId)
  logAdminAction(req.user.userId, "room_delete", "room", roomId, {
    roomName: room.name,
    onlineCount,
    messageCount,
    force: deletionDecision.force,
    reason: deletionDecision.auditReason,
    deletedByRole: req.user.role || "user"
  })
  broadcastRoomList()
  res.json({ ok: true })
})

app.get("/users/online", authMiddleware, (_, res) => {
  const users = [...onlineConnections.values()].map((ctx) => ({
    id: ctx.user.userId,
    username: ctx.user.username,
    role: ctx.user.role || "user",
    status: ctx.status,
    roomId: ctx.roomId
  }))
  res.json({ users })
})

app.get("/admin/me", authMiddleware, requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user })
})

app.get("/admin/users", authMiddleware, requireAdmin, (_, res) => {
  const rows = db.prepare(`
    SELECT id, username, is_guest, role, is_banned, banned_reason, banned_until, usage_seconds, usage_limit_minutes, created_at, last_seen_at
    FROM users
    ORDER BY created_at DESC
  `).all()
  res.json({
    users: rows.map((row) => {
      const online = onlineConnections.has(row.id)
      return {
        ...row,
        online
      }
    })
  })
})

app.get("/admin/stats", authMiddleware, requireAdmin, (_, res) => {
  const usersTotal = db.prepare("SELECT COUNT(*) AS total FROM users").get()?.total || 0
  const roomsTotal = db.prepare("SELECT COUNT(*) AS total FROM rooms").get()?.total || 0
  const messagesTotal = db.prepare("SELECT COUNT(*) AS total FROM messages").get()?.total || 0
  const bannedUsers = db.prepare("SELECT COUNT(*) AS total FROM users WHERE is_banned = 1").get()?.total || 0
  const messages24h = db.prepare("SELECT COUNT(*) AS total FROM messages WHERE created_at >= ?").get(Date.now() - 24 * 60 * 60 * 1000)?.total || 0
  res.json({
    stats: {
      usersTotal,
      roomsTotal,
      messagesTotal,
      bannedUsers,
      onlineUsers: onlineConnections.size,
      messages24h
    }
  })
})

app.get("/admin/rtc-config", authMiddleware, requireAdmin, (req, res) => {
  const endpoint = resolvePublicEndpoint(req)
  res.json({
    rtc: {
      iceServers: rtcIceServersCurrent,
      source: rtcIceServersSource,
      raw: rtcIceServersRaw
    },
    endpoint: {
      baseUrl: endpoint.baseUrl,
      wsUrl: endpoint.wsUrl,
      httpProtocol: endpoint.httpProtocol,
      wsProtocol: endpoint.wsProtocol,
      host: endpoint.host
    },
    cors: {
      exactOrigins: CORS_EXACT_ORIGINS,
      regex: CLIENT_ORIGIN_REGEX,
      wildcard: CLIENT_ORIGIN === "*"
    }
  })
})

app.post("/admin/rtc-config", authMiddleware, requireAdmin, (req, res) => {
  const raw = typeof req.body?.iceServersJson === "string"
    ? req.body.iceServersJson
    : JSON.stringify(req.body?.iceServers ?? null)
  const normalizedRaw = String(raw || "").trim()
  if (!normalizedRaw) {
    saveSetting(RTC_ICE_SETTING_KEY, "")
    rtcIceServersCurrent = parseRtcIceServers(RTC_ICE_SERVERS_ENV_JSON, DEFAULT_RTC_ICE_SERVERS)
    rtcIceServersSource = RTC_ICE_SERVERS_ENV_JSON ? "env" : "default"
    rtcIceServersRaw = RTC_ICE_SERVERS_ENV_JSON || ""
    logAdminAction(req.user.userId, "rtc_config_reset", "rtc", "", { source: rtcIceServersSource })
    return res.json({ ok: true, rtc: { iceServers: rtcIceServersCurrent, source: rtcIceServersSource } })
  }
  const parsed = parseRtcIceServers(normalizedRaw, [])
  if (!parsed.length) {
    return res.status(400).json({ error: "RTC ICE 配置无效：需要是包含 urls 的数组 JSON" })
  }
  saveSetting(RTC_ICE_SETTING_KEY, JSON.stringify(parsed))
  rtcIceServersCurrent = parsed
  rtcIceServersSource = "db"
  rtcIceServersRaw = JSON.stringify(parsed)
  logAdminAction(req.user.userId, "rtc_config_update", "rtc", "", { iceServers: parsed })
  return res.json({ ok: true, rtc: { iceServers: rtcIceServersCurrent, source: rtcIceServersSource } })
})

app.post("/admin/users/:userId/ban", authMiddleware, requireAdmin, (req, res) => {
  const userId = String(req.params.userId || "")
  const banned = Boolean(req.body?.banned)
  const reason = normalizeInput(req.body?.reason) || null
  const bannedUntil = Number(req.body?.bannedUntil || 0)
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(userId)
  if (!target) return res.status(404).json({ error: "用户不存在" })
  db.prepare("UPDATE users SET is_banned = ?, banned_reason = ?, banned_until = ? WHERE id = ?")
    .run(banned ? 1 : 0, banned ? reason : null, banned && Number.isFinite(bannedUntil) && bannedUntil > 0 ? bannedUntil : null, userId)
  enforceUserAccessNow(userId, "账号已被管理员封禁")
  logAdminAction(req.user.userId, banned ? "user_ban" : "user_unban", "user", userId, {
    reason: reason || "",
    bannedUntil: bannedUntil || null
  })
  res.json({ ok: true })
})

app.post("/admin/users/:userId/usage-limit", authMiddleware, requireAdmin, (req, res) => {
  const userId = String(req.params.userId || "")
  const minutes = Number(req.body?.minutes)
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 50000) {
    return res.status(400).json({ error: "时长限制参数无效" })
  }
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(userId)
  if (!target) return res.status(404).json({ error: "用户不存在" })
  db.prepare("UPDATE users SET usage_limit_minutes = ? WHERE id = ?").run(Math.floor(minutes), userId)
  enforceUserAccessNow(userId, "已达到使用时长上限")
  logAdminAction(req.user.userId, "user_usage_limit", "user", userId, { minutes: Math.floor(minutes) })
  res.json({ ok: true })
})

app.post("/admin/users/:userId/reset-usage", authMiddleware, requireAdmin, (req, res) => {
  const userId = String(req.params.userId || "")
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(userId)
  if (!target) return res.status(404).json({ error: "用户不存在" })
  db.prepare("UPDATE users SET usage_seconds = 0 WHERE id = ?").run(userId)
  logAdminAction(req.user.userId, "user_usage_reset", "user", userId, {})
  res.json({ ok: true })
})

app.post("/admin/users/:userId/kick", authMiddleware, requireAdmin, (req, res) => {
  const userId = String(req.params.userId || "")
  enforceUserAccessNow(userId, "已被管理员下线")
  logAdminAction(req.user.userId, "user_kick", "user", userId, {})
  res.json({ ok: true })
})

app.delete("/admin/users/:userId", authMiddleware, requireAdmin, (req, res) => {
  const userId = String(req.params.userId || "")
  const user = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(userId)
  if (!user) return res.status(404).json({ error: "用户不存在" })
  if (user.role === "admin") return res.status(403).json({ error: "无法删除管理员账号" })
  
  enforceUserAccessNow(userId, "账号已被管理员删除")
  
  db.prepare("DELETE FROM messages WHERE user_id = ?").run(userId)
  db.prepare("DELETE FROM room_user_permissions WHERE user_id = ?").run(userId)
  db.prepare("DELETE FROM users WHERE id = ?").run(userId)
  
  logAdminAction(req.user.userId, "user_delete", "user", userId, { username: user.username })
  res.json({ ok: true })
})

app.get("/admin/rooms", authMiddleware, requireAdmin, (_, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.name, r.created_at, r.created_by, r.is_locked, r.is_readonly, r.speaking_mode, r.host_user_id, u.username AS creator_name, hu.username AS host_name
    FROM rooms r
    LEFT JOIN users u ON u.id = r.created_by
    LEFT JOIN users hu ON hu.id = r.host_user_id
    ORDER BY r.created_at DESC
  `).all()
  const stmt = db.prepare("SELECT COUNT(*) AS total, MAX(created_at) AS last_message_at FROM messages WHERE room_id = ?")
  res.json({
    rooms: rows.map((row) => {
      const messageStats = stmt.get(row.id)
      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        createdBy: row.created_by,
        createdByName: row.creator_name || "未知",
        isLocked: Boolean(row.is_locked),
        isReadonly: Boolean(row.is_readonly),
        speakingMode: row.speaking_mode || "all",
        hostUserId: row.host_user_id || null,
        hostUserName: row.host_name || "未设置",
        onlineCount: roomSockets.get(row.id)?.size || 0,
        messageCount: messageStats?.total || 0,
        lastMessageAt: messageStats?.last_message_at || null
      }
    })
  })
})

app.post("/admin/rooms/:roomId/settings", authMiddleware, requireAdmin, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const room = db.prepare("SELECT id, is_locked, is_readonly, speaking_mode, host_user_id FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  const isLocked = req.body?.isLocked
  const isReadonly = req.body?.isReadonly
  const speakingMode = normalizeInput(req.body?.speakingMode)
  const hostUserId = normalizeInput(req.body?.hostUserId)
  const nextLocked = typeof isLocked === "boolean" ? (isLocked ? 1 : 0) : room.is_locked
  const nextReadonly = typeof isReadonly === "boolean" ? (isReadonly ? 1 : 0) : room.is_readonly
  const nextSpeakingMode = speakingMode === "host_only" || speakingMode === "all" ? speakingMode : (room.speaking_mode || "all")
  let nextHostUserId = hostUserId || room.host_user_id
  if (hostUserId) {
    const targetUser = db.prepare("SELECT id FROM users WHERE id = ?").get(hostUserId)
    if (!targetUser) return res.status(404).json({ error: "主持人用户不存在" })
    nextHostUserId = targetUser.id
  }
  db.prepare("UPDATE rooms SET is_locked = ?, is_readonly = ?, speaking_mode = ?, host_user_id = ? WHERE id = ?")
    .run(nextLocked, nextReadonly, nextSpeakingMode, nextHostUserId || null, roomId)
  logAdminAction(req.user.userId, "room_settings_update", "room", roomId, {
    isLocked: Boolean(nextLocked),
    isReadonly: Boolean(nextReadonly),
    speakingMode: nextSpeakingMode,
    hostUserId: nextHostUserId || null
  })
  if (nextLocked) {
    disconnectRoomMembers(roomId, "房间已被管理员锁定")
  }
  broadcastPresence()
  broadcastRoomList()
  res.json({ ok: true })
})

app.get("/admin/rooms/:roomId/members", authMiddleware, requireAdmin, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const room = db.prepare("SELECT id, host_user_id, speaking_mode FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  const permissionRows = db.prepare("SELECT user_id, can_send FROM room_user_permissions WHERE room_id = ?").all(roomId)
  const permissionMap = new Map(permissionRows.map((row) => [row.user_id, Boolean(row.can_send)]))
  const members = [...onlineConnections.values()]
    .filter((ctx) => ctx.roomId === roomId && ctx.user)
    .map((ctx) => {
      const access = getRoomSpeakAccess(roomId, ctx.user.userId, ctx.user.role || "user")
      return {
        userId: ctx.user.userId,
        username: ctx.user.username,
        role: ctx.user.role || "user",
        isHost: room.host_user_id === ctx.user.userId,
        speakingMode: room.speaking_mode || "all",
        canSend: access.allowed,
        manualCanSend: permissionMap.has(ctx.user.userId) ? permissionMap.get(ctx.user.userId) : true
      }
    })
  res.json({ members })
})

app.post("/admin/rooms/:roomId/members/:userId/permissions", authMiddleware, requireAdmin, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const userId = String(req.params.userId || "")
  const canSend = req.body?.canSend
  if (typeof canSend !== "boolean") {
    return res.status(400).json({ error: "canSend参数无效" })
  }
  const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId)
  if (!user) return res.status(404).json({ error: "用户不存在" })
  db.prepare(`
    INSERT INTO room_user_permissions (room_id, user_id, can_send, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(room_id, user_id)
    DO UPDATE SET can_send = excluded.can_send, updated_at = excluded.updated_at
  `).run(roomId, userId, canSend ? 1 : 0, Date.now())
  logAdminAction(req.user.userId, canSend ? "room_member_unmute" : "room_member_mute", "room", roomId, { userId, canSend })
  notifyUser(userId, canSend ? "你已被管理员解除禁言" : "你已被管理员禁言")
  broadcastPresence()
  res.json({ ok: true })
})

app.get("/admin/rooms/:roomId/messages", authMiddleware, requireAdmin, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500)
  const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  const rows = db.prepare(`
    SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(roomId, limit)
  res.json({
    messages: rows.reverse().map((row) => ({
      id: row.id,
      text: row.content,
      createdAt: row.created_at,
      sender: { id: row.user_id, username: row.username }
    }))
  })
})

app.delete("/admin/rooms/:roomId/messages", authMiddleware, requireAdmin, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const room = db.prepare("SELECT id FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  db.prepare("DELETE FROM messages WHERE room_id = ?").run(roomId)
  logAdminAction(req.user.userId, "room_messages_clear", "room", roomId, {})
  res.json({ ok: true })
})

app.delete("/admin/rooms/:roomId", authMiddleware, requireAdmin, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const room = db.prepare("SELECT id, name, created_by FROM rooms WHERE id = ?").get(roomId)
  if (!room) return res.status(404).json({ error: "房间不存在" })
  const onlineCount = Number(roomSockets.get(roomId)?.size || 0)
  const deletionDecision = resolveRoomDeletionDecision(room.name, onlineCount, req.body)
  if (!deletionDecision.ok) {
    return res.status(deletionDecision.status).json({
      error: deletionDecision.error,
      roomName: room.name,
      onlineCount
    })
  }
  disconnectRoomMembers(roomId, deletionDecision.reason)
  const messageCount = Number(db.prepare("SELECT COUNT(1) AS total FROM messages WHERE room_id = ?").get(roomId)?.total || 0)
  db.prepare("DELETE FROM messages WHERE room_id = ?").run(roomId)
  db.prepare("DELETE FROM room_user_permissions WHERE room_id = ?").run(roomId)
  db.prepare("DELETE FROM rooms WHERE id = ?").run(roomId)
  roomSockets.delete(roomId)
  logAdminAction(req.user.userId, "room_delete", "room", roomId, {
    roomName: room.name,
    onlineCount,
    messageCount,
    force: deletionDecision.force,
    reason: deletionDecision.auditReason,
    deletedByRole: req.user.role || "admin"
  })
  broadcastRoomList()
  res.json({ ok: true })
})

app.get("/admin/audit-logs", authMiddleware, requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 1000)
  const adminUserId = normalizeInput(req.query.adminUserId)
  const action = normalizeInput(req.query.action)
  const targetType = normalizeInput(req.query.targetType)
  const from = Number(req.query.from || 0)
  const to = Number(req.query.to || 0)
  const where = []
  const params = []
  if (adminUserId) {
    where.push("l.admin_user_id = ?")
    params.push(adminUserId)
  }
  if (action) {
    where.push("l.action = ?")
    params.push(action)
  }
  if (targetType) {
    where.push("l.target_type = ?")
    params.push(targetType)
  }
  if (Number.isFinite(from) && from > 0) {
    where.push("l.created_at >= ?")
    params.push(from)
  }
  if (Number.isFinite(to) && to > 0) {
    where.push("l.created_at <= ?")
    params.push(to)
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const rows = db.prepare(`
    SELECT l.id, l.admin_user_id, l.action, l.target_type, l.target_id, l.details, l.created_at, u.username AS admin_username
    FROM admin_audit_logs l
    LEFT JOIN users u ON u.id = l.admin_user_id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ?
  `).all(...params, limit)
  res.json({
    logs: rows.map((row) => ({
      id: row.id,
      adminUserId: row.admin_user_id,
      adminUsername: row.admin_username || "未知管理员",
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: parseJsonSafe(row.details, {}),
      createdAt: row.created_at
    }))
  })
})

app.get("/rooms/:roomId/messages", authMiddleware, (req, res) => {
  const roomId = String(req.params.roomId || "")
  const rows = db.prepare(`
    SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT 200
  `).all(roomId)
  res.json({
    messages: rows.reverse().map((row) => ({
      id: row.id,
      text: row.content,
      createdAt: row.created_at,
      sender: { id: row.user_id, username: row.username }
    }))
  })
})

if (WEB_ASSETS_DIR) {
  app.use(express.static(WEB_ASSETS_DIR))
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/auth") || req.path.startsWith("/admin") || req.path.startsWith("/rooms") || req.path.startsWith("/users") || req.path.startsWith("/api")) {
      next()
      return
    }
    res.sendFile(path.join(WEB_ASSETS_DIR, "index.html"))
  })
}

wss.on("connection", (socket, request) => {
  const origin = getRequestOrigin(request)
  if (!isCorsOriginAllowed(origin)) {
    send(socket, WS_EVENTS.ERROR, { message: "连接来源未授权" })
    socket.close()
    return
  }
  const context = {
    socket,
    user: null,
    roomId: null,
    status: USER_STATUS.ONLINE,
    lastPingAt: Date.now(),
    sessionStartedAt: null
  }

  socket.on("message", (raw) => {
    let message = null
    try {
      message = JSON.parse(String(raw))
    } catch {
      send(socket, WS_EVENTS.ERROR, { message: "消息格式错误" })
      return
    }
    routeSocketMessage(context, message)
  })

  socket.on("close", () => {
    flushUserUsage(context)
    handleLeaveRoom(context)
    if (context.user) {
      const current = onlineConnections.get(context.user.userId)
      if (current === context) {
        onlineConnections.delete(context.user.userId)
        broadcastPresence()
      }
    }
  })

  socket.on("error", () => {})
})

setInterval(() => {
  const now = Date.now()
  for (const [, ctx] of onlineConnections) {
    flushUserUsage(ctx)
    const access = getUserAccess(ctx.user.userId)
    if (!access.allowed) {
      send(ctx.socket, WS_EVENTS.ERROR, { message: access.reason })
      ctx.socket.close()
      continue
    }
    if (now - ctx.lastPingAt > 60000) {
      ctx.socket.close()
      continue
    }
    send(ctx.socket, WS_EVENTS.HEARTBEAT, { serverTime: now })
  }
  if (now - lastGuestCleanupAt > 60_000) {
    lastGuestCleanupAt = now
    cleanupExpiredGuestUsers(now)
  }
}, 15000)

server.listen(PORT, () => {
  const endpoint = resolvePublicEndpoint()
  console.log(`Server listening on ${endpoint.baseUrl}`)
})

function routeSocketMessage(context, message) {
  if (!message || typeof message.type !== "string") {
    send(context.socket, WS_EVENTS.ERROR, { message: "缺少消息类型" })
    return
  }
  switch (message.type) {
    case WS_EVENTS.AUTH:
      handleWsAuth(context, message)
      return
    case WS_EVENTS.HEARTBEAT:
      context.lastPingAt = Date.now()
      return
    case WS_EVENTS.ROOM_JOIN:
      handleJoinRoom(context, message)
      return
    case WS_EVENTS.ROOM_LEAVE:
      handleLeaveRoom(context)
      return
    case WS_EVENTS.PRESENCE_UPDATE:
      handlePresence(context, message)
      return
    case WS_EVENTS.CHAT_TEXT:
      handleChatText(context, message)
      return
    case WS_EVENTS.PRIVATE_SESSION_INVITE:
      handlePrivateSessionInvite(context, message)
      return
    case WS_EVENTS.CHAT_FILE_META:
      handleFileMeta(context, message)
      return
    case WS_EVENTS.CHAT_FILE_DATA:
      handleFileData(context, message)
      return
    case WS_EVENTS.WEBRTC_OFFER:
    case WS_EVENTS.WEBRTC_ANSWER:
    case WS_EVENTS.WEBRTC_ICE:
      relayRtcSignal(context, message)
      return
    case WS_EVENTS.LIVE_STATE:
      handleLiveState(context, message)
      return
    default:
      send(context.socket, WS_EVENTS.ERROR, { message: "未知消息类型" })
  }
}

function handleWsAuth(context, message) {
  const token = String(message.payload?.token || "")
  try {
    const user = jwt.verify(token, JWT_SECRET)
    const dbUser = db.prepare(`
      SELECT id, username, role, is_banned, banned_reason, banned_until, usage_seconds, usage_limit_minutes
      FROM users WHERE id = ?
    `).get(user.userId)
    if (!dbUser) {
      send(context.socket, WS_EVENTS.AUTH_ERROR, { message: "用户不存在" })
      return
    }
    const access = getUserAccess(dbUser.id)
    if (!access.allowed) {
      send(context.socket, WS_EVENTS.AUTH_ERROR, { message: access.reason })
      return
    }
    const oldContext = onlineConnections.get(dbUser.id)
    if (oldContext && oldContext !== context) {
      send(oldContext.socket, WS_EVENTS.ERROR, { message: "账号在其他设备登录" })
      oldContext.socket.close()
    }
    context.user = user
    context.user.role = dbUser.role || "user"
    context.status = USER_STATUS.ONLINE
    context.sessionStartedAt = Date.now()
    onlineConnections.set(user.userId, context)
    db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(Date.now(), user.userId)
    send(context.socket, WS_EVENTS.AUTH_OK, { user: { id: user.userId, username: user.username } })
    send(context.socket, WS_EVENTS.ROOM_LIST, { rooms: getRoomList() })
    send(context.socket, WS_EVENTS.PRESENCE_UPDATE, { users: getOnlineUsersPayload() })
    broadcastPresence()
  } catch {
    send(context.socket, WS_EVENTS.AUTH_ERROR, { message: "鉴权失败" })
  }
}

function handleJoinRoom(context, message) {
  if (!context.user) {
    send(context.socket, WS_EVENTS.AUTH_ERROR, { message: "请先鉴权" })
    return
  }
  const roomId = String(message.payload?.roomId || "")
  const room = db.prepare("SELECT id, name, is_locked FROM rooms WHERE id = ?").get(roomId)
  if (!room) {
    send(context.socket, WS_EVENTS.ERROR, { message: "房间不存在" })
    return
  }
  if (room.is_locked) {
    send(context.socket, WS_EVENTS.ERROR, { message: "房间已被管理员锁定" })
    return
  }
  handleLeaveRoom(context)
  if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set())
  const members = roomSockets.get(roomId)
  if (members.size >= ROOM_LIMITS.MAX_USERS) {
    send(context.socket, WS_EVENTS.ERROR, { message: "房间人数已满" })
    return
  }
  members.add(context.socket)
  context.roomId = roomId
  send(context.socket, WS_EVENTS.ROOM_JOINED, {
    roomId,
    roomName: room.name,
    roomUsers: getRoomUsersPayload(roomId)
  }, roomId)
  const currentLiveOwner = roomLiveOwners.get(roomId)
  if (currentLiveOwner) {
    send(context.socket, WS_EVENTS.LIVE_STATE, {
      roomId,
      active: true,
      mode: currentLiveOwner.mode || "screen",
      sourceName: currentLiveOwner.sourceName || "桌面",
      senderUserId: currentLiveOwner.userId,
      sender: { id: currentLiveOwner.userId, username: currentLiveOwner.username || "用户" }
    }, roomId)
  }
  broadcastToRoom(roomId, WS_EVENTS.ROOM_USER_JOINED, {
    roomId,
    user: { id: context.user.userId, username: context.user.username }
  })
  broadcastPresence()
  broadcastRoomList()
}

function handleLeaveRoom(context) {
  if (!context.roomId) return
  const roomId = context.roomId
  const leavingUserId = String(context.user?.userId || "")
  const liveOwner = roomLiveOwners.get(roomId)
  if (liveOwner && leavingUserId && liveOwner.userId === leavingUserId) {
    roomLiveOwners.delete(roomId)
    broadcastToRoom(roomId, WS_EVENTS.LIVE_STATE, {
      roomId,
      active: false,
      senderUserId: leavingUserId,
      sender: { id: leavingUserId, username: context.user?.username || "用户" }
    })
  }
  const members = roomSockets.get(roomId)
  if (members) {
    members.delete(context.socket)
    if (members.size === 0) roomSockets.delete(roomId)
  }
  if (context.user) {
    broadcastToRoom(roomId, WS_EVENTS.ROOM_USER_LEFT, {
      roomId,
      user: { id: context.user.userId, username: context.user.username }
    })
  }
  context.roomId = null
  broadcastPresence()
  broadcastRoomList()
}

function handlePresence(context, message) {
  if (!context.user) {
    send(context.socket, WS_EVENTS.AUTH_ERROR, { message: "请先鉴权" })
    return
  }
  const status = String(message.payload?.status || USER_STATUS.ONLINE)
  if (![USER_STATUS.ONLINE, USER_STATUS.BUSY, USER_STATUS.OFFLINE].includes(status)) return
  context.status = status
  broadcastPresence()
}

function handleChatText(context, message) {
  if (!context.user) {
    send(context.socket, WS_EVENTS.AUTH_ERROR, { message: "请先鉴权" })
    return
  }
  const scope = String(message.payload?.scope || "room")
  const text = sanitizeText(String(message.payload?.text || "")).slice(0, ROOM_LIMITS.MAX_MESSAGE_LENGTH)
  if (!text) return
  if (scope === "private") {
    const targetUserId = String(message.payload?.targetUserId || "")
    if (!targetUserId || targetUserId === context.user.userId) {
      send(context.socket, WS_EVENTS.ERROR, { message: "私聊目标无效" })
      return
    }
    const targetContext = onlineConnections.get(targetUserId)
    if (!targetContext) {
      send(context.socket, WS_EVENTS.ERROR, { message: "私聊目标不在线" })
      return
    }
    if (!context.roomId || !targetContext.roomId || targetContext.roomId !== context.roomId) {
      send(context.socket, WS_EVENTS.ERROR, { message: "私聊目标不在同一房间" })
      return
    }
    const senderPayload = {
      scope: "private",
      text,
      sender: { id: context.user.userId, username: context.user.username },
      target: { id: targetContext.user.userId, username: targetContext.user.username }
    }
    const targetPayload = {
      scope: "private",
      text,
      sender: { id: context.user.userId, username: context.user.username },
      target: { id: targetContext.user.userId, username: targetContext.user.username }
    }
    send(context.socket, WS_EVENTS.CHAT_TEXT, senderPayload)
    if (targetContext !== context) {
      send(targetContext.socket, WS_EVENTS.CHAT_TEXT, targetPayload)
    }
    return
  }
  if (!context.roomId) {
    send(context.socket, WS_EVENTS.ERROR, { message: "请先进入房间" })
    return
  }
  const access = getRoomSpeakAccess(context.roomId, context.user.userId, context.user.role || "user")
  if (!access.allowed) {
    send(context.socket, WS_EVENTS.ERROR, { message: access.reason })
    return
  }
  db.prepare("INSERT INTO messages (id, room_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(cryptoRandomId(), context.roomId, context.user.userId, text, Date.now())
  broadcastToRoom(context.roomId, WS_EVENTS.CHAT_TEXT, {
    roomId: context.roomId,
    text,
    sender: { id: context.user.userId, username: context.user.username }
  })
}

function handlePrivateSessionInvite(context, message) {
  if (!context.user || !context.roomId) {
    send(context.socket, WS_EVENTS.AUTH_ERROR, { message: "请先进入房间后再发起私密会话" })
    return
  }
  const targetUserId = String(message.payload?.targetUserId || "")
  if (!targetUserId || targetUserId === context.user.userId) {
    send(context.socket, WS_EVENTS.ERROR, { message: "私密会话目标无效" })
    return
  }
  const targetContext = onlineConnections.get(targetUserId)
  if (!targetContext || targetContext.roomId !== context.roomId) {
    send(context.socket, WS_EVENTS.ERROR, { message: "目标用户不在线或不在同房间" })
    return
  }
  const payload = {
    roomId: context.roomId,
    sender: { id: context.user.userId, username: context.user.username },
    target: { id: targetContext.user.userId, username: targetContext.user.username },
    text: sanitizeText(String(message.payload?.text || "")).slice(0, 120)
  }
  send(targetContext.socket, WS_EVENTS.PRIVATE_SESSION_INVITE, payload, context.roomId)
  send(context.socket, WS_EVENTS.PRIVATE_SESSION_INVITE, { ...payload, delivered: true }, context.roomId)
}

function handleFileMeta(context, message) {
  if (!context.user || !context.roomId) return
  const access = getRoomSpeakAccess(context.roomId, context.user.userId, context.user.role || "user")
  if (!access.allowed) {
    send(context.socket, WS_EVENTS.ERROR, { message: access.reason })
    return
  }
  const fileName = sanitizeText(String(message.payload?.fileName || ""))
  const size = Number(message.payload?.size || 0)
  if (!fileName || !Number.isFinite(size) || size <= 0) return
  broadcastToRoom(context.roomId, WS_EVENTS.CHAT_FILE_META, {
    roomId: context.roomId,
    fileName,
    size,
    sender: { id: context.user.userId, username: context.user.username }
  })
}

function handleFileData(context, message) {
  if (!context.user || !context.roomId) return
  const access = getRoomSpeakAccess(context.roomId, context.user.userId, context.user.role || "user")
  if (!access.allowed) {
    send(context.socket, WS_EVENTS.ERROR, { message: access.reason })
    return
  }
  const fileName = sanitizeText(String(message.payload?.fileName || "")).slice(0, 160)
  const mimeType = sanitizeText(String(message.payload?.mimeType || "application/octet-stream")).slice(0, 120)
  const size = Number(message.payload?.size || 0)
  const dataUrl = String(message.payload?.dataUrl || "")
  if (!fileName || !Number.isFinite(size) || size <= 0 || size > MAX_FILE_SHARE_BYTES) {
    send(context.socket, WS_EVENTS.ERROR, { message: "文件大小无效或超出限制" })
    return
  }
  const dataUrlHeaderEnd = dataUrl.indexOf(",")
  if (!dataUrl.startsWith("data:") || dataUrlHeaderEnd <= 0) {
    send(context.socket, WS_EVENTS.ERROR, { message: "文件数据格式错误" })
    return
  }
  const header = dataUrl.slice(0, dataUrlHeaderEnd)
  if (!header.endsWith(";base64")) {
    send(context.socket, WS_EVENTS.ERROR, { message: "文件编码格式错误" })
    return
  }
  const base64Body = dataUrl.slice(dataUrlHeaderEnd + 1).replaceAll(/\s+/g, "")
  if (!base64Body) {
    send(context.socket, WS_EVENTS.ERROR, { message: "文件内容为空" })
    return
  }
  const paddingSize = base64Body.endsWith("==") ? 2 : base64Body.endsWith("=") ? 1 : 0
  const decodedSize = Math.floor((base64Body.length * 3) / 4) - paddingSize
  if (!Number.isFinite(decodedSize) || decodedSize <= 0 || decodedSize > MAX_FILE_SHARE_BYTES) {
    send(context.socket, WS_EVENTS.ERROR, { message: "文件内容无效或超出限制" })
    return
  }
  if (Math.abs(decodedSize - size) > 4096) {
    send(context.socket, WS_EVENTS.ERROR, { message: "文件校验失败" })
    return
  }
  broadcastToRoom(context.roomId, WS_EVENTS.CHAT_FILE_DATA, {
    roomId: context.roomId,
    fileName,
    mimeType,
    size: decodedSize,
    dataUrl,
    sender: { id: context.user.userId, username: context.user.username }
  })
}

function relayRtcSignal(context, message) {
  if (!context.user || !context.roomId) return
  const targetUserId = String(message.payload?.targetUserId || "")
  const target = onlineConnections.get(targetUserId)
  if (!target || target.roomId !== context.roomId) {
    send(context.socket, WS_EVENTS.ERROR, { message: "目标用户不在线或不在同房间" })
    return
  }
  send(target.socket, message.type, {
    ...message.payload,
    senderUserId: context.user.userId
  })
}

function handleLiveState(context, message) {
  if (!context.user || !context.roomId) return
  const active = Boolean(message.payload?.active)
  const mode = String(message.payload?.mode || "screen").trim() || "screen"
  const sourceName = sanitizeText(String(message.payload?.sourceName || "")).slice(0, 80)
  const roomId = context.roomId
  const senderUserId = String(context.user.userId || "")
  const senderUsername = String(context.user.username || "用户")
  const owner = roomLiveOwners.get(roomId)
  if (active) {
    if (owner && owner.userId !== senderUserId) {
      send(context.socket, WS_EVENTS.ERROR, { message: `当前已有 ${owner.username || "用户"} 在直播` }, roomId)
      send(context.socket, WS_EVENTS.LIVE_STATE, {
        roomId,
        active: false,
        forceStop: true,
        senderUserId
      }, roomId)
      return
    }
    roomLiveOwners.set(roomId, {
      userId: senderUserId,
      username: senderUsername,
      mode,
      sourceName
    })
  } else if (owner && owner.userId === senderUserId) {
    roomLiveOwners.delete(roomId)
  }
  broadcastToRoom(context.roomId, WS_EVENTS.LIVE_STATE, {
    roomId,
    active,
    mode,
    sourceName,
    senderUserId,
    sender: { id: senderUserId, username: senderUsername }
  })
}

function broadcastToRoom(roomId, type, payload) {
  const members = roomSockets.get(roomId)
  if (!members) return
  const packet = createPacket(type, payload, roomId)
  const data = JSON.stringify(packet)
  for (const socket of members) {
    if (socket.readyState === socket.OPEN) socket.send(data)
  }
}

function broadcastPresence() {
  const users = getOnlineUsersPayload()
  const data = JSON.stringify(createPacket(WS_EVENTS.PRESENCE_UPDATE, { users }))
  for (const [, ctx] of onlineConnections) {
    if (ctx.socket.readyState === ctx.socket.OPEN) ctx.socket.send(data)
  }
}

function getOnlineUsersPayload() {
  return [...onlineConnections.values()].map((ctx) => ({
    id: ctx.user.userId,
    username: ctx.user.username,
    roomId: ctx.roomId,
    status: ctx.status,
    role: ctx.user.role || "user",
    canSend: ctx.roomId ? getRoomSpeakAccess(ctx.roomId, ctx.user.userId, ctx.user.role || "user").allowed : true
  }))
}

function getRoomUsersPayload(roomId) {
  const users = getOnlineUsersPayload()
  return users.filter((item) => item.roomId === roomId)
}

function getRoomList() {
  const rows = db.prepare("SELECT id, name, created_by, created_at, is_locked, is_readonly, speaking_mode, host_user_id FROM rooms ORDER BY created_at DESC").all()
  return rows.map((room) => ({
    ...room,
    onlineCount: roomSockets.get(room.id)?.size || 0,
    is_locked: Boolean(room.is_locked),
    is_readonly: Boolean(room.is_readonly),
    speaking_mode: room.speaking_mode || "all",
    host_user_id: room.host_user_id || null
  }))
}

function broadcastRoomList() {
  const data = JSON.stringify(createPacket(WS_EVENTS.ROOM_LIST, { rooms: getRoomList() }))
  for (const [, ctx] of onlineConnections) {
    if (ctx.socket.readyState === ctx.socket.OPEN) ctx.socket.send(data)
  }
}

function send(socket, type, payload, roomId = null) {
  if (socket.readyState !== socket.OPEN) return
  socket.send(JSON.stringify(createPacket(type, payload, roomId)))
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token) return res.status(401).json({ error: "未授权" })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    const dbUser = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.user.userId)
    if (!dbUser) return res.status(401).json({ error: "用户不存在" })
    const access = getUserAccess(req.user.userId)
    if (!access.allowed) return res.status(403).json({ error: access.reason })
    req.user.role = dbUser.role || "user"
    next()
  } catch {
    res.status(401).json({ error: "Token无效或已过期" })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "仅管理员可访问" })
  }
  return next()
}

function normalizeInput(value) {
  if (typeof value !== "string") return ""
  const normalized = value.trim()
  return normalized.length ? normalized : ""
}

function canDeleteRoom(room, user) {
  const role = String(user?.role || "")
  if (role === "admin") return true
  const ownerId = String(room?.created_by || "")
  const userId = String(user?.userId || "")
  return Boolean(ownerId && userId && ownerId === userId)
}

function resolveRoomDeletionDecision(roomName, onlineCount, payload) {
  const confirmation = normalizeInput(payload?.confirmationText)
  const reasonInput = normalizeInput(payload?.reason)
  const force = Boolean(payload?.force)
  if (!confirmation || confirmation !== roomName) {
    return {
      ok: false,
      status: 400,
      error: "删除确认失败：请输入完整房间名进行确认",
      force: false,
      reason: "",
      auditReason: ""
    }
  }
  if (onlineCount > 0 && !force) {
    return {
      ok: false,
      status: 409,
      error: "房间仍有在线成员，请确认后执行强制删除",
      force: false,
      reason: "",
      auditReason: ""
    }
  }
  const auditReason = reasonInput || "管理员手动删除房间"
  const reasonPrefix = onlineCount > 0 ? "房间已被管理员强制关闭" : "房间已被管理员关闭"
  const reason = `${reasonPrefix}：${auditReason}`
  return {
    ok: true,
    status: 200,
    error: "",
    force,
    reason,
    auditReason
  }
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_\u4e00-\u9fa5-]{2,24}$/.test(username)
}

function sanitizeText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

const authHits = new Map()
function authRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown"
  const now = Date.now()
  if (!authHits.has(ip)) authHits.set(ip, [])
  const slots = authHits.get(ip).filter((ts) => now - ts < 60_000)
  slots.push(now)
  authHits.set(ip, slots)
  if (slots.length > 30) {
    return res.status(429).json({ error: "认证请求过于频繁，请稍后再试" })
  }
  return next()
}

function createHttpServer(expressApp) {
  if (TLS_KEY_PATH && TLS_CERT_PATH && fs.existsSync(TLS_KEY_PATH) && fs.existsSync(TLS_CERT_PATH)) {
    const key = fs.readFileSync(TLS_KEY_PATH)
    const cert = fs.readFileSync(TLS_CERT_PATH)
    return https.createServer({ key, cert }, expressApp)
  }
  return http.createServer(expressApp)
}

function initDb(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      is_guest INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      is_banned INTEGER NOT NULL DEFAULT 0,
      banned_reason TEXT,
      banned_until INTEGER,
      usage_seconds INTEGER NOT NULL DEFAULT 0,
      usage_limit_minutes INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      is_locked INTEGER NOT NULL DEFAULT 0,
      is_readonly INTEGER NOT NULL DEFAULT 0,
      speaking_mode TEXT NOT NULL DEFAULT 'all',
      host_user_id TEXT
    );
    CREATE TABLE IF NOT EXISTS room_user_permissions (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      can_send INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (room_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  ensureColumn(database, "users", "role", "TEXT NOT NULL DEFAULT 'user'")
  ensureColumn(database, "users", "is_banned", "INTEGER NOT NULL DEFAULT 0")
  ensureColumn(database, "users", "banned_reason", "TEXT")
  ensureColumn(database, "users", "banned_until", "INTEGER")
  ensureColumn(database, "users", "usage_seconds", "INTEGER NOT NULL DEFAULT 0")
  ensureColumn(database, "users", "usage_limit_minutes", "INTEGER")
  ensureColumn(database, "users", "last_seen_at", "INTEGER")
  ensureColumn(database, "rooms", "is_locked", "INTEGER NOT NULL DEFAULT 0")
  ensureColumn(database, "rooms", "is_readonly", "INTEGER NOT NULL DEFAULT 0")
  ensureColumn(database, "rooms", "speaking_mode", "TEXT NOT NULL DEFAULT 'all'")
  ensureColumn(database, "rooms", "host_user_id", "TEXT")
}

function getSetting(key) {
  const normalized = String(key || "").trim()
  if (!normalized) return ""
  return String(db.prepare("SELECT value FROM settings WHERE key = ?").get(normalized)?.value || "")
}

function saveSetting(key, value) {
  const normalized = String(key || "").trim()
  if (!normalized) return false
  const rawValue = String(value ?? "")
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(normalized, rawValue, Date.now())
  return true
}

function loadRtcIceServersFromDb() {
  const stored = getSetting(RTC_ICE_SETTING_KEY).trim()
  if (!stored) return
  const parsed = parseRtcIceServers(stored, [])
  if (!parsed.length) return
  rtcIceServersCurrent = parsed
  rtcIceServersSource = "db"
  rtcIceServersRaw = stored
}

function ensureColumn(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all()
  const exists = columns.some((column) => column.name === columnName)
  if (!exists) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  }
}

function ensureAdminUser() {
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (admin) return
  const id = cryptoRandomId()
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10)
  db.prepare(`
    INSERT INTO users (id, username, password_hash, is_guest, role, is_banned, usage_seconds, usage_limit_minutes, created_at, last_seen_at)
    VALUES (?, ?, ?, 0, 'admin', 0, 0, NULL, ?, ?)
  `).run(id, ADMIN_USERNAME, hash, Date.now(), Date.now())
}

function getUserAccess(userId) {
  const user = db.prepare(`
    SELECT is_banned, banned_reason, banned_until, usage_seconds, usage_limit_minutes
    FROM users WHERE id = ?
  `).get(userId)
  if (!user) return { allowed: false, reason: "用户不存在" }
  const now = Date.now()
  if (user.is_banned) {
    const until = Number(user.banned_until || 0)
    if (!until || until > now) {
      return { allowed: false, reason: user.banned_reason || "账号已被封禁" }
    }
    db.prepare("UPDATE users SET is_banned = 0, banned_reason = NULL, banned_until = NULL WHERE id = ?").run(userId)
  }
  if (Number.isFinite(user.usage_limit_minutes) && user.usage_limit_minutes > 0) {
    const limitSeconds = Math.floor(user.usage_limit_minutes * 60)
    if ((user.usage_seconds || 0) >= limitSeconds) {
      return { allowed: false, reason: "已达到使用时长上限" }
    }
  }
  return { allowed: true, reason: "" }
}

function getRoomSpeakAccess(roomId, userId, userRole) {
  if (userRole === "admin") return { allowed: true, reason: "" }
  const room = db.prepare("SELECT id, is_readonly, speaking_mode, host_user_id FROM rooms WHERE id = ?").get(roomId)
  if (!room) return { allowed: false, reason: "房间不存在" }
  if (room.is_readonly) return { allowed: false, reason: "房间当前为只读模式" }
  if ((room.speaking_mode || "all") === "host_only" && room.host_user_id !== userId) {
    return { allowed: false, reason: "当前仅主持人可发言" }
  }
  const permission = db.prepare("SELECT can_send FROM room_user_permissions WHERE room_id = ? AND user_id = ?").get(roomId, userId)
  if (permission && !permission.can_send) {
    return { allowed: false, reason: "你已被管理员禁言" }
  }
  return { allowed: true, reason: "" }
}

function flushUserUsage(context) {
  if (!context.user || !context.sessionStartedAt) return
  const now = Date.now()
  const deltaSeconds = Math.floor((now - context.sessionStartedAt) / 1000)
  if (deltaSeconds <= 0) return
  db.prepare("UPDATE users SET usage_seconds = usage_seconds + ?, last_seen_at = ? WHERE id = ?")
    .run(deltaSeconds, now, context.user.userId)
  context.sessionStartedAt = now
}

function enforceUserAccessNow(userId, reason) {
  const ctx = onlineConnections.get(userId)
  if (!ctx) return
  send(ctx.socket, WS_EVENTS.ERROR, { message: reason })
  ctx.socket.close()
}

function notifyUser(userId, message) {
  const ctx = onlineConnections.get(userId)
  if (!ctx) return
  send(ctx.socket, WS_EVENTS.ERROR, { message })
}

function disconnectRoomMembers(roomId, reason) {
  for (const [, ctx] of onlineConnections) {
    if (ctx.roomId !== roomId) continue
    send(ctx.socket, WS_EVENTS.ERROR, { message: reason })
    ctx.socket.close()
  }
}

function purgeOfflineGuestUsersByUsername(username) {
  const normalized = normalizeInput(username)
  if (!normalized) return
  const rows = db.prepare("SELECT id FROM users WHERE username = ? AND is_guest = 1").all(normalized)
  for (let index = 0; index < rows.length; index += 1) {
    const guestId = String(rows[index]?.id || "")
    if (!guestId) continue
    if (onlineConnections.has(guestId)) continue
    const lastSeen = db.prepare("SELECT last_seen_at FROM users WHERE id = ?").get(guestId)?.last_seen_at || 0
    if (Number(lastSeen) && Date.now() - Number(lastSeen) < GUEST_OFFLINE_RETENTION_MS) continue
    db.prepare("DELETE FROM room_user_permissions WHERE user_id = ?").run(guestId)
    db.prepare("DELETE FROM users WHERE id = ? AND is_guest = 1").run(guestId)
  }
}

function cleanupExpiredGuestUsers(now) {
  const current = Number(now || Date.now())
  const threshold = current - GUEST_OFFLINE_RETENTION_MS
  if (!Number.isFinite(threshold) || threshold <= 0) return
  const rows = db.prepare("SELECT id FROM users WHERE is_guest = 1 AND COALESCE(last_seen_at, created_at) < ? LIMIT 200").all(threshold)
  for (let index = 0; index < rows.length; index += 1) {
    const guestId = String(rows[index]?.id || "")
    if (!guestId) continue
    if (onlineConnections.has(guestId)) continue
    db.prepare("DELETE FROM room_user_permissions WHERE user_id = ?").run(guestId)
    db.prepare("DELETE FROM users WHERE id = ? AND is_guest = 1").run(guestId)
  }
}

function logAdminAction(adminUserId, action, targetType, targetId, details) {
  db.prepare(`
    INSERT INTO admin_audit_logs (id, admin_user_id, action, target_type, target_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    cryptoRandomId(),
    adminUserId,
    action,
    targetType,
    targetId || null,
    JSON.stringify(details || {}),
    Date.now()
  )
}

function parseJsonSafe(value, fallback) {
  try {
    return JSON.parse(String(value || ""))
  } catch {
    return fallback
  }
}

function parseOriginList(value) {
  const raw = String(value || "")
  if (!raw.trim() || raw.trim() === "*") return []
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseRtcIceServers(rawValue, fallbackList) {
  const fallback = Array.isArray(fallbackList) ? fallbackList : []
  if (!String(rawValue || "").trim()) return fallback
  const parsed = parseJsonSafe(rawValue, null)
  if (!Array.isArray(parsed)) return fallback
  const normalized = []
  for (let index = 0; index < parsed.length; index += 1) {
    const item = parsed[index]
    if (!item || typeof item !== "object") continue
    const urlsRaw = item.urls
    const urlsList = Array.isArray(urlsRaw) ? urlsRaw : [urlsRaw]
    const urls = urlsList.map((entry) => String(entry || "").trim()).filter(Boolean)
    if (!urls.length) continue
    const nextItem = { urls: urls.length === 1 ? urls[0] : urls }
    const username = String(item.username || "").trim()
    const credential = String(item.credential || "").trim()
    if (username) nextItem.username = username
    if (credential) nextItem.credential = credential
    normalized.push(nextItem)
  }
  return normalized.length ? normalized : fallback
}

function buildOriginPattern(value) {
  const source = String(value || "").trim()
  if (!source) return null
  try {
    return new RegExp(source, "i")
  } catch {
    return null
  }
}

function isCorsOriginAllowed(origin) {
  if (CLIENT_ORIGIN === "*") return true
  if (!origin) return true
  if (CORS_EXACT_ORIGINS.includes(origin)) return true
  if (CORS_ORIGIN_PATTERN && CORS_ORIGIN_PATTERN.test(origin)) return true
  return false
}

function getRequestOrigin(request) {
  return String(request?.headers?.origin || "").trim()
}

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

function resolvePublicHost(req) {
  const forwardedHost = getForwardedHeaderValue(req.headers["x-forwarded-host"])
  const directHost = String(req.get("host") || "")
  const host = sanitizeHost(forwardedHost || directHost)
  return host || `localhost:${PORT}`
}

function resolveRequestHttpProtocol(req) {
  const forwardedProto = getForwardedHeaderValue(req.headers["x-forwarded-proto"])
  const protocol = String(forwardedProto || req.protocol || "http").trim().toLowerCase()
  return protocol === "https" ? "https" : "http"
}

function resolvePublicEndpoint(req) {
  const configured = parseConfiguredPublicBaseUrl(PUBLIC_BASE_URL)
  if (configured) {
    const configuredWs = parseConfiguredPublicWsUrl(PUBLIC_WS_URL)
    if (!configuredWs) return configured
    return {
      ...configured,
      wsUrl: configuredWs.wsUrl,
      wsProtocol: configuredWs.wsProtocol
    }
  }
  const httpProtocol = req ? resolveRequestHttpProtocol(req) : TLS_KEY_PATH && TLS_CERT_PATH ? "https" : "http"
  const wsProtocol = httpProtocol === "https" ? "wss" : "ws"
  const host = req ? resolvePublicHost(req) : `localhost:${PORT}`
  const configuredWs = parseConfiguredPublicWsUrl(PUBLIC_WS_URL)
  return {
    baseUrl: `${httpProtocol}://${host}`,
    wsUrl: configuredWs ? configuredWs.wsUrl : `${wsProtocol}://${host}`,
    httpProtocol,
    wsProtocol: configuredWs ? configuredWs.wsProtocol : wsProtocol,
    host
  }
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
