import test from 'node:test';
import assert from 'node:assert/strict';
import { createFavorites, favoriteCards } from '../src/favorites.js';
import { makeCourse } from './fixtures.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
}

test('toggle로 추가하고 다시 toggle하면 제거된다', () => {
  const f = createFavorites(memoryStorage());
  assert.equal(f.has('a'), false);
  assert.equal(f.toggle('a'), true);
  assert.equal(f.has('a'), true);
  assert.equal(f.toggle('a'), false);
  assert.equal(f.has('a'), false);
});

test('저장소에 저장되고 새 인스턴스에서 복원된다', () => {
  const storage = memoryStorage();
  createFavorites(storage).toggle('a');
  assert.deepEqual(createFavorites(storage).list(), ['a']);
});

test('저장소 값이 깨져 있거나 저장소가 예외를 던져도 동작한다', () => {
  assert.deepEqual(createFavorites(memoryStorage({ 'trekking.favorites': '{oops' })).list(), []);
  assert.deepEqual(createFavorites(memoryStorage({ 'trekking.favorites': '"x"' })).list(), []);
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const f = createFavorites(broken);
  assert.equal(f.toggle('a'), true);
  assert.equal(f.has('a'), true);
});

test('저장소가 없어도(undefined) 메모리로 동작한다', () => {
  const f = createFavorites(undefined);
  f.toggle('a');
  assert.equal(f.has('a'), true);
});

test('favoriteCards: 즐겨찾기 코스만, 위치가 있으면 가까운 순', () => {
  const far = makeCourse({ id: 'far', start: { lat: 37.69, lng: 127.1, name: 'f' } });
  const near = makeCourse({ id: 'near', start: { lat: 37.5, lng: 127, name: 'n' } });
  const other = makeCourse({ id: 'other' });
  const cards = favoriteCards([far, near, other], ['far', 'near'], { lat: 37.5, lng: 127 });
  assert.deepEqual(cards.map((c) => c.course.id), ['near', 'far']);
  assert.equal(typeof cards[0].distanceKm, 'number');
});

test('favoriteCards: 위치가 없으면 distanceKm은 null이고 저장된 순서를 유지', () => {
  const a = makeCourse({ id: 'a' });
  const b = makeCourse({ id: 'b' });
  const cards = favoriteCards([a, b], ['b', 'a'], null);
  assert.deepEqual(cards.map((c) => c.course.id), ['b', 'a']);
  assert.equal(cards[0].distanceKm, null);
});

test('favoriteCards: 목록에 없는 id는 무시한다', () => {
  assert.deepEqual(favoriteCards([makeCourse({ id: 'a' })], ['gone'], null), []);
});
