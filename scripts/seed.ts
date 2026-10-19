import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getPool, WORKSPACE } from '../src/lib/db';

const rows = readFileSync('data/기관_사이트_및_공지사항_URL.md', 'utf8').split('\n')
  .map(line => line.split('|').slice(1, -1).map(s => s.trim()))
  .filter(row => row.length === 4 && row[1].startsWith('<https://'));
const configs: Record<string, { adapter: string; body: string; link: string; date: string }> = {
  '공무원연금': { adapter: 'geps', body: '#cont-ct .viewCtn', link: '.sj a', date: '.writngDe' },
  '한국도로교통공단': { adapter: 'koroad', body: '.bbsCont .cont', link: '.tit a', date: '.date' },
  '국민건강보험': { adapter: 'nhis', body: '.post-content', link: 'a.a-link', date: 'td:nth-last-child(2)' },
};
const pool = getPool();
try {
  await pool.query('INSERT INTO workspaces(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING', [WORKSPACE, '개인 업무공간']);
  for (const [name, home, url, note] of rows) {
    const cfg = configs[name];
    const category = /연금|보험|보험금융|여신|AIPIS|마이카/.test(name) ? '보험·금융' : '공공기관';
    const message = cfg ? '실제 수집 연동 · 목록 첫 페이지 최대 12건' :
      /경찰청|eFine/.test(name) ? '접근 제한: 자동 요청 시 307 리다이렉트 반복. 브라우저에서 수동 확인 필요.' :
      '연동 준비 · 원본 자료: ' + note;
    await pool.query(
      'INSERT INTO institutions(id,workspace_id,name,category,home_url,notice_url,adapter,body_selector,link_selector,date_selector,active,setup_note) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12 WHERE NOT EXISTS(SELECT 1 FROM institutions WHERE workspace_id=$2 AND name=$3)',
      [randomUUID(), WORKSPACE, name, category, home.slice(1, -1), url.slice(1, -1), cfg?.adapter || 'generic', cfg?.body || '', cfg?.link || 'a', cfg?.date || '', !!cfg, message],
    );
  }
  console.log('원본 자료에서 기관 ' + rows.length + '곳 등록 완료 (실제 연동 3곳, 예시 자료 없음)');
} finally { await pool.end(); }
