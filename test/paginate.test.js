import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate, PAGE_SIZE } from '../src/paginate.js';

const nums = (n) => Array.from({ length: n }, (_, i) => i + 1);

test('한 페이지는 10개', () => {
  assert.equal(PAGE_SIZE, 10);
});

test('25개를 10개씩: 1쪽 10개, 2쪽 10개, 3쪽 5개', () => {
  const p1 = paginate(nums(25), 1);
  assert.deepEqual(p1.items, nums(10));
  assert.equal(p1.totalPages, 3);
  assert.equal(p1.hasPrev, false);
  assert.equal(p1.hasNext, true);
  const p3 = paginate(nums(25), 3);
  assert.deepEqual(p3.items, [21, 22, 23, 24, 25]);
  assert.equal(p3.hasPrev, true);
  assert.equal(p3.hasNext, false);
});

test('범위를 벗어난 쪽 번호는 가까운 유효한 쪽으로 맞춘다', () => {
  assert.equal(paginate(nums(25), 99).page, 3);
  assert.equal(paginate(nums(25), 0).page, 1);
  assert.equal(paginate(nums(25), -4).page, 1);
  assert.equal(paginate(nums(25), 'x').page, 1);
});

test('빈 목록은 1쪽, 항목 없음, 이전·다음 없음', () => {
  const p = paginate([], 1);
  assert.deepEqual(p.items, []);
  assert.equal(p.page, 1);
  assert.equal(p.totalPages, 1);
  assert.equal(p.hasPrev || p.hasNext, false);
  assert.equal(p.total, 0);
});

test('정확히 10개면 1쪽만, total과 from/to를 알려 준다', () => {
  const p = paginate(nums(10), 1);
  assert.equal(p.totalPages, 1);
  assert.equal(p.hasNext, false);
  assert.equal(p.total, 10);
  const q = paginate(nums(25), 2);
  assert.equal(q.from, 11);
  assert.equal(q.to, 20);
});
