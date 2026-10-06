#!/usr/bin/env node
/* ============================================================
   bake-meet.js — 행사(미팅 일정)의 Event 구조화 데이터를 meetings.html 3벌에 굽는다
   ------------------------------------------------------------
   행사 페이지는 화면을 JS 로 그리므로 검색엔진·AI 가 "언제 어디서 무슨 행사"인지
   머리(head)에서 바로 읽을 수 있게 schema.org Event 를 정적으로 넣는다(2026-10-06 SEO·AEO 점검).
   공개(published) 이고 날짜가 있는 일정만. 마감이 지난 행사도 EventScheduled 로 남겨 두되 지난 날짜는 제외.

   실행: node bake-meet.js  (bake.yml 에서 매시간)  → 변경이 있으면 커밋·푸시
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const HOST = { vi: 'https://vn.makenov.com', ko: 'https://kr.makenov.com', en: 'https://en.makenov.com' };
const FILE = { vi: 'meetings.html', ko: 'ko/meetings.html', en: 'en/meetings.html' };
const T = (v, lang) => (v && typeof v === 'object') ? (v[lang] || v.vi || v.ko || v.en || '') : String(v ?? '');
const OPEN = '<!-- mk:event-ld (bake-meet.js가 관리 — 직접 수정 금지) -->', CLOSE = '<!-- /mk:event-ld -->';

(async () => {
  const conf = fs.readFileSync(path.join(PUB, 'assets/js/config.js'), 'utf8');
  const url = (conf.match(/MK_SUPABASE_URL\s*=\s*'([^']*)'/) || [])[1], anon = (conf.match(/MK_SUPABASE_ANON\s*=\s*'([^']*)'/) || [])[1];
  const r = await fetch(url.replace(/\/$/, '') + '/meet/v1/trips', { headers: { apikey: anon, Authorization: 'Bearer ' + anon } });
  if (!r.ok) throw new Error('meet/v1/trips → HTTP ' + r.status);
  const data = await r.json();
  const trips = (data.trips || data || []).filter(t => t && t.published !== false && t.visit_date);
  const today = new Date().toISOString().slice(0, 10);
  let touched = 0;
  for (const [lang, rel] of Object.entries(FILE)) {
    const fp = path.join(PUB, rel);
    if (!fs.existsSync(fp)) continue;
    const events = trips.filter(t => String(t.visit_date) >= today).map(t => {
      const x = (t.extra && typeof t.extra === 'object') ? t.extra : {};
      const name = T(t.title, lang) || 'MAKENOV';
      const city = T(t.city, lang), venue = T(t.venue, lang);
      const start = t.visit_date + (t.time_start ? 'T' + t.time_start + ':00+07:00' : '');
      const end = (t.visit_end || t.visit_date) + (t.time_end ? 'T' + t.time_end + ':00+07:00' : '');
      const ev = {
        '@context': 'https://schema.org', '@type': 'BusinessEvent',
        name, startDate: start, endDate: end,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: `${HOST[lang]}/meetings.html#trip-${t.id}`,
        description: T(t.summary, lang) || T(x.lead, lang) || undefined,
        organizer: { '@type': 'Organization', name: 'MAKENOV', url: HOST[lang] + '/' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND', availability: 'https://schema.org/InStock', url: `${HOST[lang]}/meetings.html#trip-${t.id}`,
                  validThrough: t.deadline || undefined },
        inLanguage: lang,
      };
      if (venue || city) ev.location = { '@type': 'Place', name: venue || city, address: { '@type': 'PostalAddress', addressLocality: city || undefined, addressCountry: 'VN' } };
      const perf = (t.items || []).map(i => i.brand).filter(Boolean);
      if (perf.length) ev.performer = perf.map(b => ({ '@type': 'Organization', name: b }));
      return ev;
    });
    let s = fs.readFileSync(fp, 'utf8');
    const block = events.length ? `${OPEN}\n${events.map(e => `<script type="application/ld+json">${JSON.stringify(e).replace(/<\//g, '<\\/')}</script>`).join('\n')}\n${CLOSE}` : `${OPEN}${CLOSE}`;
    const re = new RegExp(OPEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + CLOSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const next = re.test(s) ? s.replace(re, block) : s.replace('</head>', block + '\n</head>');
    if (next !== s) { fs.writeFileSync(fp, next); touched++; }
    console.log(`${rel} — Event ${events.length}건${next === s ? ' · 변경 없음' : ''}`);
  }
  console.log('완료 —', touched, '개 파일');
})().catch(e => { console.error(e); process.exit(1); });
