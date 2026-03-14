const state = {
  token: localStorage.getItem("admin_token") || "",
  user: null,
  users: [],
  rooms: [],
  logs: [],
  rtcConfig: null,
  stats: {
    usersTotal: 0,
    roomsTotal: 0,
    messagesTotal: 0,
    bannedUsers: 0,
    onlineUsers: 0,
    messages24h: 0,
    rtcIceCount: 0
  },
  logFilters: {
    action: "",
    adminUserId: "",
    targetType: "",
    from: 0,
    to: 0
  },
  roomMembers: [],
  activeRoomId: "",
  activeTab: "users"
}

const els = {
  adminInfo: byId("adminInfo"),
  loginPanel: byId("loginPanel"),
  dashboard: byId("dashboard"),
  username: byId("username"),
  password: byId("password"),
  loginBtn: byId("loginBtn"),
  refreshBtn: byId("refreshBtn"),
  logoutBtn: byId("logoutBtn"),
  tabUsersBtn: byId("tabUsersBtn"),
  tabRoomsBtn: byId("tabRoomsBtn"),
  tabLogsBtn: byId("tabLogsBtn"),
  usersTotal: byId("usersTotal"),
  onlineUsers: byId("onlineUsers"),
  roomsTotal: byId("roomsTotal"),
  messagesTotal: byId("messagesTotal"),
  messages24h: byId("messages24h"),
  bannedUsers: byId("bannedUsers"),
  rtcIceCount: byId("rtcIceCount"),
  refreshRtcBtn: byId("refreshRtcBtn"),
  saveRtcBtn: byId("saveRtcBtn"),
  rtcConfigText: byId("rtcConfigText"),
  rtcConfigInput: byId("rtcConfigInput"),
  rtcConfigSaveState: byId("rtcConfigSaveState"),
  logActionInput: byId("logActionInput"),
  logAdminInput: byId("logAdminInput"),
  logFromInput: byId("logFromInput"),
  logToInput: byId("logToInput"),
  logTargetTypeInput: byId("logTargetTypeInput"),
  logFilterBtn: byId("logFilterBtn"),
  logResetBtn: byId("logResetBtn"),
  usersView: byId("usersView"),
  userSearchInput: byId("userSearchInput"),
  userSearchBtn: byId("userSearchBtn"),
  roomsView: byId("roomsView"),
  logsView: byId("logsView"),
  userRows: byId("userRows"),
  roomRows: byId("roomRows"),
  logRows: byId("logRows"),
  roomMessagePreview: byId("roomMessagePreview"),
  roomMemberList: byId("roomMemberList")
}

init()

async function init() {
  bindEvents()
  if (state.token) {
    const ok = await loadAdminMe()
    if (ok) await refreshActiveTab()
  }
}

function bindEvents() {
  els.loginBtn.onclick = login
  els.refreshBtn.onclick = refreshActiveTab
  els.logoutBtn.onclick = () => {
    state.token = ""
    state.user = null
    localStorage.removeItem("admin_token")
    render()
  }
  els.tabUsersBtn.onclick = () => setActiveTab("users")
  els.tabRoomsBtn.onclick = () => setActiveTab("rooms")
  els.tabLogsBtn.onclick = () => setActiveTab("logs")
  if (els.userSearchBtn) {
    els.userSearchBtn.onclick = () => {
      renderUsers()
    }
  }
  if (els.userSearchInput) {
    els.userSearchInput.oninput = () => {
      renderUsers()
    }
  }
  if (els.refreshRtcBtn) {
    els.refreshRtcBtn.onclick = () => {
      loadRtcConfig()
    }
  }
  if (els.saveRtcBtn) {
    els.saveRtcBtn.onclick = () => {
      saveRtcConfig()
    }
  }
  els.logFilterBtn.onclick = () => {
    state.logFilters.action = els.logActionInput.value.trim()
    state.logFilters.adminUserId = els.logAdminInput.value.trim()
    state.logFilters.targetType = els.logTargetTypeInput.value.trim()
    state.logFilters.from = parseDateInput(els.logFromInput.value)
    state.logFilters.to = parseDateInput(els.logToInput.value, true)
    loadLogs()
  }
  els.logResetBtn.onclick = () => {
    state.logFilters.action = ""
    state.logFilters.adminUserId = ""
    state.logFilters.targetType = ""
    state.logFilters.from = 0
    state.logFilters.to = 0
    els.logActionInput.value = ""
    els.logAdminInput.value = ""
    els.logFromInput.value = ""
    els.logToInput.value = ""
    els.logTargetTypeInput.value = ""
    loadLogs()
  }
}

