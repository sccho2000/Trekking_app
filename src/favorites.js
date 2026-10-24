import { haversineKm } from './geo.js';

const KEY = 'trekking.favorites';

function readIds(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY));
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// 즐겨찾기 id 목록. 브라우저 저장소를 못 쓰는 환경(시크릿 모드 등)에서도 메모리로는 동작한다.
export function createFavorites(storage) {
  let ids = readIds(storage);
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(ids));
    } catch {
      // 저장 실패는 무시하고 이번 방문 동안만 유지한다.
    }
  };
  return {
    has: (id) => ids.includes(id),
    list: () => [...ids],
    toggle(id) {
      const added = !ids.includes(id);
      ids = added ? [...ids, id] : ids.filter((x) => x !== id);
      save();
      return added;
    },
  };
}

// 즐겨찾기 코스를 카드 형태로 만든다. 위치가 있으면 가까운 순, 없으면 저장된 순서.
export function favoriteCards(courses, ids, position) {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const cards = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((course) => {
      const distanceKm = position ? haversineKm(position, course.start) : null;
      return {
        course,
        distanceKm,
        mediumDifficulty: course.difficulty === '보통',
        reason: distanceKm !== null ? `내 위치에서 ${distanceKm.toFixed(1)}km` : '즐겨찾기한 코스',
      };
    });
  return position ? cards.sort((a, b) => a.distanceKm - b.distanceKm) : cards;
}
