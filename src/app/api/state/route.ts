import { getBootstrap } from '@/lib/service';
import { requireAccess } from '@/lib/access';
import { errorResponse } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { requireAccess(request); return Response.json(await getBootstrap(), {headers:{'Cache-Control':'no-store'}}); }
  catch (error) { return errorResponse(error); }
}
