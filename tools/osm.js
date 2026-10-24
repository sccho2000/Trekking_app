// OpenStreetMap(Overpass) 걷기 경로 relation을 앱의 코스 형태로 바꾸는 순수 함수들.
// 데이터 © OpenStreetMap contributors, ODbL — 화면에 출처를 표시해야 한다.
import { haversineKm } from '../src/geo.js';
import { simplifyPath } from './durunubi.js';

const SKIP_ROLES = new Set(['alternative', 'excursion', 'approach', 'connection', 'guidepost', 'platform', 'stop', 'entry_point']);
const SKIP_NAME = /등산로|정맥|종주|트레킹 노선/;
const MAX_GAP_KM = 1.5;
const MIN_KM = 1;
const MAX_KM = 20;
const EASY_MAX_KM = 8;
const MIN_PER_KM = 20; // 시속 3km 가정(오르내림·휴식 포함)

const hasHangul = (s) => /[가-힣]/.test(s);
const pt = (p) => ({ lat: p[0], lng: p[1] });
const dist = (a, b) => haversineKm(pt(a), pt(b));
const lengthOf = (pts) => pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);

export function cleanName(tags) {
  const raw = String(tags?.['name:ko'] || tags?.name || '');
  return raw.replace(/^\[([^\]]+)\]\s*/, '$1 ').replace(/\s+/g, ' ').trim();
}

// relation 멤버(way)를 한 줄 경로로 잇는다. 이어지지 않는 틈의 최대 크기(maxGapKm)도 알려 준다.
export function chainWays(members) {
  const ways = (members ?? [])
    .filter((m) => m.type === 'way' && Array.isArray(m.geometry) && m.geometry.length >= 2 && !SKIP_ROLES.has(m.role))
    .map((m) => m.geometry.map((g) => [g.lat, g.lon]));
  if (ways.length === 0) return { path: [], lengthKm: 0, maxGapKm: 0 };

  if (ways.length >= 2) {
    const [first, second] = ways;
    const near = (p) => Math.min(dist(p, second[0]), dist(p, second[second.length - 1]));
    if (near(first[0]) < near(first[first.length - 1])) first.reverse();
  }

  const path = [];
  let lengthKm = 0;
  let maxGapKm = 0;
  for (const pts of ways) {
    lengthKm += lengthOf(pts);
    if (path.length > 0) {
      const end = path[path.length - 1];
      const toStart = dist(end, pts[0]);
      const toEnd = dist(end, pts[pts.length - 1]);
      if (toEnd < toStart) pts.reverse();
      maxGapKm = Math.max(maxGapKm, Math.min(toStart, toEnd));
    }
    path.push(...pts);
  }
  return { path, lengthKm, maxGapKm };
}

export function relationToCourse(relation, region) {
  const name = cleanName(relation.tags);
  if (!hasHangul(name) || SKIP_NAME.test(name)) return null;

  const { path, lengthKm, maxGapKm } = chainWays(relation.members);
  if (path.length < 2 || lengthKm < MIN_KM || lengthKm > MAX_KM || maxGapKm > MAX_GAP_KM) return null;

  const simplified = simplifyPath(path, 60);
  const [startLat, startLng] = simplified[0];
  const [endLat, endLng] = simplified[simplified.length - 1];
  const distanceKm = Math.round(lengthKm * 10) / 10;
  return {
    id: `osm-${relation.id}`,
    name,
    region,
    distanceKm,
    durationMin: Math.max(5, Math.round((lengthKm * MIN_PER_KM) / 5) * 5),
    difficulty: lengthKm <= EASY_MAX_KM ? '쉬움' : '보통',
    start: { lat: startLat, lng: startLng, name: `${name} 시점` },
    end: { lat: endLat, lng: endLng },
    path: simplified,
    transit: '',
    description: String(relation.tags?.description || relation.tags?.note || '').slice(0, 200)
      || '오픈스트리트맵에 등록된 걷기 길이에요. 거리는 경로 기준이고 소요시간은 추정값이에요.',
    source: '© OpenStreetMap contributors (ODbL)',
    isSample: false,
  };
}

export function dedupeById(courses) {
  const seen = new Set();
  return courses.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

// 이름이 같은 코스(구간 정보가 빠진 중복)는 더 긴 것만 남긴다.
export function dedupeByName(courses) {
  const best = new Map();
  for (const c of courses) {
    const prev = best.get(c.name);
    if (!prev || c.distanceKm > prev.distanceKm) best.set(c.name, c);
  }
  return courses.filter((c) => best.get(c.name) === c);
}
