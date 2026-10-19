// Personal local access / Vercel Authentication protected preview.
// An unprotected production deployment must not expose workspace data.
export function requireAccess(request: Request, mutation = false) {
  if (process.env.VERCEL_ENV === 'production') throw Object.assign(new Error('운영 배포의 접근 보호를 먼저 설정해 주세요.'), { status:503 });
  if (mutation) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host') || new URL(request.url).host;
    if (origin && new URL(origin).host !== host ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
      throw Object.assign(new Error('다른 사이트에서의 변경 요청은 허용되지 않습니다.'), { status:403 });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      throw Object.assign(new Error('JSON 형식의 요청만 허용됩니다.'), { status:415 });
    }
  }
}
