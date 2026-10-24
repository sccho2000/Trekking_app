import { haversineKm } from './geo.js';

export const REGION_CENTER = {
  서울: { lat: 37.5665, lng: 126.978 },
  경기: { lat: 37.2636, lng: 127.0286 },
};

const ORIGIN_REGION = { seoul: '서울', gyeonggi: '경기' };
const BUCKET_CENTER_MIN = { short: 120, half: 210, full: 330 };
const MAX_CARDS = 3;
export const MAX_NEARBY_KM = 60;

export function durationBucket(min) {
  if (min <= 150) return 'short';
  if (min < 270) return 'half';
  return 'full';
}

export function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function buildReason(course, distanceKm) {
  const parts = [];
  if (distanceKm !== null) parts.push(`내 위치에서 ${distanceKm.toFixed(1)}km`);
  parts.push(formatDuration(course.durationMin), course.difficulty);
  return parts.join(' · ');
}

export function recommend({ courses, time, origin, position, relaxTime = false }) {
  if (origin === 'here' && !position) return { cards: [], needsRegion: true, canRelax: false, noNearby: false };

  const region = ORIGIN_REGION[origin];
  const inScope = courses
    .filter((c) => !region || c.region === region)
    .filter((c) => relaxTime || durationBucket(c.durationMin) === time)
    .map((course) => ({
      course,
      distanceKm: origin === 'here' ? haversineKm(position, course.start) : null,
    }));
  // 내 위치 기준에서는 너무 먼 코스를 추천하지 않는다.
  const candidates = origin === 'here' ? inScope.filter((c) => c.distanceKm <= MAX_NEARBY_KM) : inScope;
  const noNearby = origin === 'here' && inScope.length > 0 && candidates.length === 0;

  const rank = (c) => (c.course.difficulty === '쉬움' ? 0 : 1);
  const secondary = (c) =>
    c.distanceKm !== null ? c.distanceKm : Math.abs(c.course.durationMin - BUCKET_CENTER_MIN[time]);
  // 내 위치 기준이면 가까운 순이 우선(난이도는 동률일 때만), 지역 선택이면 쉬움 코스가 우선.
  candidates.sort((a, b) =>
    origin === 'here'
      ? secondary(a) - secondary(b) || rank(a) - rank(b)
      : rank(a) - rank(b) || secondary(a) - secondary(b),
  );

  const cards = candidates.slice(0, MAX_CARDS).map(({ course, distanceKm }) => ({
    course,
    distanceKm,
    mediumDifficulty: course.difficulty === '보통',
    reason: buildReason(course, distanceKm),
  }));
  return { cards, needsRegion: false, canRelax: cards.length < MAX_CARDS && !relaxTime, noNearby };
}
