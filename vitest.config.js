// This project's unit tests run on Node's built-in test runner (`npm test` ->
// `node --test tests/`), which needs no extra dependencies.
//
// If you prefer Vitest, install it (`npm i -D vitest`), then in each file under
// tests/ change the harness import:
//     import { describe, it, expect } from './harness.mjs';
//   ->
//     import { describe, it, expect } from 'vitest';
// and replace the body of this file with:
//     import { defineConfig } from 'vitest/config';
//     export default defineConfig({ test: { include: ['tests/**/*.test.mjs'] } });
export default {};
