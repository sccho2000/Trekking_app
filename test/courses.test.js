import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCourse, validCourses } from '../src/courses.js';
import { COURSES } from '../data/courses.js';
import { makeCourse } from './fixtures.js';

test('유효한 코스는 통과한다', () => {
  assert.equal(isValidCourse(makeCourse()), true);
});

for (const field of ['name', 'region', 'distanceKm', 'durationMin', 'difficulty', 'start', 'end', 'path']) {
  test(`${field}가 없으면 무효`, () => {
    const c = makeCourse();
    delete c[field];
    assert.equal(isValidCourse(c), false);
  });
}

test('숫자가 아닌 distanceKm/durationMin은 무효', () => {
  assert.equal(isValidCourse(makeCourse({ distanceKm: '6' })), false);
  assert.equal(isValidCourse(makeCourse({ durationMin: NaN })), false);
});

test('path가 배열이 아니면 무효', () => {
  assert.equal(isValidCourse(makeCourse({ path: 'x' })), false);
});

test('허용되지 않은 region/difficulty는 무효', () => {
  assert.equal(isValidCourse(makeCourse({ region: '부산' })), false);
  assert.equal(isValidCourse(makeCourse({ difficulty: '어려움' })), false);
});

test('null/undefined 입력도 예외 없이 무효', () => {
  assert.equal(isValidCourse(null), false);
  assert.equal(isValidCourse(undefined), false);
});

test('validCourses는 무효 항목을 걸러낸다', () => {
  assert.equal(validCourses([makeCourse(), { name: 'x' }]).length, 1);
});

const BOUNDS = {
  서울: { lat: [37.43, 37.7], lng: [126.76, 127.18] },
  경기: { lat: [36.9, 38.0], lng: [126.5, 127.9] },
};
const bucket = (m) => (m <= 150 ? 'short' : m < 270 ? 'half' : 'full');

test('샘플 데이터: 10개 이상, 모두 유효하고 샘플 표시', () => {
  assert.ok(COURSES.length >= 10);
  for (const c of COURSES) {
    assert.equal(isValidCourse(c), true, c.id);
    assert.equal(c.isSample, true);
    assert.ok(c.name.startsWith('(샘플)'), c.name);
  }
});

test('샘플 데이터: id 중복 없음, 경로 2점 이상, 첫 점이 start, 좌표가 지역 경계 안', () => {
  assert.equal(new Set(COURSES.map((c) => c.id)).size, COURSES.length);
  for (const c of COURSES) {
    assert.ok(c.path.length >= 2, c.id);
    assert.deepEqual(c.path[0], [c.start.lat, c.start.lng], c.id);
    const b = BOUNDS[c.region];
    for (const [lat, lng] of c.path) {
      assert.ok(lat >= b.lat[0] && lat <= b.lat[1] && lng >= b.lng[0] && lng <= b.lng[1], `${c.id} ${lat},${lng}`);
    }
  }
});

test('샘플 데이터: 시간 구간 3 × 지역 2 조합마다 최소 1개, 종일에 보통 포함', () => {
  for (const region of ['서울', '경기']) {
    for (const b of ['short', 'half', 'full']) {
      assert.ok(COURSES.some((c) => c.region === region && bucket(c.durationMin) === b), `${region} ${b}`);
    }
  }
  assert.ok(COURSES.some((c) => bucket(c.durationMin) === 'full' && c.difficulty === '보통'));
});
