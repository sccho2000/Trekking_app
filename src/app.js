import { COURSES } from '../data/courses.js';
import { NAVER_MAP_CLIENT_ID } from '../config.js';
import { validCourses } from './courses.js';
import { recommend, REGION_CENTER, MAX_NEARBY_KM } from './recommend.js';
import { fetchWeather, describeWeather } from './weather.js';
import { cardHtml, detailHtml, approachHtml } from './render.js';
import { buildDirectionsLinks } from './links.js';
import { loadNaverMap, showRoute, showApproach } from './mapview.js';
import { getPosition } from './geolocate.js';
import { createSequencer } from './latest.js';
import { openDirections } from './openLinks.js';
import { createFavorites, favoriteCards } from './favorites.js';
import { paginate } from './paginate.js';
import { haversineKm } from './geo.js';

const courses = validCourses(COURSES);
const $ = (sel) => document.querySelector(sel);
const state = {
  time: 'half', origin: 'here', move: 'transit',
  position: null, allCards: [], page: 1, canRelax: false, weather: null, favoritesView: false,
};
const searches = createSequencer();
const details = createSequencer();
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
const EMPTY_FAVORITES = '아직 즐겨찾기한 코스가 없어요. 카드의 ☆ 버튼으로 추가해 보세요.';
let emptyText = EMPTY_DEFAULT;

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

// 목록을 10개씩 나눠 현재 쪽만 그린다.
function renderCards() {
  const showTransit = state.move === 'transit';
  const weather = state.favoritesView ? null : state.weather;
  const view = paginate(state.allCards, state.page);
  state.page = view.page;
  $('#results').innerHTML = view.items
    .map((card, i) => cardHtml(card, { showTransit, weather, favorite: favorites.has(card.course.id), rank: view.from + i }))
    .join('');
  $('#empty-text').textContent = emptyText;
  $('#empty').hidden = view.total > 0;
  $('#relax').hidden = state.favoritesView || !state.canRelax;
  $('#pager').hidden = view.totalPages <= 1;
  $('#prev').disabled = !view.hasPrev;
  $('#next').disabled = !view.hasNext;
  $('#page-info').textContent = `${view.from}–${view.to} / 총 ${view.total}개 (${view.page}/${view.totalPages}쪽)`;
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
  $('#region-prompt').hidden = true;
  $('#go').disabled = true;
  setStatus('코스를 찾는 중…');
  try {
    const position = cond.origin === 'here' ? await getPosition() : null;
    if (!searches.isCurrent(token)) return;
    state.position = position;

    const result = recommend({ courses, time: cond.time, origin: cond.origin, position, relaxTime });
    if (result.needsRegion) {
      setStatus('');
      state.allCards = [];
      emptyText = EMPTY_DEFAULT;
      renderCards();
      $('#empty').hidden = true;
      $('#region-prompt').hidden = false;
      return;
    }
    const weather = describeWeather(await fetchWeather(weatherPoint({ origin: cond.origin, position })));
    if (!searches.isCurrent(token)) return;
    setStatus('');
    state.weather = weather;
    state.allCards = result.cards;
    state.canRelax = result.canRelax;
    state.page = 1;
    emptyText = emptyMessage(result, cond);
    renderCards();
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
  $('#region-prompt').hidden = true;
  setStatus('');
  state.allCards = favoriteCards(courses, favorites.list(), state.position);
  state.page = 1;
  emptyText = EMPTY_FAVORITES;
  renderCards();
  syncFavoriteButton();
}

function toggleFavorite(card) {
  favorites.toggle(card.course.id);
  if (state.favoritesView) {
    state.allCards = favoriteCards(courses, favorites.list(), state.position);
    emptyText = EMPTY_FAVORITES;
  }
  renderCards();
  syncFavoriteButton();
}

const findCard = (id) => state.allCards.find((c) => c.course.id === id);

// ---- 코스 선택 화면: 왼쪽 코스 지도·정보, 오른쪽 현재 위치 → 출발점 ----
let homeScroll = 0;

function showDetailView(visible) {
  $('#home-view').hidden = visible;
  $('#detail-view').hidden = !visible;
  $('#app').classList.toggle('wide', visible);
}

async function openDetail(card) {
  const course = card.course;
  const token = details.next();
  homeScroll = window.scrollY;
  history.pushState({ view: 'detail' }, '');
  showDetailView(true);
  window.scrollTo(0, 0);

  $('#course-info').innerHTML = detailHtml(course);
  $('#approach-info').innerHTML = '<p>현재 위치를 확인하는 중…</p>';
  $('#open-directions').disabled = true;
  $('#course-map').innerHTML = '<p class="map-note">지도를 불러오는 중…</p>';
  $('#approach-map').innerHTML = '<p class="map-note">지도를 불러오는 중…</p>';

  const naver = await naverReady;
  if (!details.isCurrent(token)) return;
  showRoute($('#course-map'), course, naver); // 지도는 화면에 보이는 상태에서 만들어야 크기가 맞는다

  const position = state.position ?? (await getPosition());
  if (!details.isCurrent(token)) return;
  state.position = position;
  const start = course.start;
  showApproach($('#approach-map'), position, start, naver);
  $('#approach-info').innerHTML = approachHtml({
    distanceKm: position ? haversineKm(position, start) : null,
    hasPosition: Boolean(position),
    move: state.move,
  });

  const links = buildDirectionsLinks({
    from: position,
    to: { lat: start.lat, lng: start.lng, name: start.name },
    mode: state.move === 'car' ? 'car' : 'transit',
  });
  const btn = $('#open-directions');
  btn.disabled = false;
  btn.onclick = () => openDirections(links, openEnv());
}

function showHome() {
  details.next(); // 진행 중인 상세 화면 작업을 무시한다
  showDetailView(false);
  window.scrollTo(0, homeScroll);
}

$('#back').addEventListener('click', () => {
  if (history.state?.view === 'detail') history.back(); // popstate에서 처음 화면으로 돌아간다
  else showHome();
});
window.addEventListener('popstate', () => {
  if (!$('#detail-view').hidden) showHome();
});

// ---- 이벤트 ----
document.querySelectorAll('.group').forEach((g) => {
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state[g.dataset.group] = chip.dataset.value;
    syncChips();
    if (g.dataset.group === 'move' && state.allCards.length > 0) renderCards(); // 대중교통 문구를 바로 반영
  });
});
$('#go').addEventListener('click', () => search());
$('#relax').addEventListener('click', () => search({ relaxTime: true }));
$('#fav-toggle').addEventListener('click', () => (state.favoritesView ? search() : showFavorites()));
$('#prev').addEventListener('click', () => { state.page -= 1; renderCards(); window.scrollTo(0, 0); });
$('#next').addEventListener('click', () => { state.page += 1; renderCards(); window.scrollTo(0, 0); });
$('#region-prompt').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-region]');
  if (!btn) return;
  state.origin = btn.dataset.region;
  syncChips();
  search();
});
$('#results').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  const card = btn && findCard(btn.dataset.id);
  if (!card) return;
  if (btn.dataset.action === 'favorite') toggleFavorite(card);
  else openDetail(card);
});

syncChips();
syncFavoriteButton();
