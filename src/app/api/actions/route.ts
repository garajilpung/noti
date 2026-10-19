import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { load } from 'cheerio';
import { requireAccess } from '@/lib/access';
import { errorResponse, readJson } from '@/lib/http';
import { transaction, WORKSPACE } from '@/lib/db';
import { AppError, validateEntityIds } from '@/lib/service';
import { validateUrl } from '@/lib/collector';

const institutionSchema = z.object({
  id:z.string().optional(), name:z.string().trim().min(1).max(100), category:z.string().min(1).max(50),
  home_url:z.string().url(),notice_url:z.string().url(),mode:z.enum(['list','page']),adapter:z.enum(['generic','geps','koroad','nhis']),
  list_selector:z.string().min(1).max(500),link_selector:z.string().min(1).max(500),date_selector:z.string().max(500),
  body_selector:z.string().max(500),exclude_selector:z.string().max(500),active:z.boolean(),max_items:z.number().int().min(1).max(12),
  entity_ids:z.array(z.string()).max(100),
});
export async function POST(request: Request) {
  try {
    requireAccess(request,true);
    const input = z.object({action:z.string(),data:z.unknown()}).parse(await readJson(request));
    if (input.action === 'institution') {
      const data = institutionSchema.parse(input.data);
      validateUrl(data.home_url);validateUrl(data.notice_url);
      if (data.active && !data.body_selector.trim()) throw new AppError('점검 활성화 전에 본문 영역을 설정해 주세요.');
      try {
        const $ = load('<div></div>');
        [data.list_selector,data.link_selector,data.date_selector,data.body_selector,data.exclude_selector].filter(Boolean).forEach(selector => { $(selector); });
      } catch { throw new AppError('CSS 선택자 문법이 올바르지 않습니다.'); }
      const id = data.id || randomUUID();
      await transaction(async client => {
        await validateEntityIds(client,data.entity_ids,WORKSPACE);
        const values = [id,WORKSPACE,data.name,data.category,data.home_url,data.notice_url,data.mode,data.adapter,data.list_selector,data.link_selector,data.date_selector,data.body_selector,data.exclude_selector,data.active,data.max_items];
        if (data.id) {
          const current = await client.query('SELECT lease_until FROM institutions WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[id,WORKSPACE]);
          if (!current.rows[0]) throw new AppError('기관을 찾을 수 없습니다.',404);
          if (current.rows[0].lease_until && Date.parse(current.rows[0].lease_until)>Date.now()) throw new AppError('점검이 끝난 후 설정을 변경해 주세요.',409);
          await client.query('UPDATE institutions SET name=$3,category=$4,home_url=$5,notice_url=$6,mode=$7,adapter=$8,list_selector=$9,link_selector=$10,date_selector=$11,body_selector=$12,exclude_selector=$13,active=$14,max_items=$15 WHERE id=$1 AND workspace_id=$2',values);
        } else await client.query('INSERT INTO institutions(id,workspace_id,name,category,home_url,notice_url,mode,adapter,list_selector,link_selector,date_selector,body_selector,exclude_selector,active,max_items) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',values);
        await client.query('DELETE FROM entity_institutions WHERE institution_id=$1',[id]);
        for(const entityId of new Set(data.entity_ids)) await client.query('INSERT INTO entity_institutions(entity_id,institution_id) VALUES($1,$2)',[entityId,id]);
      });
      return Response.json({id});
    }
    if (input.action === 'entity') {
      const data = z.object({id:z.string().optional(),kind:z.enum(['company','project']),name:z.string().trim().min(1).max(100),company_id:z.string().nullable(),memo:z.string().max(10000),institution_ids:z.array(z.string()).max(100)}).parse(input.data);
      const id = data.id || randomUUID();
      await transaction(async client => {
        const valid = await client.query('SELECT id FROM institutions WHERE workspace_id=$1 AND id=ANY($2::text[])',[WORKSPACE,data.institution_ids]);
        if (valid.rowCount !== new Set(data.institution_ids).size) throw new AppError('기관 연결을 다시 확인해 주세요.');
        if(data.company_id) {
          const company = await client.query("SELECT id FROM entities WHERE workspace_id=$1 AND id=$2 AND kind='company'",[WORKSPACE,data.company_id]);
          if(!company.rowCount) throw new AppError('상위 업체를 찾을 수 없습니다.');
        }
        const params = [id,WORKSPACE,data.kind,data.name,data.kind === 'project' ? data.company_id : null,data.memo];
        if(data.id) {
          const updated = await client.query('UPDATE entities SET name=$4,company_id=$5,memo=$6 WHERE id=$1 AND workspace_id=$2 AND kind=$3 RETURNING id',params);
          if(!updated.rowCount) throw new AppError('업체·프로젝트를 찾을 수 없습니다.',404);
        } else await client.query('INSERT INTO entities(id,workspace_id,kind,name,company_id,memo) VALUES($1,$2,$3,$4,$5,$6)',params);
        await client.query('DELETE FROM entity_institutions WHERE entity_id=$1',[id]);
        for(const institutionId of new Set(data.institution_ids)) await client.query('INSERT INTO entity_institutions(entity_id,institution_id) VALUES($1,$2)',[id,institutionId]);
      });
      return Response.json({id});
    }
    if(input.action === 'schedule') {
      const data = z.object({institution_id:z.string(),scheduled_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),memo:z.string().max(1000)}).parse(input.data);
      const id = randomUUID();
      await transaction(async client => {
        const institution = await client.query('SELECT id FROM institutions WHERE id=$1 AND workspace_id=$2',[data.institution_id,WORKSPACE]);
        if(!institution.rowCount) throw new AppError('기관을 찾을 수 없습니다.',404);
        await client.query('INSERT INTO check_schedules(id,institution_id,scheduled_date,memo) VALUES($1,$2,$3,$4)',[id,data.institution_id,data.scheduled_date,data.memo]);
      });
      return Response.json({id});
    }
    if(input.action === 'deleteSchedule') {
      const {id} = z.object({id:z.string()}).parse(input.data);
      await transaction(client => client.query('DELETE FROM check_schedules s USING institutions i WHERE s.id=$1 AND s.institution_id=i.id AND i.workspace_id=$2',[id,WORKSPACE]));
      return Response.json({ok:true});
    }
    throw new AppError('지원하지 않는 작업입니다.');
  } catch(error) { return errorResponse(error); }
}
