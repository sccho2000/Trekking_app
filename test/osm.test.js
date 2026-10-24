import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, chainWays, relationToCourse, dedupeById, dedupeByName } from '../tools/osm.js';
import { isValidCourse } from '../src/courses.js';

// 위도 0.01도 ≈ 1.11km. 한 구간이 약 1.1km인 직선 way를 만든다.
const way = (lat0, lat1, lng = 127, role = '') => ({
  type: 'way', role,
  geometry: [{ lat: lat0, lon: lng }, { lat: (lat0 + lat1) / 2, lon: lng }, { lat: lat1, lon: lng }],
});
const rel = (id, tags, members) => ({ type: 'relation', id, tags, members });

test('cleanName: name:ko 우선, 대괄호 접두사는 풀고 공백 정리', () => {
  assert.equal(cleanName({ name: '[서울둘레길] 7코스 / 일자산 코스' }), '서울둘레길 7코스 / 일자산 코스');
  assert.equal(cleanName({ name: 'Iljasan Trail', 'name:ko': '일자산 숲길' }), '일자산 숲길');
  assert.equal(cleanName({ name: '  안산   자락길 ' }), '안산 자락길');
  assert.equal(cleanName({}), '');
});

test('chainWays: 순서대로 이어 붙이고 길이를 합산한다', () => {
  const r = chainWays([way(37.5, 37.51), way(37.51, 37.52)]);
  assert.equal(r.path.length, 6);
  assert.ok(r.lengthKm > 2.0 && r.lengthKm < 2.5, String(r.lengthKm));
  assert.ok(r.maxGapKm < 0.01);
});

test('chainWays: 뒤집힌 way는 방향을 맞추고, 첫 way도 둘째에 맞춰 방향을 정한다', () => {
  const r = chainWays([way(37.51, 37.5), way(37.51, 37.52)]);
  assert.deepEqual(r.path[0], [37.5, 127]);
  assert.deepEqual(r.path[r.path.length - 1], [37.52, 127]);
  assert.ok(r.maxGapKm < 0.01);
});

test('chainWays: 끊어진 구간은 maxGapKm로 드러난다', () => {
  const r = chainWays([way(37.5, 37.51), way(37.6, 37.61)]);
  assert.ok(r.maxGapKm > 8, String(r.maxGapKm));
});

test('chainWays: 지오메트리가 없거나 way가 아닌 멤버는 건너뛴다', () => {
  const r = chainWays([{ type: 'node', geometry: [] }, { type: 'way', geometry: null }, way(37.5, 37.51)]);
  assert.equal(r.path.length, 3);
  assert.deepEqual(chainWays([]), { path: [], lengthKm: 0, maxGapKm: 0 });
});

test('chainWays: 보조 역할(alternative, guidepost 등)은 제외한다', () => {
  const r = chainWays([way(37.5, 37.51), way(37.8, 37.81, 127, 'alternative')]);
  assert.equal(r.path.length, 3);
});

const members = [way(37.5, 37.52), way(37.52, 37.54)]; // 약 4.4km

test('relationToCourse: 정상 변환, 거리·소요시간·난이도·출처, isValidCourse 통과', () => {
  const c = relationToCourse(rel(123, { name: '[서울둘레길] 5코스', route: 'hiking' }, members), '서울');
  assert.equal(c.id, 'osm-123');
  assert.equal(c.name, '서울둘레길 5코스');
  assert.equal(c.region, '서울');
  assert.ok(c.distanceKm > 4 && c.distanceKm < 4.8);
  assert.equal(c.durationMin % 5, 0);
  assert.ok(c.durationMin >= 80 && c.durationMin <= 95, String(c.durationMin));
  assert.equal(c.difficulty, '쉬움');
  assert.deepEqual(c.start, { lat: 37.5, lng: 127, name: '서울둘레길 5코스 시점' });
  assert.equal(c.isSample, false);
  assert.ok(c.source.includes('OpenStreetMap'));
  assert.ok(c.path.length >= 2 && c.path.length <= 60);
  assert.equal(isValidCourse(c), true);
});

test('relationToCourse: 8km를 넘으면 보통', () => {
  const long = [way(37.5, 37.54), way(37.54, 37.58)]; // 약 8.9km
  assert.equal(relationToCourse(rel(1, { name: '긴 둘레길' }, long), '경기').difficulty, '보통');
});

test('relationToCourse: 걸러내는 경우들은 null', () => {
  const ok = (tags, m = members) => relationToCourse(rel(1, tags, m), '경기');
  assert.equal(ok({ name: 'Seoul City Trail' }), null); // 한글 이름 없음
  assert.equal(ok({ name: '1.631 km' }), null);
  assert.equal(ok({}), null);
  assert.equal(ok({ name: '도락산 등산로' }), null);
  assert.equal(ok({ name: '한북정맥' }), null);
  assert.equal(ok({ name: '짧은 길' }, [way(37.5, 37.502)]), null); // 1km 미만
  assert.equal(ok({ name: '너무 긴 길' }, [way(37.0, 37.3)]), null); // 20km 초과
  assert.equal(ok({ name: '끊어진 길' }, [way(37.5, 37.51), way(37.6, 37.61)]), null);
  assert.equal(ok({ name: '멤버 없음' }, []), null);
});

test('dedupeById: 같은 id는 첫 번째만', () => {
  assert.deepEqual(dedupeById([{ id: 'a', n: 1 }, { id: 'a', n: 2 }, { id: 'b', n: 3 }]).map((c) => c.n), [1, 3]);
});

test('dedupeByName: 같은 이름이면 더 긴 코스만', () => {
  const out = dedupeByName([
    { id: 'a', name: '북한산둘레길', distanceKm: 3.6 },
    { id: 'b', name: '북한산둘레길', distanceKm: 9.1 },
    { id: 'c', name: '다른 길', distanceKm: 2 },
  ]);
  assert.deepEqual(out.map((c) => c.id).sort(), ['b', 'c']);
});
