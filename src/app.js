import { COURSES } from '../data/courses.js';
import { NAVER_MAP_CLIENT_ID } from '../config.js';
import { validCourses } from './courses.js';
import { recommend, REGION_CENTER, MAX_NEARBY_KM } from './recommend.js';
import { fetchWeather, describeWeather } from './weather.js';
import { cardHtml, escapeHtml } from './render.js';
import { buildDirectionsLinks, buildCourseMapLinks } from './links.js';
import { loadNaverMap, showRoute } from './mapview.js';
import { getPosition } from './geolocate.js';
import { createSequencer } from './latest.js';
import { openDirections } from './openLinks.js';
import { createFavorites, favoriteCards } from './favorites.js';

const courses = validCourses(COURSES);
const $ = (sel) => document.querySelector(sel);
const state = {
  time: 'half', origin: 'here', move: 'transit',
  position: null, cards: [], canRelax: false, weather: null, favoritesView: false, previewCourse: null,
};
const searches = createSequencer();
const confirms = createSequencer();
const naverReady = loadNaverMap(NAVER_MAP_CLIENT_ID);

let storage = null;
try {
  storage = window.localStorage;
} catch {
  // 저장소를 못 쓰면 이번 방문 동안만 즐겨찾기가 유지된다.
}
const favorites = createFavorites(storage);

const openEnv = () => ({ ua: navigator.userAgent, location: window.location, doc: document, win: window });
const EMPTY_DEFAULT = '조건에 맞는 코스가 없어요.';

function setStatus(text) {
  $('#status').textContent = text;
}

function syncChips() {
  document.querySelectorAll('.group').forEach((g) => {
    g.querySelectorAll('.chip').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === state[g.dataset.group]));
    });
  });
}

function syncFavoriteButton() {
  const btn = $('#fav-toggle');
  btn.textContent = `★ 즐겨찾기 (${favorites.list().length})`;
  btn.setAttribute('aria-pressed', String(state.favoritesView));
}

function renderCards(emptyText = EMPTY_DEFAULT) {
  const showTransit = state.move === 'transit';
  const weather = state.favoritesView ? null : state.weather;
  $('#results').innerHTML = state.cards
    .map((card) => cardHtml(card, { showTransit, weather, favorite: favorites.has(card.course.id) }))
    .join('');
  $('#empty-text').textContent = emptyText;
  $('#empty').hidden = state.cards.length > 0;
  $('#relax').hidden = state.favoritesView || !state.canRelax;
}

function hidePanels() {
  $('#map-panel').hidden = true;
  $('#confirm-panel').hidden = true;
  $('#region-prompt').hidden = true;
}

function weatherPoint({ origin, position }) {
  if (position) return position;
  return origin === 'gyeonggi' ? REGION_CENTER.경기 : REGION_CENTER.서울;
}

function emptyMessage(result, cond) {
  if (result.noNearby) return `내 위치에서 ${MAX_NEARBY_KM}km 안에 맞는 코스가 없어요. 출발 지역을 경기로 골라 보세요.`;
  if (cond.origin === 'seoul') return '서울에는 아직 수록된 코스가 없어요. 경기를 골라 보세요.';
  if (cond.time === 'short') return '2시간 안팎 코스는 아직 없어요. 반나절이나 하루 종일을 골라 보세요.';
  return EMPTY_DEFAULT;
}

async function search({ relaxTime = false } = {}) {
  const token = searches.next();
  const cond = { time: state.time, origin: state.origin };
  state.favoritesView = false;
  syncFavoriteButton();
  hidePanels();
  $('#go').disabled = true;
  setStatus('코스를 찾는 중…');
  try {
    const position = cond.origin === 'here' ? await getPosition() : null;
    if (!searches.isCurrent(token)) return;
    state.position = position;

    const result = recommend({ courses, time: cond.time, origin: cond.origin, position, relaxTime });
    if (result.needsRegion) {
      setStatus('');
      state.cards = [];
      renderCards();
      $('#empty').hidden = true;
      $('#region-prompt').hidden = false;
      return;
    }
    const weather = describeWeather(await fetchWeather(weatherPoint({ origin: cond.origin, position })));
    if (!searches.isCurrent(token)) return;
    setStatus('');
    state.weather = weather;
    state.cards = result.cards;
    state.canRelax = result.canRelax;
    renderCards(emptyMessage(result, cond));
  } catch {
    if (searches.isCurrent(token)) setStatus('문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.');
  } finally {
    if (searches.isCurrent(token)) $('#go').disabled = false;
  }
}

