// 샘플 데이터: 실제 코스가 아닙니다. 공공데이터로 교체하기 전까지의 임시 값입니다.
const round5 = (n) => Math.round(n * 1e5) / 1e5;

// start에서 (dLat, dLng)만큼 떨어진 곳까지 살짝 굽은 6점 경로를 만든다.
function route(start, dLat, dLng) {
  return Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    return [
      round5(start.lat + dLat * t + 0.003 * Math.sin(t * Math.PI * 3)),
      round5(start.lng + dLng * t + 0.003 * Math.sin(t * Math.PI * 2)),
    ];
  });
}

function sample(id, region, name, distanceKm, durationMin, difficulty, start, delta, transit, description) {
  const path = route(start, ...delta);
  const [endLat, endLng] = path[path.length - 1];
  return {
    id, name: `(샘플) ${name}`, region, distanceKm, durationMin, difficulty,
    start: { ...start, name: `(샘플) ${name} 출발점` },
    end: { lat: endLat, lng: endLng },
    path, transit, description,
    source: '샘플 데이터', isSample: true,
  };
}

export const COURSES = [
  sample('seoul-01', '서울', '도심 성곽 산책길', 5.2, 120, '쉬움', { lat: 37.58, lng: 126.97 }, [0.02, 0.03], '지하철역 도보 5분 (가상)', '도심 가까이에서 짧게 걷는 코스'),
  sample('seoul-02', '서울', '하천변 걷기길', 6.5, 140, '쉬움', { lat: 37.548, lng: 127.04 }, [0.02, 0.05], '지하철역 도보 3분 (가상)', '평탄한 하천변 길'),
  sample('seoul-03', '서울', '둘레길 한 구간', 8.4, 200, '쉬움', { lat: 37.65, lng: 127.02 }, [-0.03, 0.04], '지하철역 도보 8분 (가상)', '완만한 숲길 위주'),
  sample('seoul-04', '서울', '공원 연결 숲길', 9.8, 240, '쉬움', { lat: 37.47, lng: 126.95 }, [0.04, 0.05], '버스 정류장 도보 2분 (가상)', '공원 두 곳을 잇는 코스'),
  sample('seoul-05', '서울', '능선 종주 코스', 13, 300, '보통', { lat: 37.66, lng: 126.95 }, [-0.05, 0.06], '지하철역 도보 10분 (가상)', '오르내림이 있는 긴 코스'),
  sample('gyeonggi-01', '경기', '호수 순환길', 4.8, 100, '쉬움', { lat: 37.3, lng: 127.0 }, [0.01, 0.02], '버스 정류장 도보 4분 (가상)', '호수를 한 바퀴 도는 코스'),
  sample('gyeonggi-02', '경기', '읍성 옛길', 6, 150, '쉬움', { lat: 37.74, lng: 127.05 }, [0.03, 0.02], '기차역 도보 6분 (가상)', '옛길을 따라 걷는 코스'),
  sample('gyeonggi-03', '경기', '강변 산책길', 8, 180, '쉬움', { lat: 37.55, lng: 127.3 }, [0.02, 0.08], '버스 정류장 도보 5분 (가상)', '강을 따라 이어지는 평탄한 길'),
  sample('gyeonggi-04', '경기', '산성 둘러보기', 9.5, 250, '보통', { lat: 37.45, lng: 127.18 }, [0.03, 0.04], '버스 정류장 도보 7분 (가상)', '산성 둘레를 도는 코스'),
  sample('gyeonggi-05', '경기', '긴 숲길 종주', 14, 330, '보통', { lat: 37.8, lng: 127.1 }, [-0.06, 0.07], '기차역 도보 12분 (가상)', '하루 일정으로 걷는 긴 코스'),
];
