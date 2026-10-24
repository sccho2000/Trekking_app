import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNaverMap, showRoute, showApproach } from '../src/mapview.js';
import { makeCourse } from './fixtures.js';

function fakeNaver({ mapThrows = false } = {}) {
  const calls = { polylines: [], markers: [], fit: null };
  class LatLng { constructor(lat, lng) { this.lat = lat; this.lng = lng; } }
  class LatLngBounds { constructor(a, b) { this.pts = [a, b]; } extend(p) { this.pts.push(p); return this; } }
  class Map {
    constructor() { if (mapThrows) throw new Error('boom'); }
    fitBounds(b) { calls.fit = b; }
  }
  class Polyline { constructor(o) { calls.polylines.push(o); } }
  class Marker { constructor(o) { calls.markers.push(o); } }
  return { naver: { maps: { LatLng, LatLngBounds, Map, Polyline, Marker } }, calls };
}

test('키가 비어 있으면 null이고 document를 건드리지 않는다', async () => {
  const untouched = new Proxy({}, { get() { throw new Error('document touched'); } });
  assert.equal(await loadNaverMap('', untouched), null);
});

test('스크립트 로드에 실패하면 예외 없이 null, ncpKeyId로 요청한다', async () => {
  let src;
  const doc = {
    createElement: () => ({}),
    head: { appendChild(script) { src = script.src; queueMicrotask(() => script.onerror()); } },
  };
  assert.equal(await loadNaverMap('abc123', doc), null);
  assert.ok(src.includes('oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=abc123'), src);
});

test('naver가 없으면 SVG 미리보기와 네이버 지도 안내', () => {
  const container = { innerHTML: '' };
  showRoute(container, makeCourse(), null);
  assert.ok(container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('네이버 지도'));
});

test('경로가 비어도 예외 없이 안내 문구만 나온다', () => {
  const container = { innerHTML: '' };
  showRoute(container, makeCourse({ path: [] }), null);
  assert.ok(!container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('네이버 지도'));
});

test('naver가 있으면 경로선 1개와 출발·도착 마커 2개를 그린다', () => {
  const { naver, calls } = fakeNaver();
  const container = { innerHTML: 'old' };
  showRoute(container, makeCourse(), naver);
  assert.equal(calls.polylines.length, 1);
  assert.equal(calls.polylines[0].path.length, 3);
  assert.equal(calls.markers.length, 2);
  assert.ok(calls.fit);
  assert.ok(!container.innerHTML.includes('<svg'));
});

test('지도 그리기가 throw하면 SVG로 대체한다', () => {
  const { naver } = fakeNaver({ mapThrows: true });
  const container = { innerHTML: '' };
  showRoute(container, makeCourse(), naver);
  assert.ok(container.innerHTML.includes('<svg'));
});

test('인증 실패 콜백이 오면 SVG와 인증 안내로 바꾼다', () => {
  const { naver } = fakeNaver();
  const container = { innerHTML: '' };
  showRoute(container, makeCourse(), naver);
  assert.equal(typeof globalThis.navermap_authFailure, 'function');
  globalThis.navermap_authFailure();
  assert.ok(container.innerHTML.includes('<svg'));
  assert.ok(container.innerHTML.includes('인증'));
  delete globalThis.navermap_authFailure;
});

const here = { lat: 37.5, lng: 127 };
const start = { lat: 37.6, lng: 126.9 };

test('showApproach: naver가 있으면 내 위치·출발점 마커 2개와 점선 1개', () => {
  const { naver, calls } = fakeNaver();
  showApproach({ innerHTML: '' }, here, start, naver);
  assert.equal(calls.markers.length, 2);
  assert.equal(calls.polylines.length, 1);
  assert.equal(calls.polylines[0].path.length, 2);
  assert.ok(calls.fit);
});

test('showApproach: 현재 위치가 없으면 출발점 마커만', () => {
  const { naver, calls } = fakeNaver();
  showApproach({ innerHTML: '' }, null, start, naver);
  assert.equal(calls.markers.length, 1);
  assert.equal(calls.polylines.length, 0);
});

test('showApproach: naver가 없으면 두 점을 잇는 SVG', () => {
  const container = { innerHTML: '' };
  showApproach(container, here, start, null);
  assert.ok(container.innerHTML.includes('<svg') && container.innerHTML.includes('<polyline'));
});

test('showApproach: 위치가 없고 naver도 없으면 예외 없이 안내만', () => {
  const container = { innerHTML: '' };
  showApproach(container, null, start, null);
  assert.ok(container.innerHTML.includes('네이버 지도'));
});

test('지도가 둘이어도 인증 실패 콜백 하나가 둘 다 SVG로 바꾼다', () => {
  const a = fakeNaver();
  const left = { innerHTML: '' };
  const right = { innerHTML: '' };
  showRoute(left, makeCourse(), a.naver);
  showApproach(right, here, start, a.naver);
  globalThis.navermap_authFailure();
  assert.ok(left.innerHTML.includes('<svg') && left.innerHTML.includes('인증'));
  assert.ok(right.innerHTML.includes('<svg') && right.innerHTML.includes('인증'));
  delete globalThis.navermap_authFailure;
});
