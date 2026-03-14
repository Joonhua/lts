import test from "node:test"
import assert from "node:assert/strict"

function sanitizeText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

test("sanitizeText escapes html characters", () => {
  const payload = `<img src="x" onerror='alert(1)'>`
  const escaped = sanitizeText(payload)
  assert.equal(escaped.includes("<"), false)
  assert.equal(escaped.includes(">"), false)
  assert.equal(escaped.includes("onerror"), true)
})
