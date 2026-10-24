import test from 'node:test';
import assert from 'node:assert/strict';
import { durationBucket, recommend, REGION_CENTER } from '../src/recommend.js';
import { makeCourse } from './fixtures.js';

const at = (lat, lng) => ({ lat, lng });
const half = (id, o = {}) => makeCourse({ id, durationMin: 200, ...o });

test('durationBucket 경계값', () => {
  assert.equal(durationBucket(150), 'short');
  assert.equal(durationBucket(151), 'half');
  assert.equal(durationBucket(269), 'half');
  assert.equal(durationBucket(270), 'full');
});

test('REGION_CENTER에 서울/경기 중심 좌표가 있다', () => {
  assert.deepEqual(REGION_CENTER.서울, at(37.5665, 126.978));
  assert.deepEqual(REGION_CENTER.경기, at(37.2636, 127.0286));
});

test('origin 지역 필터', () => {
  const courses = [half('a', { region: '서울' }), half('b', { region: '경기' })];
  const s = recommend({ courses, time: 'half', origin: 'seoul', position: null });
  assert.deepEqual(s.cards.map((c) => c.course.id), ['a']);
  const g = recommend({ courses, time: 'half', origin: 'gyeonggi', position: null });
  assert.deepEqual(g.cards.map((c) => c.course.id), ['b']);
});

test('시간 구간이 다른 코스는 나오지 않는다', () => {
  const courses = [half('a'), makeCourse({ id: 'b', durationMin: 100 }), makeCourse({ id: 'c', durationMin: 300 })];
  const r = recommend({ courses, time: 'half', origin: 'seoul', position: null });
  assert.deepEqual(r.cards.map((c) => c.course.id), ['a']);
});

test('지역 선택에서는 쉬움이 보통보다 먼저, mediumDifficulty 표시', () => {
  const hard = half('hard', { difficulty: '보통', durationMin: 210 });
  const easy = half('easy', { difficulty: '쉬움', durationMin: 260 });
  const r = recommend({ courses: [hard, easy], time: 'half', origin: 'seoul', position: null });
  assert.deepEqual(r.cards.map((c) => c.course.id), ['easy', 'hard']);
  assert.equal(r.cards[0].mediumDifficulty, false);
  assert.equal(r.cards[1].mediumDifficulty, true);
});

test('내 위치 선택에서는 난이도와 관계없이 가까운 순, 보통은 표시만 한다', () => {
  const near = half('near', { difficulty: '보통', start: { lat: 37.5, lng: 127, name: 'n' } });
  const far = half('far', { difficulty: '쉬움', start: { lat: 37.69, lng: 127.1, name: 'f' } });
  const r = recommend({ courses: [far, near], time: 'half', origin: 'here', position: at(37.5, 127) });
  assert.deepEqual(r.cards.map((c) => c.course.id), ['near', 'far']);
  assert.ok(r.cards[0].distanceKm <= r.cards[1].distanceKm);
  assert.equal(r.cards[0].mediumDifficulty, true);
});

test('내 위치 선택 시 같은 난이도 안에서 가까운 순, distanceKm은 숫자', () => {
  const a = half('a', { start: { lat: 37.6, lng: 127, name: 'a' } });
  const b = half('b', { start: { lat: 37.51, lng: 127, name: 'b' } });
  const r = recommend({ courses: [a, b], time: 'half', origin: 'here', position: at(37.5, 127) });
  assert.deepEqual(r.cards.map((c) => c.course.id), ['b', 'a']);
  assert.equal(typeof r.cards[0].distanceKm, 'number');
});

test('지역 선택에서는 distanceKm이 null', () => {
  const r = recommend({ courses: [half('a')], time: 'half', origin: 'seoul', position: null });
  assert.equal(r.cards[0].distanceKm, null);
});

test('내 위치인데 위치가 없으면 needsRegion', () => {
  const r = recommend({ courses: [half('a')], time: 'half', origin: 'here', position: null });
  assert.deepEqual(r, { cards: [], needsRegion: true, canRelax: false });
});

test('후보가 많아도 카드는 3개, canRelax false', () => {
  const courses = ['a', 'b', 'c', 'd', 'e'].map((id) => half(id));
  const r = recommend({ courses, time: 'half', origin: 'seoul', position: null });
  assert.equal(r.cards.length, 3);
  assert.equal(r.canRelax, false);
});

test('3개 미만이면 canRelax, 0개면 빈 카드', () => {
  const two = recommend({ courses: [half('a'), half('b')], time: 'half', origin: 'seoul', position: null });
  assert.equal(two.cards.length, 2);
  assert.equal(two.canRelax, true);
  const none = recommend({ courses: [], time: 'half', origin: 'seoul', position: null });
  assert.deepEqual(none.cards, []);
  assert.equal(none.canRelax, true);
});

test('relaxTime은 시간 필터를 무시하고 canRelax를 끈다', () => {
  const courses = [half('a'), makeCourse({ id: 'b', durationMin: 100 }), makeCourse({ id: 'c', durationMin: 300 })];
  const r = recommend({ courses, time: 'half', origin: 'seoul', position: null, relaxTime: true });
  assert.equal(r.cards.length, 3);
  assert.equal(r.canRelax, false);
});

test('reason은 비어 있지 않고 난이도를 포함한다', () => {
  const r = recommend({ courses: [half('a')], time: 'half', origin: 'seoul', position: null });
  assert.ok(r.cards[0].reason.includes('쉬움'));
});
