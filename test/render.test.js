import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, cardHtml } from '../src/render.js';
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

test('버튼의 data-action, data-id', () => {
  const html = cardHtml(card({}, { id: 'seoul-01' }), ctx());
  assert.ok(html.includes('data-action="preview" data-id="seoul-01"'));
  assert.ok(html.includes('data-action="select" data-id="seoul-01"'));
  assert.ok(html.includes('지도에서 보기') && html.includes('이 코스로 정하기'));
});
