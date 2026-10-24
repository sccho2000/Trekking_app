import { COURSES } from '../data/courses.js';
import { validCourses } from './courses.js';
import { recommend, REGION_CENTER } from './recommend.js';
import { fetchWeather, describeWeather } from './weather.js';
import { cardHtml, escapeHtml } from './render.js';
import { buildDirectionsLinks } from './links.js';
import { loadNaverMap, showRoute } from './mapview.js';
import { NAVER_MAP_CLIENT_ID } from '../config.js';

const courses = validCourses(COURSES);
const $ = (sel) => document.querySelector(sel);
const state = { time: 'half', origin: 'here', move: 'transit', position: null, cards: [], weather: null };

function syncChips() {
  document.querySelectorAll('.group').forEach((g) => {
    g.querySelectorAll('.chip').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === state[g.dataset.group]));
    });
  });
}

function getPosition(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

function weatherPoint() {
  if (state.position) return state.position;
  return state.origin === 'gyeonggi' ? REGION_CENTER.경기 : REGION_CENTER.서울;
}

function showResults({ cards, canRelax }) {
  state.cards = cards;
  const showTransit = state.move === 'transit';
  $('#results').innerHTML = cards.map((card) => cardHtml(card, { showTransit, weather: state.weather })).join('');
  $('#empty').hidden = cards.length > 0;
  $('#relax').hidden = !canRelax;
}

async function search({ relaxTime = false } = {}) {
  $('#region-prompt').hidden = true;
  $('#status').textContent = '코스를 찾는 중…';
  state.position = state.origin === 'here' ? await getPosition() : null;

  const result = recommend({ courses, time: state.time, origin: state.origin, position: state.position, relaxTime });
  if (result.needsRegion) {
    $('#status').textContent = '';
    $('#results').innerHTML = '';
    $('#empty').hidden = true;
    $('#relax').hidden = true;
    $('#region-prompt').hidden = false;
    return;
  }
  state.weather = describeWeather(await fetchWeather(weatherPoint()));
  $('#status').textContent = '';
  showResults(result);
}

document.querySelectorAll('.group').forEach((g) => {
  g.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state[g.dataset.group] = chip.dataset.value;
    syncChips();
  });
});
$('#go').addEventListener('click', () => search());
$('#relax').addEventListener('click', () => search({ relaxTime: true }));
$('#region-prompt').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-region]');
  if (!btn) return;
  state.origin = btn.dataset.region;
  syncChips();
  search();
});

const naverReady = loadNaverMap(NAVER_MAP_CLIENT_ID);
const APP_OPEN_WAIT_MS = 1500;

function findCard(id) {
  return state.cards.find((c) => c.course.id === id);
}

async function previewCourse(card) {
  $('#map-title').textContent = card.course.name;
  $('#map-panel').hidden = false;
  showRoute($('#map'), card.course, await naverReady);
  $('#map-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function confirmCourse(card) {
  const course = card.course;
  $('#confirm-panel').hidden = false;
  $('#confirm-panel').innerHTML = '<p>현재 위치를 확인하는 중…</p>';
  if (!state.position) state.position = await getPosition();
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
    window.location.href = links.app;
    setTimeout(() => {
      if (!document.hidden) window.open(links.web, '_blank', 'noopener');
    }, APP_OPEN_WAIT_MS);
  });
  $('#confirm-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('#results').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  const card = btn && findCard(btn.dataset.id);
  if (!card) return;
  if (btn.dataset.action === 'preview') previewCourse(card);
  else confirmCourse(card);
});

syncChips();
