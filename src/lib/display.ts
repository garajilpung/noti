export const RESULT_LABELS: Record<string,string> = {
  pending:'연동 준비',running:'점검 중',baseline:'기준 자료 저장',unchanged:'변경 없음',changed:'변경 발견',failed:'수집 실패',
};
export function koreaDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
}
export function dateTime(value?: string | null) {
  return value ? new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)) : '점검 이력 없음';
}
export function dayKey(value: string) { return koreaDate(new Date(value)); }
export function fullDay(value: string) {
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'}).format(new Date(value+'T12:00:00+09:00'));
}
import type { Change } from './types';
export function isWorkItem(change:Pick<Change,'kind'|'reviewed'|'response_status'>) {
  return change.kind !== 'baseline' || !change.reviewed || change.response_status !== '미분류';
}
