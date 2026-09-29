# 미팅 펀딩(방문 일정) 설계 — 2026-09-29

## 왜 바꾸나

"사업자 인증하면 가격·MOQ가 보인다"는 바이어에게 보상이 아니라 절차로 느껴졌다.
메이크노브의 핵심을 **한국 공급사와의 대면 미팅을 만들어 주는 플랫폼**으로 옮긴다.
크라우드펀딩(텀블벅) 방식: 목표 인원이 모이면 실행된다.

- 한국 공급사 담당자가 **정해진 날**(예: 12월 3일) 베트남에 온다.
- 공급사(제품)별로 **인증 바이어가 목표 인원(기본 5곳)** 만큼 마감일까지 신청하면 그 미팅은 **확정**.
- 사이트 곳곳에 진행률(3/5)과 마감 D-day를 보여 준다.
- 사업자 인증은 없애지 않고 **미팅 신청 자격**으로 바꾼다(공급사가 허수 바이어 때문에 헛걸음하지 않게).
- 목표 미달이면 화상 미팅으로 연결한다(사이트 문구에 명시).

개편 전 상태 백업: 브랜치 `backup-pre-meeting-20260929`, 태그 `pre-meeting-pivot-20260929` (origin 에 푸시됨).

## 데이터

| 테이블 | 한 행 | 주요 컬럼 |
|---|---|---|
| `meet_trips` | 방문 일정 하나(오는 날 하나) | id, title/city/venue/summary(`{vi,ko,en}` JSON), visit_date, visit_end, deadline, items(`[{product_id, goal}]` JSON), status(open·confirmed·closed·cancelled), published, sort |
| `meet_requests` | (일정, 제품, 바이어) 신청 하나 | trip_id, product_id, buyer_id, 신청 시점 프로필 사본(company·contact_name·phone·email), channel, volume, message, status(applied·cancelled·met·noshow), memo, aff_ref |

- 유니크 키 (trip_id, product_id, buyer_id). 취소 후 재신청은 같은 행을 되살린다.
- 확정(confirmed)은 저장하지 않고 계산한다: 취소 제외 신청 수 ≥ goal.
- 마감·D-day 는 **베트남 시간(Asia/Ho_Chi_Minh)** 기준. 마감일 당일까지 신청 가능.
- 확정된 뒤에도 마감 전이면 신청을 더 받는다(공급사 입장에선 미팅이 늘수록 좋다).

## API — `/meet/v1` (app/Controllers/Api/Meet.php)

| 누가 | 메서드 · 경로 | 설명 |
|---|---|---|
| 공개 | GET `trips` · `trips/{id}` | 공개 일정 + 제품별 신청 수. 개인정보 없음. 로그인 상태면 `mine` 표시 |
| 바이어 | GET `me` | 내 신청 목록 |
| 바이어 | POST `apply` | 로그인 401 `login_required` · 미인증 403 `verify_required` · 마감 409 `closed` · 중복 409 `already` |
| 바이어 | POST `cancel` | 마감 전까지만 |
| 관리자 | GET/POST/DELETE `admin/trips[/id]` | 신청이 있는 일정은 삭제 불가(숨김·취소로) |
| 관리자 | GET `admin/requests[?trip_id=]` · POST `admin/requests/{id}` | 신청자 목록, 상태·메모 |

deploy.yml 이 `php spark migrate` 를 돌리지 않으므로 Aff 와 같은 **스키마 가드**로 첫 요청에서 마이그레이션한다
(`writable/meet_schema_ok`, `SCHEMA_VER`). 마이그레이션 000031·000032.

## 화면

- `meetings.html` (+ `ko/`, `en/`) — 방문 일정 페이지. 히어로(구조 설명 3단계) · 다가오는 일정 · 지난 일정 · FAQ. 헤더 메뉴 맨 앞.
- 홈(`index.html`)·제품 홈(`products.html`)의 `[data-mt-home]` — 곧 오는 공급사 3건 요약.
- 제품 상세의 `[data-mt-product]` — 가격 박스와 문의 버튼 사이의 신청 박스.
- 제품 카드 하단 한 줄 — "Gặp mặt 3/12 ▬▬ 2/5".
- 관리자 › 미팅 펀딩 › 방문 일정 (`admin-meet.js`) — 일정 등록·수정, 공급사별 목표 인원, 신청자 목록·상태·메모.

프론트 코드는 `app.js` 의 `MkMeet` 섹션 하나에 모았다(모든 페이지가 app.js 를 싣기 때문).
데이터는 부팅 때 `MkData.boot()` 와 나란히 받고, 2.5초 넘게 늦으면 먼저 그린 뒤 도착하면 다시 그린다.

로컬 개발: localhost 에서만 `localStorage.mk_meet_api`(백엔드 주소)·`mk_meet_tok`(테스트 토큰)을 읽는다.

## 운영에서 사람이 할 일

1. 관리자 › 방문 일정에서 첫 일정(예: 12월 3일)을 만들고, 오는 공급사(제품)·목표 인원·마감일을 넣고 **사이트에 노출**을 켠다.
2. 상단 띠배너 문구는 DB 설정값이라 코드로 바뀌지 않는다 — 관리자 › 설정 › 띠배너에서 미팅 안내로 바꾼다.
3. 목표를 채운 제품은 공급사에 방문 확정을 알리고, 신청자에게 장소·시간을 보낸다(관리자 신청자 목록의 연락처).
