const REGIONS = ['서울', '경기'];
const DIFFICULTIES = ['쉬움', '보통'];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPoint = (p) => p && isNum(p.lat) && isNum(p.lng);

export function isValidCourse(c) {
  return Boolean(
    c &&
      typeof c.name === 'string' && c.name &&
      REGIONS.includes(c.region) &&
      isNum(c.distanceKm) &&
      isNum(c.durationMin) &&
      DIFFICULTIES.includes(c.difficulty) &&
      isPoint(c.start) &&
      isPoint(c.end) &&
      Array.isArray(c.path),
  );
}

export function validCourses(list) {
  return list.filter(isValidCourse);
}
