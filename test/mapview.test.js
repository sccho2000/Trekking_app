import test from 'node:test';
import assert from 'node:assert/strict';
import { showRoute } from '../src/mapview.js';
import { makeCourse } from './fixtures.js';

test('경로 모양 SVG와 네이버 지도 안내 문구를 보여 준다', () => {
  const container = { innerHTML: '' };
  showRoute(container, makeCourse());
  assert.ok(container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('네이버 지도'));
});

test('경로가 비어도 예외 없이 안내 문구만 나온다', () => {
  const container = { innerHTML: '' };
  showRoute(container, makeCourse({ path: [] }));
  assert.ok(!container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('네이버 지도'));
});
