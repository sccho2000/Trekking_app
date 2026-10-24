import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectionsLinks } from '../src/links.js';

const to = { lat: 37.58, lng: 126.97, name: '(샘플) 성곽길 출발점' };
const from = { lat: 37.5, lng: 127.0 };

test('대중교통은 nmap://route/public, 자차는 nmap://route/car', () => {
  assert.ok(buildDirectionsLinks({ from, to, mode: 'transit' }).app.startsWith('nmap://route/public?'));
  assert.ok(buildDirectionsLinks({ from, to, mode: 'car' }).app.startsWith('nmap://route/car?'));
});

test('app 링크에 도착 좌표와 appname이 있고 web은 map.naver.com', () => {
  const l = buildDirectionsLinks({ from, to, mode: 'transit' });
  assert.ok(l.app.includes('dlat=37.58') && l.app.includes('dlng=126.97'));
  assert.ok(l.app.includes('appname='));
  assert.ok(l.web.startsWith('https://map.naver.com/'));
});

test('from이 없으면 slat/slng 생략(현재 위치 사용), 있으면 포함', () => {
  assert.ok(!buildDirectionsLinks({ from: null, to, mode: 'car' }).app.includes('slat='));
  const l = buildDirectionsLinks({ from, to, mode: 'car' });
  assert.ok(l.app.includes('slat=37.5') && l.app.includes('slng=127'));
});

test('이름의 &, <, 공백이 인코딩된다', () => {
  const l = buildDirectionsLinks({ from, to: { ...to, name: '숲길 & 공원 <A>' }, mode: 'transit' });
  for (const url of [l.app, l.web]) {
    assert.ok(!/[ <>]/.test(url), url);
    assert.ok(url.includes(encodeURIComponent('숲길 & 공원 <A>')), url);
  }
});
