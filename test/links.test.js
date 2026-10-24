import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDirectionsLinks, buildCourseMapLinks } from '../src/links.js';
import { makeCourse } from './fixtures.js';

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

const longPath = Array.from({ length: 12 }, (_, i) => [37.5 + i * 0.001, 127 + i * 0.001]);
const countOf = (url, re) => (url.match(re) || []).length;

test('코스 지도 링크: 도보 경로, 출발·도착은 코스의 처음과 끝', () => {
  const course = makeCourse({ path: longPath, start: { lat: 37.5, lng: 127, name: '출발 & 점' } });
  const l = buildCourseMapLinks(course);
  assert.ok(l.app.startsWith('nmap://route/walk?'));
  assert.ok(l.app.includes('slat=37.5&slng=127'));
  assert.ok(l.app.includes('dlat=37.511') && l.app.includes('dlng=127.011'));
  assert.ok(l.app.includes('appname='));
  assert.ok(l.web.startsWith('https://map.naver.com/') && l.web.endsWith('/walk'));
  assert.ok(!/[ <>]/.test(l.app + l.web));
});

test('경유지는 최대 5개이고 경로 안쪽 점이다', () => {
  const l = buildCourseMapLinks(makeCourse({ path: longPath }));
  const n = countOf(l.app, /v\dlat=/g);
  assert.ok(n >= 1 && n <= 5, String(n));
  assert.ok(!l.app.includes('v6lat='));
  assert.ok(!l.app.includes('v1lat=37.5&'));
});

test('점이 2개뿐이면 경유지가 없다', () => {
  const l = buildCourseMapLinks(makeCourse({ path: [[37.5, 127], [37.51, 127.01]] }));
  assert.equal(countOf(l.app, /v\dlat=/g), 0);
});

test('경로가 비어 있어도 start/end로 링크를 만든다', () => {
  const c = makeCourse({ path: [] });
  const l = buildCourseMapLinks(c);
  assert.ok(l.app.includes(`slat=${c.start.lat}`) && l.app.includes(`dlat=${c.end.lat}`));
});
