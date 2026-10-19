import { NextResponse, type NextRequest } from 'next/server';
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV === 'production') return new NextResponse('운영 배포 접근 보호 설정이 필요합니다. 현재는 보호된 미리보기 주소를 이용해 주세요.', {status:503});
  const response = NextResponse.next();
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('X-Frame-Options','DENY');
  response.headers.set('Referrer-Policy','no-referrer');
  response.headers.set('X-Robots-Tag','noindex, nofollow');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'] };
