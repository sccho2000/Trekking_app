export function makeCourse(overrides = {}) {
  return {
    id: 'c1',
    name: '(샘플) 테스트 코스',
    region: '서울',
    distanceKm: 6,
    durationMin: 180,
    difficulty: '쉬움',
    start: { lat: 37.55, lng: 126.98, name: '출발점' },
    end: { lat: 37.56, lng: 126.99 },
    path: [[37.55, 126.98], [37.555, 126.985], [37.56, 126.99]],
    transit: '지하철 1번 출구 도보 5분',
    description: '테스트용 코스',
    source: '샘플 데이터',
    isSample: true,
    ...overrides,
  };
}
