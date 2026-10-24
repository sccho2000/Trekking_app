import { routeToSvg } from './routeSvg.js';

const NOTE = '<p class="map-note">실제 지도는 네이버 지도(앱 또는 새 탭)에서 열려요. 아래는 코스 모양 미리보기예요.</p>';

// 지도 API 키 없이, 코스 모양을 SVG로 보여 주고 안내 문구를 붙인다.
export function showRoute(container, course) {
  container.innerHTML = routeToSvg(course.path) + NOTE;
}
