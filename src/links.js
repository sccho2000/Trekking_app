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
