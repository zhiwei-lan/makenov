# 제휴마케팅 1차(프론트 + 관리자 제휴 탭, 가짜 데이터) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `vn.makenov.com/affiliate/` 마케터 화면 6페이지와 관리자 '제휴' 탭을 가짜 데이터(mock 어댑터)로 완성해 프리뷰에서 흐름·디자인을 확정한다. 백엔드(PHP)는 다음 계획.

**Architecture:** 정적 HTML 껍데기 + `affiliate/aff.js`(자체 헤더·푸터·헬퍼·`AffApi`). `AffApi`는 어댑터 하나(`aff-mock.js`, localStorage)로 시작하고 나중에 REST 어댑터로 갈아끼운다 — 페이지 코드는 안 바뀐다. 관리자도 같은 방식(`admin-aff.js`의 `AffAdmin` 어댑터). CSS는 본 사이트 `style.css` 재사용 + `affiliate.css`(카드 뱃지·대시보드 숫자·표만).

**Tech Stack:** 정적 HTML/JS(ES2020, 빌드 없음), style.css, 기존 admin 콘솔(admin.js 전역 함수 방식), build-sites.js

## Global Constraints

- 베트남어 단일. 관리자는 한국어. 카피는 담백하게(수수께끼·대구법 금지, 제목은 라벨)
- 용어 고정: 유통사=`nhà phân phối`, 마케터=`cộng tác viên`(CTV), 리드=`khách hàng tiềm năng`, 적립금=`hoa hồng`
- 본 사이트 app.js·store-supabase.js·supabase-js 를 affiliate 페이지에서 **로드하지 않는다** (완전 분리, 세션쿠키 공유 금지). 헤더·푸터는 aff.js 가 그린다. 같은 CSS 클래스(`mk-header`·`mk-footer`·`wrap`·`btn`·`p-card`·`tabs`·`f-row`·`list-item`·`empty`)만 쓴다
- 자산 캐시버스터: 새 파일은 `?v=20260909c`. JS/CSS 수정 시 `node bump-asset-version.js <이름> <버전>`
- `affiliate/` 는 vn 사이트에만 복사. robots 에 `/affiliate/my.html` Disallow
- 데이터 모양은 설계서 4절 API 응답과 같게 — mock 이 곧 API 계약이다
- 커밋은 태스크마다. 푸시는 사용자 지시 후

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `public/affiliate/aff-mock.js` | 가짜 백엔드. 캠페인 3개(실제 제품 p0/p9/p11)·마케터 세션·리드·출금을 localStorage `aff_mock` 에 저장. `window.AffApi` 구현 |
| `public/affiliate/aff.js` | 공통: `esc`·`vnd()`·`toast`·`affHeader()`·`affFooter()`·`affGuard()`(로그인 필요 페이지)·`affLink(code,pid)`·`copyText()` . 페이지마다 `pageInit()` 을 부른다 |
| `public/affiliate/affiliate.css` | 캠페인 카드 단가 뱃지, 대시보드 숫자 카드, 표, 소재 그리드, 링크복사 박스 |
| `public/affiliate/index.html` | 홈 |
| `public/affiliate/campaigns.html` | 캠페인 목록 |
| `public/affiliate/campaign.html` | 캠페인 상세 (`?id=`) |
| `public/affiliate/join.html` · `login.html` | 가입 · 로그인 |
| `public/affiliate/my.html` | 마이페이지 4탭 |
| `public/assets/js/admin-aff.js` | 관리자 '제휴' 탭 렌더 + `AffAdmin` mock 어댑터 |
| `public/admin/index.html` | `<section id="tab-aff">` + 스크립트 태그 |
| `public/assets/js/admin.js` | TABS/NAV 에 `aff` 등록, renderAll 에 `renderAff()` |
| `build-sites.js` | affiliate 복사 규칙 + robots |

## 데이터 계약 (mock = 미래 API 응답)

