import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { get } from 'node:https';
import { isIP } from 'node:net';
import type { Institution, CollectedNotice } from './types';

export function isPublicAddress(address: string) {
  if (isIP(address) === 6) {
    const s = address.toLowerCase();
    if (s.startsWith('64:ff9b::')) {
      const tail = s.slice(9).split(':');
      if (tail.length !== 2) return false;
      const high = parseInt(tail[0],16), low = parseInt(tail[1],16);
      return isPublicAddress([high>>>8,high&255,low>>>8,low&255].join('.'));
    }
    return s.startsWith('2') || s.startsWith('3');
  }
  if (isIP(address) !== 4) return false;
  const [a,b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0) ||
    a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19) || a >= 224);
}
export function validateUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
    url.port && !['443','1443','2443'].includes(url.port)) {
    throw new Error('외부 HTTPS URL만 수집할 수 있습니다. 허용 포트: 443, 1443, 2443');
  }
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local') ||
    isIP(url.hostname) && !isPublicAddress(url.hostname)) throw new Error('내부 주소는 수집할 수 없습니다.');
  return url;
}
async function requestHtml(url: URL): Promise<{ status: number; location?: string; html: string }> {
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('내부 네트워크 주소 접근은 허용되지 않습니다.');
  const address = addresses.find(a => a.family === 4) || addresses[0];
  return new Promise((resolve, reject) => {
    const request = get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NotiMonitor/1.0)', Accept: 'text/html,application/xhtml+xml' },
      family: address.family,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, response => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 12_000_000) { request.destroy(new Error('응답이 12MB를 초과했습니다.')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        const raw = Buffer.concat(chunks);
        const declared = String(response.headers['content-type'] || '');
        const encoding = /euc-kr|ks_c_5601|cp949/i.test(declared + raw.subarray(0, 2000).toString()) ? 'euc-kr' : 'utf-8';
        resolve({ status: response.statusCode || 0, location: response.headers.location, html: new TextDecoder(encoding).decode(raw) });
      });
    });
    const timeout = setTimeout(() => request.destroy(new Error('연결 또는 응답 시간 초과 (15초)')), 15000);
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
  });
}
export async function fetchHtml(value: string) {
  let url = validateUrl(value);
  const originalHost = url.hostname;
  const visited = new Set<string>();
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (visited.has(url.href)) throw new Error('접근 제한: 리다이렉트가 반복됩니다. 원문에서 수동 확인해 주세요.');
    visited.add(url.href);
    const response = await requestHtml(url);
    if (response.status >= 300 && response.status < 400 && response.location) {
      url = validateUrl(new URL(response.location, url).href);
      if (url.hostname !== originalHost) throw new Error('다른 도메인으로 이동했습니다. 로그인 또는 URL 변경을 수동 확인해 주세요.');
      continue;
    }
    if (response.status !== 200) throw new Error('HTTP ' + response.status + ': 접근 제한 또는 기관 서버 오류. 원문 수동 확인이 필요합니다.');
    if (/captcha|자동입력 방지문자|비정상적인 접근|요청이 차단/.test(response.html) && response.html.length < 20000) {
      throw new Error('보안 인증 또는 자동 접근 차단 화면입니다. 원문에서 수동 확인해 주세요.');
    }
    return response.html;
  }
  throw new Error('리다이렉트 횟수 초과. 로그인 또는 접근 제한을 확인해 주세요.');
}
export function normalize(text: string) {
  return text.normalize('NFC').replace(/\u00a0/g, ' ').replace(/[ \t\r]+/g, ' ')
    .split('\n').map(line => line.trim()).filter(Boolean).join('\n').trim();
}
export function fingerprint(title: string, body: string) {
  return createHash('sha256').update(JSON.stringify([normalize(title), normalize(body)])).digest('hex');
}
export function extractBody(html: string, institution: Pick<Institution, 'body_selector' | 'exclude_selector'>, url: string) {
  if (!institution.body_selector.trim()) throw new Error('본문 영역 설정이 필요합니다. CSS 선택자를 등록해 주세요.');
  const $ = load(html);
  const body = $(institution.body_selector).first().clone();
  if (!body.length) throw new Error('본문 영역을 찾지 못했습니다: ' + institution.body_selector + '. 기준 자료는 유지됩니다.');
  body.find('script,style,noscript,input,button').remove();
  if (institution.exclude_selector.trim()) body.find(institution.exclude_selector).remove();
  body.find('img').each((_, element) => {
    const src = $(element).attr('src') || '';
    const alt = $(element).attr('alt') || '이미지';
    const reference = src.startsWith('data:') ? '내장 이미지 SHA256 ' + createHash('sha256').update(src).digest('hex') : new URL(src || url, url).href;
    $(element).replaceWith('\n[이미지: ' + alt + '] ' + reference + '\n');
  });
  body.find('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    if (href && !href.startsWith('javascript:') && !href.startsWith('#')) $(element).append(' (' + new URL(href, url).href + ')');
  });
  body.find('br').replaceWith('\n');
  body.find('p,div,li,tr,h1,h2,h3,h4,section').each((_, element) => { $(element).append('\n'); });
  const result = normalize(body.text());
  if (result.length < 5) throw new Error('본문이 비어 있거나 너무 짧습니다. 기준 자료를 갱신하지 않았습니다.');
  return result;
}
export function canonicalUrl(value: string) {
  const url = validateUrl(value);
  for (const key of [...url.searchParams.keys()]) {
    if (/^(curPage|cp|listType|bdOpenYn|bdNoticeYn|article.offset|articleLimit|page|pageIndex|utm_.*|jsessionid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.hash = '';
  url.searchParams.sort();
  return url.href;
}
export function parseList(html: string, institution: Institution) {
  const $ = load(html);
  const found = new Map<string, Omit<CollectedNotice, 'body'>>();
  $(institution.list_selector).each((_, row) => {
    const link = $(row).find(institution.link_selector).first();
    const href = link.attr('href');
    if (!href || /^(javascript:|#)/i.test(href)) return;
    const title = normalize(link.text()).replace(/\s+/g, ' ');
    if (!title) return;
    const url = canonicalUrl(new URL(href, institution.notice_url).href);
    if (new URL(url).hostname !== new URL(institution.notice_url).hostname) return;
    const dateText = institution.date_selector ? $(row).find(institution.date_selector).text() : $(row).text();
    const match = dateText.match(/(20\d{2})[.\-/](\d{2})[.\-/](\d{2})/);
    const publishedDate = match ? match[1] + '-' + match[2] + '-' + match[3] : null;
    found.set(url, { sourceKey: url, title, url, publishedDate });
  });
  const rows = [...found.values()].slice(0, institution.max_items);
  if (!rows.length) throw new Error('공지 목록을 추출하지 못했습니다. 로그인·동적 페이지·선택자 변경 여부를 확인해 주세요.');
  return rows;
}
export async function collectInstitution(institution: Institution): Promise<CollectedNotice[]> {
  const html = await fetchHtml(institution.notice_url);
  if (institution.mode === 'page') {
    return [{ sourceKey: canonicalUrl(institution.notice_url), title: institution.name + ' 페이지 내용', url: institution.notice_url, publishedDate: null, body: extractBody(html, institution, institution.notice_url) }];
  }
  const list = parseList(html, institution);
  const result: CollectedNotice[] = [];
  // Two requests at a time, no retries that could bypass access restrictions.
  for (let i = 0; i < list.length; i += 2) {
    result.push(...await Promise.all(list.slice(i, i + 2).map(async item => ({
      ...item, body: extractBody(await fetchHtml(item.url), institution, item.url),
    }))));
  }
  return result;
}