async function saveRtcConfig() {
  try {
    const raw = String(els.rtcConfigInput?.value || "").trim()
    if (els.rtcConfigSaveState) els.rtcConfigSaveState.textContent = "正在保存..."
    const result = await request("/admin/rtc-config", "POST", {
      iceServersJson: raw
    })
    state.rtcConfig = result?.rtc || null
    state.stats.rtcIceCount = Array.isArray(result?.rtc?.iceServers) ? result.rtc.iceServers.length : 0
    renderStats()
    renderRtcConfig()
    if (els.rtcConfigSaveState) {
      els.rtcConfigSaveState.textContent = "已保存。客户端需要刷新页面/重连后才会使用新配置。"
    }
  } catch (error) {
    if (els.rtcConfigSaveState) {
      els.rtcConfigSaveState.textContent = `保存失败：${String(error?.message || "未知错误")}`
    }
  }
}

async function login() {
  const username = els.username.value.trim()
  const password = els.password.value.trim()
  try {
    const result = await request("/auth/login", "POST", { username, password }, false)
    state.token = result.token
    localStorage.setItem("admin_token", state.token)
    const ok = await loadAdminMe()
    if (!ok) return
    await refreshActiveTab()
  } catch (error) {
    alert(error.message)
  }
}

async function loadAdminMe() {
  try {
    const result = await request("/admin/me", "GET")
    state.user = result.user
    render()
    return true
  } catch {
    state.token = ""
    localStorage.removeItem("admin_token")
    state.user = null
    render()
    return false
  }
}

async function loadUsers() {
  try {
    const result = await request("/admin/users", "GET")
    state.users = result.users || []
    renderUsers()
  } catch (error) {
    alert(error.message)
  }
}

async function loadRooms() {
  try {
    const result = await request("/admin/rooms", "GET")
    state.rooms = result.rooms || []
    renderRooms()
  } catch (error) {
    alert(error.message)
  }
}

async function loadLogs() {
  try {
    const search = new URLSearchParams({ limit: "200" })
    if (state.logFilters.action) search.set("action", state.logFilters.action)
    if (state.logFilters.adminUserId) search.set("adminUserId", state.logFilters.adminUserId)
    if (state.logFilters.targetType) search.set("targetType", state.logFilters.targetType)
    if (state.logFilters.from > 0) search.set("from", String(state.logFilters.from))
    if (state.logFilters.to > 0) search.set("to", String(state.logFilters.to))
    const result = await request(`/admin/audit-logs?${search.toString()}`, "GET")
    state.logs = result.logs || []
    renderLogs()
  } catch (error) {
    alert(error.message)
  }
}

async function loadStats() {
  try {
    const result = await request("/admin/stats", "GET")
    state.stats = { ...state.stats, ...(result.stats || {}) }
    renderStats()
  } catch (error) {
    alert(error.message)
  }
}

async function loadRtcConfig() {
  try {
    const result = await request("/admin/rtc-config", "GET")
    state.rtcConfig = result?.rtc || null
    state.stats.rtcIceCount = Array.isArray(result?.rtc?.iceServers) ? result.rtc.iceServers.length : 0
    renderStats()
    renderRtcConfig()
  } catch (error) {
    state.rtcConfig = null
    renderRtcConfig(error?.message || "加载 RTC 配置失败")
  }
}

