const REGIONS = ['서울', '경기'];
const DIFFICULTIES = ['쉬움', '보통'];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPoint = (p) => p && isNum(p.lat) && isNum(p.lng);
const isText = (v) => typeof v === 'string' && v !== '';
const isPathPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(isNum);

export function isValidCourse(c) {
  return Boolean(
    c &&
      isText(c.id) &&
      isText(c.name) &&
      REGIONS.includes(c.region) &&
      isNum(c.distanceKm) && c.distanceKm > 0 &&
      Number.isInteger(c.durationMin) && c.durationMin > 0 &&
      DIFFICULTIES.includes(c.difficulty) &&
      isPoint(c.start) && isText(c.start.name) &&
      isPoint(c.end) &&
      Array.isArray(c.path) && c.path.every(isPathPoint) &&
      typeof c.transit === 'string',
  );
}

export function validCourses(list) {
  const seen = new Set();
  return list.filter((c) => {
    if (!isValidCourse(c) || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
