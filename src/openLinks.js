export function isMobileUa(ua) {
  return /Android|iPhone|iPad|iPod/i.test(ua || '');
}

// 모바일: 네이버 지도 앱을 먼저 열고, 화면이 그대로면 같은 탭에서 웹 길찾기로 간다.
// 데스크톱: 앱 스킴을 시도하지 않고 웹 길찾기를 새 탭으로 연다.
export function openDirections(links, { ua, location, doc, win, waitMs = 1500 }) {
  if (!isMobileUa(ua)) {
    win.open(links.web, '_blank', 'noopener');
    return;
  }
  const timer = win.setTimeout(() => {
    if (!doc.hidden) location.href = links.web;
  }, waitMs);
  const cancel = () => win.clearTimeout(timer);
  win.addEventListener('pagehide', cancel, { once: true });
  doc.addEventListener('visibilitychange', cancel, { once: true });
  location.href = links.app;
}
