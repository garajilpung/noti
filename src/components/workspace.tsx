'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, CalendarDays, Building2, FileStack, FolderKanban, RefreshCw, ArrowUpRight, CircleHelp, BellDot, SearchCheck, AlertCircle, ChevronRight, Menu, X, CheckCheck, FilePlus2, FilePenLine, CircleDot } from 'lucide-react';
import type { Bootstrap, Change, Detail } from '@/lib/types';
import { dateTime, koreaDate, isWorkItem } from '@/lib/display';
import { Calendar } from './calendar';
import { Institutions } from './institutions';
import { NoticeDetail, NoticeList } from './notices';
import { Projects } from './projects';
import { Badge, External, Modal, Spinner } from './ui';

export type View = 'dashboard'|'institutions'|'notices'|'projects';
const NAV = [
  {view:'dashboard',href:'/',label:'점검 캘린더',icon:CalendarDays},
  {view:'notices',href:'/notices',label:'공지·변경사항',icon:FileStack},
  {view:'institutions',href:'/institutions',label:'기관 관리',icon:Building2},
  {view:'projects',href:'/projects',label:'업체·프로젝트',icon:FolderKanban},
] as const;
const DESCRIPTIONS: Record<View,string> = {
  dashboard:'기관의 변화를 놓치지 않고, 오늘의 업무를 정리하세요.',
  notices:'새로운 공지와 내용 변경을 확인하고 대응 상태를 관리하세요.',
  institutions:'점검할 기관과 수집 영역, 관련 업무를 관리하세요.',
  projects:'기관과 업무를 연결하고, 영향받는 공지와 대응 이력을 확인하세요.',
};
async function api<T>(url:string,init?:RequestInit):Promise<T> {
  const response=await fetch(url,{cache:'no-store',...init,headers:{'Content-Type':'application/json',...init?.headers}});
  const body=await response.json();
  if(!response.ok)throw new Error(body.error+(body.details?' '+body.details.join(' / '):''));
  return body;
}
export function Workspace({view}:{view:View}) {
  const [data,setData]=useState<Bootstrap|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState<string[]>([]);
  const [toast,setToast]=useState<{message:string;error?:boolean}|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null),[detailLoading,setDetailLoading]=useState(false);
  const [mobileNav,setMobileNav]=useState(false),[help,setHelp]=useState(false);
  const refresh=useCallback(async()=>{
    try{setData(await api<Bootstrap>('/api/state'));setError('');}catch(e){setError((e as Error).message);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),6000);return()=>clearTimeout(timer);},[toast]);
  async function save(action:string,form:unknown) {
    await api('/api/actions',{method:'POST',body:JSON.stringify({action,data:form})});
    await refresh();setToast({message:'저장했습니다.'});
  }
  async function check(ids:string[]) {
    const targets=[...new Set(ids)].filter(id=>!busy.includes(id));
    if(!targets.length)return;
    setBusy(old=>[...new Set([...old,...targets])]);
    let failures=0;
    for(const id of targets) {
      try {
        const result=await api<{status:string;error?:string}>('/api/check',{method:'POST',body:JSON.stringify({id})});
        if(result.status==='failed')failures++;
      } catch(e) {failures++;setToast({message:(e as Error).message,error:true});}
      finally{setBusy(old=>old.filter(item=>item!==id));await refresh();}
    }
    setToast({message:targets.length+'곳 점검 완료'+(failures?' · '+failures+'곳 실패 (실패 이유를 확인해 주세요.)':''),error:!!failures});
  }
  async function open(id:string) {
    setDetailLoading(true);
    try{setDetail(await api<Detail>('/api/notices/'+id));}catch(e){setToast({message:(e as Error).message,error:true});}finally{setDetailLoading(false);}
  }
  async function update(change:Change,patch:Partial<Change>) {
    try {
      const updated=await api<Detail>('/api/notices/'+change.id,{method:'PATCH',body:JSON.stringify({reviewed:change.reviewed,response_status:change.response_status,memo:change.memo,version:change.version,entity_ids:change.entity_ids,...patch})});
      if(detail?.change.id===change.id)setDetail(updated);
      await refresh();setToast({message:'처리 내용과 변경 이력을 저장했습니다.'});
    }catch(e){await refresh();throw e;}
  }
  const actionable=data?.changes.filter(isWorkItem)||[];
  const unread=actionable.filter(c=>!c.reviewed);
  const review=actionable.filter(c=>c.response_status==='검토 필요');
  const todo=actionable.filter(c=>!c.reviewed||c.response_status==='검토 필요'||c.response_status==='대응 중');
  const failed=data?.institutions.filter(i=>i.last_result==='failed')||[];
  const latest=data?.runs[0]?.started_at;
  const active=data?.institutions.filter(i=>i.active)||[];
  const current=NAV.find(n=>n.view===view)!;
  return <div className="app-shell">
    <a className="skip-link" href="#main">본문으로 바로가기</a>
    <aside className={'sidebar '+(mobileNav?'mobile-open':'')}>
      <Link className="brand" href="/"><span className="brand-symbol"><Activity size={23}/></span><span>noti<span className="brand-period">.</span></span><span className="brand-caption">기관 모니터링</span></Link>
      <div className="workspace-switch"><div className="workspace-avatar">N</div><div><strong>개인 업무공간</strong><span>공지 모니터링 워크스페이스</span></div><ChevronRight size={14}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="주 메뉴">{NAV.map(item=><Link key={item.view} href={item.href} className={'nav-link '+(view===item.view?'active':'')} onClick={()=>setMobileNav(false)}><item.icon size={19}/><span>{item.label}</span>{item.view==='notices'&&!!unread.length&&<span className="nav-count">{unread.length}</span>}</Link>)}</nav>
      <div className="sidebar-note"><div className="row gap"><i className="dot green"/><strong>변화를 확인하는 작은 습관</strong></div><p>기관의 공지부터 업무의 마무리까지,<br/>한곳에서 차분하게 관리하세요.</p></div>
      <div className="sidebar-bottom"><button onClick={()=>setHelp(true)}><CircleHelp size={17}/>이용 안내<ArrowUpRight size={14}/></button><div className="user-row"><div className="user-avatar">개</div><div><strong>개인 사용자</strong><small>수동 점검 모드</small></div><Badge>v1.0</Badge></div></div>
    </aside>
    {mobileNav&&<button className="nav-backdrop" aria-label="메뉴 닫기" onClick={()=>setMobileNav(false)}/>}
    <div className="app-main"><header className="topbar"><div className="row gap"><button className="icon-button mobile-menu" aria-label="메뉴 열기" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><span>업무공간</span><ChevronRight size={13}/><strong>{current.label}</strong></div><div className="row gap"><span className="topbar-mode"><i className="dot green"/>수동 점검 모드</span><span className="topbar-date">{koreaDate().replaceAll('-','. ')}</span><button className="icon-button" aria-label="공지·변경사항으로 이동" onClick={()=>{window.location.href='/notices';}}><BellDot size={19}/></button></div></header>
      <main id="main"><div className="page-heading"><div><div className="eyebrow">기관 모니터링 워크스페이스</div><h1>{current.label}</h1><p>{DESCRIPTIONS[view]}</p></div><div className="heading-actions"><span className="last-check">마지막 점검 <strong>{dateTime(latest)}</strong></span><button className="button primary" disabled={!active.length||!!busy.length} onClick={()=>void check(active.map(i=>i.id))}>{busy.length?<Spinner/>:<RefreshCw size={15}/>}<span>{busy.length?busy.length+'곳 점검 중':'전체 수동 점검'}</span></button></div></div>
      {error&&<div className="error-banner" role="alert"><AlertCircle size={18}/><div><strong>자료를 불러오지 못했습니다</strong><p>{error}</p></div><button className="button small" onClick={()=>void refresh()}>다시 시도</button></div>}
      {!data&&!error&&<div className="loading-state" role="status"><Spinner/><p>업무공간을 불러오는 중입니다.</p><div className="skeleton-grid">{[1,2,3,4].map(n=><div key={n} className="skeleton"/>)}</div></div>}
      {data&&<>{view==='dashboard'&&<>
        <div className="metrics"><Metric label="새로운 공지" value={actionable.filter(c=>c.kind==='new').length} icon={FilePlus2} tone="blue" hint="기준 수집 이후 발견"/><Metric label="내용 변경" value={actionable.filter(c=>c.kind==='changed').length} icon={FilePenLine} tone="purple" hint="직전 성공 수집본과 비교"/><Metric label="미확인 항목" value={unread.length} icon={CircleDot} tone="amber" hint="오늘 확인할 업무"/><Metric label="검토 필요" value={review.length} icon={SearchCheck} tone="green" hint="확인 여부와 별도 관리"/></div>
        {!!failed.length&&<div className="error-banner"><AlertCircle size={18}/><div><strong>{failed.length}개 기관 수집 실패</strong><p>{failed.map(i=>i.name+': '+i.last_error).join(' / ')}</p></div><Link className="button small" href="/institutions">실패 이유 확인<ArrowUpRight size={13}/></Link></div>}
        {todo.length?<div className="today-work"><NoticeList data={data} open={id=>void open(id)} update={update} compact items={todo}/></div>:<div className="today-summary"><CheckCheck size={17}/><strong>오늘 확인할 업무가 없습니다</strong><span>새 공지와 변경 사항이 발견되면 이곳에 표시됩니다.</span><Link href="/notices">공지 보기<ArrowUpRight size={13}/></Link></div>}
        <div className="calendar-section-label"><div className="row gap"><h2>점검 일정과 기록</h2><Badge tone="green">실제 업무 자료</Badge></div><span>전체 {data.institutions.length}개 기관 중 {active.length}곳 점검 활성</span></div>
        <Calendar data={data} check={check} busy={busy} save={save}/>
      </>}{view==='institutions'&&<Institutions data={data} busy={busy} check={check} save={save}/>}
      {view==='notices'&&<NoticeList data={data} open={id=>void open(id)} update={update}/>}
      {view==='projects'&&<Projects data={data} save={save} open={id=>void open(id)} update={update}/>}
      <footer className="page-footer"><span><CheckCheck size={13}/>실제 수집 자료와 업무 기록을 영구 저장합니다.</span><span>NOTI WORKSPACE · KST</span></footer>
      </>}
      </main>
    </div>
    {toast&&<div className={'toast '+(toast.error?'error':'')} role="status"><span>{toast.message}</span><button aria-label="알림 닫기" onClick={()=>setToast(null)}><X size={16}/></button></div>}
    {detailLoading&&<Modal title="공지 상세 불러오기" onClose={()=>setDetailLoading(false)}><div className="loading-state"><Spinner/>수집 자료를 불러오는 중입니다.</div></Modal>}
    {detail&&data&&!detailLoading&&<NoticeDetail key={detail.change.id} detail={detail} data={data} onClose={()=>setDetail(null)} onSave={update}/>}
    {help&&<Modal title="업무공간 이용 안내" onClose={()=>setHelp(false)}><div className="help-body"><h3>1. 기관 점검</h3><p>공무원연금·한국도로교통공단·국민건강보험 3곳의 공지를 실제 수집합니다. 전체 또는 기관별 수동 점검을 실행하세요. 다른 기관은 본문·목록 영역을 설정한 후 활성화할 수 있습니다.</p><h3>2. 기준 자료와 새 알림</h3><p>처음 수집한 공지는 기준 자료로 저장합니다. 이후 새로운 공지나 본문 수정이 발견되면 업무 알림이 생성됩니다. 수집 실패 시 이전 자료를 유지합니다.</p><h3>3. 확인과 대응</h3><p>공지 확인 여부와 대응 상태를 따로 저장합니다. 읽은 공지도 ‘확인 완료 + 검토 필요’로 남길 수 있습니다. 상세 화면에서 메모와 연결 항목을 저장하면 대응 이력에 기록됩니다.</p><h3>4. 캘린더 일정</h3><p>예정 일정과 실제 점검 이력을 해당 날짜에 표시합니다. 일정 추가는 자동 실행 예약이 아닙니다. 정기 점검은 실행 환경 확인 후 별도로 설정합니다.</p><h3>수집 범위</h3><p>공지 목록 첫 페이지에서 최대 12건을 확인합니다. 이전 페이지로 이동한 공지의 재수정, 첨부파일 내부 내용, 같은 URL의 외부 이미지 교체는 현재 감지 범위에 포함되지 않습니다.</p></div></Modal>}
  </div>;
}
function Metric({label,value,icon:Icon,tone,hint}:{label:string;value:number;icon:typeof Activity;tone:string;hint:string}) {
  return <div className="metric"><div className="row-between"><span>{label}</span><div className={'metric-icon '+tone}><Icon size={17}/></div></div><div className="metric-value">{value}<span>건</span></div><p>{hint}</p></div>;
}
