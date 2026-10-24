// 근거: 네이버 클라우드 Maps URL Scheme 문서(https://guide.ncloud-docs.com/docs/application-maps-url-scheme-vpc)
// - nmap://route/public, nmap://route/car, dlat/dlng 필수, appname 필수, slat/slng/sname 생략 시 현재 위치 사용.
// - 웹 길찾기 URL(map.naver.com/p/directions)은 공식 문서에 없어 널리 쓰이는 형식을 사용. 출발지 '-'는 사용자가 지도에서 고른다.
const APP_NAME = 'trekking-recommender';
const WEB_MODE = { transit: 'transit', car: 'car' };
const APP_ACTION = { transit: 'public', car: 'car' };

export function buildDirectionsLinks({ from, to, mode, appname = APP_NAME }) {
  const name = encodeURIComponent(to.name);
  const params = [];
  if (from) params.push(`slat=${from.lat}`, `slng=${from.lng}`);
  params.push(`dlat=${to.lat}`, `dlng=${to.lng}`, `dname=${name}`, `appname=${encodeURIComponent(appname)}`);
  const app = `nmap://route/${APP_ACTION[mode]}?${params.join('&')}`;

  const start = from ? `${from.lng},${from.lat}` : '-';
  const web = `https://map.naver.com/p/directions/${start}/${to.lng},${to.lat},${name}/-/${WEB_MODE[mode]}`;
  return { app, web };
}

const MAX_WAYPOINTS = 5;
const round5 = (n) => Math.round(n * 1e5) / 1e5;

// path 안쪽 점 중 최대 MAX_WAYPOINTS개를 고르게 뽑는다.
function pickWaypoints(path) {
  const inner = path.slice(1, -1);
  if (inner.length <= MAX_WAYPOINTS) return inner;
  return Array.from({ length: MAX_WAYPOINTS }, (_, i) => inner[Math.round((i * (inner.length - 1)) / (MAX_WAYPOINTS - 1))]);
}

// 코스 전체를 네이버 지도에서 보기 위한 도보 경로 링크. 앱 스킴은 경유지를 지원하고,
// 웹 URL은 경유지 형식을 확인하지 못해 출발~도착만 담는다. 지도 API 키는 필요 없다.
export function buildCourseMapLinks(course, appname = APP_NAME) {
  const path = course.path.length > 0 ? course.path : [[course.start.lat, course.start.lng], [course.end.lat, course.end.lng]];
  const [sLat, sLng] = path[0].map(round5);
  const [dLat, dLng] = path[path.length - 1].map(round5);
  const sname = encodeURIComponent(course.start.name);
  const dname = encodeURIComponent(`${course.name} 도착`);

  const params = [`slat=${sLat}`, `slng=${sLng}`, `sname=${sname}`, `dlat=${dLat}`, `dlng=${dLng}`, `dname=${dname}`];
  pickWaypoints(path).forEach(([lat, lng], i) => params.push(`v${i + 1}lat=${round5(lat)}`, `v${i + 1}lng=${round5(lng)}`));
  params.push(`appname=${encodeURIComponent(appname)}`);

  return {
    app: `nmap://route/walk?${params.join('&')}`,
    web: `https://map.naver.com/p/directions/${sLng},${sLat},${sname}/${dLng},${dLat},${dname}/-/walk`,
  };
}
