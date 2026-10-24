// 사용법: DURUNUBI_KEY=<공공데이터포털 인증키> node tools/import-durunubi.js
// 두루누비 코스 목록과 각 코스의 GPX를 받아 data/courses.js를 다시 만든다. 키는 파일에 저장하지 않는다.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseGpx, simplifyPath, regionOf, toCourse } from './durunubi.js';

const key = process.env.DURUNUBI_KEY;
if (!key) {
  console.error('환경변수 DURUNUBI_KEY가 필요해요.');
  process.exit(1);
}

const LIST_URL = 'https://apis.data.go.kr/B551011/Durunubi/courseList';
const params = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'trekking', _type: 'json', numOfRows: '300', pageNo: '1' });
const listRes = await fetch(`${LIST_URL}?serviceKey=${encodeURIComponent(key)}&${params}`);
if (!listRes.ok) throw new Error(`목록 요청 실패: HTTP ${listRes.status}`);
const items = (await listRes.json()).response?.body?.items?.item ?? [];

const wanted = items.filter((i) => regionOf(i.sigun));
const courses = [];
let bytes = 0;
for (const item of wanted) {
  if (!item.gpxpath) continue;
  const res = await fetch(item.gpxpath);
  if (!res.ok) {
    console.warn(`건너뜀(GPX HTTP ${res.status}): ${item.crsKorNm}`);
    continue;
  }
  const xml = await res.text();
  bytes += xml.length;
  const course = toCourse(item, simplifyPath(parseGpx(xml), 60));
  if (course) courses.push(course);
  else console.warn(`제외: ${item.crsKorNm} (난이도 상이거나 데이터 부족)`);
}
courses.sort((a, b) => a.id.localeCompare(b.id));

const header = '// 자동 생성: tools/import-durunubi.js (출처: 한국관광공사 두루누비 정보 서비스, 공공데이터포털). 직접 고치지 마세요.\n';
const out = fileURLToPath(new URL('../data/courses.js', import.meta.url));
await writeFile(out, `${header}export const COURSES = ${JSON.stringify(courses, null, 1)};\n`, 'utf8');
console.log(`서울·경기 ${wanted.length}개 중 ${courses.length}개 저장 (GPX ${Math.round(bytes / 1024)}KB 처리)`);
