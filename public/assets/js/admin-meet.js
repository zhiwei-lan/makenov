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
};

let meetCache = { trips: [], reqs: [] };
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
    const [trips, reqs] = await Promise.all([MeetAdmin.trips(), MeetAdmin.requests()]);
    meetCache = { trips: trips || [], reqs: reqs || [] };
  }catch(e){
    el.innerHTML = `<div class="card"><p class="note"><b>방문 일정을 불러오지 못했습니다.</b><br>${esc(e.message)}</p></div>`;
    return;
  }
  el.innerHTML = meetListHtml();
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
    return `<tr class="row-hover"><td><b>${esc(tr.visit_date || '미정')}</b>${tr.visit_end && tr.visit_end !== tr.visit_date ? `<div class="sub">~ ${esc(tr.visit_end)}</div>` : ''}<div class="sub">마감 ${esc(tr.deadline || '없음')}${tr.open && dl != null ? ` (D-${dl})` : ''}</div></td>
      <td><b>${esc(triText(tr.title) || tr.id)}</b><div class="sub">${esc(triText(tr.city))} · ${esc(tr.id)}</div>${prog}</td>
      <td>${esc(MEET_ST[tr.status] || tr.status)}<div class="sub">${tr.published ? '사이트 노출' : '<span style="color:#B02A37">숨김</span>'}</div><div class="sub">확정 ${done}/${items.length}</div></td>
      <td><button class="btn btn-ghost btn-sm" onclick="meetReqTrip=meetReqTrip==='${esc(tr.id)}'?null:'${esc(tr.id)}';document.getElementById('tab-meet').innerHTML=meetListHtml()">신청자 ${reqN}</button>
        <button class="btn btn-ghost btn-sm" onclick="meetEdit='${esc(tr.id)}';renderMeet()">수정</button>
        <button class="btn btn-ghost btn-sm" onclick="meetDelete('${esc(tr.id)}')">삭제</button></td></tr>
      ${meetReqTrip === tr.id ? `<tr><td colspan="4" style="background:#F8F9FA">${meetReqTable(tr)}</td></tr>` : ''}`;
  }).join('');
  return `
    <div class="card"><p class="note"><b>미팅 펀딩</b> — 한국 공급사 담당자가 베트남에 오는 날을 정해 올리면, 공급사(제품)별로 인증 바이어가 목표 인원(기본 5곳)까지 신청합니다.
      목표를 채운 제품은 <b>방문 확정</b>으로 표시됩니다. 마감일이 지나면 사이트에서 신청이 닫힙니다(베트남 시간 기준).<br>
      일정은 <b>사이트 노출</b>을 켜야 vn/kr/en 의 <b>방문 일정</b> 페이지·홈·제품 상세에 보입니다.</p>
      <div class="bar"><span class="grow"></span><button class="btn btn-primary btn-sm" onclick="meetEdit='';renderMeet()">+ 새 방문 일정</button></div>
      <div class="tbl-wrap"><table><thead><tr><th style="width:150px">방문일 · 마감</th><th>일정 · 공급사별 신청</th><th style="width:120px">상태</th><th style="width:220px"></th></tr></thead><tbody>
      ${rows || `<tr class="empty-row"><td colspan="4">방문 일정이 없습니다. 오른쪽 위 ‘새 방문 일정’으로 12월 3일 같은 날짜를 올려 보세요.</td></tr>`}
      </tbody></table></div></div>`;
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
  return meetSeedBar(tr) + `<table><thead><tr><th style="width:120px">신청일</th><th>제품</th><th>회사 · 담당자</th><th>업종 · 예상 수량</th><th style="width:150px">상태</th></tr></thead><tbody>${list.map(r => `
    <tr><td>${esc(String(r.created_at || '').slice(0, 16))}</td><td>${esc(meetPname(r.product_id))}</td>
      <td><b>${esc(r.company || '')}</b> ${String(r.buyer_id || '').startsWith('seed-') ? '<span class="sub" style="color:#6c757d;font-weight:700">임시</span>' : String(r.buyer_id || '').startsWith('lead-') ? '<span class="sub" style="color:#0B45B4;font-weight:700">간편 신청</span>' : r.verified ? '<span class="sub" style="color:#0b7a5c;font-weight:700">인증</span>' : '<span class="sub" style="color:#B02A37">미인증</span>'}<div class="sub">${esc(r.contact_name || '')}${r.position ? ' (' + esc(r.position) + ')' : ''} · ${esc(r.phone || '')}<br>${esc(r.email || '')}${r.homepage ? ' · ' + esc(r.homepage) : ''}</div>${r.message ? `<div class="sub" style="white-space:pre-wrap">“${esc(r.message)}”</div>` : ''}${r.aff_ref ? `<div class="sub">CTV ${esc(r.aff_ref)}</div>` : ''}</td>
      <td>${esc(MEET_CH[r.channel] || r.channel || '')}<div class="sub">${esc(r.volume || '')}</div></td>
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

