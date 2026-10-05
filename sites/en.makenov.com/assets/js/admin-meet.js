/* ============================================================
   관리자 · 미팅 펀딩(방문 일정)  — /meet/v1/admin/*
   백엔드: app/Controllers/Api/Meet.php · 사이트: app.js MkMeet · 페이지: meetings.html
   ------------------------------------------------------------
   방문 일정 1건 = 한국 공급사 담당자가 베트남에 오는 날 하나.
   그 안에 공급사(제품)별 목표 인원(기본 5)을 건다. 마감 전까지 인증 바이어가 신청한다.
   공개(published)를 켜야 사이트에 보인다. 신청이 있는 일정은 삭제 대신 숨김/취소로.
   ============================================================ */
const MeetAdmin = {
  base(){ return (typeof MK_SUPABASE_URL !== 'undefined' ? MK_SUPABASE_URL : 'https://makenov.com/').replace(/\/$/, '') + '/meet/v1/'; },
  async token(){
    try{ const { data } = await SB.auth.getSession(); return data && data.session ? data.session.access_token : ''; }catch(e){ return ''; }
  },
  async call(method, path, body){
    const h = { apikey: MK_SUPABASE_ANON, Accept: 'application/json', Authorization: 'Bearer ' + (await this.token()) };
    if(body !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(this.base() + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    let d = null; try{ d = await r.json(); }catch(e){}
    if(!r.ok){
      if(d && d.error === 'schema_missing') throw new Error('방문 일정 테이블을 만드는 중입니다. 잠시 뒤 다시 열어 주세요. 계속되면 서버에서 php spark migrate 를 돌려야 합니다.');
      throw new Error((d && d.message) || ('HTTP ' + r.status));
    }
    return d;
  },
  trips(){ return this.call('GET', 'admin/trips'); },
  saveTrip(id, body){ return this.call('POST', 'admin/trips/' + encodeURIComponent(id), body); },
  deleteTrip(id){ return this.call('DELETE', 'admin/trips/' + encodeURIComponent(id)); },
  requests(tid){ return this.call('GET', 'admin/requests' + (tid ? '?trip_id=' + encodeURIComponent(tid) : '')); },
  setRequest(id, patch){ return this.call('POST', 'admin/requests/' + encodeURIComponent(id), patch); },
  addRequests(body){ return this.call('POST', 'admin/requests', body); },
  clearSeed(tid){ return this.call('DELETE', 'admin/requests/seed' + (tid ? '?trip_id=' + encodeURIComponent(tid) : '')); },
  config(){ return this.call('GET', 'admin/config'); },
  saveConfig(body){ return this.call('POST', 'admin/config', body); },
  testNotify(){ return this.call('POST', 'admin/config/test', {}); },
};

let meetCache = { trips: [], reqs: [], cfg: null };
let meetEdit = null;      // null = 목록, '' = 새 일정, id = 수정
let meetReqTrip = null;   // 신청자 목록을 펼친 일정 id
const MEET_ST = { open:'모집 중', confirmed:'방문 확정', closed:'마감', cancelled:'취소' };
const MEET_REQ_ST = { applied:'신청', met:'미팅 완료', noshow:'불참', cancelled:'바이어 취소' };
const MEET_CH = { pharmacy:'약국', cosmetic:'화장품 매장', mart:'마트·편의점', online:'온라인', dist:'도매·대리점', other:'기타' };

function meetPname(pid){ const p = (typeof MK_PRODUCTS !== 'undefined' ? MK_PRODUCTS : []).find(x => x.id === pid); return p ? `${p.brand} · ${triText(p.name)}` : pid + ' (없는 제품)'; }
function meetDays(a, b){ if(!a || !b) return ''; return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

async function renderMeet(){
  const el = document.getElementById('tab-meet');
  if(!el) return;
  if(meetEdit !== null){ el.innerHTML = meetForm(meetEdit); return; }
  el.innerHTML = `<div class="card"><p class="note">불러오는 중…</p></div>`;
  try{
    const [trips, reqs, cfg] = await Promise.all([MeetAdmin.trips(), MeetAdmin.requests(), MeetAdmin.config().catch(() => null)]);
    meetCache = { trips: trips || [], reqs: reqs || [], cfg: cfg || null };
  }catch(e){
    el.innerHTML = `<div class="card"><p class="note"><b>행사 일정을 불러오지 못했습니다.</b><br>${esc(e.message)}</p></div>`;
    return;
  }
  el.innerHTML = meetListHtml();
}

/* 신청자 엑셀(CSV) — 엑셀에서 한글이 깨지지 않게 BOM 을 붙인다. 임시(시드) 신청은 뺀다 */
function meetCsv(tid){
  const trips = meetCache.trips, tname = id => { const t = trips.find(x => x.id === id); return t ? (triText(t.title) || id) : id; };
  const rows = meetCache.reqs.filter(r => (!tid || r.trip_id === tid) && !String(r.buyer_id || '').startsWith('seed-'));
  if(!rows.length){ toastA('내려받을 신청이 없습니다 (임시 신청은 제외됩니다)'); return; }
  const kind = r => String(r.buyer_id || '').startsWith('lead-') ? '간편 신청' : (r.verified ? '회원(인증)' : '회원');
  const head = ['신청일', '행사', '제품', '회사', '담당자', '직함', '연락처', '이메일', '홈페이지', '업종', '문의 내용', '구분', '상태', '메모'];
  const cell = v => { const s = String(v == null ? '' : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [head].concat(rows.map(r => [String(r.created_at || '').slice(0, 16), tname(r.trip_id), meetPname(r.product_id), r.company, r.contact_name, r.position,
    r.phone ? '\t' + r.phone : '', r.email, r.homepage, MEET_CH[r.channel] || r.channel, r.message, kind(r), MEET_REQ_ST[r.status] || r.status, r.memo]));
  const csv = '﻿' + lines.map(l => l.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'makenov-meeting-requests' + (tid ? '-' + tid : '') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toastA(`신청 ${rows.length}건을 내려받았습니다`);
}

/* 새 신청 알림 메일 */
async function meetCfgSave(){
  try{ const r = await MeetAdmin.saveConfig({ notify_email: av('mc-email') }); if(meetCache.cfg) meetCache.cfg.notify_email = r.notify_email; document.getElementById('mc-email').value = r.notify_email; toastA(r.notify_email ? '알림 메일 주소를 저장했습니다' : '알림을 껐습니다 (주소 없음)'); }
  catch(e){ toastA('저장 실패: ' + e.message); }
}
async function meetCfgTest(btn){
  const orig = btn.textContent; btn.disabled = true; btn.textContent = '보내는 중…';
  const out = document.getElementById('mc-result');
  try{ const r = await MeetAdmin.testNotify(); out.innerHTML = `<span style="color:#0b7a5c;font-weight:700">테스트 메일을 보냈습니다</span> → ${esc((r.to || []).join(', '))} · 받은편지함(스팸함 포함)을 확인하세요.`; }
  catch(e){ out.innerHTML = `<span style="color:#B02A37;font-weight:700">보내지 못했습니다.</span> ${esc(e.message)}<br>서버의 메일 발송 설정이 필요합니다 — 서버 .env 에 email.protocol = smtp, email.SMTPHost / SMTPUser / SMTPPass / SMTPPort / fromEmail 을 넣어야 합니다.`; }
  btn.disabled = false; btn.textContent = orig;
}
function meetCfgCard(){
  const c = meetCache.cfg;
  if(!c) return '';
  return `<div class="card"><div class="bar"><h3 style="margin:0">새 신청 알림 메일</h3><span class="grow"></span></div>
    <p class="note" style="margin:6px 0 10px">미팅 신청이 들어올 때마다 아래 주소로 메일을 보냅니다(임시 신청 제외). 여러 주소는 쉼표로 구분, 최대 5개. 비우고 저장하면 알림을 끕니다.</p>
    <div class="bar" style="gap:8px;flex-wrap:wrap"><input id="mc-email" class="srch" style="flex:1;min-width:260px" placeholder="notice@makenov.com, sales@…" value="${esc(c.notify_email || '')}">
      <button class="btn btn-primary btn-sm" onclick="meetCfgSave()">저장</button>
      <button class="btn btn-ghost btn-sm" onclick="meetCfgTest(this)">테스트 메일 보내기</button></div>
    <p class="hint" id="mc-result" style="margin:8px 0 0">보내는 방식: ${esc(c.mail_via)} · 보내는 주소: ${esc(c.mail_from)}</p></div>`;
}

function meetListHtml(){
  const rows = meetCache.trips.map(tr => {
    const items = tr.items || [];
    const reqN = meetCache.reqs.filter(r => r.trip_id === tr.id && r.status !== 'cancelled').length;
    const done = items.filter(i => i.confirmed).length;
    const prog = items.map(i => `<div class="sub" style="display:flex;gap:8px;align-items:center"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(meetPname(i.product_id))}</span>
        <span style="display:inline-block;width:80px;height:6px;border-radius:9px;background:#E9ECEF;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, Math.round(i.count / i.goal * 100))}%;background:${i.confirmed ? '#022E7D' : '#27CAA1'}"></i></span>
        <b style="min-width:40px;text-align:right">${i.count}/${i.goal}</b></div>`).join('');
    const dl = tr.days_left;
    const phase = tr.days_to_visit != null && tr.days_to_visit < 0 ? '종료' : tr.open ? '모집 중' : (MEET_ST[tr.status] || tr.status) === '모집 중' ? '마감' : (MEET_ST[tr.status] || tr.status);
    return `<tr class="row-hover"><td><b>${esc(tr.visit_date || '미정')}</b>${tr.visit_end && tr.visit_end !== tr.visit_date ? `<div class="sub">~ ${esc(tr.visit_end)}</div>` : ''}<div class="sub">마감 ${esc(tr.deadline || '없음')}${tr.open && dl != null ? ` (D-${dl})` : ''}</div></td>
      <td><b>${esc(triText(tr.title) || tr.id)}</b><div class="sub">${esc(triText(tr.city))} · ${esc(tr.id)}</div>${prog}</td>
      <td>${esc(phase)}<div class="sub">${tr.published ? '사이트 노출' : '<span style="color:#B02A37">숨김</span>'}</div><div class="sub">확정 ${done}/${items.length}</div></td>
      <td><button class="btn btn-ghost btn-sm" onclick="meetReqTrip=meetReqTrip==='${esc(tr.id)}'?null:'${esc(tr.id)}';document.getElementById('tab-meet').innerHTML=meetListHtml()">신청자 ${reqN}</button>
        <button class="btn btn-ghost btn-sm" onclick="meetEdit='${esc(tr.id)}';renderMeet()">수정</button>
        <button class="btn btn-ghost btn-sm" onclick="meetDelete('${esc(tr.id)}')">삭제</button></td></tr>
      ${meetReqTrip === tr.id ? `<tr><td colspan="4" style="background:#F8F9FA">${meetReqTable(tr)}</td></tr>` : ''}`;
  }).join('');
  return `
    <div class="card"><p class="note"><b>행사 일정</b> — 공급사를 직접 만나는 행사를 올리면, 바이어가 가입 없이 회사명·연락처만 남겨 공급사(제품)별로 미팅을 신청합니다.
      신청 수가 목표 인원(기본 5곳)에 닿은 제품은 <b>확정</b>으로 표시됩니다. 마감일이 지나면 신청이 닫히고, 행사일이 지나면 사이트의 ‘종료’ 탭으로 넘어갑니다(베트남 시간 기준).<br>
      <b>사이트 노출</b>을 켜야 vn/kr/en 의 <b>방문 일정</b> 페이지 · 홈 · 제품 상세에 보입니다. 행사일을 비운 일정은 목록에 나오지 않습니다.</p>
      <div class="bar"><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="meetCsv()">전체 신청 엑셀(CSV)</button><button class="btn btn-primary btn-sm" onclick="meetEdit='';renderMeet()">+ 새 행사 일정</button></div>
      <div class="tbl-wrap"><table><thead><tr><th style="width:150px">행사일 · 마감</th><th>행사 · 공급사별 신청</th><th style="width:120px">상태</th><th style="width:220px"></th></tr></thead><tbody>
      ${rows || `<tr class="empty-row"><td colspan="4">행사 일정이 없습니다. 오른쪽 위 ‘새 행사 일정’으로 등록하세요.</td></tr>`}
      </tbody></table></div></div>
    ${meetCfgCard()}`;
}

/* 임시(시드) 신청 도구줄 — 실제 신청이 들어오기 전 카드가 전부 0으로 보이지 않게 채워 두는 용도 */
function meetSeedBar(tr){
  const items = tr.items || [];
  const seeds = meetCache.reqs.filter(r => r.trip_id === tr.id && String(r.buyer_id || '').startsWith('seed-')).length;
  return `<div class="bar" style="gap:8px;flex-wrap:wrap;padding:8px;background:#F6F8F7;border-radius:10px;margin-bottom:10px">
    <span class="sub" style="font-weight:700">임시 신청</span>
    <select id="seed-pid-${esc(tr.id)}">${items.map(i => `<option value="${esc(i.product_id)}">${esc(meetPname(i.product_id))}</option>`).join('')}</select>
    <input id="seed-n-${esc(tr.id)}" type="number" min="1" max="10" value="2" style="width:64px">곳
    <button class="btn btn-ghost btn-sm" onclick="meetSeedAdd('${esc(tr.id)}')">추가</button>
    <span class="grow"></span>
    <span class="sub">임시 ${seeds}건</span>
    ${seeds ? `<button class="btn btn-ghost btn-sm" style="color:#B02A37" onclick="meetSeedClear('${esc(tr.id)}')">임시 신청 모두 지우기</button>` : ''}
  </div>`;
}
async function meetSeedAdd(tid){
  const pid = av('seed-pid-' + tid), n = Number(av('seed-n-' + tid)) || 1;
  try{ await MeetAdmin.addRequests({ trip_id: tid, product_id: pid, count: n }); toastA(`임시 신청 ${n}곳 추가`); meetReqTrip = tid; renderMeet(); }
  catch(e){ toastA('실패: ' + e.message); }
}
async function meetSeedClear(tid){
  if(!confirm('이 일정의 임시 신청을 모두 지울까요? (실제 바이어 신청은 남습니다)')) return;
  try{ const r = await MeetAdmin.clearSeed(tid); toastA(`임시 신청 ${r.deleted}건 삭제`); meetReqTrip = tid; renderMeet(); }
  catch(e){ toastA('실패: ' + e.message); }
}
function meetReqTable(tr){
  const list = meetCache.reqs.filter(r => r.trip_id === tr.id);
  if(!list.length) return meetSeedBar(tr) + `<p class="sub" style="padding:8px">아직 신청이 없습니다.</p>`;
  return meetSeedBar(tr) + `<div class="bar" style="margin:0 0 8px"><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="meetCsv('${esc(tr.id)}')">이 행사 신청 엑셀(CSV)</button></div><table><thead><tr><th style="width:120px">신청일</th><th>제품</th><th>회사 · 담당자</th><th>업종 · 문의 내용</th><th style="width:150px">상태</th></tr></thead><tbody>${list.map(r => `
    <tr><td>${esc(String(r.created_at || '').slice(0, 16))}</td><td>${esc(meetPname(r.product_id))}</td>
      <td><b>${esc(r.company || '')}</b> ${String(r.buyer_id || '').startsWith('seed-') ? '<span class="sub" style="color:#6c757d;font-weight:700">임시</span>' : String(r.buyer_id || '').startsWith('lead-') ? '<span class="sub" style="color:#0B45B4;font-weight:700">간편 신청</span>' : r.verified ? '<span class="sub" style="color:#0b7a5c;font-weight:700">인증</span>' : '<span class="sub" style="color:#B02A37">미인증</span>'}<div class="sub">${esc(r.contact_name || '')}${r.position ? ' (' + esc(r.position) + ')' : ''} · ${esc(r.phone || '')}<br>${esc(r.email || '')}${r.homepage ? ' · ' + esc(r.homepage) : ''}</div>${r.message ? `<div class="sub" style="white-space:pre-wrap">“${esc(r.message)}”</div>` : ''}${r.aff_ref ? `<div class="sub">CTV ${esc(r.aff_ref)}</div>` : ''}</td>
      <td>${esc(MEET_CH[r.channel] || r.channel || '')}<div class="sub">${esc(r.volume || '')}</div>${r.message ? `<div class="sub" style="margin-top:6px;white-space:pre-wrap;color:var(--mk-ink)"><b>문의</b> ${esc(r.message)}</div>` : ''}</td>
      <td><select onchange="meetSetReq('${esc(r.id)}',{status:this.value})">${Object.entries(MEET_REQ_ST).map(([v, l]) => `<option value="${v}" ${r.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input style="margin-top:6px" placeholder="메모" value="${esc(r.memo || '')}" onchange="meetSetReq('${esc(r.id)}',{memo:this.value})"></td></tr>`).join('')}
    </tbody></table>`;
}

function meetItemRow(it){
  const prods = (typeof MK_PRODUCTS !== 'undefined' ? MK_PRODUCTS : []);
  return `<div class="fgrid meet-item" style="grid-template-columns:1fr 120px 60px;align-items:end">
    <div class="fld"><label>제품(공급사)</label><select class="mi-pid">${prods.map(p => `<option value="${esc(p.id)}" ${it && it.product_id === p.id ? 'selected' : ''}>${esc(p.brand)} · ${esc(triText(p.name))}${p.published === false ? ' (비공개)' : ''}</option>`).join('')}</select></div>
    <div class="fld"><label>목표 인원</label><input class="mi-goal" type="number" min="1" max="50" value="${esc(it ? it.goal : 5)}"></div>
    <div class="fld"><button class="btn btn-ghost btn-sm" onclick="this.closest('.meet-item').remove()">빼기</button></div></div>`;
}

/* ---- 행사 상세 페이지 정보(부가 정보) 입력 줄 — FAQ · 지원 내용 ---- */
function meetFaqRow(f){
  const g = (o, l) => (o && o[l]) ? o[l] : '';
  const q = f ? f.q : {}, a = f ? f.a : {};
  return `<div class="mx-faq" style="border:1px solid var(--adm-line,#E5E8EB);border-radius:10px;padding:12px;margin-bottom:10px">
    <div class="fgrid">${['ko', 'vi', 'en'].map(l => `<div class="fld"><label><span class="lang-tag">${l.toUpperCase()}</span>질문</label><input class="fq-${l}" value="${esc(g(q, l))}"></div>`).join('')}</div>
    <div class="fgrid">${['ko', 'vi', 'en'].map(l => `<div class="fld"><label><span class="lang-tag">${l.toUpperCase()}</span>답변</label><textarea class="fa-${l}" rows="3">${esc(g(a, l))}</textarea></div>`).join('')}</div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('.mx-faq').remove()">이 질문 빼기</button></div>`;
}
function meetPerkRow(p){
  const g = l => (p && p[l]) ? p[l] : '';
  return `<div class="fgrid mx-perk" style="grid-template-columns:1fr 1fr 1fr 60px;align-items:end">
    ${['ko', 'vi', 'en'].map(l => `<div class="fld"><label><span class="lang-tag">${l.toUpperCase()}</span></label><input class="pk-${l}" value="${esc(g(l))}"></div>`).join('')}
    <div class="fld"><button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('.mx-perk').remove()">빼기</button></div></div>`;
}
/* 사이트 기본 문구(i18n)를 불러와 줄을 채운다 — 그대로 두면 기본값과 같고, 고치면 이 행사에만 적용된다 */
function meetI18n(key, lang){ try{ return (I18N[lang] && I18N[lang][key]) || ''; }catch(e){ return ''; } }
function meetLoadFaqDefaults(){
  const dl = av('mt-deadline');
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].filter(n => n !== 5 || dl).map(n => {     // 5번(마감일)은 마감일이 있을 때만
    const tri = k => ({ ko: meetI18n(k, 'ko').split('{d}').join(dl), vi: meetI18n(k, 'vi').split('{d}').join(dl), en: meetI18n(k, 'en').split('{d}').join(dl) });
    return { q: tri('mt_kf_q' + n), a: tri('mt_kf_a' + n) };
  }).filter(r => r.q.ko);
  document.getElementById('mx-faqs').innerHTML = rows.map(meetFaqRow).join('');
  toastA('기본 질문 ' + rows.length + '개를 불러왔습니다 — 고친 뒤 저장하세요');
}
function meetLoadPerkDefaults(){
  const rows = [1, 2, 3, 4, 5].map(n => ({ ko: meetI18n('mt_kf_b' + n, 'ko'), vi: meetI18n('mt_kf_b' + n, 'vi'), en: meetI18n('mt_kf_b' + n, 'en') })).filter(r => r.ko);
  document.getElementById('mx-perks').innerHTML = rows.map(meetPerkRow).join('');
  toastA('기본 항목 ' + rows.length + '개를 불러왔습니다');
}

function meetForm(id){
  const tr = id ? meetCache.trips.find(x => x.id === id) : null;
  const g = (o, k) => (o && o[k]) ? o[k] : '';
  const title = tr ? tr.title : {}, city = tr ? tr.city : {}, venue = tr ? tr.venue : {}, sum = tr ? tr.summary : {};
  const x = (tr && tr.extra && typeof tr.extra === 'object') ? tr.extra : {};
  const langRow = (base, o, area) => ['ko', 'vi', 'en'].map(l => `<div class="fld"><label><span class="lang-tag">${l.toUpperCase()}</span></label>${area
    ? `<textarea id="${base}-${l}" rows="3">${esc(g(o, l))}</textarea>` : `<input id="${base}-${l}" value="${esc(g(o, l))}">`}</div>`).join('');
  const items = tr ? (tr.items || []) : [];
  const logos = Array.isArray(x.logos) ? x.logos : [];
  const chk = (cid, on, label) => `<label style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px;font-weight:600;cursor:pointer"><input type="checkbox" id="${cid}" ${on ? 'checked' : ''} style="width:auto;margin:0"> ${label}</label>`;
  return `
    <div class="card"><div class="bar"><h3 style="margin:0">${tr ? '행사 일정 수정' : '새 행사 일정'}</h3><span class="grow"></span>
      <button class="btn btn-ghost btn-sm" onclick="meetEdit=null;renderMeet()">취소</button><button class="btn btn-primary btn-sm" onclick="meetSave(${tr ? `'${esc(tr.id)}'` : 'null'})">저장</button></div>
      <div class="fgrid">
        <div class="fld"><label>일정 ID (영문 소문자·숫자·하이픈)</label><input id="mt-id" value="${esc(tr ? tr.id : '')}" placeholder="visit-20261203">${tr ? '<p class="hint" style="margin:4px 0 0">바꾸면 사이트 주소(…/meetings.html#trip-ID)도 바뀝니다. 신청 내역은 그대로 따라옵니다.</p>' : ''}</div>
        <div class="fld"><label>행사일 (비우면 ‘미정’ — 목록에 안 나옵니다)</label><input id="mt-visit" type="date" value="${esc(tr ? tr.visit_date || '' : '')}" onchange="if(!document.getElementById('mt-id').value&&this.value)document.getElementById('mt-id').value='visit-'+this.value.replace(/-/g,'')"></div>
        <div class="fld"><label>행사 마지막 날 (하루면 비움)</label><input id="mt-end" type="date" value="${esc(tr ? tr.visit_end || '' : '')}"></div>
        <div class="fld"><label>시작 시각 (베트남 시간)</label><input id="mt-t1" type="time" value="${esc(tr ? tr.time_start || '' : '')}"></div>
        <div class="fld"><label>종료 시각 (비워도 됨)</label><input id="mt-t2" type="time" value="${esc(tr ? tr.time_end || '' : '')}"></div>
        <div class="fld"><label>신청 마감일 (베트남 시간, 이날까지 신청 가능)</label><input id="mt-deadline" type="date" value="${esc(tr ? tr.deadline || '' : '')}"></div>
        <div class="fld"><label>상태</label><select id="mt-status">${Object.entries(MEET_ST).map(([v, l]) => `<option value="${v}" ${(tr ? tr.status : 'open') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="fld"><label>정렬(같은 날 여러 일정일 때, 작을수록 먼저)</label><input id="mt-sort" type="number" value="${esc(tr ? tr.sort : 99)}"></div>
        <div class="fld"><label style="display:flex;align-items:center;gap:8px;margin-top:28px"><input type="checkbox" id="mt-pub" ${tr && tr.published ? 'checked' : ''} style="width:auto"> 사이트에 노출</label></div>
      </div>
      <p class="hint">마감일이 지나면 사이트에서 ‘마감’으로 바뀌고, 행사일이 지나면 ‘종료’ 탭으로 넘어갑니다.</p>
      <div class="sect"><h4>행사명 <span class="sub">(비우면 “한국 공급사 대면 미팅”)</span></h4><div class="fgrid">${langRow('mt-title', title)}</div></div>
      <div class="sect"><h4>도시 <span class="sub">(예: 호치민)</span></h4><div class="fgrid">${langRow('mt-city', city)}</div></div>
      <div class="sect"><h4>행사장 <span class="sub">(예: 호텔 니코 사이공 — 비우면 “추후 안내”)</span></h4><div class="fgrid">${langRow('mt-venue', venue)}</div></div>
      <div class="sect"><h4>소개 (선택)</h4><div class="fgrid">${langRow('mt-sum', sum, true)}</div></div>
      <div class="sect"><h4>참가 공급사(제품)와 목표 인원</h4>
        <div id="mt-items">${(items.length ? items : [null]).map(meetItemRow).join('')}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="document.getElementById('mt-items').insertAdjacentHTML('beforeend', meetItemRow(null))">+ 공급사 추가</button>
        <p class="hint">같은 제품을 두 번 넣으면 첫 번째만 남습니다. 이미 신청이 들어온 제품을 빼면 그 신청은 사이트에 보이지 않게 됩니다(데이터는 남음).</p></div>

      <div class="sect"><h4>행사 상세 페이지 정보 <span class="sub">(전부 선택 사항 — 넣은 것만 행사 상세 페이지에 나옵니다)</span></h4>
        <div style="margin:8px 0 4px;font-weight:600;font-size:13px">부제 <span class="sub">(행사명 아래 초록색 작은 줄. 예: 한국–베트남 비즈니스 상담회)</span></div><div class="fgrid">${langRow('mx-sub', x.sub)}</div>
        <div style="margin:12px 0 4px;font-weight:600;font-size:13px">한 줄 소개 <span class="sub">(신청 상자의 행사명 아래 문장)</span></div><div class="fgrid">${langRow('mx-lead', x.lead)}</div>
        <div style="margin:12px 0 4px;font-weight:600;font-size:13px">공식 행사명 <span class="sub">(행사 개요 표의 ‘행사명’. 비우면 위 행사명)</span></div><div class="fgrid">${langRow('mx-name', x.name)}</div>
        <div style="margin:12px 0 4px;font-weight:600;font-size:13px">세부 장소 <span class="sub">(행사 개요 표의 ‘장소’. 예: 호텔 니코 사이공 4층 컨퍼런스룸)</span></div><div class="fgrid">${langRow('mx-venue', x.venue_detail)}</div>
        <div style="margin:12px 0 4px;font-weight:600;font-size:13px">주관</div><div class="fgrid">${langRow('mx-host', x.host)}</div>
        <div style="margin:12px 0 4px;font-weight:600;font-size:13px">운영</div><div class="fgrid">${langRow('mx-org', x.org)}</div>
        <div style="margin:14px 0 4px;font-weight:600;font-size:13px">주최 로고 <span class="sub">(최대 3개 — 신청 상자 맨 위에 나란히)</span></div>
        <div class="fgrid">${[0, 1, 2].map(i => `<div class="fld">${uploader('mx-logo' + i, logos[i] || '', { hint: '로고 ' + (i + 1) + ' · 흰 바탕 가로형 권장. URL 로 넣어도 됩니다.' })}</div>`).join('')}</div>
        <div style="margin:14px 0 4px;font-weight:600;font-size:13px">행사 사진 <span class="sub">(참가 제품 사진이 없을 때만 상세 맨 위에 나옵니다)</span></div>
        ${uploader('mx-photo', x.photo || '', { hint: '가로 사진 권장.' })}
        <div style="margin:14px 0 4px;font-weight:600;font-size:13px">오시는 길 (구글 지도)</div>
        <div class="fld"><label>지도 검색어 <span class="sub">(영문 장소명 + 주소. 비우면 행사장·도시 이름으로 찾습니다)</span></label><input id="mx-mapq" value="${esc(x.map_q || '')}" placeholder="Hotel Nikko Saigon, 235 Nguyen Van Cu, District 1, Ho Chi Minh City"></div>
        <div style="margin:8px 0 4px;font-size:12.5px;color:var(--adm-sub,#6c757d)">지도 아래 주소 표기</div><div class="fgrid">${langRow('mx-mapaddr', x.map_addr)}</div>
        <div style="margin:14px 0 4px;font-weight:600;font-size:13px">표시 설정</div>
        ${chk('mx-fixed', x.fixed, '날짜·장소가 정해진 행사 — 진행 방식 4단계와 기본 FAQ 를 보여 줍니다 (끄면 ‘5곳이 모이면 확정’ 3단계)')}
        ${chk('mx-booth', x.booth, '통역 · 상담 부스 안내 표시 (지원 내용·FAQ·신청 상자에 통역 문구)')}
        ${chk('mx-growing', x.growing, '‘참가 공급사는 순차적으로 추가됩니다’ 안내 표시')}
      </div>

      <div class="sect"><h4>이 행사의 FAQ <span class="sub">(비워 두면 사이트 기본 질문이 나옵니다. 넣으면 이 행사에는 아래 질문만 나옵니다)</span></h4>
        <div id="mx-faqs">${(Array.isArray(x.faq) ? x.faq : []).map(meetFaqRow).join('')}</div>
        <div class="bar" style="gap:8px"><button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('mx-faqs').insertAdjacentHTML('beforeend', meetFaqRow(null))">+ 질문 추가</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="meetLoadFaqDefaults()">기본 질문 불러와서 고치기</button><span class="grow"></span></div></div>

      <div class="sect"><h4>이 행사의 지원 내용 <span class="sub">(비워 두면 사이트 기본 항목이 나옵니다)</span></h4>
        <div id="mx-perks">${(Array.isArray(x.perks) ? x.perks : []).map(meetPerkRow).join('')}</div>
        <div class="bar" style="gap:8px"><button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('mx-perks').insertAdjacentHTML('beforeend', meetPerkRow(null))">+ 항목 추가</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="meetLoadPerkDefaults()">기본 항목 불러와서 고치기</button><span class="grow"></span></div>
        <p class="hint">모든 행사에 공통으로 쓰는 기본 문구(진행 방식 · FAQ · 지원 내용)는 <b>문구</b> 탭 › 공통 UI 에서 <b>mt_kf_</b> 로 검색해 고칠 수 있습니다.</p></div>

      <div class="bar" style="margin-top:22px"><span class="grow"></span><button class="btn btn-ghost" onclick="meetEdit=null;renderMeet()">취소</button><button class="btn btn-primary" onclick="meetSave(${tr ? `'${esc(tr.id)}'` : 'null'})">저장</button></div>
    </div>`;
}

async function meetSave(id){
  const tri3 = base => ({ ko: av(base + '-ko'), vi: av(base + '-vi'), en: av(base + '-en') });
  const cls3 = (row, pre) => ({ ko: (row.querySelector('.' + pre + '-ko') || {}).value || '', vi: (row.querySelector('.' + pre + '-vi') || {}).value || '', en: (row.querySelector('.' + pre + '-en') || {}).value || '' });
  const tid = id || av('mt-id');
  const newId = id ? av('mt-id') : '';
  const body = {
    visit_date: av('mt-visit'), visit_end: av('mt-end'), deadline: av('mt-deadline'),
    time_start: av('mt-t1'), time_end: av('mt-t2'),
    status: av('mt-status'), sort: Number(av('mt-sort')) || 99, published: ac('mt-pub'),
    title: tri3('mt-title'), city: tri3('mt-city'), venue: tri3('mt-venue'), summary: tri3('mt-sum'),
    items: [...document.querySelectorAll('#mt-items .meet-item')].map(r => ({
      product_id: r.querySelector('.mi-pid').value, goal: Number(r.querySelector('.mi-goal').value) || 5,
    })),
    extra: {
      sub: tri3('mx-sub'), lead: tri3('mx-lead'), name: tri3('mx-name'), venue_detail: tri3('mx-venue'),
      host: tri3('mx-host'), org: tri3('mx-org'),
      logos: [0, 1, 2].map(i => av('mx-logo' + i)).filter(Boolean), photo: av('mx-photo'),
      map_q: av('mx-mapq'), map_addr: tri3('mx-mapaddr'),
      fixed: ac('mx-fixed'), booth: ac('mx-booth'), growing: ac('mx-growing'),
      faq: [...document.querySelectorAll('#mx-faqs .mx-faq')].map(r => ({ q: cls3(r, 'fq'), a: cls3(r, 'fa') })),
      perks: [...document.querySelectorAll('#mx-perks .mx-perk')].map(r => cls3(r, 'pk')),
    },
  };
  if(!/^[a-z0-9][a-z0-9-]{2,39}$/.test(tid) || (newId && !/^[a-z0-9][a-z0-9-]{2,39}$/.test(newId))){ toastA('일정 ID 는 영문 소문자·숫자·하이픈 3~40자 (예: visit-20261203)'); return; }
  if(newId && newId !== tid){
    if(!confirm(`일정 ID 를 ${tid} → ${newId} 로 바꿉니다.\n사이트 주소(#trip-${newId})가 바뀌고, 예전 주소로 들어오면 행사 목록이 보입니다. 계속할까요?`)) return;
    body.new_id = newId;
  }
  if(body.deadline && body.visit_date && body.deadline > body.visit_date){ toastA('마감일이 행사일보다 늦습니다'); return; }
  if(!body.items.length){ toastA('공급사(제품)를 하나 이상 넣으세요'); return; }
  if(body.extra.logos.some(u => /^mkimg:/.test(u)) || /^mkimg:/.test(body.extra.photo)){ toastA('이미지는 서버에 올라간 주소여야 합니다 — 다시 올리거나 URL 로 넣어 주세요'); return; }
  toastA('저장하는 중…');
  try{ await MeetAdmin.saveTrip(tid, body); toastA('저장했습니다'); meetEdit = null; renderMeet(); }
  catch(e){ toastA('저장 실패: ' + e.message); }
}
async function meetDelete(id){
  if(!confirm('이 방문 일정을 삭제할까요? (신청이 있으면 삭제되지 않습니다 — 숨김이나 취소로 바꾸세요)')) return;
  try{ await MeetAdmin.deleteTrip(id); toastA('삭제했습니다'); renderMeet(); }
  catch(e){ toastA(e.message); }
}
async function meetSetReq(id, patch){
  try{ await MeetAdmin.setRequest(id, patch); const r = meetCache.reqs.find(x => x.id === id); if(r) Object.assign(r, patch); toastA('저장했습니다'); }
  catch(e){ toastA('저장 실패: ' + e.message); }
}
