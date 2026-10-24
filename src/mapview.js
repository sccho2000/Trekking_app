import { routeToSvg } from './routeSvg.js';

// 네이버 지도 JS API v3. 현재 키 파라미터 이름은 ncpKeyId (공식 시작하기 문서 기준).
const SCRIPT_URL = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=';
const NOTE_UNAVAILABLE = '<p class="map-note">네이버 지도를 불러오지 못해 코스 모양만 보여 드려요. 아래 버튼으로 네이버 지도 앱·웹에서 열 수 있어요.</p>';
const NOTE_AUTH = '<p class="map-note">네이버 지도 인증에 실패했어요. 네이버 클라우드 콘솔의 Web 서비스 URL에 지금 주소(예: http://localhost:8000)를 등록했는지 확인해 주세요. 우선 코스 모양만 보여 드려요.</p>';

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

function showFallback(container, course, note) {
  container.innerHTML = routeToSvg(course.path) + note;
}

export function showRoute(container, course, naver = null) {
  if (!naver) return showFallback(container, course, NOTE_UNAVAILABLE);
  try {
    // 인증 실패는 지도를 만든 뒤에 비동기로 알려 주므로, 그때 SVG로 바꾼다.
    globalThis.navermap_authFailure = () => showFallback(container, course, NOTE_AUTH);
    drawNaverRoute(container, course, naver);
  } catch {
    showFallback(container, course, NOTE_UNAVAILABLE);
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
  const bounds = latLngs.reduce((b, p) => b.extend(p), new maps.LatLngBounds(latLngs[0], latLngs[0]));
  map.fitBounds(bounds);
}