function meetForm(id){
  const tr = id ? meetCache.trips.find(x => x.id === id) : null;
  const g = (o, k) => (o && o[k]) ? o[k] : '';
  const title = tr ? tr.title : {}, city = tr ? tr.city : {}, venue = tr ? tr.venue : {}, sum = tr ? tr.summary : {};
  const langRow = (base, o, area) => ['ko', 'vi', 'en'].map(l => `<div class="fld"><label><span class="lang-tag">${l.toUpperCase()}</span></label>${area
    ? `<textarea id="${base}-${l}" rows="3">${esc(g(o, l))}</textarea>` : `<input id="${base}-${l}" value="${esc(g(o, l))}">`}</div>`).join('');
  const items = tr ? (tr.items || []) : [];
  return `
    <div class="card"><div class="bar"><h3 style="margin:0">${tr ? '방문 일정 수정' : '새 방문 일정'}</h3><span class="grow"></span>
      <button class="btn btn-ghost btn-sm" onclick="meetEdit=null;renderMeet()">취소</button><button class="btn btn-primary btn-sm" onclick="meetSave(${tr ? `'${esc(tr.id)}'` : 'null'})">저장</button></div>
      <div class="fgrid">
        <div class="fld"><label>일정 ID (영문 소문자·숫자·하이픈)</label><input id="mt-id" value="${esc(tr ? tr.id : '')}" ${tr ? 'disabled' : ''} placeholder="visit-20261203"></div>
        <div class="fld"><label>방문일 (비우면 ‘미정’)</label><input id="mt-visit" type="date" value="${esc(tr ? tr.visit_date || '' : '')}" onchange="if(!document.getElementById('mt-id').value&&this.value)document.getElementById('mt-id').value='visit-'+this.value.replace(/-/g,'')"></div>
        <div class="fld"><label>방문 마지막 날 (하루면 비움)</label><input id="mt-end" type="date" value="${esc(tr ? tr.visit_end || '' : '')}"></div>
        <div class="fld"><label>시작 시각 (베트남 시간)</label><input id="mt-t1" type="time" value="${esc(tr ? tr.time_start || '' : '')}"></div>
        <div class="fld"><label>종료 시각 (비워도 됨)</label><input id="mt-t2" type="time" value="${esc(tr ? tr.time_end || '' : '')}"></div>
        <div class="fld"><label>신청 마감일 (베트남 시간, 이날까지 신청 가능)</label><input id="mt-deadline" type="date" value="${esc(tr ? tr.deadline || '' : '')}"></div>
        <div class="fld"><label>상태</label><select id="mt-status">${Object.entries(MEET_ST).map(([v, l]) => `<option value="${v}" ${(tr ? tr.status : 'open') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="fld"><label>정렬(같은 날 여러 일정일 때, 작을수록 먼저)</label><input id="mt-sort" type="number" value="${esc(tr ? tr.sort : 99)}"></div>
        <div class="fld"><label style="display:flex;align-items:center;gap:8px;margin-top:28px"><input type="checkbox" id="mt-pub" ${tr && tr.published ? 'checked' : ''} style="width:auto"> 사이트에 노출</label></div>
      </div>
      <p class="hint">마감일은 방문일 2주 전쯤을 권장합니다. 목표를 채운 뒤 공급사 일정·항공권을 잡을 시간이 필요합니다.</p>
      <div class="sect"><h4>제목 <span class="sub">(비우면 “한국 공급사 대면 미팅”)</span></h4><div class="fgrid">${langRow('mt-title', title)}</div></div>
      <div class="sect"><h4>도시 <span class="sub">(예: 호치민)</span></h4><div class="fgrid">${langRow('mt-city', city)}</div></div>
      <div class="sect"><h4>행사장 <span class="sub">(예: 롯데호텔 사이공 2층 크리스탈홀 — 비우면 “추후 안내”)</span></h4><div class="fgrid">${langRow('mt-venue', venue)}</div></div>
      <div class="sect"><h4>소개 (선택)</h4><div class="fgrid">${langRow('mt-sum', sum, true)}</div></div>
      <div class="sect"><h4>오는 공급사(제품)와 목표 인원</h4>
        <div id="mt-items">${(items.length ? items : [null]).map(meetItemRow).join('')}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="document.getElementById('mt-items').insertAdjacentHTML('beforeend', meetItemRow(null))">+ 공급사 추가</button>
        <p class="hint">같은 제품을 두 번 넣으면 첫 번째만 남습니다. 이미 신청이 들어온 제품을 빼면 그 신청은 사이트에 보이지 않게 됩니다(데이터는 남음).</p></div>
      <div class="bar" style="margin-top:22px"><span class="grow"></span><button class="btn btn-ghost" onclick="meetEdit=null;renderMeet()">취소</button><button class="btn btn-primary" onclick="meetSave(${tr ? `'${esc(tr.id)}'` : 'null'})">저장</button></div>
    </div>`;
}

async function meetSave(id){
  const tri3 = base => ({ ko: av(base + '-ko'), vi: av(base + '-vi'), en: av(base + '-en') });
  const tid = id || av('mt-id');
  const body = {
    visit_date: av('mt-visit'), visit_end: av('mt-end'), deadline: av('mt-deadline'),
    time_start: av('mt-t1'), time_end: av('mt-t2'),
    status: av('mt-status'), sort: Number(av('mt-sort')) || 99, published: ac('mt-pub'),
    title: tri3('mt-title'), city: tri3('mt-city'), venue: tri3('mt-venue'), summary: tri3('mt-sum'),
    items: [...document.querySelectorAll('#mt-items .meet-item')].map(r => ({
      product_id: r.querySelector('.mi-pid').value, goal: Number(r.querySelector('.mi-goal').value) || 5,
    })),
  };
  if(!/^[a-z0-9][a-z0-9-]{2,39}$/.test(tid)){ toastA('일정 ID 는 영문 소문자·숫자·하이픈 3~40자 (예: visit-20261203)'); return; }
  if(body.deadline && body.visit_date && body.deadline > body.visit_date){ toastA('마감일이 방문일보다 늦습니다'); return; }
  if(!body.items.length){ toastA('공급사(제품)를 하나 이상 넣으세요'); return; }
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
