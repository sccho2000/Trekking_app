import { routeToSvg } from './routeSvg.js';

// 네이버 지도 JS API v3. 현재 키 파라미터 이름은 ncpKeyId (공식 시작하기 문서 기준).
const SCRIPT_URL = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=';
const NOTE_UNAVAILABLE = '<p class="map-note">네이버 지도를 불러오지 못해 모양만 보여 드려요. 아래 버튼으로 네이버 지도 앱·웹에서 열 수 있어요.</p>';
const NOTE_AUTH = '<p class="map-note">네이버 지도 인증에 실패했어요. 네이버 클라우드 콘솔의 Web 서비스 URL에 지금 주소(예: http://localhost:8000)를 등록했는지 확인해 주세요. 우선 모양만 보여 드려요.</p>';

export function loadNaverMap(clientId, doc = document) {
  if (!clientId) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const script = doc.createElement('script');
      script.src = SCRIPT_URL + encodeURIComponent(clientId);
      script.onload = () => resolve(globalThis.naver ?? null);
      script.onerror = () => resolve(null);
      doc.head.appendChild(script);
    } catch {
      resolve(null);
    }
  });
}

// 인증 실패 콜백은 전역 하나뿐이라, 화면에 있는 지도마다 SVG 대체 동작을 등록해 두고 한꺼번에 실행한다.
const authFallbacks = new Map();
function onAuthFailure(container, fallback) {
  authFallbacks.set(container, fallback);
  globalThis.navermap_authFailure = () => authFallbacks.forEach((run) => run());
}

const svgWithNote = (path, note) => routeToSvg(path) + note;

// 코스 전체 경로를 지도에 그린다.
export function showRoute(container, course, naver = null) {
  const fallback = (note) => () => { container.innerHTML = svgWithNote(course.path, note); };
  if (!naver) return fallback(NOTE_UNAVAILABLE)();
  try {
    onAuthFailure(container, fallback(NOTE_AUTH));
    drawNaverRoute(container, course, naver);
  } catch {
    fallback(NOTE_UNAVAILABLE)();
  }
}

function drawNaverRoute(container, course, naver) {
  const { maps } = naver;
  container.innerHTML = '';
  const latLngs = course.path.map(([lat, lng]) => new maps.LatLng(lat, lng));
  const map = new maps.Map(container, { center: latLngs[0], zoom: 14 });
  new maps.Polyline({ map, path: latLngs, strokeColor: '#2e7d32', strokeWeight: 5 });
  new maps.Marker({ map, position: latLngs[0], title: '출발' });
  new maps.Marker({ map, position: latLngs[latLngs.length - 1], title: '도착' });
  map.fitBounds(latLngs.reduce((b, p) => b.extend(p), new maps.LatLngBounds(latLngs[0], latLngs[0])));
}

// 현재 위치(from, 없을 수 있음)에서 코스 출발점(to)까지를 점선으로 보여 준다. 직선이며 실제 길찾기 경로가 아니다.
export function showApproach(container, from, to, naver = null) {
  const points = from ? [[from.lat, from.lng], [to.lat, to.lng]] : [[to.lat, to.lng]];
  const fallback = (note) => () => { container.innerHTML = svgWithNote(points, note); };
  if (!naver) return fallback(NOTE_UNAVAILABLE)();
  try {
    onAuthFailure(container, fallback(NOTE_AUTH));
    drawApproach(container, from, to, naver);
  } catch {
    fallback(NOTE_UNAVAILABLE)();
  }
}

function drawApproach(container, from, to, naver) {
  const { maps } = naver;
  container.innerHTML = '';
  const target = new maps.LatLng(to.lat, to.lng);
  const map = new maps.Map(container, { center: target, zoom: 14 });
  new maps.Marker({ map, position: target, title: '코스 출발점' });
  if (!from) return;
  const origin = new maps.LatLng(from.lat, from.lng);
  new maps.Marker({ map, position: origin, title: '내 위치' });
  new maps.Polyline({ map, path: [origin, target], strokeColor: '#1565c0', strokeWeight: 4, strokeStyle: 'shortdash' });
  map.fitBounds(new maps.LatLngBounds(origin, origin).extend(target));
}
