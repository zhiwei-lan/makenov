# MAKENOV 제휴마케팅(Affiliate) 설계

작성일: 2026-09-09
주소: https://vn.makenov.com/affiliate/
레퍼런스: dbdbdeep.com (CPA 제휴 플랫폼) — 기능 구조만 참고, 디자인은 MAKENOV 체계 재사용

## 1. 확정 사항

| 항목 | 결정 |
| --- | --- |
| 수익 모델 | CPA(리드). 마케터 링크로 들어온 유통사가 제품에 **문의**를 남기면 1건 |
| 캠페인 단위 | 제품. 관리자가 제품마다 캠페인 켜기 + 리드 단가(VND) + 리드 상한 |
| 마케터 계정 | MAKENOV 바이어 계정과 **완전 분리** (전용 테이블·토큰) |
| 언어 | 베트남어 단일. 관리자는 한국어 |
| 승인·정산 | 관리자 수동. 리드 승인/반려 → 적립. 마케터가 출금 신청 → 관리자 계좌이체 후 지급완료 처리 |
| 디자인 | MAKENOV 본 사이트 CSS(style.css)·헤더/푸터 문법·민트 그대로 재사용 |
| 구현 방식 | 정적 프론트(`public/affiliate/`) + CI4 API 확장(`Api\Aff`). 기존 배포·굽기 파이프라인 그대로 |

## 2. 데이터

MySQL 5.6, 논리 외래키만(회사 표준). jsonb 는 TEXT+JSON 문자열.

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `aff_marketers` | id(CHAR36) · code(VARCHAR8, UNIQUE) · email(UNIQUE) · password_hash · name · phone · zalo · bank_name · bank_account · bank_holder · status(active/blocked) · memo · created_at · updated_at | code = 대문자+숫자 6자, 링크에 씀 |
| `aff_tokens` | id · marketer_id · access_token · refresh_token · expires_at · created_at | auth_tokens 와 같은 회전 방식, 테이블만 분리 |
| `aff_campaigns` | product_id(PK) · cpa_vnd(INT) · cap(INT, NULL=무제한) · headline · materials(JSON: 이미지 URL 배열) · copy_text · rules · featured(BOOL) · sort · active(BOOL) · created_at · updated_at | 제품 1개 = 캠페인 1개 |
| `aff_clicks` | id · code · product_id · day(DATE) · ua_hash(CHAR32) · created_at | UNIQUE(code, product_id, day, ua_hash) — 같은 기기 하루 1건 |
| `aff_leads` | id · inquiry_id · marketer_id · product_id · status(pending/approved/rejected) · amount_vnd · reject_reason · decided_at · created_at | amount 는 접수 시점의 단가를 스냅샷 |
| `aff_withdrawals` | id · marketer_id · amount_vnd · bank_snapshot(JSON) · status(requested/paid/rejected) · memo · paid_at · created_at | |
| `inquiries` | **+ aff_ref VARCHAR8 NULL** | 기존 테이블의 유일한 변경 |
| `settings` | key=`aff` 한 줄: `{ minWithdraw:500000, cookieDays:30, contact:{zalo,email}, notice:{…} }` | 관리자 제휴탭 설정 |

잔액 = 승인 리드 합 − (요청중+지급완료 출금 합). 반려된 출금은 잔액에 돌아온다.

### 마이그레이션 실행 문제
deploy.yml 은 `git pull + composer install` 만 하고 `php spark migrate` 를 돌리지 않는다. 8/19 의 `negotiable` 마이그레이션도 아직 서버 DB 에 없다(2026-09-09 REST 응답에 컬럼 없음 확인).
→ `Api\Aff` 첫 요청에서 `aff_marketers` 테이블이 없으면 `service('migrations')->latest()` 를 한 번 실행하는 **자동 마이그레이션 가드**를 둔다(결과는 `writable/aff_schema_ok` 파일로 기억). DB 계정에 DDL 권한이 없어 실패하면 500 대신 `{"error":"schema_missing"}` 을 돌려주고, 그때는 개발자에게 SQL 파일(`database/aff.sql`)을 전달한다.

## 3. 추적 흐름

