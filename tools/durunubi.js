// 한국관광공사 두루누비 정보 서비스(공공데이터포털) 응답을 앱의 코스 형태로 바꾸는 순수 함수들.
const round5 = (n) => Math.round(n * 1e5) / 1e5;

export function parseGpx(xml) {
  const points = [];
  for (const m of String(xml ?? '').matchAll(/<trkpt\s+lat="([^"]*)"\s+lon="([^"]*)"/g)) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (m[1] !== '' && m[2] !== '' && Number.isFinite(lat) && Number.isFinite(lng)) points.push([lat, lng]);
  }
  return points;
}

// 처음과 끝을 보존하며 최대 max개 점으로 고르게 줄인다.
export function simplifyPath(points, max = 60) {
  if (points.length === 0) return [];
  const n = points.length;
  const count = Math.min(n, max);
  if (count === 1) return [points[0].map(round5)];
  return Array.from({ length: count }, (_, i) => points[Math.round((i * (n - 1)) / (count - 1))].map(round5));
}

export function levelToDifficulty(level) {
  return { 1: '쉬움', 2: '보통' }[Number(level)] ?? null;
}

export function stripHtml(s) {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTransit(travelerinfo) {
  const lines = String(travelerinfo ?? '').split(/<br\s*\/?>/i).map(stripHtml);
  return lines.filter((l) => l.includes('교통편')).join(' / ').slice(0, 200);
}

export function regionOf(sigun) {
  const head = String(sigun ?? '').split(' ')[0];
  return head === '서울' || head === '경기' ? head : null;
}

// 서울·경기의 난이도 상 이하 코스만 변환한다. 입문자용 앱이라 난이도 상(3)은 제외한다.
export function toCourse(item, path) {
  const region = regionOf(item.sigun);
  const difficulty = levelToDifficulty(item.crsLevel);
  const distanceKm = Number(item.crsDstnc);
  const durationMin = Number(item.crsTotlRqrmHour);
  if (!region || !difficulty || path.length < 2) return null;
  if (!(distanceKm > 0) || !Number.isInteger(durationMin) || durationMin <= 0) return null;

  const name = stripHtml(item.crsKorNm);
  const [startLat, startLng] = path[0];
  const [endLat, endLng] = path[path.length - 1];
  return {
    id: `durunubi-${item.crsIdx}`,
    name,
    region,
    distanceKm,
    durationMin,
    difficulty,
    start: { lat: startLat, lng: startLng, name: `${name} 시점` },
    end: { lat: endLat, lng: endLng },
    path,
    transit: extractTransit(item.travelerinfo),
    description: stripHtml(item.crsSummary).slice(0, 300),
    source: '한국관광공사 두루누비 정보 서비스(공공데이터포털)',
    isSample: false,
  };
}
