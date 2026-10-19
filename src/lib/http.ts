import { ZodError } from 'zod';
import { AppError } from './service';
export function errorResponse(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error:'입력값을 확인해 주세요.', details:error.issues.map(i => i.path.join('.') + ': ' + i.message) },{status:400});
  if (error instanceof AppError) return Response.json({ error:error.message },{status:error.status});
  if (error instanceof Error && 'status' in error && typeof error.status === 'number') return Response.json({error:error.message},{status:error.status});
  console.error('요청 처리 실패', error instanceof Error ? error.name : 'UnknownError');
  return Response.json({error:'저장소 또는 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'},{status:500});
}
export async function readJson(request: Request) {
  const text = await request.text();
  if (text.length > 100000) throw new AppError('입력 내용이 너무 큽니다.',413);
  try { return JSON.parse(text); } catch { throw new AppError('요청 JSON이 올바르지 않습니다.'); }
}