```js
// campaign
{ product_id:'p9', name:'Kem dưỡng chân cao cấp 3WB Gounbal', brand:'WELLBEING HEALTH FARM', cat:'beauty',
  img:'https://makenov.com/storage/v1/object/public/product-images/2026/mszejcol5ldjob.png',
  cpa_vnd:150000, cap:100, approved:12, pending:3, remaining:88,
  headline:'Kem dưỡng gót chân bán chạy tại Hàn Quốc', materials:['https://…jpg', …],
  copy_text:'Kem dưỡng chân 3WB Gounbal — làm mềm da chai sần…', rules:'Không quảng cáo sai sự thật…',
  featured:true, active:true }
// me
{ id:'m1', code:'AB12CD', email:'a@b.vn', name:'Nguyễn Văn A', phone:'09…', zalo:'09…',
  bank_name:'Vietcombank', bank_account:'0123…', bank_holder:'NGUYEN VAN A', created_at:'2026-09-01' }
// summary
{ clicks30:143, leads:{pending:3,approved:12,rejected:2}, approved_vnd:1800000, withdrawn_vnd:500000,
  balance_vnd:1300000, min_withdraw:500000 }
// lead
{ id:'l1', product_id:'p9', product_name:'…', status:'approved', amount_vnd:150000,
  created_at:'2026-09-03 10:20', decided_at:'2026-09-04 09:00', reject_reason:null }
// withdrawal
{ id:'w1', amount_vnd:500000, status:'paid', created_at:'2026-09-05', paid_at:'2026-09-06' }
// rankings
{ marketers:[{rank:1, name:'Ng***', vnd:4200000}, …10], campaigns:[{rank:1, product_id:'p9', name:'…', leads:31}, …],
  approval:[{rank:1, product_id:'p0', name:'…', rate:0.92}, …] }
```

`AffApi` 시그니처 (모두 Promise):
`campaigns({featured,cat,sort})` · `campaign(pid)` · `rankings()` · `signup({email,password,name,phone,zalo})` · `login(email,password)` · `logout()` · `session()`(동기, me 또는 null) · `me()` · `updateMe(patch)` · `changePassword(old,new)` · `summary()` · `leads({status})` · `clicks(days)` · `withdrawals()` · `requestWithdrawal(amount)`
실패는 `throw new Error(베트남어 메시지)`.

---

### Task 1: 공통 층 (aff-mock.js · aff.js · affiliate.css)

**Files:**
- Create: `public/affiliate/aff-mock.js`, `public/affiliate/aff.js`, `public/affiliate/affiliate.css`
- Test: 브라우저 콘솔 (프리뷰 :5716)

**Interfaces:**
- Produces: `window.AffApi`(위 계약), `esc(s)`, `vnd(n)`→`"150.000 ₫"`, `toast(msg)`, `affHeader(active)`, `affFooter()`, `affGuard()`→me 또는 login.html 로 이동, `affLink(code,pid)`→`https://vn.makenov.com/products/${pid}.html?ref=${code}`, `copyText(s)`, `affBoot(pageInit)`(DOMContentLoaded 에 헤더·푸터 그리고 pageInit 호출)