1. 마케터 링크: `https://vn.makenov.com/products/p9.html?ref=AB12CD` (캠페인 상세의 "링크 복사" 버튼이 만들어 줌. 홈·목록 링크도 `?ref=` 유지)
2. `app.js` 부팅: URL 에 `ref` 가 있으면 `localStorage.mk_aff = {code, ts}` 저장(기존 값 덮어씀, cookieDays 뒤 만료) + `POST /aff/v1/click {code, product_id}` (제품 페이지일 때만, 서버가 하루 1건으로 중복 제거)
3. 문의 전송(`addInquiry`): `mk_aff` 가 유효하면 `aff_ref` 를 함께 insert
4. 서버(`Rest` inquiries special-write): `aff_ref` 가 있고 코드가 active 마케터이며 그 제품 캠페인이 active 이고 cap 미달이면 `aff_leads(pending, amount=cpa_vnd)` 생성. 조건 미달이면 문의만 저장하고 리드는 안 만든다
5. 관리자 문의함에 마케터 코드·이름 표시 + 승인/반려 버튼. 승인 → `approved`, 반려 → `rejected`+사유
6. 마케터 마이페이지에 리드 상태·금액 반영. 잔액 ≥ minWithdraw 면 출금 신청 가능

부정 방지: 자기 문의(마케터가 바이어 계정으로 문의)는 관리자 승인 단계에서 거른다. 클릭은 수익과 무관(통계용)이라 별도 방어 없음.

## 4. API (`/aff/v1/…`, 컨트롤러 `App\Controllers\Api\Aff`)

CORS OPTIONS 프리플라이트 목록에 `aff/v1` 추가. 응답은 기존 REST 와 같은 JSON 규약.

공개(토큰 없음)
- `GET campaigns` — active 캠페인 + 제품(name.vi·img·brand·cat) 조인, 승인 리드 수·잔여 cap 포함. `?featured=1`, `?cat=`
- `GET campaigns/{pid}` — 상세(소재·규정 포함)
- `GET rankings` — 이번 달 승인 금액 TOP10 마케터(이름 앞 2자+***), 리드 많은 캠페인 TOP10, 승인율 TOP10
- `POST click`
- `POST signup` `{email,password,name,phone,zalo}` → 가입 즉시 로그인 세션
- `POST login` `{email,password}` / `POST token` (refresh) / `POST logout`

마케터(`Authorization: Bearer <aff access_token>`)
- `GET me` / `PATCH me` (이름·전화·Zalo·계좌·비밀번호 변경)
- `GET me/summary` — 클릭·리드(대기/승인/반려)·승인 금액·잔액·출금 합
- `GET me/leads?status=&page=` — 제품명·상태·금액·일시 (문의 내용은 안 보여줌)
- `GET me/clicks?days=30` — 일자별 클릭
- `POST me/withdrawals {amount}` / `GET me/withdrawals`

관리자(기존 admin 토큰 — `Rest.php` 정책 맵에 테이블 추가)
- `aff_campaigns` read public / write admin
- `aff_marketers`·`aff_leads`·`aff_withdrawals`·`aff_clicks` read admin / write admin
- 승인·반려·지급완료는 PATCH 로 status 변경(Rest special 에서 decided_at·paid_at 자동)

비밀번호는 `password_hash()`. 토큰은 기존 `Auth.php` 와 같은 랜덤 64자·TTL·회전.

## 5. 마케터 화면 (`public/affiliate/`, 베트남어)

공통: 자체 헤더(`aff.js` 가 그림) — 로고(MAKENOV **Affiliate**) · 메뉴 `Chiến dịch` `Bảng xếp hạng` `Hướng dẫn` `Thông báo` · 우측 `Đăng nhập / Đăng ký` 또는 `이름 · 잔액 · Tài khoản`. 푸터는 본 사이트 것 재사용. CSS 는 `style.css` + 작은 `affiliate.css`(카드 뱃지·대시보드 표만).

