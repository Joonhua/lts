import test from "node:test"
import assert from "node:assert/strict"

function parseOriginList(value) {
  const raw = String(value || "")
  if (!raw.trim() || raw.trim() === "*") return []
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
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

function isCorsOriginAllowed(origin, clientOrigin, clientOriginRegex) {
  if (clientOrigin === "*") return true
  if (!origin) return true
  const exact = parseOriginList(clientOrigin)
  const pattern = buildOriginPattern(clientOriginRegex)
  if (exact.includes(origin)) return true
  if (pattern && pattern.test(origin)) return true
  return false
}

function getClientOriginRegex(override = "") {
  const fallback = "^https://([a-z0-9-]+\\.(ngrok-free\\.app|ngrok\\.app)|[a-z0-9-]+\\.trycloudflare\\.com)$"
  return String(override || "").trim() || fallback
}

test("isCorsOriginAllowed supports exact origin list", () => {
  assert.equal(
    isCorsOriginAllowed("http://localhost:5173", "http://localhost:5173,http://127.0.0.1:5173", ""),
    true
  )
  assert.equal(
    isCorsOriginAllowed("http://evil.example.com", "http://localhost:5173,http://127.0.0.1:5173", ""),
    false
  )
})

test("isCorsOriginAllowed supports regex origin list", () => {
  const regex = "^https://([a-z0-9-]+\\.(ngrok-free\\.app|ngrok\\.app)|[a-z0-9-]+\\.trycloudflare\\.com)$"
  assert.equal(
    isCorsOriginAllowed("https://demo-123.ngrok-free.app", "http://localhost:5173", regex),
    true
  )
  assert.equal(
    isCorsOriginAllowed("https://demo-123.ngrok.app", "http://localhost:5173", regex),
    true
  )
  assert.equal(
    isCorsOriginAllowed("https://voice-abc.trycloudflare.com", "http://localhost:5173", regex),
    true
  )
  assert.equal(
    isCorsOriginAllowed("https://demo-123.example.com", "http://localhost:5173", regex),
    false
  )
})

test("isCorsOriginAllowed allows no-origin and wildcard mode", () => {
  assert.equal(isCorsOriginAllowed("", "http://localhost:5173", ""), true)
  assert.equal(isCorsOriginAllowed("https://any-origin.example.com", "*", ""), true)
})

test("getClientOriginRegex provides default tunnel domains", () => {
  const regex = getClientOriginRegex("")
  assert.equal(isCorsOriginAllowed("https://demo-123.ngrok.app", "http://localhost:5173", regex), true)
  assert.equal(isCorsOriginAllowed("https://voice-abc.trycloudflare.com", "http://localhost:5173", regex), true)
})
