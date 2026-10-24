import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGpx, simplifyPath, levelToDifficulty, stripHtml, extractTransit, regionOf, toCourse,
} from '../tools/durunubi.js';
import { isValidCourse } from '../src/courses.js';

const gpx = `<?xml version="1.0"?><gpx><trk><trkseg>
  <trkpt lat="37.1" lon="126.6"><ele>2.9</ele></trkpt>
  <trkpt lat="37.2" lon="126.7"/>
  <trkpt lat="abc" lon="126.8"/>
  <trkpt lat="37.3" lon="126.9"></trkpt>
</trkseg></trk></gpx>`;

test('parseGpx: trkpt의 lat/lon을 [lat,lng]로 읽고 숫자가 아닌 점은 버린다', () => {
  assert.deepEqual(parseGpx(gpx), [[37.1, 126.6], [37.2, 126.7], [37.3, 126.9]]);
  assert.deepEqual(parseGpx(''), []);
  assert.deepEqual(parseGpx(undefined), []);
});

test('simplifyPath: 최대 개수 이하로 줄이고 처음과 끝을 보존, 소수 5자리', () => {
  const pts = Array.from({ length: 1000 }, (_, i) => [37 + i * 0.000012345678, 127 + i * 0.00001]);
  const out = simplifyPath(pts, 60);
  assert.ok(out.length <= 60 && out.length >= 2);
  assert.deepEqual(out[0], [37, 127]);
  assert.deepEqual(out[out.length - 1], [Math.round((37 + 999 * 0.000012345678) * 1e5) / 1e5, Math.round((127 + 999 * 0.00001) * 1e5) / 1e5]);
  assert.deepEqual(simplifyPath([[1, 2], [3, 4]], 60), [[1, 2], [3, 4]]);
  assert.deepEqual(simplifyPath([], 60), []);
});

test('levelToDifficulty: 1=쉬움, 2=보통, 그 밖은 null', () => {
  assert.equal(levelToDifficulty('1'), '쉬움');
  assert.equal(levelToDifficulty('2'), '보통');
  assert.equal(levelToDifficulty('3'), null);
  assert.equal(levelToDifficulty(undefined), null);
});

test('stripHtml: br은 공백, 태그 제거, 공백 정리', () => {
  assert.equal(stripHtml('- 가<br>- 나 <b>다</b>  &amp; 라'), '- 가 - 나 다 & 라');
  assert.equal(stripHtml(undefined), '');
});

test('extractTransit: 교통편 줄만 뽑는다', () => {
  const info = '- 시점: 전곡항<br>교통편) 사당역에서 1002번 버스<br>- 종점: 대부도';
  assert.equal(extractTransit(info), '교통편) 사당역에서 1002번 버스');
  assert.equal(extractTransit('- 시점: 어딘가'), '');
  assert.ok(extractTransit('교통편) ' + 'x'.repeat(500)).length <= 200);
});

test('regionOf', () => {
  assert.equal(regionOf('서울 강동구'), '서울');
  assert.equal(regionOf('경기 안산시'), '경기');
  assert.equal(regionOf('인천 중구'), null);
  assert.equal(regionOf(undefined), null);
});

const item = {
  crsIdx: 'T_CRS_MNG0000005363', crsKorNm: '서해랑길  89코스 ', crsDstnc: '19', crsTotlRqrmHour: '390',
  crsLevel: '2', sigun: '경기 안산시', crsSummary: '- 요약<br>- 둘', travelerinfo: '교통편) 버스',
};
const path = [[37.1, 126.6], [37.2, 126.7], [37.3, 126.8]];

test('toCourse: 두루누비 항목을 앱 코스로 바꾸고 isValidCourse를 통과한다', () => {
  const c = toCourse(item, path);
  assert.equal(c.id, 'durunubi-T_CRS_MNG0000005363');
  assert.equal(c.name, '서해랑길 89코스');
  assert.equal(c.region, '경기');
  assert.equal(c.distanceKm, 19);
  assert.equal(c.durationMin, 390);
  assert.equal(c.difficulty, '보통');
  assert.deepEqual(c.start, { lat: 37.1, lng: 126.6, name: '서해랑길 89코스 시점' });
  assert.deepEqual(c.end, { lat: 37.3, lng: 126.8 });
  assert.equal(c.transit, '교통편) 버스');
  assert.equal(c.description, '- 요약 - 둘');
  assert.equal(c.isSample, false);
  assert.ok(c.source.includes('두루누비'));
  assert.equal(isValidCourse(c), true);
});

test('toCourse: 난이도 상, 서울·경기 밖, 경로 부족, 숫자 아님은 null', () => {
  assert.equal(toCourse({ ...item, crsLevel: '3' }, path), null);
  assert.equal(toCourse({ ...item, sigun: '부산 남구' }, path), null);
  assert.equal(toCourse(item, [[1, 2]]), null);
  assert.equal(toCourse({ ...item, crsDstnc: 'x' }, path), null);
});
