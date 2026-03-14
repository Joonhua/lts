import test from "node:test"
import assert from "node:assert/strict"

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

test("escapeHtml escapes dangerous characters", () => {
  const result = escapeHtml("<script>alert(1)</script>")
  assert.equal(result.includes("<"), false)
  assert.equal(result.includes(">"), false)
})
