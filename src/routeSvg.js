const fmt = (n) => Math.round(n * 10) / 10;

export function routeToSvg(path, { width = 320, height = 200, pad = 16 } = {}) {
  const pts = (path || []).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (pts.length === 0) return '';

  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const cosLat = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * cosLat;
  const spanY = maxLat - minLat;
  const fit = Math.min(spanX > 0 ? (width - 2 * pad) / spanX : Infinity, spanY > 0 ? (height - 2 * pad) / spanY : Infinity);
  const scale = Number.isFinite(fit) ? fit : 0;

  const project = ([lat, lng]) => [
    fmt(width / 2 + (lng - (minLng + maxLng) / 2) * cosLat * scale),
    fmt(height / 2 - (lat - (minLat + maxLat) / 2) * scale),
  ];
  const xy = pts.map(project);
  const [sx, sy] = xy[0];
  const [ex, ey] = xy[xy.length - 1];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="코스 경로 미리보기">` +
    `<polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${sx}" cy="${sy}" r="6" fill="#1565c0"><title>출발</title></circle>` +
    `<circle cx="${ex}" cy="${ey}" r="6" fill="#c62828"><title>도착</title></circle>` +
    `</svg>`
  );
}
