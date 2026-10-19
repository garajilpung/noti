import { z } from 'zod';
import { runCheck } from '@/lib/service';
import { requireAccess } from '@/lib/access';
import { errorResponse, readJson } from '@/lib/http';
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    requireAccess(request,true);
    const {id} = z.object({id:z.string().min(1)}).parse(await readJson(request));
    return Response.json(await runCheck(id));
  } catch(error) { return errorResponse(error); }
}
