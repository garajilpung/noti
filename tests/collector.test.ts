import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, extractBody, fingerprint, isPublicAddress, normalize, parseList, validateUrl } from '../src/lib/collector';
import { isWorkItem, dayKey } from '../src/lib/display';
import type { Institution } from '../src/lib/types';
import { requireAccess } from '../src/lib/access';

test('실제 Host로 출처 검사: localhost 내부 URL과 외부 127.0.0.1 차이 처리',()=>{
  requireAccess(new Request('http://localhost:3000/api/actions',{method:'POST',headers:{Host:'127.0.0.1:3000',Origin:'http://127.0.0.1:3000','Content-Type':'application/json','Sec-Fetch-Site':'same-origin'}}),true);
  assert.throws(()=>requireAccess(new Request('http://localhost:3000/api/actions',{method:'POST',headers:{Host:'127.0.0.1:3000',Origin:'https://other.example','Content-Type':'application/json'}}),true),/다른 사이트/);
});

test('본문 선택과 반복 변경 요소 제외', () => {
  const config={body_selector:'article',exclude_selector:'.views,.clock'};
  const first='<nav>메뉴</nav><article><p>서비스 점검 안내</p><span class="views">조회 10</span><span class="clock">10:00</span></article>';
  const second=first.replace('조회 10','조회 99').replace('10:00','12:00');
  assert.equal(extractBody(first,config,'https://example.com/notice'),extractBody(second,config,'https://example.com/notice'));
  assert.throws(()=>extractBody(first,{...config,body_selector:'.missing'},'https://example.com/notice'),/본문 영역/);
});
test('실제 본문·제목 변경 감지, 의미 없는 공백 정규화', () => {
  assert.equal(fingerprint('제목','내용  하나'),fingerprint('제목','내용 하나'));
  assert.notEqual(fingerprint('제목','점검 10시'),fingerprint('제목','점검 11시'));
  assert.notEqual(fingerprint('이전 제목','같은 본문'),fingerprint('새 제목','같은 본문'));
  assert.equal(normalize('  가\u00a0\u00a0나 \r\n\n다  '),'가 나\n다');
});
test('동일 공지의 페이지 파라미터 중복 제거와 게시일 추출', () => {
  const institution={notice_url:'https://example.com/list',list_selector:'tbody tr',link_selector:'.title a',date_selector:'.date',max_items:12} as Institution;
  const html='<table><tbody><tr><td class="title"><a href="/article/1?curPage=1">첫 공지</a></td><td class="date">2026.10.19</td></tr><tr><td class="title"><a href="/article/1?curPage=2">첫 공지</a></td><td class="date">2026.10.19</td></tr></tbody></table>';
  const rows=parseList(html,institution);
  assert.equal(rows.length,1);assert.equal(rows[0].publishedDate,'2026-10-19');
  assert.equal(canonicalUrl('https://example.com/view?articleNo=1&article.offset=20&articleLimit=10'),'https://example.com/view?articleNo=1');
  assert.throws(()=>parseList('<div>로그인이 필요합니다</div>',institution),/공지 목록/);
});
test('외부 HTTPS 주소만 허용하고 NAT64의 내부 주소도 차단', () => {
  assert.equal(validateUrl('https://www.geps.or.kr/').hostname,'www.geps.or.kr');
  for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.0.1','::1','fc00::1','::ffff:127.0.0.1','64:ff9b::7f00:1'])assert.equal(isPublicAddress(address),false,address);
  assert.equal(isPublicAddress('27.101.224.6'),true);
  assert.equal(isPublicAddress('64:ff9b::1b65:e006'),true);
  assert.throws(()=>validateUrl('http://example.com/'),/HTTPS/);
  assert.throws(()=>validateUrl('https://localhost/'),/내부/);
});
test('기준 자료는 알림 제외, 사용자가 검토 대상으로 지정하면 업무에 포함', () => {
  assert.equal(isWorkItem({kind:'baseline',reviewed:true,response_status:'미분류'}),false);
  assert.equal(isWorkItem({kind:'baseline',reviewed:true,response_status:'검토 필요'}),true);
  assert.equal(isWorkItem({kind:'new',reviewed:false,response_status:'미분류'}),true);
  assert.equal(dayKey('2026-10-18T15:01:00Z'),'2026-10-19');
});