| 파일 | 내용 |
| --- | --- |
| `index.html` | 히어로(한 줄 설명 + 가입 CTA) · 추천 캠페인 카드 8개 · 마케터 랭킹 TOP10 · 공지 5개 |
| `campaigns.html` | 전체 캠페인 카드 그리드(카테고리 칩·정렬: 단가순/신규순). 카드 = 제품 사진·브랜드·제품명·**단가 N₫/리드**·잔여 N |
| `campaign.html?id=` | 제품 요약 · 단가·잔여 · 홍보 소재(이미지 다운로드, 문구 복사) · 규정 · **내 링크 복사**(로그인 시) / 로그인 유도 |
| `join.html` · `login.html` | 가입(이메일·비번·이름·전화·Zalo·약관 동의) · 로그인 · 비밀번호 재설정은 2차 |
| `my.html` | 탭 4개: 대시보드(요약 숫자·최근 30일 클릭 막대·최근 리드) / 리드 목록 / 출금(잔액·신청·이력) / 계정(정보·계좌·비번) |
| `guide.html` `notice.html` `faq.html` | 2차 |

렌더 방식은 본 사이트와 같다: HTML 껍데기 + `aff.js` 가 API 로 채움. 홈·목록은 크롤러용으로 2차에 사전렌더.
`build-sites.js`: `affiliate/` 는 vn 사이트에만 복사(kr/en 은 SKIP). robots 는 `/affiliate/my.html` Disallow.

## 6. 관리자 '제휴' 탭 (admin.js, 한국어)

- **캠페인**: 제품 목록에 캠페인 on/off · 단가 · 상한 · 추천 · 소재 업로드(기존 uploader) · 문구 · 규정. 승인/대기 리드 수 표시
- **리드**: 대기 리드 목록(마케터·제품·문의 원문·일시) → 승인/반려(사유). 필터 상태별
- **출금**: 신청 목록(마케터·금액·계좌 스냅샷) → 지급완료/반려. 지급 전 잔액 재검증
- **마케터**: 목록(코드·이름·연락처·잔액·리드 수) · 정지/해제 · 메모
- **설정**: 최소 출금액 · 링크 유효일 · 연락처(Zalo/이메일)
- 기존 **문의함**에 마케터 코드 배지 + 바로 승인/반려 버튼 (리드 탭과 같은 동작)

## 7. 오류 처리

- 코드 없음/정지 마케터/캠페인 off/cap 초과 → 문의는 정상 저장, 리드만 생성 안 함(유통사 경험엔 영향 없음)
- 출금 신청 금액 > 잔액, < 최소액 → 400 + 베트남어 메시지
- 토큰 만료 → 401 → `aff.js` 가 refresh 시도 후 실패 시 로그인 페이지로
- 스키마 미생성(`schema_missing`) → 마케터 화면에 "준비 중" 안내, 관리자 탭에 SQL 안내

## 8. 검증

- 로컬: `php spark serve` 없이도 프론트는 `:5716` 정적 서버 + 라이브 API 로 확인 가능하나, 새 API 는 서버 배포 후에야 붙는다. 배포 후 `curl https://makenov.com/aff/v1/campaigns` 로 스키마·응답 확인, 마케터 가입→링크→문의→관리자 승인→출금 신청까지 실제 클릭스루 1회
- deploy-check 마커 올려서 배포 확인(현재 98)

## 9. 순서

1. **1차 — 뼈대와 돈 흐름**: 마이그레이션 7건 + 자동 가드 · `Aff` 컨트롤러(공개·마케터 API) · Rest 정책 추가 · 추적(app.js ref/click/aff_ref) · 리드 자동 생성 · 관리자 제휴 탭(캠페인·리드·출금·마케터·설정) · 프론트(홈·목록·상세·가입·로그인·마이페이지)
2. **2차 — 살 붙이기**: 랭킹 정교화 · 공지/프로모션/FAQ(기존 notices/faqs 에 `page='affiliate'` 로 재사용) · 이용안내 · 비밀번호 재설정 · 홈/목록 사전렌더
3. **3차 — 부가**: 소셜 로그인(Google/Facebook/Zalo) · 출석 이벤트 · 신고센터 · 영상 강의

범위 밖: 자동 송금, 광고주(공급사) 셀프 로그인, CPS.
