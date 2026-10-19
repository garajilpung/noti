import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { getPool, databaseConnection } from '../src/lib/db';
import { getBootstrap, getDetail, runCheck, updateChange } from '../src/lib/service';
import { koreaDate } from '../src/lib/display';
import type { CollectedNotice, Institution } from '../src/lib/types';

after(async()=>{await getPool().end();});
test('통제된 자료로 기관 등록 → 수집 → 대응 저장 → 별도 연결 재조회',async t=>{
  const pool=getPool(),workspace='test-'+randomUUID(),institutionId=randomUUID();
  const item=(key:string,body:string):CollectedNotice=>({sourceKey:key,title:'[검증 전용] 공지 '+key,url:'https://example.com/notice/'+key,publishedDate:'2026-10-19',body});
  let items=[item('1','최초 점검: 오전 10시'),item('2','시스템 정상 운영')];
  const fixture=async (_institution:Institution)=>items;
  let changedId='',companyId='',projectId='';
  await pool.query('INSERT INTO workspaces(id,name) VALUES($1,$2)',[workspace,'통제된 예시 검증 전용']);
  await pool.query("INSERT INTO institutions(id,workspace_id,name,home_url,notice_url,active,body_selector) VALUES($1,$2,'[검증 전용] 기관','https://example.com','https://example.com/list',true,'article')",[institutionId,workspace]);
  try {
    await t.test('최초 수집은 기준 자료이며 업무 알림 0건',async()=>{
      const result=await runCheck(institutionId,workspace,fixture);
      assert.equal(result.status,'baseline');
      const state=await getBootstrap(workspace);
      assert.equal(state.changes.length,2);
      assert.ok(state.changes.every(c=>c.kind==='baseline'&&c.reviewed));
    });
    await t.test('재점검해도 중복 공지·알림 없음, 수집본은 보관',async()=>{
      const result=await runCheck(institutionId,workspace,fixture);
      assert.equal(result.status,'unchanged');
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM notices WHERE institution_id=$1',[institutionId])).rows[0].count,2);
      assert.equal((await getBootstrap(workspace)).changes.length,2);
    });
    await t.test('신규 1건과 기존 본문 변경 1건을 분리 저장',async()=>{
      items=[item('1','변경 점검: 오전 11시'),item('2','시스템 정상 운영'),item('3','새로운 점검 일정')];
      const result=await runCheck(institutionId,workspace,fixture);
      assert.equal(result.newCount,1);assert.equal(result.changedCount,1);
      const state=await getBootstrap(workspace);
      const changed=state.changes.find(c=>c.kind==='changed')!;
      changedId=changed.id;
      const detail=await getDetail(changedId,workspace);
      assert.equal(detail.before?.body,'최초 점검: 오전 10시');
      assert.equal(detail.after.body,'변경 점검: 오전 11시');
      assert.equal(state.changes.filter(c=>c.kind==='new').length,1);
    });
    await t.test('실패와 변경 없음 구분, 실패 시 이전 수집본·성공 시각 보존',async()=>{
      const before=await getBootstrap(workspace);
      const result=await runCheck(institutionId,workspace,async()=>{throw new Error('[통제된 실패] 기관 HTTP 403');});
      assert.equal(result.status,'failed');
      const state=await getBootstrap(workspace);
      assert.equal(state.institutions[0].last_success_at,before.institutions[0].last_success_at);
      assert.equal(state.changes.length,before.changes.length);
      assert.equal(state.institutions[0].last_result,'failed');
      assert.equal((await runCheck(institutionId,workspace,fixture)).status,'unchanged');
    });
    await t.test('업체와 프로젝트 각각 여러 기관에 연결 가능',async()=>{
      companyId=randomUUID();projectId=randomUUID();
      const anotherInstitution=randomUUID();
      await pool.query("INSERT INTO institutions(id,workspace_id,name,home_url,notice_url) VALUES($1,$2,'[검증 전용] 연결 기관','https://example.com','https://example.com/other')",[anotherInstitution,workspace]);
      await pool.query("INSERT INTO entities(id,workspace_id,kind,name) VALUES($1,$2,'company','[검증 전용] 업체')",[companyId,workspace]);
      await pool.query("INSERT INTO entities(id,workspace_id,kind,name,company_id) VALUES($1,$2,'project','[검증 전용] 프로젝트',$3)",[projectId,workspace,companyId]);
      for(const id of [companyId,projectId])for(const institution of [institutionId,anotherInstitution])await pool.query('INSERT INTO entity_institutions(entity_id,institution_id) VALUES($1,$2)',[id,institution]);
      const state=await getBootstrap(workspace);
      assert.deepEqual(new Set(state.institutions[0].entity_ids),new Set([companyId,projectId]));
      assert.ok(state.entities.every(e=>e.institution_ids.includes(institutionId)&&e.institution_ids.includes(anotherInstitution)));
    });
    await t.test('확인 완료 + 검토 필요 + 메모·직접 연결·시각·이력 저장',async()=>{
      const {change}=await getDetail(changedId,workspace);
      await updateChange(changedId,{...change,reviewed:true,response_status:'검토 필요',memo:'[검증 전용] 업체 영향 조사 필요',entity_ids:[companyId,projectId]},workspace);
      const detail=await getDetail(changedId,workspace);
      assert.equal(detail.change.reviewed,true);assert.equal(detail.change.response_status,'검토 필요');
      assert.ok(detail.change.reviewed_at);assert.equal(detail.activities.length,1);
      assert.equal(detail.activities[0].memo,'[검증 전용] 업체 영향 조사 필요');
      assert.deepEqual(new Set(detail.change.entity_ids),new Set([companyId,projectId]));
      await assert.rejects(()=>updateChange(changedId,{...change,reviewed:false,response_status:'미분류',memo:'오래된 화면',entity_ids:[]},workspace),/다른 화면/);
      assert.equal((await getDetail(changedId,workspace)).activities.length,1);
    });
    await t.test('새 데이터베이스 연결에서도 저장 내용 유지, 다른 업무공간과 분리',async()=>{
      const other=new Pool({connectionString:databaseConnection()});
      try {
        const saved=(await other.query('SELECT reviewed,response_status,memo FROM changes WHERE id=$1',[changedId])).rows[0];
        assert.equal(saved.reviewed,true);assert.equal(saved.response_status,'검토 필요');
        assert.equal(saved.memo,'[검증 전용] 업체 영향 조사 필요');
        assert.equal((await getBootstrap()).institutions.some(i=>i.id===institutionId),false);
      }finally{await other.end();}
    });
    await t.test('당일 점검 성공 시 예정 일정 완료 처리',async()=>{
      const scheduleId=randomUUID();
      await pool.query('INSERT INTO check_schedules(id,institution_id,scheduled_date,memo) VALUES($1,$2,$3,$4)',[scheduleId,institutionId,koreaDate(),'[검증 전용] 일정']);
      const result=await runCheck(institutionId,workspace,fixture);
      const state=await getBootstrap(workspace);
      assert.equal(state.schedules[0].scheduled_date,koreaDate());
      assert.equal(state.schedules[0].completed_run_id,result.id);
    });
    await t.test('기관별 중복 실행 방지, 다른 기관은 계속 점검',async()=>{
      let release:()=>void=()=>{};
      let started:()=>void=()=>{};
      const gate=new Promise<void>(resolve=>{release=resolve;});
      const ready=new Promise<void>(resolve=>{started=resolve;});
      const first=runCheck(institutionId,workspace,async()=>{started();await gate;return items;});
      await ready;
      try {await assert.rejects(()=>runCheck(institutionId,workspace,fixture),/점검 중/);}
      finally {release();}
      assert.equal((await first).status,'unchanged');
      const secondId=randomUUID();
      await pool.query("INSERT INTO institutions(id,workspace_id,name,home_url,notice_url,active,body_selector) VALUES($1,$2,'[검증 전용] 두 번째 기관','https://example.com','https://example.com/list',true,'article')",[secondId,workspace]);
      const results=await Promise.all([runCheck(institutionId,workspace,async()=>{throw new Error('통제된 기관 오류');}),runCheck(secondId,workspace,fixture)]);
      assert.equal(results[0].status,'failed');assert.equal(results[1].status,'baseline');
    });
  }finally{await pool.query('DELETE FROM workspaces WHERE id=$1',[workspace]);}
});
