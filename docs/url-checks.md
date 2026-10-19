# 기관별 URL 접속·수집 검증표

- 확인일: 2026-10-19 (한국 시간)
- 원본: data/기관_사이트_및_공지사항_URL.md
- 홈페이지 24개 및 공지 URL 24개에 GET 요청. 최대 4회 리다이렉트, 연결 6초·전체 15초 제한.
- HTTP 200은 접속 응답 확인 결과이며 수집 성공과 구분한다.

| 기관 | 홈페이지 | 공지사항 | 로컬 목록·본문 수집 | Vercel 서버 수집 |
| --- | --- | --- | --- | --- |
| 4대보험 | [HTTP 200](https://www.4insure.or.kr/pbiz/main/main.do) | [HTTP 200](https://www.4insure.or.kr/pbiz/ntcn/selectInstNtcMttrList.do) | 미검증 · 연동 준비 | 미검증 |
| 경찰청 | [HTTP 307 · 리다이렉트 반복](https://www.police.go.kr/index.do) | [HTTP 307 · 리다이렉트 반복](https://www.police.go.kr/user/bbs/BD_selectBbsList.do?q_bbsCode=1001) | 미검증 · 연동 준비 | 미검증 |
| 국민연금 | [HTTP 200](https://nps.or.kr/main.do) | [HTTP 200](https://www.nps.or.kr/pnsgdnc/newgdnc/getOHAE0001M0List.do?menuId=MN24000897) | 미검증 · 연동 준비 | 미검증 |
| 공무원연금 | [HTTP 200](https://www.geps.or.kr/index) | [HTTP 200](https://www.geps.or.kr/notiCommunication_notice_center) | 성공 · 기준 10건 | 재점검 성공 · 변경 없음 |
| 군인연금 | [HTTP 200](https://mpis.mil.kr/main/main.do) | [HTTP 200](https://mpis.mil.kr/board/ntc/ntcList.do) | 미검증 · 연동 준비 | 미검증 |
| 전자가족관계등록시스템 | [HTTP 200](https://efamily.scourt.go.kr/index.jsp) | [HTTP 200](https://efamily.scourt.go.kr/cs/CsBltnWrtList.do?bltnbordId=0000001) | 미검증 · 연동 준비 | 미검증 |
| 대한민국 법원 | [HTTP 200](https://www.scourt.go.kr/scourt/index.html) | [HTTP 200](https://www.scourt.go.kr/portal/news/NewsListAction.work?gubun=3) | 미검증 · 연동 준비 | 미검증 |
| 인터넷등기소 | [HTTP 200](https://www.iros.go.kr/) | [HTTP 200](https://www.iros.go.kr/) | 미검증 · 연동 준비 | 미검증 |
| 안전운전 통합민원 | [HTTP 200](https://www.safedriving.or.kr/) | [HTTP 200](https://www.safedriving.or.kr/boardManage/selectNoticeBoardList.do) | 미검증 · 연동 준비 | 미검증 |
| 한국도로교통공단 | [HTTP 200](https://www.koroad.or.kr/) | [HTTP 200](https://www.koroad.or.kr/main/board/1/board_list.do) | 성공 · 기준 12건 | 실패 · 15초 응답 시간 초과 |
| 사학연금 | [HTTP 200](https://www.tp.or.kr/tp-kr/index.do) | [HTTP 200](https://www.tp.or.kr/tp-kr/bbs/i-151/list.do) | 미검증 · 연동 준비 | 미검증 |
| 여신금융협회 카드매출조회 | [HTTP 200](https://www.cardsales.or.kr/) | [HTTP 200](https://www.cardsales.or.kr/page/mypage/notice) | 미검증 · 연동 준비 | 미검증 |
| 위택스 | [HTTP 200](https://www.wetax.go.kr/main.do) | [HTTP 200](https://www.wetax.go.kr/tcp/wtg/J040401M01.do) | 미검증 · 연동 준비 | 미검증 |
| 정부24 | [HTTP 200](https://plus.gov.kr/) | [HTTP 200](https://plus.gov.kr/portal/ntcmttr/) | 미검증 · 연동 준비 | 미검증 |
| 홈택스 | [HTTP 200](https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml) | [HTTP 200](https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=16&tm2lIdx=1601000000) | 미검증 · 연동 준비 | 미검증 |
| 국민건강보험 | [HTTP 200](https://www.nhis.or.kr/nhis/index.do) | [HTTP 200](https://www.nhis.or.kr/nhis/together/wbhaea01000m01.do) | 성공 · 기준 12건 | 재점검 성공 · 변경 없음 |
| 자동차리콜센터 | [HTTP 200](https://www.car.go.kr/home/main.do) | [HTTP 200](https://www.car.go.kr/rs/nct/list.do) | 미검증 · 연동 준비 | 미검증 |
| 내보험다보여 | [HTTP 200](https://www.credit4u.or.kr:2443/) | [HTTP 200](https://www.credit4u.or.kr:2443/cnsl/noticeList.do?menuNo=360&link=cnsl%2FnoticeList.do) | 미검증 · 연동 준비 | 미검증 |
| 한국도로공사 | [HTTP 200](https://www.ex.co.kr/) | [HTTP 200](https://www.ex.co.kr/portal/biz/bbs/layout1/selectBoardList.do?TyCode=BBST01&authFlag=Y&bbsAttrbCode=BBSA01&bbsId=BBSMSTR_000000000182&searchCnd=0) | 미검증 · 연동 준비 | 미검증 |
| 자동차365 | [HTTP 200](https://www.car365.go.kr/) | [HTTP 200](https://www.car365.go.kr/ccpt/comm/ntcn/ntcView.do?_menuId=M640101000&moblYn=Y&bbsId=123) | 미검증 · 연동 준비 | 미검증 |
| AIPIS | [HTTP 200](https://aipis.kidi.or.kr:1443/aipis_web/index.do) | [HTTP 200](https://aipis.kidi.or.kr:1443/aipis_web/IAU031.do) | 미검증 · 연동 준비 | 미검증 |
| eFine | [HTTP 307 · 리다이렉트 반복](https://www.efine.go.kr/main/main.do) | [HTTP 307 · 리다이렉트 반복](https://www.efine.go.kr/notification/notice/notificationNoticeList.do) | 미검증 · 연동 준비 | 미검증 |
| 보건복지부 면허민원 | [HTTP 200](https://lic.mohw.go.kr/) | [HTTP 200](https://www.mohw.go.kr/board.es?mid=a10501010100&bid=0003) | 미검증 · 연동 준비 | 미검증 |
| 내 차보험 찾기(마이카) | [HTTP 200](https://mycar.kidi.or.kr/) | [HTTP 200](https://mycar.kidi.or.kr/) | 미검증 · 연동 준비 | 미검증 |
