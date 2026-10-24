import test from 'node:test';
import assert from 'node:assert/strict';
import { parseForecast, fetchWeather, describeWeather } from '../src/weather.js';

const good = { daily: { precipitation_probability_max: [70], temperature_2m_max: [18.2], temperature_2m_min: [9] } };
const okFetch = (json) => async () => ({ ok: true, json: async () => json });

test('parseForecast 정상 응답', () => {
  assert.deepEqual(parseForecast(good), { rainProb: 70, tMax: 18.2, tMin: 9 });
});

test('parseForecast 비정상 입력은 예외 없이 null', () => {
  for (const bad of [
    undefined, null, 'x', {}, { daily: {} },
    { daily: { precipitation_probability_max: [], temperature_2m_max: [1], temperature_2m_min: [1] } },
    { daily: { precipitation_probability_max: ['70'], temperature_2m_max: [1], temperature_2m_min: [1] } },
    { daily: { precipitation_probability_max: [null], temperature_2m_max: [1], temperature_2m_min: [1] } },
  ]) {
    assert.equal(parseForecast(bad), null);
  }
});

test('fetchWeather 정상 응답과 요청 URL', async () => {
  let url;
  const fetchFn = async (u) => { url = String(u); return { ok: true, json: async () => good }; };
  const w = await fetchWeather({ lat: 37.5, lng: 127 }, fetchFn);
  assert.deepEqual(w, { rainProb: 70, tMax: 18.2, tMin: 9 });
  assert.ok(url.includes('api.open-meteo.com/v1/forecast'));
  assert.ok(url.includes('latitude=37.5') && url.includes('longitude=127'));
  assert.ok(url.includes('precipitation_probability_max') && url.includes('timezone'));
});

test('fetchWeather 실패는 모두 null', async () => {
  assert.equal(await fetchWeather({ lat: 1, lng: 1 }, async () => ({ ok: false })), null);
  assert.equal(await fetchWeather({ lat: 1, lng: 1 }, async () => { throw new Error('net'); }), null);
  assert.equal(await fetchWeather({ lat: 1, lng: 1 }, async () => ({ ok: true, json: async () => { throw new Error('bad'); } })), null);
  assert.equal(await fetchWeather({ lat: 1, lng: 1 }, okFetch({ nope: 1 })), null);
});

test('describeWeather', () => {
  assert.deepEqual(describeWeather(null), { text: '날씨 정보를 불러오지 못했어요', warn: false });
  const wet = describeWeather({ rainProb: 60, tMax: 20, tMin: 10 });
  assert.equal(wet.warn, true);
  assert.ok(wet.text.includes('비 예보') && wet.text.includes('60%'));
  assert.equal(describeWeather({ rainProb: 59, tMax: 20, tMin: 10 }).warn, false);
});

test('fetchWeather는 응답이 없어도 timeout 뒤에 null', async () => {
  const never = () => new Promise(() => {});
  assert.equal(await fetchWeather({ lat: 1, lng: 1 }, never, 30), null);
});

test('fetchWeather는 좌표를 소수 둘째 자리로 줄여 보낸다', async () => {
  let url;
  await fetchWeather({ lat: 37.56789, lng: 126.97812 }, async (u) => { url = String(u); return { ok: false }; });
  assert.ok(url.includes('latitude=37.57') && url.includes('longitude=126.98'), url);
});

test('describeWeather 문구에 출발 지역 기준임이 드러난다', () => {
  assert.ok(describeWeather({ rainProb: 10, tMax: 20, tMin: 10 }).text.includes('출발 지역'));
});
