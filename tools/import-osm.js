// 사용법: node tools/import-osm.js
// 오픈스트리트맵(Overpass API)에서 서울·경기의 걷기 경로(둘레길 등)를 받아 data/courses-osm.js를 만든다.
// 데이터 © OpenStreetMap contributors, ODbL. 공개 서버라 요청은 2번만 하고, 식별 가능한 User-Agent를 보낸다.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relationToCourse, dedupeById, dedupeByName } from './osm.js';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const HEADERS = { 'User-Agent': 'trekking-course-import/1.0 (personal learning project)', Accept: '*/*' };
const AREAS = [
  { iso: 'KR-11', region: '서울' },
  { iso: 'KR-41', region: '경기' },
];

async function query(iso) {
  const q = `[out:json][timeout:240];area["ISO3166-2"="${iso}"]->.a;relation(area.a)["route"~"^(hiking|foot|walking)$"];out geom;`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(ENDPOINT, { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(q)}` });
    if (res.ok) return (await res.json()).elements ?? [];
    console.warn(`${iso}: HTTP ${res.status} (시도 ${attempt}/3)`);
    await new Promise((r) => setTimeout(r, 15000 * attempt));
  }
  throw new Error(`${iso} 요청 실패`);
}

const courses = [];
let received = 0;
for (const { iso, region } of AREAS) {
  const elements = await query(iso);
  received += elements.length;
  for (const rel of elements) {
    // 서울 목록에 먼저 들어 있으면 서울, 아니면 경기로 본다(dedupeById가 첫 번째만 남긴다).
    const course = relationToCourse(rel, region);
    if (course) courses.push(course);
  }
  console.log(`${region}: relation ${elements.length}개 처리`);
  await new Promise((r) => setTimeout(r, 2000));
}

const result = dedupeByName(dedupeById(courses)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
const stamp = new Date().toISOString().slice(0, 10);
const header = `// 자동 생성: tools/import-osm.js (${stamp}). 데이터 © OpenStreetMap contributors, ODbL. 직접 고치지 마세요.\n`;
const out = fileURLToPath(new URL('../data/courses-osm.js', import.meta.url));
await writeFile(out, `${header}export const OSM_COURSES = ${JSON.stringify(result, null, 1)};\n`, 'utf8');
console.log(`받은 relation ${received}개 → 코스 ${result.length}개 저장 (서울 ${result.filter((c) => c.region === '서울').length}, 경기 ${result.filter((c) => c.region === '경기').length})`);
