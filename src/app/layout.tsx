import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'noti. | 기관 모니터링 업무공간',description:'기관 공지와 웹페이지 변경을 확인하고 대응 상태를 관리하는 개인 업무공간',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><body>{children}</body></html>;
}