function render() {
  const isLogin = Boolean(state.user)
  els.loginPanel.classList.toggle("hidden", isLogin)
  els.dashboard.classList.toggle("hidden", !isLogin)
  els.adminInfo.textContent = isLogin ? `已登录：${state.user.username}` : "未登录"
  els.usersView.classList.toggle("hidden", state.activeTab !== "users")
  els.roomsView.classList.toggle("hidden", state.activeTab !== "rooms")
  els.logsView.classList.toggle("hidden", state.activeTab !== "logs")
}

function renderStats() {
  els.usersTotal.textContent = String(state.stats.usersTotal || 0)
  els.onlineUsers.textContent = String(state.stats.onlineUsers || 0)
  els.roomsTotal.textContent = String(state.stats.roomsTotal || 0)
  els.messagesTotal.textContent = String(state.stats.messagesTotal || 0)
  els.messages24h.textContent = String(state.stats.messages24h || 0)
  els.bannedUsers.textContent = String(state.stats.bannedUsers || 0)
  if (els.rtcIceCount) {
    els.rtcIceCount.textContent = String(state.stats.rtcIceCount || 0)
  }
}

function renderRtcConfig(errorText = "") {
  if (!els.rtcConfigText) return
  if (errorText) {
    els.rtcConfigText.textContent = `RTC 配置加载失败：${errorText}`
    return
  }
  if (!state.rtcConfig) {
    els.rtcConfigText.textContent = "尚未加载"
    return
  }
  els.rtcConfigText.textContent = JSON.stringify(state.rtcConfig, null, 2)
  if (els.rtcConfigInput) {
    els.rtcConfigInput.value = JSON.stringify(state.rtcConfig.iceServers || [], null, 2)
  }
}

function renderUsers() {
  render()
  els.userRows.innerHTML = ""
  const search = (els.userSearchInput?.value || "").toLowerCase().trim()
  const filteredUsers = state.users.filter((user) => {
    if (!search) return true
    return user.username.toLowerCase().includes(search) || user.id.toLowerCase().includes(search)
  })
  filteredUsers.forEach((user) => {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${escapeHtml(user.username)}<br/><small style="color:#888">${user.id}</small></td>
      <td>${escapeHtml(user.role || "user")}</td>
      <td>${user.online ? '<span style="color:green">在线</span>' : '<span style="color:#888">离线</span>'}</td>
      <td>${user.is_banned ? '<span style="color:red">是</span>' : "否"}</td>
      <td>${Math.floor((user.usage_seconds || 0) / 60)}</td>
      <td>${user.usage_limit_minutes || "-"}</td>
      <td></td>
    `
    const actions = tr.lastElementChild
    if (user.role !== "admin") {
      actions.appendChild(actionButton(user.is_banned ? "解封" : "封禁", () => {
        if (user.is_banned) {
          banUser(user.id, false, "", 0)
        } else {
          const hours = prompt("封禁时长（小时，0为永久）", "24")
          if (hours === null) return
          const reason = prompt("封禁原因", "违规行为")
          if (reason === null) return
          const h = parseInt(hours) || 0
          const until = h > 0 ? Date.now() + h * 3600000 : 0
          banUser(user.id, true, reason, until)
        }
      }))
      actions.appendChild(actionButton("强制下线", () => kickUser(user.id)))
      actions.appendChild(actionButton("时长限制", () => {
        const mins = prompt("时长限制（分钟，0为不限）", user.usage_limit_minutes || "120")
        if (mins === null) return
        setUsageLimit(user.id, parseInt(mins) || 0)
      }))
      actions.appendChild(actionButton("重置时长", () => resetUsage(user.id)))
      actions.appendChild(actionButton("删除", () => {
        if (confirm(`确定要删除用户 "${user.username}" 吗？此操作不可撤销，且会清空该用户的聊天记录。`)) {
          deleteUser(user.id)
        }
      }, "danger"))
    } else {
      actions.innerHTML = '<span style="color:#888">管理员账号</span>'
    }
    els.userRows.appendChild(tr)
  })
}

async function deleteUser(userId) {
  try {
    await request(`/admin/users/${userId}`, "DELETE")
    await refreshActiveTab()
  } catch (error) {
    alert(error.message)
  }
}

function renderRooms() {
  render()
  els.roomRows.innerHTML = ""
  state.roomMessagePreview.innerHTML = ""
  state.roomMembers = []
  state.activeRoomId = ""
  renderRoomMembers()
  state.rooms.forEach((room) => {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${escapeHtml(room.name)}</td>
      <td>${escapeHtml(room.createdByName || "-")}</td>
      <td>${room.isLocked ? "已锁定" : room.isReadonly ? "只读" : "正常"}</td>
      <td>${room.speakingMode === "host_only" ? "主持人发言" : "全员发言"}</td>
      <td>${escapeHtml(room.hostUserName || "-")}</td>
      <td>${room.onlineCount || 0}</td>
      <td>${room.messageCount || 0}</td>
      <td>${room.lastMessageAt ? formatDateTime(room.lastMessageAt) : "-"}</td>
      <td></td>
    `
    const actions = tr.lastElementChild
    actions.appendChild(actionButton(room.isLocked ? "解除锁定" : "锁定房间", () => updateRoomSettings(room.id, { isLocked: !room.isLocked })))
    actions.appendChild(actionButton(room.isReadonly ? "取消只读" : "设为只读", () => updateRoomSettings(room.id, { isReadonly: !room.isReadonly })))
    actions.appendChild(actionButton(room.speakingMode === "host_only" ? "全员发言" : "主持人发言", () => updateRoomSettings(room.id, { speakingMode: room.speakingMode === "host_only" ? "all" : "host_only" })))
    actions.appendChild(actionButton("查看消息", () => previewRoomMessages(room.id)))
    actions.appendChild(actionButton("成员权限", () => loadRoomMembers(room.id)))
    actions.appendChild(actionButton("清空消息", () => clearRoomMessages(room.id)))
    actions.appendChild(actionButton("删除房间", () => deleteRoom(room)))
    els.roomRows.appendChild(tr)
  })
}

