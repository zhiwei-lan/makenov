/* ============================================================
   Supabase → MySQL 데이터 이관 스크립트
   ------------------------------------------------------------
   Supabase 의 13개 테이블을 읽어 MySQL INSERT 문(sql/data_*.sql)으로 뽑는다.
   auth.users 는 REST 로 못 읽으므로 service_role 키로 Admin API 를 쓴다.

   실행 (makenov-ci4 폴더에서):
     node scripts/export_supabase.js <SUPABASE_URL> <SERVICE_ROLE_KEY>

   ⚠ service_role 키가 필요하다 — Supabase 대시보드 > Settings > API.
     anon 키로는 profiles·inquiries 같은 보호 테이블이 0행으로 나온다.
   ⚠ 비밀번호는 이관되지 않는다. Supabase 는 해시를 내주지 않으므로
     기존 회원은 새 서버에서 "비밀번호 재설정"을 한 번 해야 한다.
     (지금은 회원이 거의 없으니 관리자 계정만 새로 만들면 된다)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const [URL_, KEY] = process.argv.slice(2);
if (!URL_ || !KEY) {
  console.error('사용법: node scripts/export_supabase.js <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const OUT = path.join(__dirname, '..', 'sql');

/* MySQL 로 옮길 때의 컬럼 변환 규칙 */
const JSON_COLS = {
  companies: ['name', 'tagline', 'intro', 'location', 'certs'],
  products: ['name', 'tagline', 'brand_story', 'gallery', 'detail'],
  columns_post: ['cat', 'title', 'excerpt', 'body'],
  hero_slides: ['kicker', 'title', 'sub'],
  faqs: ['q', 'a'],
  notices: ['title', 'body'],
  settings: ['value'],
};
const TABLES = [
  'admins', 'profiles', 'companies', 'products', 'product_terms',
  'columns_post', 'hero_slides', 'wishlist', 'inquiries', 'maker_leads',
  'faqs', 'notices', 'settings',
];

const q = v => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '') + "'";
};
const toDatetime = v => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  /* 1) auth.users → auth_users (Admin API) */
  const ur = await fetch(URL_.replace(/\/$/, '') + '/auth/v1/admin/users?per_page=1000', { headers: H });
  const uj = await ur.json();
  const users = uj.users || [];
  let sql = '-- auth_users (비밀번호는 이관 불가 — 재설정 필요. 임시 해시는 로그인 불가 값)\n';
  for (const u of users) {
    sql += `INSERT INTO auth_users (id,email,password_hash,email_confirmed_at,created_at,updated_at) VALUES (`
      + [q(u.id), q(u.email), q('!reset-required!'), q(toDatetime(u.email_confirmed_at)),
         q(toDatetime(u.created_at)), q(toDatetime(u.updated_at))].join(',') + `);\n`;
  }
  fs.writeFileSync(path.join(OUT, 'data_auth_users.sql'), sql);
  console.log('auth_users:', users.length, '명');

  /* 2) 일반 테이블 */
  for (const t of TABLES) {
    const r = await fetch(`${URL_.replace(/\/$/, '')}/rest/v1/${t}?select=*&limit=10000`, { headers: H });
    if (!r.ok) { console.log(t + ': 건너뜀 (' + r.status + ')'); continue; }
    const rows = await r.json();
    if (!rows.length) { console.log(t + ': 0행'); continue; }

    let out = `-- ${t} (${rows.length}행)\n`;
    for (const row of rows) {
      const cols = [], vals = [];
      for (const [k, v] of Object.entries(row)) {
        cols.push('`' + k + '`');
        if ((JSON_COLS[t] || []).includes(k)) {
          vals.push(q(v === null ? null : JSON.stringify(v)));
        } else if (k.endsWith('_at') || k === 'date') {
          vals.push(q(k === 'date' ? (v ? String(v).slice(0, 10) : null) : toDatetime(v)));
        } else {
          vals.push(q(v));
        }
      }
      out += `INSERT INTO \`${t}\` (${cols.join(',')}) VALUES (${vals.join(',')});\n`;
    }
    fs.writeFileSync(path.join(OUT, `data_${t}.sql`), out);
    console.log(t + ':', rows.length, '행');
  }

  console.log('\n완료. sql/ 폴더의 파일들을 마이그레이션(php spark migrate) 후에 순서대로 실행하세요.');
  console.log('순서: auth_users → admins → profiles → companies → products → 나머지');
})().catch(e => { console.error(e); process.exit(1); });
