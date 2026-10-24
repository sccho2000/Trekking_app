import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, cardHtml, detailHtml, approachHtml } from '../src/render.js';
import { makeCourse } from './fixtures.js';

const card = (o = {}, c = {}) => ({
  course: makeCourse(c), distanceKm: null, mediumDifficulty: false, reason: '3시간 · 쉬움', ...o,
});
const ctx = (o = {}) => ({ showTransit: false, weather: null, ...o });

test('escapeHtml은 < > " & 를 이스케이프한다', () => {
  const out = escapeHtml('<a href="x">&');
  assert.ok(!/[<>"]/.test(out));
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|#39;)/.test(out));
});

test('카드에 이름, 거리, 시간, 난이도, 이유, 샘플 표시가 들어간다', () => {
  const html = cardHtml(card({}, { distanceKm: 6.5, durationMin: 150 }), ctx());
  for (const s of ['(샘플) 테스트 코스', '6.5km', '2시간 30분', '쉬움', '3시간 · 쉬움', '샘플 데이터']) {
    assert.ok(html.includes(s), s);
  }
});

test('이름의 HTML은 날것으로 나오지 않는다', () => {
  const html = cardHtml(card({}, { name: '<script>alert(1)</script>' }), ctx());
  assert.ok(!html.includes('<script>'));
});

test('대중교통 문구는 showTransit일 때만', () => {
  assert.ok(!cardHtml(card(), ctx()).includes('지하철 1번 출구'));
  assert.ok(cardHtml(card(), ctx({ showTransit: true })).includes('지하철 1번 출구'));
});

test('mediumDifficulty일 때만 badge-medium', () => {
  assert.ok(!cardHtml(card(), ctx()).includes('badge-medium'));
  assert.ok(cardHtml(card({ mediumDifficulty: true }, { difficulty: '보통' }), ctx()).includes('badge-medium'));
});

test('날씨 경고 클래스와 날씨 없음 처리', () => {
  const warn = cardHtml(card(), ctx({ weather: { text: '오늘 비 예보', warn: true } }));
  assert.ok(warn.includes('weather') && warn.includes('warn') && warn.includes('오늘 비 예보'));
  assert.ok(!cardHtml(card(), ctx({ weather: null })).includes('class="weather'));
});

test('코스 선택 버튼의 data-action, data-id', () => {
  const html = cardHtml(card({}, { id: 'seoul-01' }), ctx());
  assert.ok(html.includes('data-action="select" data-id="seoul-01"'));
  assert.ok(html.includes('코스 선택'));
  assert.ok(!html.includes('data-action="preview"'));
});

test('순번이 있으면 제목 앞에 붙는다', () => {
  assert.ok(cardHtml(card(), ctx({ rank: 3 })).includes('3. '));
  assert.ok(!cardHtml(card(), ctx()).includes('undefined'));
});

test('즐겨찾기 버튼: data-action, data-id, aria-pressed', () => {
  const off = cardHtml(card({}, { id: 'seoul-01' }), ctx({ favorite: false }));
  assert.ok(off.includes('data-action="favorite" data-id="seoul-01"'));
  assert.ok(off.includes('aria-pressed="false"'));
  const on = cardHtml(card({}, { id: 'seoul-01' }), ctx({ favorite: true }));
  assert.ok(on.includes('aria-pressed="true"'));
});

test('detailHtml: 코스 정보와 교통편, 출처가 들어가고 HTML은 이스케이프된다', () => {
  const c = makeCourse({ name: '<b>코스</b>', distanceKm: 12, durationMin: 240, difficulty: '보통', description: '설명 & 요약' });
  const html = detailHtml(c);
  for (const s of ['12km', '4시간', '보통', '지하철 1번 출구', '설명 &amp; 요약', '샘플 데이터']) assert.ok(html.includes(s), s);
  assert.ok(!html.includes('<b>코스</b>'));
});

test('detailHtml: 교통편이 비어 있으면 교통편 줄을 만들지 않는다', () => {
  assert.ok(!detailHtml(makeCourse({ transit: '' })).includes('class="transit"'));
});

test('approachHtml: 위치가 있으면 직선거리와 안내, 없으면 위치 불명 안내', () => {
  const withPos = approachHtml({ distanceKm: 12.34, hasPosition: true, move: 'transit' });
  assert.ok(withPos.includes('12.3km') && withPos.includes('직선'));
  assert.ok(withPos.includes('대중교통'));
  assert.ok(approachHtml({ distanceKm: 5, hasPosition: true, move: 'car' }).includes('자동차'));
  const noPos = approachHtml({ distanceKm: null, hasPosition: false, move: 'transit' });
  assert.ok(noPos.includes('현재 위치를 알 수 없'));
  assert.ok(!noPos.includes('null'));
});
