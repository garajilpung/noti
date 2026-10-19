'use client';
import { useState } from 'react';
import { Building2, FolderKanban, Plus, Settings2, ArrowRight } from 'lucide-react';
import type { Bootstrap, Change, Entity } from '@/lib/types';
import { isWorkItem } from '@/lib/display';
import { Badge, CheckList, Empty, Modal, Spinner } from './ui';
import { NoticeList, relatedEntities } from './notices';
type Props={data:Bootstrap;save:(action:string,data:unknown)=>Promise<void>;open:(id:string)=>void;update:(change:Change,patch:Partial<Change>)=>Promise<void>};
export function Projects({data,save,open,update}:Props) {
  const [kind,setKind]=useState<'company'|'project'>('company');
  const [selected,setSelected]=useState<string|null>(null);
  const [editing,setEditing]=useState<Entity|null|undefined>(undefined);
  const current=data.entities.find(e=>e.id===selected);
  const related=current?data.changes.filter(c=>relatedEntities(c,data.entities).some(e=>e.id===current.id)):undefined;
  return <><div className="section-actions"><div className="segmented"><button className={kind==='company'?'active':''} onClick={()=>{setKind('company');setSelected(null);}}><Building2 size={15}/>업체</button><button className={kind==='project'?'active':''} onClick={()=>{setKind('project');setSelected(null);}}><FolderKanban size={15}/>프로젝트</button></div><button className="button primary" onClick={()=>setEditing(null)}><Plus size={16}/>{kind==='company'?'업체':'프로젝트'} 등록</button></div>
    {data.entities.filter(e=>e.kind===kind).length?<div className="entity-grid">{data.entities.filter(e=>e.kind===kind).map(entity=>{
      const changes=data.changes.filter(c=>relatedEntities(c,data.entities).some(e=>e.id===entity.id)&&isWorkItem(c));
      return <section className={'panel entity-card '+(entity.id===selected?'selected':'')} key={entity.id}><div className="row-between"><div className="entity-symbol">{kind==='company'?<Building2 size={21}/>:<FolderKanban size={21}/>}</div><button className="icon-button" aria-label={entity.name+' 수정'} onClick={()=>setEditing(entity)}><Settings2 size={17}/></button></div><h2>{entity.name}</h2>{entity.company_id&&<p className="muted">{data.entities.find(e=>e.id===entity.company_id)?.name}</p>}<p className="entity-memo">{entity.memo||'등록된 업무 메모가 없습니다.'}</p><div className="entity-institutions">{entity.institution_ids.length?entity.institution_ids.map(id=><Badge key={id}>{data.institutions.find(i=>i.id===id)?.name||'기관'}</Badge>):<span className="muted">연결된 기관 없음</span>}</div><div className="entity-counts"><span>미확인 <strong>{changes.filter(c=>!c.reviewed).length}</strong></span><span>검토 필요 <strong>{changes.filter(c=>c.response_status==='검토 필요').length}</strong></span><button className="text-button" onClick={()=>setSelected(entity.id)}>관련 공지·이력<ArrowRight size={14}/></button></div></section>;
    })}</div>:<section className="panel"><Empty title={kind==='company'?'등록된 업체가 없습니다':'등록된 프로젝트가 없습니다'} description="기관을 연결하면 해당 기관의 공지와 대응 이력을 함께 조회할 수 있습니다." action={<button className="button small" onClick={()=>setEditing(null)}><Plus size={14}/>{kind==='company'?'첫 업체':'첫 프로젝트'} 등록</button>}/></section>}
    {current&&<div className="related-section"><h2>{current.name} 관련 공지·대응 이력</h2><p className="muted">기관 연결 항목과 공지에 직접 연결한 항목을 함께 표시합니다. 공지 상세에서 전체 대응 이력을 확인할 수 있습니다.</p><NoticeList key={current.id} data={data} open={open} update={update} items={related}/></div>}
    {editing!==undefined&&<EntityForm key={editing?.id||kind} kind={kind} entity={editing} data={data} save={save} onClose={()=>setEditing(undefined)}/>}
  </>;
}
function EntityForm({kind,entity,data,save,onClose}:{kind:'company'|'project';entity:Entity|null;data:Bootstrap;save:Props['save'];onClose:()=>void}) {
  const [name,setName]=useState(entity?.name||''),[memo,setMemo]=useState(entity?.memo||'');
  const [companyId,setCompanyId]=useState(entity?.company_id||'');
  const [ids,setIds]=useState(entity?.institution_ids||[]);
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  return <Modal title={(kind==='company'?'업체':'프로젝트')+(entity?' 수정':' 등록')} onClose={onClose}><form onSubmit={async event=>{event.preventDefault();setSaving(true);setError('');try{await save('entity',{id:entity?.id,kind,name,memo,company_id:companyId||null,institution_ids:ids});onClose();}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}><div className="form-body"><label>{kind==='company'?'업체명':'프로젝트명'}<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>{kind==='project'&&<label>소속 업체<select value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">선택 안 함</option>{data.entities.filter(e=>e.kind==='company').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}<fieldset className="field-group"><legend>관련 기관 (여러 개 선택)</legend><CheckList items={data.institutions} selected={ids} onChange={setIds}/></fieldset><label>업무 메모<textarea maxLength={10000} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="업무 범위와 관련 내용을 기록하세요."/></label>{error&&<p className="error-text" role="alert">{error}</p>}</div><div className="form-footer"><button type="button" className="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving}>{saving&&<Spinner/>}저장</button></div></form></Modal>;
}
