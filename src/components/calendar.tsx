'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, CalendarClock, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { Bootstrap, CheckSchedule } from '@/lib/types';
import { dayKey, fullDay, koreaDate, dateTime, RESULT_LABELS } from '@/lib/display';
import { Badge, Empty, Modal, Spinner } from './ui';

type Props = {data:Bootstrap;check:(ids:string[])=>Promise<void>;busy:string[];save:(action:string,data:unknown)=>Promise<void>};
export function Calendar({data,check,busy,save}:Props) {
  const today=koreaDate();
  const [month,setMonth]=useState(today.slice(0,7));
  const [selected,setSelected]=useState(today);
  const [showSchedule,setShowSchedule]=useState(false);
  const [year,monthNumber]=month.split('-').map(Number);
  const start=new Date(Date.UTC(year,monthNumber-1,1));
  const days=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  const length=Math.ceil((start.getUTCDay()+days)/7)*7;
  const runs=data.runs.filter(r=>dayKey(r.started_at)===selected);
  const schedules=data.schedules.filter(s=>s.scheduled_date===selected);
  function moveMonth(offset:number) {
    const date=new Date(Date.UTC(year,monthNumber-1+offset,1));
    setMonth(date.toISOString().slice(0,7));
  }
  return <div className="calendar-layout">
    <section className="panel calendar-panel">
      <div className="calendar-toolbar">
        <div className="month-picker"><h2>{year}년 <span>{monthNumber}월</span></h2><button className="icon-button" aria-label="이전 달" onClick={()=>moveMonth(-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="다음 달" onClick={()=>moveMonth(1)}><ChevronRight size={18}/></button><button className="button small" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>오늘</button></div>
        <div className="legend"><span><i className="dot purple"/>예정</span><span><i className="dot green"/>완료</span><span><i className="dot red"/>실패</span></div>
      </div>
      <div className="calendar-scroll"><div className="calendar-grid" role="grid" aria-label={year+'년 '+monthNumber+'월 점검 캘린더'}>
        {['일','월','화','수','목','금','토'].map((day,i)=><div role="columnheader" className={'weekday '+(i===0?'sunday':i===6?'saturday':'')} key={day}>{day}</div>)}
        {Array.from({length},(_,index)=>{
          const day=index-start.getUTCDay()+1;
          if(day<1||day>days)return <div role="gridcell" className="calendar-day outside" key={index}/>;
          const key=month+'-'+String(day).padStart(2,'0');
          const dayRuns=data.runs.filter(r=>dayKey(r.started_at)===key);
          const daySchedules=data.schedules.filter(s=>s.scheduled_date===key&&!s.completed_run_id);
          const entries=[...daySchedules.map(s=>({id:s.id,name:s.institution_name,tone:'purple',label:'예정'})),...dayRuns.map(r=>({id:r.id,name:r.institution_name,tone:r.status==='failed'?'red':r.status==='running'?'gray':'green',label:r.status==='failed'?'실패':r.status==='running'?'점검 중':'완료'}))];
          return <button role="gridcell" type="button" aria-selected={selected===key} aria-label={key+' 점검 '+entries.length+'건'} onClick={()=>setSelected(key)} className={'calendar-day '+(selected===key?'selected ':'')+(key===today?'today ':'')+(index%7===0?'sunday ':index%7===6?'saturday ':'')} key={index}>
            <div className="day-top"><span className="day-number">{day}</span>{key===today&&<small>오늘</small>}</div>
            <div className="day-entries">{entries.slice(0,3).map(entry=><span key={entry.id} className={'calendar-entry '+entry.tone} title={entry.name+' '+entry.label}><i className={'dot '+entry.tone}/><span>{entry.name}</span><small>{entry.label}</small></span>)}{entries.length>3&&<span className="more-entries">+ {entries.length-3}건 더보기</span>}</div>
          </button>;
        })}
      </div></div>
      <div className="calendar-footer"><CalendarClock size={14}/><span>한국 표준시(KST) · 점검 예정과 실제 실행 이력을 표시합니다.</span><span className="manual-label">정기 자동 점검 미설정</span></div>
    </section>
    <aside className="panel day-panel">
      <div className="day-heading"><span className="eyebrow">선택한 날짜</span><h2>{fullDay(selected)}</h2><p>점검 예정 {schedules.filter(s=>!s.completed_run_id).length}건 · 실행 {runs.length}건</p></div>
      <button className="button full" onClick={()=>setShowSchedule(true)}><Plus size={15}/>점검 일정 추가</button>
      <div className="section-label">점검 예정 <span>{schedules.length}</span></div>
      {!schedules.length?<p className="quiet-empty">등록된 점검 일정이 없습니다.</p>:schedules.map(s=><ScheduleCard key={s.id} schedule={s} busy={busy.includes(s.institution_id)} active={!!data.institutions.find(i=>i.id===s.institution_id)?.active} check={check} save={save}/>)}
      <div className="section-label">실행 이력 <span>{runs.length}</span></div>
      {!runs.length?<Empty title="점검 이력이 없습니다" description="수동 점검을 실행하면 이곳에 결과가 기록됩니다."/>:runs.map(run=><div className="run-card" key={run.id}>
        <div className={'run-symbol '+(run.status==='failed'?'error':'success')}>{run.status==='failed'?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>}</div>
        <div><strong>{run.institution_name}</strong><p>{RESULT_LABELS[run.status]} · {run.item_count}건</p>{run.error&&<p className="error-text">{run.error}</p>}<small>{dateTime(run.started_at)}</small></div>
        <Badge tone={run.status==='failed'?'red':'green'}>{run.status==='failed'?'실패':run.status==='running'?'진행 중':'완료'}</Badge>
      </div>)}
    </aside>
    {showSchedule&&<ScheduleForm institutions={data.institutions} date={selected} save={save} onClose={()=>setShowSchedule(false)}/>}
  </div>;
}
function ScheduleCard({schedule,busy,active,check,save}:{schedule:CheckSchedule;busy:boolean;active:boolean;check:Props['check'];save:Props['save']}) {
  const [deleting,setDeleting]=useState(false);
  return <div className="schedule-card"><div className="row-between"><strong>{schedule.institution_name}</strong><Badge tone={schedule.completed_run_id?'green':'purple'}>{schedule.completed_run_id?'완료':'예정'}</Badge></div>{schedule.memo&&<p>{schedule.memo}</p>}<div className="schedule-actions">{!schedule.completed_run_id&&<button className="text-button" disabled={busy||!active} title={!active?'기관 설정에서 점검을 활성화해 주세요.':undefined} onClick={()=>void check([schedule.institution_id])}>{busy?<Spinner/>:<ArrowUpRight size={14}/>}지금 점검</button>}<button className="text-button muted" disabled={deleting} onClick={async()=>{setDeleting(true);try{await save('deleteSchedule',{id:schedule.id});}finally{setDeleting(false);}}}>일정 삭제</button></div></div>;
}
function ScheduleForm({institutions,date,save,onClose}:{institutions:Bootstrap['institutions'];date:string;save:Props['save'];onClose:()=>void}) {
  const [institutionId,setInstitutionId]=useState(institutions.find(i=>i.active)?.id||institutions[0]?.id||'');
  const [scheduledDate,setScheduledDate]=useState(date);
  const [memo,setMemo]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  return <Modal title="점검 일정 추가" onClose={onClose}><form onSubmit={async event=>{event.preventDefault();setSaving(true);setError('');try{await save('schedule',{institution_id:institutionId,scheduled_date:scheduledDate,memo});onClose();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}>
    <div className="form-body"><label>기관<select required value={institutionId} onChange={e=>setInstitutionId(e.target.value)}>{institutions.map(i=><option key={i.id} value={i.id}>{i.name}{!i.active?' (연동 준비)':''}</option>)}</select></label><label>점검 날짜<input type="date" required value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}/></label><label>점검 메모<textarea value={memo} maxLength={1000} onChange={e=>setMemo(e.target.value)} placeholder="확인할 내용을 남겨 주세요."/></label><p className="form-hint">일정은 캘린더에 표시됩니다. 자동 실행은 하지 않으며 해당 날짜에 수동으로 점검합니다. 당일 점검이 성공하면 일정이 완료로 표시됩니다.</p>{error&&<p role="alert" className="error-text">{error}</p>}</div><div className="form-footer"><button type="button" className="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving||!institutionId}>{saving&&<Spinner/>}일정 저장</button></div>
  </form></Modal>;
}
