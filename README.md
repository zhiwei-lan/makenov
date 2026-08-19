# MAKENOV CI4 백엔드 — 개발자 핸드오프

작성일: 2026-08-06
표준: 회사 「AI 웹사이트 제작 표준」(PHP 8.2 + CodeIgniter 4 + MySQL 5.6)
방식: 하오커뮤니케이션 CI4 이관과 동일 — **Supabase 경로 미믹**

## 이게 무엇인가

MAKENOV(makenov.com)는 정적 HTML 프론트 + Supabase(BaaS)로 운영 중입니다.
이 패키지는 그 Supabase 를 회사 표준 스택(CI4 + MySQL 5.6)으로 대체하는 백엔드입니다.

핵심 설계: **CI4 가 Supabase 의 REST·Auth·Storage·Functions 경로를 그대로 흉내냅니다.**
그래서 프론트는 코드 수정 없이 `config.js` 의 두 값만 바꾸면 됩니다.

```js
// makenov/assets/js/config.js
const MK_SUPABASE_URL  = 'https://api.도메인.com';   // 이 서버
const MK_SUPABASE_ANON = '.env 의 makenov.publicToken 값';
```

## 설치

CI4 골격은 composer 로 받고, 이 패키지를 그 위에 얹습니다.

```bash
composer create-project codeigniter4/appstarter makenov-api
cd makenov-api

# 이 패키지 얹기 (겹치는 파일은 이 패키지 것이 우선)
cp -r ../makenov-ci4/app .
cp    ../makenov-ci4/.env.example .
mkdir -p public/uploads

# Filters.php 는 통째로 덮지 말 것 — app/Config/Filters.snippet.php 의
# 두 줄(aliases + globals)만 기존 파일에 반영

cp .env.example .env          # DB 정보·publicToken·ntsKey 입력
php spark migrate             # 테이블 15개 생성
chmod -R 775 writable/
chmod -R 775 public/uploads/
php spark serve               # 로컬 확인
```

## 데이터 이관

```bash
node scripts/export_supabase.js https://dkidobfbptdiesnrqvuq.supabase.co <SERVICE_ROLE_KEY>
# → sql/data_*.sql 생성. 마이그레이션 후 이 순서로 실행:
#   auth_users → admins → profiles → companies → products → 나머지
```

- service_role 키: Supabase 대시보드 > Settings > API (anon 키로는 보호 테이블이 0행)
- **비밀번호는 이관되지 않습니다** (Supabase 가 해시를 내주지 않음).
  기존 계정은 비밀번호 재설정이 필요합니다. 관리자 계정은 새로 만들어
  `auth_users` 에 넣고 `admins` 에 `user_id` 한 줄을 추가하면 됩니다:
  ```sql
  -- 비밀번호 해시 만들기: php -r "echo password_hash('비밀번호', PASSWORD_DEFAULT);"
  INSERT INTO auth_users (id,email,password_hash,email_confirmed_at,created_at,updated_at)
    VALUES (UUID(), 'admin@회사.com', '<해시>', NOW(), NOW(), NOW());
  INSERT INTO admins (user_id, created_at, updated_at)
    SELECT id, NOW(), NOW() FROM auth_users WHERE email='admin@회사.com';
  ```
- 이미지: 현재 제품 이미지는 대부분 저장소(레포) 안 정적 파일이라 이관 대상이
  아닙니다. Supabase Storage 에 올라간 것이 있으면 public/uploads/ 로 내려받으세요.

## API 지도

| Supabase 경로 | CI4 컨트롤러 | 비고 |
| --- | --- | --- |
| `GET/POST/PATCH/DELETE /rest/v1/{table}` | `Api\Rest::handle` | 13개 테이블, RLS 를 POLICY 맵으로 미믹 |
| `POST /auth/v1/signup` | `Api\Auth::signup` | 가입 즉시 confirmed (메일 확인 없음) |
| `POST /auth/v1/token?grant_type=password` | `Api\Auth::token` | 로그인 |
| `POST /auth/v1/token?grant_type=refresh_token` | `Api\Auth::token` | 토큰 갱신(회전) |
| `GET /auth/v1/user` · `POST /auth/v1/logout` · `POST /auth/v1/resend` | `Api\Auth` | |
| `POST /functions/v1/verify-business` | `Api\Verify::handle` | 국세청·MST·도메인 인증 (엣지함수 포팅) |
| `POST /storage/v1/object/product-images/{path}` | `Api\Storage::upload` | 관리자만 |
| `GET /storage/v1/object/public/product-images/{path}` | `Api\Storage::serve` | 공개 |

