/**
 * Minimal zero-dependency test harness.
 *
 * Re-exports `describe`/`it` from Node's built-in test runner and provides a
 * small Jest/Vitest-style `expect` over `node:assert`. This lets the suite run
 * with just `node --test` — no npm install required. If you later add Vitest,
 * the test bodies port over unchanged (swap this import for `vitest`).
 */
import assert from 'node:assert/strict';
export { describe, it } from 'node:test';

export function expect(received) {
  return {
    toBe: (expected) => assert.strictEqual(received, expected),
    toEqual: (expected) => assert.deepStrictEqual(received, expected),
    toBeNull: () => assert.strictEqual(received, null),
    toBeDefined: () => assert.notStrictEqual(received, undefined),
    toBeGreaterThan: (n) => assert.ok(received > n, `${received} > ${n}`),
    toBeGreaterThanOrEqual: (n) => assert.ok(received >= n, `${received} >= ${n}`),
    toBeLessThan: (n) => assert.ok(received < n, `${received} < ${n}`),
    toBeLessThanOrEqual: (n) => assert.ok(received <= n, `${received} <= ${n}`),
    toBeCloseTo: (n, digits = 2) =>
      assert.ok(
        Math.abs(received - n) < Math.pow(10, -digits) / 2,
        `${received} ≈ ${n} (${digits} digits)`
      ),
    toHaveLength: (n) => assert.strictEqual(received?.length, n),
    toMatch: (re) => assert.ok(re.test(received), `${received} matches ${re}`),
  };
}
