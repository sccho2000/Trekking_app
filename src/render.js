import { formatDuration } from './recommend.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function cardHtml(card, { showTransit, weather, favorite = false, rank = null }) {
  const c = card.course;
  const id = escapeHtml(c.id);
  return `
<article class="card">
  <div class="card-head">
    <h3>${rank ? `${rank}. ` : ''}${escapeHtml(c.name)}</h3>
    <button type="button" class="fav" data-action="favorite" data-id="${id}" aria-pressed="${favorite}" aria-label="즐겨찾기">${favorite ? '★' : '☆'}</button>
  </div>
  <p class="meta">${c.distanceKm}km · ${formatDuration(c.durationMin)} · ${escapeHtml(c.difficulty)}</p>
  ${card.mediumDifficulty ? '<p class="badge-medium">쉬움 코스가 부족해 보통 코스도 함께 보여 드려요</p>' : ''}
  <p class="reason">${escapeHtml(card.reason)}</p>
  ${showTransit ? `<p class="transit">${escapeHtml(c.transit)}</p>` : ''}
  ${weather ? `<p class="weather${weather.warn ? ' warn' : ''}">${escapeHtml(weather.text)}</p>` : ''}
  ${c.isSample ? '<p class="sample">샘플 데이터</p>' : ''}
  <div class="actions">
    <button type="button" class="primary" data-action="select" data-id="${id}">코스 선택</button>
  </div>
</article>`;
}

// 코스 선택 화면의 왼쪽: 코스 정보
export function detailHtml(c) {
  return `
<h2>${escapeHtml(c.name)}</h2>
<p class="meta">${c.distanceKm}km · ${formatDuration(c.durationMin)} · ${escapeHtml(c.difficulty)}</p>
${c.transit ? `<p class="transit">${escapeHtml(c.transit)}</p>` : ''}
${c.description ? `<p>${escapeHtml(c.description)}</p>` : ''}
<p class="sample">출처: ${escapeHtml(c.source)}${c.isSample ? ' · 샘플 데이터' : ''}</p>`;
}

// 코스 선택 화면의 오른쪽: 현재 위치에서 출발점까지
export function approachHtml({ distanceKm, hasPosition, move }) {
  if (!hasPosition) {
    return '<p>현재 위치를 알 수 없어 출발점만 표시했어요. 네이버 지도에서 출발지를 현재 위치로 골라 주세요.</p>';
  }
  const how = move === 'car' ? '자동차' : '대중교통';
  return `<p class="meta">현재 위치에서 출발점까지 직선 약 ${distanceKm.toFixed(1)}km</p>
<p>지도의 점선은 직선 거리예요. 실제 ${how} 경로는 아래 버튼으로 네이버 지도에서 확인하세요.</p>`;
}