function renderRoomMembers() {
  els.roomMemberList.innerHTML = ""
  if (!state.activeRoomId) return
  if (state.roomMembers.length === 0) {
    const li = document.createElement("li")
    li.textContent = "当前房间暂无在线成员"
    els.roomMemberList.appendChild(li)
    return
  }
  state.roomMembers.forEach((member) => {
    const li = document.createElement("li")
    const info = document.createElement("span")
    info.textContent = `${member.username} (${member.userId}) | ${member.isHost ? "主持人" : "成员"} | ${member.canSend ? "可发言" : "不可发言"}`
    li.appendChild(info)
    li.appendChild(actionButton(member.manualCanSend ? "禁言" : "解除禁言", () => setMemberCanSend(state.activeRoomId, member.userId, !member.manualCanSend)))
    if (!member.isHost) {
      li.appendChild(actionButton("设为主持", () => updateRoomSettings(state.activeRoomId, { hostUserId: member.userId })))
    }
    els.roomMemberList.appendChild(li)
  })
}

function renderLogs() {
  render()
  els.logRows.innerHTML = ""
  state.logs.forEach((log) => {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${formatDateTime(log.createdAt)}</td>
      <td>${escapeHtml(log.adminUsername || "-")}</td>
      <td>${escapeHtml(log.action)}</td>
      <td>${escapeHtml(`${log.targetType || "-"}:${log.targetId || "-"}`)}</td>
      <td>${escapeHtml(JSON.stringify(log.details || {}))}</td>
    `
    els.logRows.appendChild(tr)
  })
}

function actionButton(label, action, className = "") {
  const btn = document.createElement("button")
  btn.textContent = label
  if (className) btn.className = className
  btn.onclick = action
  return btn
}

function setActiveTab(tab) {
  state.activeTab = tab
  refreshActiveTab()
}

async function refreshActiveTab() {
  await loadStats()
  await loadRtcConfig()
  if (state.activeTab === "rooms") {
    await loadRooms()
    return
  }
  if (state.activeTab === "logs") {
    await loadLogs()
    return
  }
  await loadUsers()
}

async function banUser(userId, banned, reason, bannedUntil) {
  await request(`/admin/users/${userId}/ban`, "POST", { banned, reason, bannedUntil })
  await refreshActiveTab()
}

async function setUsageLimit(userId, minutes) {
  await request(`/admin/users/${userId}/usage-limit`, "POST", { minutes })
  await refreshActiveTab()
}

async function resetUsage(userId) {
  await request(`/admin/users/${userId}/reset-usage`, "POST", {})
  await refreshActiveTab()
}

async function kickUser(userId) {
  await request(`/admin/users/${userId}/kick`, "POST", {})
  await refreshActiveTab()
}

async function previewRoomMessages(roomId) {
  const result = await request(`/admin/rooms/${roomId}/messages?limit=50`, "GET")
  els.roomMessagePreview.innerHTML = ""
  ;(result.messages || []).forEach((message) => {
    const li = document.createElement("li")
    li.textContent = `${formatDateTime(message.createdAt)} ${message.sender.username}: ${message.text}`
    els.roomMessagePreview.appendChild(li)
  })
}

async function loadRoomMembers(roomId) {
  state.activeRoomId = roomId
  const result = await request(`/admin/rooms/${roomId}/members`, "GET")
  state.roomMembers = result.members || []
  renderRoomMembers()
}

async function clearRoomMessages(roomId) {
  await request(`/admin/rooms/${roomId}/messages`, "DELETE")
  await refreshActiveTab()
}

async function deleteRoom(room) {
  const roomId = String(room?.id || "")
  const roomName = String(room?.name || "")
  if (!roomId || !roomName) return
  const confirmationText = prompt(`请输入房间名“${roomName}”确认删除`)
  if (confirmationText === null) return
  const normalizedConfirmation = confirmationText.trim()
  if (!normalizedConfirmation) {
    alert("删除已取消：未输入房间名")
    return
  }
  const reasonInput = prompt("删除原因（可留空）", "管理员手动删除房间")
  if (reasonInput === null) return
  const reason = reasonInput.trim() || "管理员手动删除房间"
  let force = false
  if (Number(room.onlineCount || 0) > 0) {
    force = confirm(`房间当前仍有 ${Number(room.onlineCount || 0)} 名在线成员，是否强制删除并断开成员连接？`)
    if (!force) return
  }
  try {
    await request(`/admin/rooms/${roomId}`, "DELETE", {
      confirmationText: normalizedConfirmation,
      reason,
      force
    })
  } catch (error) {
    const message = String(error?.message || "")
    if (message.includes("房间仍有在线成员")) {
      const forceRetry = confirm("房间仍有在线成员，是否立即强制删除？")
      if (!forceRetry) throw error
      await request(`/admin/rooms/${roomId}`, "DELETE", {
        confirmationText: normalizedConfirmation,
        reason,
        force: true
      })
    } else {
      throw error
    }
  }
  await refreshActiveTab()
}

async function updateRoomSettings(roomId, payload) {
  await request(`/admin/rooms/${roomId}/settings`, "POST", payload)
  await refreshActiveTab()
  if (state.activeRoomId === roomId) {
    await loadRoomMembers(roomId)
  }
}

async function setMemberCanSend(roomId, userId, canSend) {
  await request(`/admin/rooms/${roomId}/members/${userId}/permissions`, "POST", { canSend })
  await loadRoomMembers(roomId)
  await refreshActiveTab()
}

async function request(path, method, body, withAuth = true) {
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(withAuth && state.token ? { authorization: `Bearer ${state.token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "请求失败")
  return data
}

function formatDateTime(ts) {
  const date = new Date(Number(ts) || Date.now())
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const i = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${d} ${h}:${i}:${s}`
}

function byId(id) {
  return document.getElementById(id)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function parseDateInput(value, endOfMinute = false) {
  if (!value) return 0
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 0
  if (endOfMinute) {
    date.setSeconds(59, 999)
  }
  return date.getTime()
}
