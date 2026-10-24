import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequencer } from '../src/latest.js';

test('가장 최근 토큰만 현재로 인정한다', () => {
  const s = createSequencer();
  const a = s.next();
  assert.equal(s.isCurrent(a), true);
  const b = s.next();
  assert.equal(s.isCurrent(a), false);
  assert.equal(s.isCurrent(b), true);
});
