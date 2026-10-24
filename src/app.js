import { COURSES } from '../data/courses.js';
import { validCourses } from './courses.js';
import { recommend, REGION_CENTER } from './recommend.js';
import { fetchWeather, describeWeather } from './weather.js';
import { cardHtml } from './render.js';

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

syncChips();