function showFavorites() {
  searches.next(); // 진행 중인 검색 결과가 즐겨찾기 화면을 덮지 않게 한다.
  $('#go').disabled = false;
  state.favoritesView = true;
  hidePanels();
  setStatus('');
  state.cards = favoriteCards(courses, favorites.list(), state.position);
  renderCards('아직 즐겨찾기한 코스가 없어요. 카드의 ☆ 버튼으로 추가해 보세요.');
  syncFavoriteButton();
}

function findCard(id) {
  return state.cards.find((c) => c.course.id === id);
}

async function previewCourse(card) {
  state.previewCourse = card.course;
  $('#map-title').textContent = card.course.name;
  $('#map-panel').hidden = false;
  $('#map').innerHTML = '<p class="map-note">지도를 불러오는 중…</p>';
  const naver = await naverReady;
  if (state.previewCourse !== card.course) return;
  showRoute($('#map'), card.course, naver);
  $('#map-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function confirmCourse(card) {
  const course = card.course;
  const token = confirms.next();
  $('#confirm-panel').hidden = false;
  $('#confirm-panel').innerHTML = '<p>현재 위치를 확인하는 중…</p>';
  const position = state.position ?? (await getPosition());
  if (!confirms.isCurrent(token)) return;
  state.position = position;
  const links = buildDirectionsLinks({
    from: state.position,
    to: { lat: course.start.lat, lng: course.start.lng, name: course.start.name },
    mode: state.move === 'car' ? 'car' : 'transit',
  });
  $('#confirm-panel').innerHTML =
    `<h2>${escapeHtml(course.name)}</h2>` +
    '<p>이 코스로 정했어요. 현재 위치에서 출발점까지 가는 길을 네이버 지도에서 열어 보세요.</p>' +
    (state.position ? '' : '<p class="map-note">현재 위치를 알 수 없어 도착지만 지정했어요. 지도 앱에서 출발지를 현재 위치로 골라 주세요.</p>') +
    `<a class="primary" id="open-directions" href="${escapeHtml(links.web)}">네이버 지도에서 길찾기</a>`;
  $('#open-directions').addEventListener('click', (e) => {
    e.preventDefault();
    openDirections(links, openEnv());
  });
  $('#confirm-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleFavorite(card) {
  favorites.toggle(card.course.id);
  if (state.favoritesView) {
    state.cards = favoriteCards(courses, favorites.list(), state.position);
    renderCards('아직 즐겨찾기한 코스가 없어요. 카드의 ☆ 버튼으로 추가해 보세요.');
  } else {
    renderCards();
  }
  syncFavoriteButton();
}

document.querySelectorAll('.group').forEach((g) => {
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state[g.dataset.group] = chip.dataset.value;
    syncChips();
    if (g.dataset.group === 'move' && state.cards.length > 0) renderCards(); // 대중교통 문구를 바로 반영
  });
});
$('#go').addEventListener('click', () => search());
$('#relax').addEventListener('click', () => search({ relaxTime: true }));
$('#fav-toggle').addEventListener('click', () => (state.favoritesView ? search() : showFavorites()));
$('#region-prompt').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-region]');
  if (!btn) return;
  state.origin = btn.dataset.region;
  syncChips();
  search();
});
$('#open-naver').addEventListener('click', () => {
  if (state.previewCourse) openDirections(buildCourseMapLinks(state.previewCourse), openEnv());
});
$('#results').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  const card = btn && findCard(btn.dataset.id);
  if (!card) return;
  if (btn.dataset.action === 'favorite') toggleFavorite(card);
  else if (btn.dataset.action === 'preview') previewCourse(card);
  else confirmCourse(card);
});

syncChips();
syncFavoriteButton();
