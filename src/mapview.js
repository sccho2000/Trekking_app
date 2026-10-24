import { routeToSvg } from './routeSvg.js';

// 네이버 지도 JS API v3. 신규 키는 ncpKeyId 파라미터를 쓴다(키 발급 후 공식 문서로 재확인할 것).
const SCRIPT_URL = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=';
const NO_KEY_NOTE = '<p class="map-note">지도 키가 필요해요. config.js에 네이버 지도 Client ID를 넣으면 실제 지도가 보여요.</p>';

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

export function showRoute(container, course, naver) {
  if (naver) {
    try {
      drawNaverRoute(container, course, naver);
      return;
    } catch {
      // 지도 그리기에 실패하면 아래 SVG 미리보기로 대체한다.
    }
  }
  container.innerHTML = routeToSvg(course.path) + NO_KEY_NOTE;
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
