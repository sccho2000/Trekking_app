import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm } from '../src/geo.js';

test('같은 지점은 0km', () => {
  assert.equal(haversineKm({ lat: 37.5665, lng: 126.978 }, { lat: 37.5665, lng: 126.978 }), 0);
});

test('서울시청~수원은 약 34km(±1)', () => {
  const d = haversineKm({ lat: 37.5665, lng: 126.978 }, { lat: 37.2636, lng: 127.0286 });
  assert.ok(d > 33 && d < 35, String(d));
});

test('a,b 순서를 바꿔도 같다', () => {
  const a = { lat: 37.5, lng: 127 };
  const b = { lat: 37.6, lng: 126.9 };
  assert.equal(haversineKm(a, b), haversineKm(b, a));
});
