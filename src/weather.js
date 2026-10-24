export const RAIN_WARN_PCT = 60;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function parseForecast(json) {
  const d = json && json.daily;
  if (!d) return null;
  const rainProb = d.precipitation_probability_max?.[0];
  const tMax = d.temperature_2m_max?.[0];
  const tMin = d.temperature_2m_min?.[0];
  if (![rainProb, tMax, tMin].every(isNum)) return null;
  return { rainProb, tMax, tMin };
}

export async function fetchWeather(point, fetchFn = fetch, timeoutMs = 5000) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${point.lat}&longitude=${point.lng}` +
    '&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min' +
    '&timezone=Asia%2FSeoul&forecast_days=1';
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); });
  const request = (async () => {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    return parseForecast(await res.json());
  })().catch(() => null);
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function describeWeather(w) {
  if (!w) return { text: '날씨 정보를 불러오지 못했어요', warn: false };
  const base = `강수확률 ${w.rainProb}% · ${Math.round(w.tMin)}~${Math.round(w.tMax)}°`;
  return w.rainProb >= RAIN_WARN_PCT
    ? { text: `오늘 비 예보 · ${base}`, warn: true }
    : { text: base, warn: false };
}