- [ ] **Step 1: aff-mock.js** — 시드: 캠페인 3개(p0 소화덮개 200,000₫·cap 50 / p9 발크림 150,000₫·cap 100 / p11 스킨부스터 250,000₫·cap null), 마케터 `demo@makenov.com` / `demo1234` 코드 `DEMO01`, 리드 17건(승인12·대기3·반려2), 출금 1건(paid 500,000). localStorage 없으면 시드 저장. `signup` 은 이메일 중복 검사, 코드 6자 랜덤. `requestWithdrawal` 은 `amount < min_withdraw` / `amount > balance` 면 throw. `clicks(days)` 는 날짜별 0~12 난수(시드 고정).
- [ ] **Step 2: aff.js** — 헤더 마크업은 본 사이트 `.mk-header .wrap .mk-head-top` 구조: 로고(`MAKE<b>NOV</b>` + `<span class="aff-tag">Affiliate</span>`), 우측: 비로그인 `Đăng nhập` 링크 + `btn btn-primary btn-sm` `Đăng ký`; 로그인 `이름 · 잔액` (my.html 링크) + `Đăng xuất`. 메뉴행 `.mk-nav`: `Trang chủ`(index) · `Chiến dịch`(campaigns) · `Bảng xếp hạng`(index#rank) · `Hướng dẫn`(guide.html, 2차 — 지금은 index#how) · `Tài khoản`(my). 검색·언어·장바구니 없음. 푸터: 로고 + 한 줄 설명 + 링크(Trang chủ · Chiến dịch · Về MAKENOV → https://vn.makenov.com/ · Liên hệ Zalo) + `© MAKENOV`.
- [ ] **Step 3: affiliate.css** — `.aff-tag`(로고 옆 민트 라벨), `.aff-cpa`(카드 단가: 18px 민트 볼드 + `/lead` 12px), `.aff-left`(잔여 회색 12px), `.aff-hero`(민트 틴트 `#EEFBF7` 패널, h1 32px, p 16px, CTA 2개), `.aff-stats`(4열 숫자 카드: 라벨 13px 회색·값 26px 볼드), `.aff-table`(줄 구분 표, th 13px 회색), `.aff-rank`(3열 그리드, ol 순위 1~3 민트 볼드), `.aff-mats`(소재 3열 이미지 그리드 + 다운로드 버튼), `.aff-linkbox`(readonly input + 복사 버튼), `.aff-status`(뱃지: pending 회색·approved 민트·rejected 빨강·paid 민트·requested 회색), `.aff-form`(max-width 440 중앙 카드), 모바일 640 이하 1열.
- [ ] **Step 4: 확인** — `http://localhost:5716/affiliate/aff.js` 200, 콘솔에서 `await AffApi.campaigns()` 3건, `await AffApi.login('demo@makenov.com','demo1234')` me 반환, `AffApi.session().code==='DEMO01'`
- [ ] **Step 5: Commit** `git add public/affiliate && git commit -m "affiliate 공통 층: mock API·헤더/푸터·CSS"`

### Task 2: 홈 index.html

**Files:** Create `public/affiliate/index.html`
**Interfaces:** Consumes `affBoot`, `AffApi.campaigns({featured:1})`, `AffApi.rankings()`

- [ ] **Step 1: 껍데기** — `<html lang="vi">`, `<title>Cộng tác viên MAKENOV | Kiếm hoa hồng khi giới thiệu nhà phân phối</title>`, meta description, `style.css?v=20260909b` + `affiliate.css?v=20260909c`, `<header class="mk-header" id="mk-header">`, `<main class="wrap">`, `<footer class="mk-footer" id="mk-footer">`, 스크립트 `../assets/js/config.js` → `aff-mock.js` → `aff.js` → 인라인 `affBoot(pageInit)`
- [ ] **Step 2: 섹션** — ① `.aff-hero`: h1 `Giới thiệu sản phẩm Hàn Quốc, nhận hoa hồng theo từng khách hàng` · p `Chia sẻ link của bạn. Khi nhà phân phối gửi yêu cầu báo giá qua link đó, bạn nhận hoa hồng.` · CTA `Đăng ký cộng tác viên`(join) + `Xem chiến dịch`(campaigns). 로그인 상태면 CTA 를 `Tài khoản của tôi` 로. ② `.sec` `Chiến dịch nổi bật` + `Xem tất cả` → `.grid` 에 `p-card` 4~8개(썸네일·brand·h3·`.aff-cpa` `150.000 ₫ <small>/khách hàng</small>`·`.aff-left` `Còn 88`). ③ `id="how"` `Cách hoạt động` 3단계(`.aff-stats` 재사용: 1 Đăng ký & lấy link · 2 Chia sẻ cho nhà phân phối · 3 Nhận hoa hồng khi được duyệt). ④ `id="rank"` `.aff-rank` 3열: `Top cộng tác viên tháng này` / `Chiến dịch nhiều khách hàng` / `Tỷ lệ duyệt cao`. ⑤ `Thông báo` 목록 3줄(mock 고정 문구) — 2차에 게시판 연결.
- [ ] **Step 3: 확인** — 프리뷰 스크린샷 PC·모바일, 콘솔 에러 0
- [ ] **Step 4: Commit** `git commit -m "affiliate 홈"`

### Task 3: 캠페인 목록·상세

**Files:** Create `public/affiliate/campaigns.html`, `public/affiliate/campaign.html`
**Interfaces:** Consumes `AffApi.campaigns({cat,sort})`, `AffApi.campaign(pid)`, `AffApi.session()`, `affLink`, `copyText`

- [ ] **Step 1: campaigns.html** — `.page-head` h1 `Chiến dịch` p `Chọn sản phẩm, lấy link, chia sẻ.` · `.filterbar`: `.chip` 카테고리(Tất cả + MK_CATEGORIES 6개 베트남어 고정 배열 in aff.js `AFF_CATS`) + `.sortsel` (Hoa hồng cao → Mới nhất). `.grid` p-card (Task 2 와 같은 카드 함수 `campaignCard(c)` 를 aff.js 에 둔다). 0건이면 `.empty`.
- [ ] **Step 2: campaign.html** — `?id=` 없거나 못 찾으면 `.empty` + 목록 링크. 레이아웃 `.pd-row`: 왼쪽 `.pd-main` = 큰 이미지 + `.pd-sec` `Tài liệu quảng bá`(`.aff-mats` 이미지 + `Tải xuống` a[download]) + `.pd-sec` `Nội dung gợi ý`(copy_text + `Sao chép` 버튼) + `.pd-sec` `Quy định`(rules, 줄바꿈 유지). 오른쪽 `.pd-side .box`: brand · h1 · `.aff-cpa` 큰 단가 · `Còn N / cap` · 로그인 시 `.aff-linkbox`(affLink(me.code,pid) + `Sao chép link`) + `Mở trang sản phẩm` 링크(target _blank) / 비로그인 시 `Đăng nhập để lấy link` 버튼(login.html?next=campaign.html?id=…).
- [ ] **Step 3: 확인** — 카테고리 칩·정렬 동작, 상세 링크 복사 시 toast `Đã sao chép`, 비로그인 → 로그인 유도
- [ ] **Step 4: Commit** `git commit -m "affiliate 캠페인 목록·상세"`

### Task 4: 가입·로그인

**Files:** Create `public/affiliate/join.html`, `public/affiliate/login.html`
**Interfaces:** Consumes `AffApi.signup`, `AffApi.login`; `?next=` 처리

- [ ] **Step 1: join.html** — `.aff-form` 카드: h1 `Đăng ký cộng tác viên` · `.f-row` Email · Mật khẩu(≥8) · Nhập lại mật khẩu · Họ tên · Số điện thoại · Zalo(선택) · 체크 `Tôi đồng ý với quy định cộng tác viên`(링크 #, 2차) · `btn btn-primary btn-block` `Đăng ký`. 성공 → my.html. 하단 `Đã có tài khoản? Đăng nhập`.
- [ ] **Step 2: login.html** — Email · Mật khẩu · `Đăng nhập` · `Quên mật khẩu?`(2차, 지금은 toast `Liên hệ Zalo hỗ trợ`) · `Chưa có tài khoản? Đăng ký`. 성공 → `next` 또는 my.html.
- [ ] **Step 3: 확인** — 중복 이메일 에러 문구, 비번 불일치 문구, 데모 계정 로그인 후 헤더에 이름·잔액
- [ ] **Step 4: Commit** `git commit -m "affiliate 가입·로그인"`

### Task 5: 마이페이지 my.html

**Files:** Create `public/affiliate/my.html`
**Interfaces:** Consumes `affGuard`, `AffApi.summary/leads/clicks/withdrawals/requestWithdrawal/me/updateMe/changePassword`

- [ ] **Step 1: 상단** — `.my-top`: `.my-id` h1 이름 · `.my-meta` `Mã CTV: DEMO01 · Tham gia 2026-09-01` / 우측 `.aff-linkbox` 기본 링크(`https://vn.makenov.com/?ref=CODE`).
- [ ] **Step 2: 탭** (`.tabs`, mypage.html 의 showTab 패턴): `Tổng quan` · `Khách hàng` · `Hoa hồng & rút tiền` · `Tài khoản`
  - Tổng quan: `.aff-stats` 4칸(Lượt click 30 ngày · Khách hàng chờ duyệt · Đã duyệt · Số dư) + 30일 클릭 막대(순수 div 막대, 라이브러리 없음) + 최근 리드 5건 표
  - Khách hàng: 상태 칩(Tất cả/Chờ duyệt/Đã duyệt/Từ chối) + `.aff-table`(Ngày · Sản phẩm · Trạng thái 뱃지 · Hoa hồng · 반려사유)
  - Hoa hồng & rút tiền: 잔액 크게 + `Rút tiền` 폼(금액 input, 최소액 안내 `Tối thiểu 500.000 ₫`, 계좌 미등록이면 버튼 비활성 + `Tài khoản` 탭 안내) + 출금 이력 표
  - Tài khoản: 정보 폼(이름·전화·Zalo) `Lưu` / 은행(ngân hàng·số tài khoản·chủ tài khoản) `Lưu` / 비밀번호 변경
- [ ] **Step 3: 확인** — 비로그인 진입 → login.html?next=my.html, 출금 400 케이스 2종 문구, 저장 후 toast
- [ ] **Step 4: Commit** `git commit -m "affiliate 마이페이지"`

### Task 6: build-sites 규칙 + 프리뷰 경로

**Files:** Modify `build-sites.js` (ROOT_SKIP 근처, robots 생성부)

- [ ] **Step 1** — kr/en 사이트 생성 시 `affiliate` 폴더 제외(vn 만 복사). robots 문자열에 `Disallow: /affiliate/my.html` 추가(vn 만).
- [ ] **Step 2** — `node build-sites.js` 후 `ls sites/vn.makenov.com/affiliate` 6 html, `ls sites/kr.makenov.com/affiliate` 없음, `grep affiliate sites/vn.makenov.com/robots.txt`
- [ ] **Step 3: Commit** `git commit -m "build-sites: affiliate 는 vn 전용"`

### Task 7: 관리자 '제휴' 탭

**Files:** Create `public/assets/js/admin-aff.js`; Modify `public/admin/index.html`(section·script), `public/assets/js/admin.js:442-456`(TABS·NAV), `:497-499`(renderAll)
**Interfaces:** Produces `renderAff()`, `AffAdmin` mock: `campaigns()`·`saveCampaign(pid,patch)`·`leads({status})`·`decideLead(id,'approved'|'rejected',reason)`·`withdrawals()`·`payWithdrawal(id)`·`rejectWithdrawal(id,memo)`·`marketers()`·`setMarketer(id,{status,memo})`·`settings()`·`saveSettings(patch)` — 저장은 localStorage `aff_admin_mock`, 시드는 aff-mock 과 같은 숫자

- [ ] **Step 1: 등록** — TABS 에 `'aff'`(`'buyers'` 뒤), NAV 운영 그룹에 `{ id:'aff', label:'제휴', title:'제휴 마케팅', desc:'베트남 마케터(CTV) 캠페인·리드 승인·출금 처리' }` — `NAV.slice(0,4)`→`slice(0,5)`, `slice(4,9)`→`slice(5,10)`, `slice(9)`→`slice(10)`. index.html 에 `<section id="tab-aff" class="hidden">` 와 `<script src="../assets/js/admin-aff.js?v=20260909c">`(admin.js 뒤). renderAll 에 `renderAff()`. 카운트: 대기 리드 수.
- [ ] **Step 2: renderAff** — 상단 서브탭(`.bchips`): 캠페인 · 리드(대기 N) · 출금(신청 N) · 마케터 · 설정
  - 캠페인: 표(제품 썸네일·이름·브랜드 / on-off 체크 / 단가 input / 상한 input / 추천 체크 / 승인·대기 수) + 행 `수정` → 폼(헤드라인·소재 이미지 uploader 다중·문구 textarea·규정 textarea) 저장
  - 리드: 필터 칩 + 표(일시·마케터 코드·이름·제품·문의 원문 첫 80자·금액) + `승인` `반려`(prompt 로 사유)
  - 출금: 표(신청일·마케터·금액·은행/계좌/예금주·상태) + `지급완료` `반려`
  - 마케터: 표(코드·이름·이메일·전화·Zalo·잔액·리드 수·상태) + `정지/해제` + 메모
  - 설정: 최소 출금액 · 링크 유효일 · Zalo · 이메일 → 저장
- [ ] **Step 3: 확인** — 관리자 페이지에서 로그인 없이 `renderAff()` 호출해 DOM 렌더 + 승인 클릭 시 대기 수 감소(mock)
- [ ] **Step 4: Commit** `git commit -m "관리자 제휴 탭(mock)"`

### Task 8: 마무리 검증

- [ ] 6페이지 PC 1200·모바일 375 스크린샷, 콘솔 에러 0, 링크 전부 살아있음(`grep -o 'href="[^"]*"' public/affiliate/*.html | sort -u` 로 대조)
- [ ] `node bump-asset-version.js admin 20260909c`(admin.js 수정분) · `node build-sites.js`
- [ ] 커밋 후 사용자에게 프리뷰 보여주고 푸시 여부 확인

## 다음 계획(별도 문서)
백엔드: 마이그레이션 7건 + 자동 가드, `Api\Aff` 컨트롤러, Rest 정책, app.js ref/click/aff_ref, mock 어댑터 → REST 어댑터 교체, 관리자 `AffAdmin` → REST.
