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

// 실제 데이터(두루누비). 서울·경기 범위를 넉넉하게 잡아 지역 라벨이 엉뚱하지 않은지만 본다.
const BOUNDS = { lat: [36.9, 38.3], lng: [126.3, 127.9] };

test('실제 데이터: 10개 이상, 모두 유효, 출처 표기, 샘플 아님', () => {
  assert.ok(COURSES.length >= 10);
  for (const c of COURSES) {
    assert.equal(isValidCourse(c), true, c.id);
    assert.equal(c.isSample, false, c.id);
    assert.ok(c.source.includes('두루누비'), c.id);
  }
});

test('실제 데이터: id 중복 없음, 경로 2점 이상, 첫 점이 start, 마지막 점이 end, 좌표가 수도권 범위 안', () => {
  assert.equal(new Set(COURSES.map((c) => c.id)).size, COURSES.length);
  for (const c of COURSES) {
    assert.ok(c.path.length >= 2 && c.path.length <= 60, c.id);
    assert.deepEqual(c.path[0], [c.start.lat, c.start.lng], c.id);
    assert.deepEqual(c.path[c.path.length - 1], [c.end.lat, c.end.lng], c.id);
    for (const [lat, lng] of c.path) {
      assert.ok(lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1] && lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1], `${c.id} ${lat},${lng}`);
    }
  }
});

test('실제 데이터: 난이도 상 코스는 들어 있지 않다(쉬움/보통만)', () => {
  assert.ok(COURSES.every((c) => c.difficulty === '쉬움' || c.difficulty === '보통'));
});

test('id가 없거나 비어 있으면 무효', () => {
  const c = makeCourse();
  delete c.id;
  assert.equal(isValidCourse(c), false);
  assert.equal(isValidCourse(makeCourse({ id: '' })), false);
});

test('start.name, transit이 문자열이 아니면 무효', () => {
  assert.equal(isValidCourse(makeCourse({ start: { lat: 37.5, lng: 127 } })), false);
  assert.equal(isValidCourse(makeCourse({ transit: undefined })), false);
});

test('durationMin은 양의 정수, distanceKm은 양수여야 한다', () => {
  assert.equal(isValidCourse(makeCourse({ durationMin: -30 })), false);
  assert.equal(isValidCourse(makeCourse({ durationMin: 90.5 })), false);
  assert.equal(isValidCourse(makeCourse({ distanceKm: 0 })), false);
});

test('path의 각 점은 숫자 2개짜리 배열이어야 한다', () => {
  assert.equal(isValidCourse(makeCourse({ path: [null] })), false);
  assert.equal(isValidCourse(makeCourse({ path: [{ lat: 1, lng: 2 }] })), false);
  assert.equal(isValidCourse(makeCourse({ path: [[1, 'x']] })), false);
});

test('validCourses는 id가 중복된 코스를 첫 번째만 남긴다', () => {
  const list = validCourses([makeCourse({ id: 'a' }), makeCourse({ id: 'a', name: '(샘플) 두번째' })]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, '(샘플) 테스트 코스');
});
