import { formatDuration } from './recommend.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function cardHtml(card, { showTransit, weather }) {
  const c = card.course;
  const id = escapeHtml(c.id);
  return `
<article class="card">
  <h3>${escapeHtml(c.name)}</h3>
  <p class="meta">${c.distanceKm}km · ${formatDuration(c.durationMin)} · ${escapeHtml(c.difficulty)}</p>
  ${card.mediumDifficulty ? '<p class="badge-medium">쉬움 코스가 부족해 보통 코스도 함께 보여 드려요</p>' : ''}
  <p class="reason">${escapeHtml(card.reason)}</p>
  ${showTransit ? `<p class="transit">${escapeHtml(c.transit)}</p>` : ''}
  ${weather ? `<p class="weather${weather.warn ? ' warn' : ''}">${escapeHtml(weather.text)}</p>` : ''}
  ${c.isSample ? '<p class="sample">샘플 데이터</p>' : ''}
  <div class="actions">
    <button type="button" data-action="preview" data-id="${id}">지도에서 보기</button>
    <button type="button" class="primary" data-action="select" data-id="${id}">이 코스로 정하기</button>
  </div>
</article>`;
}
