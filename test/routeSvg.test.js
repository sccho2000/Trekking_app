import test from 'node:test';
import assert from 'node:assert/strict';
import { routeToSvg } from '../src/routeSvg.js';

const path = [[37.5, 127.0], [37.52, 127.03], [37.55, 127.02]];
const pointsOf = (svg) =>
  svg.match(/points="([^"]+)"/)[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));

test('3점 경로: svg, polyline, 점 3개, 범위 안, 원 2개', () => {
  const svg = routeToSvg(path, { width: 320, height: 200 });
  assert.ok(svg.includes('<svg') && svg.includes('<polyline'));
  const pts = pointsOf(svg);
  assert.equal(pts.length, 3);
  for (const [x, y] of pts) assert.ok(x >= 0 && x <= 320 && y >= 0 && y <= 200, `${x},${y}`);
  assert.equal((svg.match(/<circle/g) || []).length, 2);
});

test('위도가 큰 점의 y가 더 작다(북쪽이 위)', () => {
  const pts = pointsOf(routeToSvg(path));
  assert.ok(pts[2][1] < pts[0][1]);
});

test('빈 경로는 빈 문자열', () => {
  assert.equal(routeToSvg([]), '');
});

test('한 점, 동일 좌표 경로에서도 NaN/Infinity가 없다', () => {
  for (const p of [[[37.5, 127]], [[37.5, 127], [37.5, 127], [37.5, 127]]]) {
    const svg = routeToSvg(p);
    assert.ok(svg.includes('<svg'));
    assert.ok(!/NaN|Infinity/.test(svg), svg);
  }
});

test('배열이 아닌 점이 섞여 있어도 예외 없이 나머지로 그린다', () => {
  const svg = routeToSvg([null, [37.5, 127], 'x', [37.51, 127.01]]);
  assert.equal(pointsOf(svg).length, 2);
});
