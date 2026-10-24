import { COURSES } from '../data/courses.js';
import { validCourses } from './courses.js';
import { recommend, REGION_CENTER } from './recommend.js';
import { fetchWeather, describeWeather } from './weather.js';
import { cardHtml, escapeHtml } from './render.js';
import { buildDirectionsLinks, buildCourseMapLinks } from './links.js';
import { showRoute } from './mapview.js';
import { getPosition } from './geolocate.js';
import { createSequencer } from './latest.js';
import { openDirections } from './openLinks.js';

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

const searches = createSequencer();
const confirms = createSequencer();

function weatherPoint({ origin, position }) {
  if (position) return position;
  return origin === 'gyeonggi' ? REGION_CENTER.경기 : REGION_CENTER.서울;
}

function showResults({ cards, canRelax }, { move, weather }) {
  state.cards = cards;
  const showTransit = move === 'transit';
  $('#results').innerHTML = cards.map((card) => cardHtml(card, { showTransit, weather })).join('');
  $('#empty').hidden = cards.length > 0;
  $('#relax').hidden = !canRelax;
}

async function search({ relaxTime = false } = {}) {
  const token = searches.next();
  const cond = { time: state.time, origin: state.origin, move: state.move };
  $('#go').disabled = true;
  $('#region-prompt').hidden = true;
  $('#status').textContent = '코스를 찾는 중…';
  try {
    const position = cond.origin === 'here' ? await getPosition() : null;
    if (!searches.isCurrent(token)) return;
    state.position = position;

    const result = recommend({ courses, time: cond.time, origin: cond.origin, position, relaxTime });
    if (result.needsRegion) {
      $('#status').textContent = '';
      $('#results').innerHTML = '';
      $('#empty').hidden = true;
      $('#relax').hidden = true;
      $('#region-prompt').hidden = false;
      return;
    }
    const weather = describeWeather(await fetchWeather(weatherPoint({ origin: cond.origin, position })));
    if (!searches.isCurrent(token)) return;
    $('#status').textContent = '';
    showResults(result, { move: cond.move, weather });
  } finally {
    if (searches.isCurrent(token)) $('#go').disabled = false;
  }
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


function findCard(id) {
  return state.cards.find((c) => c.course.id === id);
}

function previewCourse(card) {
  // 클릭 직후 동기적으로 열어야 팝업 차단에 걸리지 않는다.
  openDirections(buildCourseMapLinks(card.course), {
    ua: navigator.userAgent, location: window.location, doc: document, win: window,
  });
  $('#map-title').textContent = card.course.name;
  $('#map-panel').hidden = false;
  showRoute($('#map'), card.course);
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
    openDirections(links, { ua: navigator.userAgent, location: window.location, doc: document, win: window });
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
