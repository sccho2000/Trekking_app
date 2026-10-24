import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNaverMap, showRoute } from '../src/mapview.js';
import { makeCourse } from './fixtures.js';

test('키가 비어 있으면 null이고 document를 건드리지 않는다', async () => {
  const untouched = new Proxy({}, { get() { throw new Error('document touched'); } });
  assert.equal(await loadNaverMap('', untouched), null);
});

test('스크립트 로드에 실패하면 예외 없이 null', async () => {
  const doc = {
    createElement: () => ({}),
    head: { appendChild(script) { queueMicrotask(() => script.onerror()); } },
  };
  assert.equal(await loadNaverMap('abc', doc), null);
});

test('naver가 없으면 SVG 미리보기와 키 안내', () => {
  const container = { innerHTML: '' };
  showRoute(container, makeCourse(), null);
  assert.ok(container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('지도 키가 필요해요'));
});

test('경로가 비어도 예외 없이 안내 문구만 나온다', () => {
  const container = { innerHTML: '' };
  showRoute(container, makeCourse({ path: [] }), null);
  assert.ok(!container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('지도 키가 필요해요'));
});
