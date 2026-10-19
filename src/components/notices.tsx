'use client';
import { useState } from 'react';
import { Search, Check, ArrowRight, CheckCheck, Clock3, FileText } from 'lucide-react';
import { diffLines } from 'diff';
import type { Bootstrap, Change, Detail, Entity, ResponseStatus } from '@/lib/types';
import { RESPONSE_STATUSES } from '@/lib/types';
import { dateTime, dayKey, isWorkItem } from '@/lib/display';
import { Badge, Empty, External, Modal, CheckList, Spinner } from './ui';

export function relatedEntities(change:Change,entities:Entity[]) {
  return entities.filter(entity=>change.entity_ids.includes(entity.id)||entity.institution_ids.includes(change.institution_id));
}
export function statusTone(status:string) {
  return status==='검토 필요'?'amber':status==='대응 중'?'blue':status==='대응 완료'?'green':'gray';
}
type ListProps={data:Bootstrap;open:(id:string)=>void;update:(change:Change,patch:Partial<Change>)=>Promise<void>;compact?:boolean;items?:Change[]};
export function NoticeList({data,open,update,compact=false,items}:ListProps) {
  const [scope,setScope]=useState<'work'|'baseline'|'all'>('work');
  const [keyword,setKeyword]=useState('');
  const [institution,setInstitution]=useState('');
  const [reviewed,setReviewed]=useState('');
  const [status,setStatus]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [busy,setBusy]=useState<string[]>([]);
  const [error,setError]=useState('');
  const changes=items||data.changes;
  const filtered=changes.filter(c=>
    (compact||scope==='all'||scope==='baseline'&&c.kind==='baseline'||scope==='work'&&isWorkItem(c))&&
    (!keyword||(c.title+' '+c.institution_name+' '+c.memo).toLowerCase().includes(keyword.toLowerCase()))&&
    (!institution||c.institution_id===institution)&&(!reviewed||String(c.reviewed)===reviewed)&&
    (!status||c.response_status===status)&&(!from||dayKey(c.found_at)>=from)&&(!to||dayKey(c.found_at)<=to)
  );
  async function quickUpdate(change:Change,patch:Partial<Change>) {
    setBusy(old=>[...old,change.id]);setError('');
    try{await update(change,patch);}catch(e){setError((e as Error).message);}finally{setBusy(old=>old.filter(id=>id!==change.id));}
  }
  return <section className="panel notices-panel">
    {compact?<div className="panel-heading"><div><h2>오늘 확인할 것</h2><p>미확인 공지와 검토·대응 중인 항목을 먼저 확인하세요.</p></div><a className="text-button" href="/notices">전체 보기<ArrowRight size={15}/></a></div>:<>
      <div className="list-tabs" role="tablist" aria-label="공지 유형">{([{key:'work',label:'업무 알림',count:changes.filter(isWorkItem).length},{key:'baseline',label:'기준 자료',count:changes.filter(c=>c.kind==='baseline').length},{key:'all',label:'전체',count:changes.length}] as const).map(tab=><button role="tab" aria-selected={scope===tab.key} className={scope===tab.key?'active':''} key={tab.key} onClick={()=>setScope(tab.key)}>{tab.label}<span>{tab.count}</span></button>)}</div>
      <div className="filters"><div className="search-field"><Search size={16}/><input aria-label="공지 검색" value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="제목, 기관명, 메모 검색"/></div><select aria-label="기관 필터" value={institution} onChange={e=>setInstitution(e.target.value)}><option value="">전체 기관</option>{data.institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><select aria-label="확인 여부 필터" value={reviewed} onChange={e=>setReviewed(e.target.value)}><option value="">전체 확인 여부</option><option value="false">미확인</option><option value="true">확인 완료</option></select><select aria-label="대응 상태 필터" value={status} onChange={e=>setStatus(e.target.value)}><option value="">전체 대응 상태</option>{RESPONSE_STATUSES.map(s=><option key={s}>{s}</option>)}</select><div className="date-range"><input aria-label="발견 기간 시작" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><span>~</span><input aria-label="발견 기간 종료" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div></div>
    </>}
    {error&&<p className="inline-error" role="alert">{error}</p>}
    {!filtered.length?<Empty title={compact?'확인할 업무가 없습니다':scope==='work'?'새로운 업무 알림이 없습니다':'조건에 맞는 자료가 없습니다'} description={scope==='work'?'최초 수집한 기존 공지는 기준 자료로 보관하며 신규 알림에 포함하지 않습니다.':'검색 조건을 바꾸거나 기관 점검을 실행해 주세요.'} action={!compact&&scope==='work'?<button className="button small" onClick={()=>setScope('baseline')}>기준 자료 보기<ArrowRight size={14}/></button>:undefined}/>:<div className="table-scroll"><table><thead><tr><th>기관 / 구분</th><th className="title-cell">공지 및 변경 내용</th><th>확인 여부</th><th>대응 상태</th><th>원문</th></tr></thead><tbody>{filtered.slice(0,compact?8:300).map(change=><tr key={change.id}>
      <td><strong className="institution-name">{change.institution_name}</strong><Badge tone={change.kind==='new'?'blue':change.kind==='changed'?'amber':'gray'}>{change.kind==='baseline'?'기준 자료':change.kind==='new'?'신규 공지':'내용 변경'}</Badge></td>
      <td className="title-cell"><button className="notice-title" onClick={()=>open(change.id)}>{change.title}</button><div className="notice-meta"><span>게시 {change.published_date||'일자 미제공'}</span><span>발견 {dateTime(change.found_at)}</span>{relatedEntities(change,data.entities).map(e=><span className="entity-tag" key={e.id}>{e.name}</span>)}</div>{change.memo&&<p className="memo-preview">{change.memo}</p>}</td>
      <td><button className={'review-button '+(change.reviewed?'done':'')} disabled={busy.includes(change.id)} aria-label={change.title+' '+(change.reviewed?'미확인으로 변경':'확인 완료')} onClick={()=>void quickUpdate(change,{reviewed:!change.reviewed})}>{busy.includes(change.id)?<Spinner/>:change.reviewed?<CheckCheck size={14}/>:<Clock3 size={14}/>}<span>{change.reviewed?'확인 완료':'미확인'}</span></button></td>
      <td><select className={'status-select '+statusTone(change.response_status)} aria-label={change.title+' 대응 상태'} value={change.response_status} disabled={busy.includes(change.id)} onChange={e=>void quickUpdate(change,{response_status:e.target.value as ResponseStatus})}>{RESPONSE_STATUSES.map(s=><option key={s}>{s}</option>)}</select></td><td><External url={change.url}>열기</External></td>
    </tr>)}</tbody></table></div>}
    {!compact&&<div className="list-footer"><span>{filtered.length}건{filtered.length>300?' · 최근 300건 표시':''}</span><span><FileText size={13}/>본문·이미지 참조 비교 · 첨부파일 내부 내용 제외</span></div>}
  </section>;
}
export function NoticeDetail({detail,data,onClose,onSave}:{detail:Detail;data:Bootstrap;onClose:()=>void;onSave:(change:Change,patch:Partial<Change>)=>Promise<void>}) {
  const [reviewed,setReviewed]=useState(detail.change.reviewed);
  const [status,setStatus]=useState(detail.change.response_status);
  const [memo,setMemo]=useState(detail.change.memo);
  const [entityIds,setEntityIds]=useState(detail.change.entity_ids);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [tab,setTab]=useState<'compare'|'history'>('compare');
  const changes=diffLines(detail.before?.body||'',detail.after.body);
  const inherited=data.entities.filter(e=>e.institution_ids.includes(detail.change.institution_id));
  return <Modal title="공지·변경 상세" wide onClose={onClose}><div className="detail-body"><div className="detail-title"><div className="row gap"><Badge tone="green">{detail.change.institution_name}</Badge><Badge tone={detail.change.kind==='changed'?'amber':'gray'}>{detail.change.kind==='baseline'?'기준 자료':detail.change.kind==='new'?'신규 공지':'내용 변경'}</Badge></div><h2>{detail.change.title}</h2><div className="row-between"><p className="muted">게시일 {detail.change.published_date||'미제공'} · 발견 {dateTime(detail.change.found_at)}</p><External url={detail.change.url}/></div></div>
    <div className="detail-tabs"><button className={tab==='compare'?'active':''} onClick={()=>setTab('compare')}>수집 내용·변경 비교</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>대응 이력 <span>{detail.activities.length}</span></button></div>
    {tab==='compare'?<><div className="snapshot-times"><span>이전 수집 {detail.before?dateTime(detail.before.collected_at):'없음 (최초 수집)'}</span><span>현재 수집 {dateTime(detail.after.collected_at)}</span></div>{detail.before?<div className="diff-grid"><div><h3>변경 전</h3><p className="snapshot-title">{detail.before.title}</p><pre>{changes.filter(c=>!c.added).map((c,i)=><span className={c.removed?'diff-removed':''} key={i}>{c.value}</span>)}</pre></div><div><h3>변경 후</h3><p className="snapshot-title">{detail.after.title}</p><pre>{changes.filter(c=>!c.removed).map((c,i)=><span className={c.added?'diff-added':''} key={i}>{c.value}</span>)}</pre></div></div>:<div className="snapshot-current"><h3>수집 본문</h3><pre>{detail.after.body}</pre></div>}<p className="form-hint">수집 당시 본문을 보관합니다. 이미지 공지는 이미지 참조로 표시하며, 원문에서 이미지 내용을 확인해 주세요.</p></>:<div className="activity-list">{detail.activities.length?detail.activities.map(activity=><div className="activity" key={activity.id}><div className="activity-dot"/><div><div className="row gap"><strong>{activity.actor}</strong><small>{dateTime(activity.created_at)}</small></div><div className="row gap"><Badge tone={activity.reviewed?'green':'gray'}>{activity.reviewed?'확인 완료':'미확인'}</Badge><Badge tone={statusTone(activity.response_status)}>{activity.response_status}</Badge></div><p>{activity.memo||'메모 없음'}</p><small>{activity.entity_ids.map(id=>data.entities.find(e=>e.id===id)?.name||'이전 연결 항목').join(' · ')}</small></div></div>):<Empty title="아직 대응 이력이 없습니다" description="확인 여부, 상태 또는 메모를 저장하면 이력이 남습니다."/>}</div>}
    <form className="response-form" onSubmit={async event=>{event.preventDefault();setSaving(true);setError('');try{await onSave(detail.change,{reviewed,response_status:status,memo,entity_ids:entityIds});}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><h3>업무 처리</h3><div className="form-grid"><label>확인 여부<select value={String(reviewed)} onChange={e=>setReviewed(e.target.value==='true')}><option value="false">미확인</option><option value="true">확인 완료</option></select></label><label>대응 상태<select value={status} onChange={e=>setStatus(e.target.value as ResponseStatus)}>{RESPONSE_STATUSES.map(s=><option key={s}>{s}</option>)}</select></label></div><fieldset className="field-group"><legend>관련 업체·프로젝트 직접 연결</legend><CheckList items={data.entities} selected={entityIds} onChange={setEntityIds}/></fieldset>{!!inherited.length&&<p className="form-hint">기관 연결로 함께 조회되는 항목: {inherited.map(e=>e.name).join(', ')}</p>}<label>업무 메모<textarea placeholder="영향 범위, 확인한 내용, 다음 할 일을 기록하세요." value={memo} maxLength={10000} onChange={e=>setMemo(e.target.value)}/></label><div className="row-between"><small className="muted">마지막 저장 {dateTime(detail.change.updated_at)}</small><button className="button primary" disabled={saving}>{saving?<Spinner/>:<Check size={15}/>}처리 내용 저장</button></div>{error&&<p className="error-text" role="alert">{error}</p>}</form>
  </div></Modal>;
}
