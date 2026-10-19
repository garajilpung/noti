import { z } from 'zod';
import { getDetail, updateChange } from '@/lib/service';
import { requireAccess } from '@/lib/access';
import { errorResponse, readJson } from '@/lib/http';
import { RESPONSE_STATUSES } from '@/lib/types';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{id:string}> };
export async function GET(request: Request, context: Context) {
  try { requireAccess(request); return Response.json(await getDetail((await context.params).id)); }
  catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    requireAccess(request,true);
    const data = z.object({ reviewed:z.boolean(), response_status:z.enum(RESPONSE_STATUSES), memo:z.string().max(10000),version:z.number().int().positive(),entity_ids:z.array(z.string()).max(100) }).parse(await readJson(request));
    const {id} = await context.params;
    await updateChange(id,data);
    return Response.json(await getDetail(id));
  } catch(error) { return errorResponse(error); }
}