## 권한 모델 (RLS 미믹)

supabase/03_lockdown.sql 의 정책을 `Api\Rest::POLICY` 로 옮겼습니다.

| 테이블 | 읽기 | 쓰기 |
| --- | --- | --- |
| products·companies·columns_post·hero_slides·faqs·notices·settings | 공개 (published 만) | 관리자 |
| **product_terms (가격·MOQ)** | **인증 바이어만** | 관리자 |
| profiles | 본인 또는 관리자 | 본인(인증 컬럼 제외) 또는 관리자 |
| wishlist | 본인 | 본인 (제품 wish_count 자동 증감) |
| inquiries | 본인 또는 관리자 | 등록=인증 바이어 본인, 수정·삭제=관리자 |
| maker_leads | 관리자 | 등록=공개 폼, 나머지=관리자 |
| admins | 본인 행만 | 불가 (SQL 로만 관리) |

관리자 판정 = 로그인 토큰의 user_id 가 `admins` 테이블에 있는가.
인증 바이어 판정 = `profiles.status = 'verified'`.
`status='verified'` 를 클라이언트가 직접 쓰는 길은 막혀 있고(Rest 가 지움),
`Api\Verify` 를 통과했을 때만 서버가 기록합니다 — Supabase 때와 같은 구조입니다.

## 표준과 다르게 한 것 (사유 명시)

| 항목 | 표준 | 여기서는 | 왜 |
| --- | --- | --- | --- |
| API 응답 | `{status,message,data}` | PostgREST/GoTrue 모양 | 프론트 무수정 이관이 목적. supabase-js 가 이 모양을 기대함 |
| PK | `id` INT AI | 기존 키 유지 (`p1` 같은 텍스트, UUID) | 데이터·URL 호환. 바꾸면 프론트 전면 수정 |
| 업로드 파일명 재생성 | 완전 재생성 | 정제(영숫자._- 만) + 탈출 차단 | 경로가 곧 공개 URL — 재생성하면 프론트가 만든 주소가 깨짐 |
| CSRF | 폼마다 | API 는 토큰 인증으로 대체 | 세션 쿠키를 안 쓰는 토큰 API 라 CSRF 벡터 없음 |
| adminAuth 필터 | 라우트에 적용 | 파일만 제공, 미적용 | 관리자 화면이 정적 SPA. API 는 admins 대조로 보호. 서버 렌더링 페이지 추가 시 사용 |

나머지(디렉토리 구조·네이밍·Query Builder 전용·esc·password_hash·업로드
화이트리스트 5MB·논리 외래키·utf8mb4·마이그레이션·.env 분리)는 표준 그대로입니다.

## 컷오버 순서

1. 서버에 배포, `.env` 작성, `php spark migrate`, 데이터 임포트
2. `curl https://api.도메인.com/rest/v1/products -H "apikey: <publicToken>"` 으로 확인
3. 프론트 `config.js` 의 URL·토큰 교체 → `node build.js` → 배포
4. 가입 → 사업자 인증 → 가격 열람 → 견적 문의 → 관리자 문의함, 한 바퀴 점검
5. 이상 없으면 Supabase 프로젝트는 읽기전용 백업으로 유지 후 정리

## 프론트 쪽 참고

- 프론트 저장소: github.com/leegunhee010/makenov (정적 HTML, `node build.js` 로 굽기)
- supabase/ 폴더에 원본 스키마·시드·RLS SQL 전부 있음 (이 패키지의 근거 문서)

## 언어별 서브도메인 (vn / kr / en.makenov.com)

`public/` 이 원본이고, `node build-sites.js` 가 호스트별 독립 정적 사이트를 `sites/` 에 생성한다.

| 호스트 | 루트 | 내용 |
|---|---|---|
| vn.makenov.com | `sites/vn.makenov.com` | 베트남어 = `public/` 루트 파일 |
| kr.makenov.com | `sites/kr.makenov.com` | 한국어 = `public/ko/*` 를 루트로 |
| en.makenov.com | `sites/en.makenov.com` | 영어 = `public/en/*` 를 루트로 |
| makenov.com | `public` (CI4) | API·/admin/·/uploads·/rss.xml. 페이지는 301 → 언어 사이트 (`nginx.makenov.com.conf.example`) |

페이지나 `assets/` 를 고치면 `node build-sites.js` 를 다시 돌려 `sites/` 를 함께 커밋한다. 언어 결정은 `i18n.js` 의 `MK_HOSTS`(호스트 → 언어) 가 맡고, 세션은 `.makenov.com` 쿠키로 호스트 간 공유된다.
