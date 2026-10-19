# 기관 사이트 및 공지사항 URL

- 확인일: 2026-10-16
- 정리 기준: 현재 접속 가능한 주소, 세션과 CSRF 값이 제거된 주소
- 여러 사이트가 하나의 항목에 포함된 경우 서비스별로 분리했다.

| 기관/서비스 | 사이트 URL | 공지사항 URL | 비고 |
|---|---|---|---|
| 4대보험 | <https://www.4insure.or.kr/pbiz/main/main.do> | <https://www.4insure.or.kr/pbiz/ntcn/selectInstNtcMttrList.do> | 정상 |
| 경찰청 | <https://www.police.go.kr/index.do> | <https://www.police.go.kr/user/bbs/BD_selectBbsList.do?q_bbsCode=1001> | 자동 요청 제한 가능 |
| 국민연금 | <https://nps.or.kr/main.do> | <https://www.nps.or.kr/pnsgdnc/newgdnc/getOHAE0001M0List.do?menuId=MN24000897> | 메인 URL 수정 |
| 공무원연금 | <https://www.geps.or.kr/index> | <https://www.geps.or.kr/notiCommunication_notice_center> | 정상 |
| 군인연금 | <https://mpis.mil.kr/main/main.do> | <https://mpis.mil.kr/board/ntc/ntcList.do> | 도메인·경로 수정 |
| 전자가족관계등록시스템 | <https://efamily.scourt.go.kr/index.jsp> | <https://efamily.scourt.go.kr/cs/CsBltnWrtList.do?bltnbordId=0000001> | 대법원 항목에서 분리 |
| 대한민국 법원 | <https://www.scourt.go.kr/scourt/index.html> | <https://www.scourt.go.kr/portal/news/NewsListAction.work?gubun=3> | 대법원 항목에서 분리 |
| 인터넷등기소 | <https://www.iros.go.kr/> | <https://www.iros.go.kr/> | 메인 화면에 공지 표시 |
| 안전운전 통합민원 | <https://www.safedriving.or.kr/> | <https://www.safedriving.or.kr/boardManage/selectNoticeBoardList.do> | 도로교통공단 항목에서 분리 |
| 한국도로교통공단 | <https://www.koroad.or.kr/> | <https://www.koroad.or.kr/main/board/1/board_list.do> | 도로교통공단 항목에서 분리 |
| 사학연금 | <https://www.tp.or.kr/tp-kr/index.do> | <https://www.tp.or.kr/tp-kr/bbs/i-151/list.do> | 정상 |
| 여신금융협회 카드매출조회 | <https://www.cardsales.or.kr/> | <https://www.cardsales.or.kr/page/mypage/notice> | 정상 |
| 위택스 | <https://www.wetax.go.kr/main.do> | <https://www.wetax.go.kr/tcp/wtg/J040401M01.do> | 정상 |
| 정부24 | <https://plus.gov.kr/> | <https://plus.gov.kr/portal/ntcmttr/> | 현재 도메인으로 통일 |
| 홈택스 | <https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml> | <https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=16&tm2lIdx=1601000000> | 빈 `tm3lIdx` 제거 |
| 국민건강보험 | <https://www.nhis.or.kr/nhis/index.do> | <https://www.nhis.or.kr/nhis/together/wbhaea01000m01.do> | 정상 |
| 자동차리콜센터 | <https://www.car.go.kr/home/main.do> | <https://www.car.go.kr/rs/nct/list.do> | 정상 |
| 내보험다보여 | <https://www.credit4u.or.kr:2443/> | <https://www.credit4u.or.kr:2443/cnsl/noticeList.do?menuNo=360&link=cnsl%2FnoticeList.do> | 세션성 `_csrf` 제거 |
| 한국도로공사 | <https://www.ex.co.kr/> | <https://www.ex.co.kr/portal/biz/bbs/layout1/selectBoardList.do?TyCode=BBST01&authFlag=Y&bbsAttrbCode=BBSA01&bbsId=BBSMSTR_000000000182&searchCnd=0> | `jsessionid` 포함 구주소 교체 |
| 자동차365 | <https://www.car365.go.kr/> | <https://www.car365.go.kr/ccpt/comm/ntcn/ntcView.do?_menuId=M640101000&moblYn=Y&bbsId=123> | 공지 목록 확인 |
| AIPIS | <https://aipis.kidi.or.kr:1443/aipis_web/index.do> | <https://aipis.kidi.or.kr:1443/aipis_web/IAU031.do> | 정상 |
| eFine | <https://www.efine.go.kr/main/main.do> | <https://www.efine.go.kr/notification/notice/notificationNoticeList.do> | 자동 요청 제한 가능 |
| 보건복지부 면허민원 | <https://lic.mohw.go.kr/> | <https://www.mohw.go.kr/board.es?mid=a10501010100&bid=0003> | 공지는 보건복지부 대표 사이트 |
| 내 차보험 찾기(마이카) | <https://mycar.kidi.or.kr/> | <https://mycar.kidi.or.kr/> | 공지사항 URL은 기관 URL과 동일 |

## 참고

- 경찰청과 eFine은 자동 요청에서 307 재전송이 반복될 수 있다. 브라우저 접속 시 쿠키나 보안 처리가 필요한 사이트다.
- 인터넷등기소는 별도의 고정된 공지 목록 URL 대신 메인 화면에서 공지사항을 제공한다.
