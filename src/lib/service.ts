import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPool, transaction, WORKSPACE } from './db';
import { collectInstitution, fingerprint } from './collector';
import type { Institution, CollectedNotice, Bootstrap, Change, Detail } from './types';

export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function getBootstrap(workspace = WORKSPACE): Promise<Bootstrap> {
  const pool = getPool();
  const results = await Promise.all([
    pool.query("SELECT i.*, ARRAY(SELECT entity_id FROM entity_institutions WHERE institution_id=i.id) AS entity_ids FROM institutions i WHERE workspace_id=$1 ORDER BY active DESC, name", [workspace]),
    pool.query("SELECT e.*, ARRAY(SELECT institution_id FROM entity_institutions WHERE entity_id=e.id) AS institution_ids FROM entities e WHERE workspace_id=$1 ORDER BY kind,name", [workspace]),
    pool.query("SELECT c.*,n.institution_id,i.name AS institution_name,s.title,n.url,n.published_date,n.first_seen_at,ARRAY(SELECT entity_id FROM change_entities WHERE change_id=c.id) AS entity_ids FROM changes c JOIN notices n ON n.id=c.notice_id JOIN institutions i ON i.id=n.institution_id JOIN snapshots s ON s.id=c.after_snapshot_id WHERE i.workspace_id=$1 ORDER BY c.found_at DESC LIMIT 1000", [workspace]),
    pool.query("SELECT r.*,i.name AS institution_name FROM check_runs r JOIN institutions i ON i.id=r.institution_id WHERE i.workspace_id=$1 AND r.started_at > now()-interval '1 year' ORDER BY r.started_at DESC LIMIT 2000", [workspace]),
    pool.query("SELECT s.*,i.name AS institution_name FROM check_schedules s JOIN institutions i ON i.id=s.institution_id WHERE i.workspace_id=$1 ORDER BY scheduled_date", [workspace]),
  ]);
  return { institutions: results[0].rows, entities: results[1].rows, changes: results[2].rows, runs: results[3].rows, schedules: results[4].rows };
}
export async function getDetail(id: string, workspace = WORKSPACE): Promise<Detail> {
  const pool = getPool();
  const result = await pool.query("SELECT c.*,n.institution_id,i.name AS institution_name,s.title,n.url,n.published_date,n.first_seen_at,ARRAY(SELECT entity_id FROM change_entities WHERE change_id=c.id) AS entity_ids FROM changes c JOIN notices n ON n.id=c.notice_id JOIN institutions i ON i.id=n.institution_id JOIN snapshots s ON s.id=c.after_snapshot_id WHERE c.id=$1 AND i.workspace_id=$2", [id,workspace]);
  if (!result.rows[0]) throw new AppError('항목을 찾을 수 없습니다.', 404);
  const change = result.rows[0];
  const [before, after, activities] = await Promise.all([
    change.before_snapshot_id ? pool.query('SELECT * FROM snapshots WHERE id=$1',[change.before_snapshot_id]) : Promise.resolve({ rows: [] }),
    pool.query('SELECT * FROM snapshots WHERE id=$1',[change.after_snapshot_id]),
    pool.query('SELECT * FROM activities WHERE change_id=$1 ORDER BY created_at DESC',[id]),
  ]);
  return { change, before: before.rows[0] || null, after: after.rows[0], activities: activities.rows };
}
export async function validateEntityIds(client: PoolClient, ids: string[], workspace: string) {
  if (!ids.length) return;
  const valid = await client.query('SELECT id FROM entities WHERE id=ANY($1::text[]) AND workspace_id=$2',[ids,workspace]);
  if (valid.rowCount !== new Set(ids).size) throw new AppError('연결할 업체·프로젝트를 다시 확인해 주세요.');
}
export async function updateChange(id: string, patch: Pick<Change,'reviewed'|'response_status'|'memo'|'version'|'entity_ids'>, workspace = WORKSPACE) {
  return transaction(async client => {
    const current = await client.query('SELECT c.* FROM changes c JOIN notices n ON n.id=c.notice_id JOIN institutions i ON i.id=n.institution_id WHERE c.id=$1 AND i.workspace_id=$2 FOR UPDATE OF c',[id,workspace]);
    if (!current.rows[0]) throw new AppError('항목을 찾을 수 없습니다.',404);
    if (current.rows[0].version !== patch.version) throw new AppError('다른 화면에서 수정되었습니다. 최신 내용을 불러온 후 다시 저장해 주세요.',409);
    await validateEntityIds(client, patch.entity_ids, workspace);
    await client.query("UPDATE changes SET reviewed=$2,response_status=$3,memo=$4,version=version+1,updated_at=now(),reviewed_at=CASE WHEN $2 AND NOT reviewed THEN now() WHEN NOT $2 THEN NULL ELSE reviewed_at END WHERE id=$1",[id,patch.reviewed,patch.response_status,patch.memo]);
    await client.query('DELETE FROM change_entities WHERE change_id=$1',[id]);
    for (const entityId of new Set(patch.entity_ids)) await client.query('INSERT INTO change_entities(change_id,entity_id) VALUES($1,$2)',[id,entityId]);
    await client.query('INSERT INTO activities(id,change_id,reviewed,response_status,memo,entity_ids) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),id,patch.reviewed,patch.response_status,patch.memo,JSON.stringify(patch.entity_ids)]);
  });
}
export async function storeCollection(client: PoolClient, institution: Institution, runId: string, items: CollectedNotice[]) {
  const baseline = !institution.baseline_at;
  let newCount = 0, changedCount = 0;
  for (const item of items) {
    const existing = await client.query('SELECT * FROM notices WHERE institution_id=$1 AND source_key=$2',[institution.id,item.sourceKey]);
    const noticeId = existing.rows[0]?.id || randomUUID();
    const previous = existing.rows[0] ? (await client.query('SELECT * FROM snapshots WHERE notice_id=$1 ORDER BY collected_at DESC,id DESC LIMIT 1',[noticeId])).rows[0] : null;
    const hash = fingerprint(item.title,item.body);
    if (!existing.rows[0]) await client.query('INSERT INTO notices(id,institution_id,source_key,title,url,published_date) VALUES($1,$2,$3,$4,$5,$6)',[noticeId,institution.id,item.sourceKey,item.title,item.url,item.publishedDate]);
    else await client.query('UPDATE notices SET title=$2,url=$3,published_date=$4,last_seen_at=now() WHERE id=$1',[noticeId,item.title,item.url,item.publishedDate]);
    const snapshotId = randomUUID();
    await client.query('INSERT INTO snapshots(id,notice_id,run_id,title,body,content_hash,source_url) VALUES($1,$2,$3,$4,$5,$6,$7)',[snapshotId,noticeId,runId,item.title,item.body,hash,item.url]);
    const kind = baseline ? 'baseline' : !previous ? 'new' : previous.content_hash !== hash ? 'changed' : null;
    if (kind) {
      await client.query('INSERT INTO changes(id,notice_id,kind,before_snapshot_id,after_snapshot_id,reviewed,reviewed_at) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6 THEN now() ELSE NULL END)',[randomUUID(),noticeId,kind,kind === 'changed' ? previous.id : null,snapshotId,baseline]);
      if (kind === 'new') newCount++;
      if (kind === 'changed') changedCount++;
    }
  }
  const status = baseline ? 'baseline' : newCount + changedCount ? 'changed' : 'unchanged';
  await client.query('UPDATE check_runs SET status=$2,finished_at=now(),item_count=$3,new_count=$4,changed_count=$5 WHERE id=$1',[runId,status,items.length,newCount,changedCount]);
  await client.query('UPDATE institutions SET baseline_at=COALESCE(baseline_at,now()),last_success_at=now(),last_checked_at=now(),last_result=$2,last_error=NULL,lease_until=NULL,lease_token=NULL WHERE id=$1',[institution.id,status]);
  await client.query("UPDATE check_schedules SET completed_run_id=$2 WHERE institution_id=$1 AND scheduled_date=(now() AT TIME ZONE 'Asia/Seoul')::date AND completed_run_id IS NULL",[institution.id,runId]);
  return { id: runId, status, itemCount: items.length, newCount, changedCount };
}
export async function runCheck(id: string, workspace = WORKSPACE, collector = collectInstitution) {
  const runId = randomUUID();
  const institution = await transaction(async client => {
    const locked = await client.query("UPDATE institutions SET lease_until=now()+interval '180 seconds',lease_token=$3 WHERE id=$1 AND workspace_id=$2 AND active=true AND (lease_until IS NULL OR lease_until<now()) RETURNING *",[id,workspace,runId]);
    if (!locked.rows[0]) {
      const existing = await client.query('SELECT active FROM institutions WHERE id=$1 AND workspace_id=$2',[id,workspace]);
      if (!existing.rows[0]) throw new AppError('기관을 찾을 수 없습니다.',404);
      throw new AppError(existing.rows[0].active ? '이미 점검 중입니다. 잠시 후 결과를 확인해 주세요.' : '점검이 비활성화되어 있습니다.',409);
    }
    await client.query("UPDATE check_runs SET status='failed',finished_at=now(),error='이전 점검의 실행 시간이 초과되었습니다.' WHERE institution_id=$1 AND status='running'",[id]);
    await client.query("INSERT INTO check_runs(id,institution_id,status) VALUES($1,$2,'running')",[runId,id]);
    return locked.rows[0] as Institution;
  });
  try {
    const items = await collector(institution);
    if (!items.length) throw new Error('수집된 항목이 없습니다. 기준 자료를 유지합니다.');
    return await transaction(async client => {
      const lock = await client.query('SELECT lease_token FROM institutions WHERE id=$1 FOR UPDATE',[id]);
      if (lock.rows[0]?.lease_token !== runId) throw new AppError('점검 유효 시간이 만료되었습니다.',409);
      return storeCollection(client,institution,runId,items);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 수집 오류';
    await transaction(async client => {
      await client.query("UPDATE check_runs SET status='failed',finished_at=now(),error=$2 WHERE id=$1",[runId,message]);
      await client.query("UPDATE institutions SET last_checked_at=now(),last_result='failed',last_error=$2,lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$3",[id,message,runId]);
    });
    return { id:runId,status:'failed',error:message,itemCount:0,newCount:0,changedCount:0 };
  }
}
