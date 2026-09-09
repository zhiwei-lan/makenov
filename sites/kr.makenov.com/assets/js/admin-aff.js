/* ============================================================
   admin-aff.js — 관리자 '제휴' 탭 (베트남 마케터 CTV 프로그램)
   ------------------------------------------------------------
   서브탭: 캠페인 · 리드 · 출금 · 마케터(상세: 클릭·채널·리드) · 설정
   데이터는 AffAdmin 어댑터 → 서버 /aff/v1/admin/* (app/Controllers/Api/Aff.php).
   인증은 관리자 로그인 토큰(SB 세션 access_token)을 Bearer 로 보낸다.
   설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
   ============================================================ */
const AffAdmin = {
  base(){ return (typeof MK_SUPABASE_URL !== 'undefined' ? MK_SUPABASE_URL : 'https://makenov.com/').replace(/\/$/, '') + '/aff/v1/admin/'; },
  async token(){
    try{ const { data } = await SB.auth.getSession(); return data && data.session ? data.session.access_token : ''; }catch(e){ return ''; }
  },
  async call(method, path, body){
    const h = { apikey: MK_SUPABASE_ANON, Accept: 'application/json', Authorization: 'Bearer ' + (await this.token()) };
    if(body !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(this.base() + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    let d = null; try{ d = await r.json(); }catch(e){}
    if(!r.ok){
      if(d && d.error === 'schema_missing') throw new Error('제휴 테이블이 아직 없습니다. 서버에서 php spark migrate 를 돌리거나 database/aff.sql 을 적용하세요. (' + (d.detail || '') + ')');
      throw new Error((d && d.message) || ('HTTP ' + r.status));
    }
    return d;
  },
  campaigns(){ return this.call('GET', 'campaigns'); },
  /* 캠페인 없는 제품도 목록에 보여 켤 수 있게 — MK_PRODUCTS 와 합친다 */
  async products(){
    const cs = await this.campaigns();
    const list = (typeof MK_PRODUCTS !== 'undefined' ? MK_PRODUCTS : []).filter(p => p.published !== false);
    return list.map(p => {
      const c = cs.find(x => x.product_id === p.id);
      return { product_id:p.id, name:triText(p.name), brand:p.brand, cat:p.cat, img:p.img,
        campaign: c || { product_id:p.id, cpa_vnd:0, cap:null, headline:'', materials:[], keywords:[], copy_text:'', rules:'', featured:false, active:false, sort:99, approved:0, pending:0 } };
    });
  },
  saveCampaign(pid, patch){ return this.call('POST', 'campaigns/' + encodeURIComponent(pid), patch); },
  leads(o){ return this.call('GET', 'leads' + (o && o.status ? '?status=' + o.status : '')); },
  decideLead(id, status, reason){ return this.call('POST', 'leads/' + id, { status, reason }); },
  withdrawals(){ return this.call('GET', 'withdrawals'); },
  setWithdrawal(id, status, memo){ return this.call('POST', 'withdrawals/' + id, memo === undefined ? { status } : { status, memo }); },
  marketers(){ return this.call('GET', 'marketers'); },
  marketer(id){ return this.call('GET', 'marketers/' + id); },
  setMarketer(id, patch){ return this.call('POST', 'marketers/' + id, patch); },
  settings(){ return this.call('GET', 'settings'); },
  saveSettings(patch){ return this.call('POST', 'settings', patch); },
};

/* ---------- 렌더 ---------- */
let affSub = 'campaigns', affLeadFilter = 'pending', affEditPid = null, affDetailId = null, affCache = { pending:0, wd:0 };
const AFF_ST_KO = { pending:'대기', approved:'승인', rejected:'반려', requested:'신청', paid:'지급완료', active:'정상', blocked:'정지' };
const AFF_CH_KO = { fb:'Facebook', zalo:'Zalo', tiktok:'TikTok', copy:'링크복사', other:'기타', '':'기타' };
const vndK = n => (Math.round(Number(n) || 0)).toLocaleString('vi-VN') + ' ₫';
function affBadge(st){
  const ok = st === 'approved' || st === 'paid' || st === 'active', bad = st === 'rejected' || st === 'blocked';
  return `<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${ok ? '#EEFBF7' : bad ? '#FDECEC' : '#F2F4F6'};color:${ok ? '#13A583' : bad ? '#D9534F' : '#4E5968'}">${AFF_ST_KO[st] || st}</span>`;
}
function affPendingCount(){ return affCache.pending; }
function affFail(e){ toastA(e.message || String(e)); console.error(e); }

async function renderAff(){
  const el = document.getElementById('tab-aff'); if(!el) return;
  if(!isSB()){ el.innerHTML = `<div class="card"><p class="note">제휴 탭은 서버 모드에서만 동작합니다.</p></div>`; return; }
  const subs = [['campaigns', '캠페인'], ['leads', `리드 ${affCache.pending ? `<b>${affCache.pending}</b>` : ''}`], ['withdrawals', `출금 ${affCache.wd ? `<b>${affCache.wd}</b>` : ''}`], ['marketers', '마케터'], ['settings', '설정']];
  el.innerHTML = `<div class="card"><div class="bar" style="margin:0 0 14px"><div class="bchips">${subs.map(([k, t]) => `<button class="bchip${affSub === k ? ' on' : ''}" onclick="affSub='${k}';affEditPid=null;affDetailId=null;renderAff()">${t}</button>`).join('')}</div><span class="grow"></span><a class="btn btn-ghost btn-sm" href="https://vn.makenov.com/affiliate/" target="_blank">CTV 사이트 열기 ↗</a></div><div id="aff-body"><p class="note">불러오는 중…</p></div></div>`;
  try{
    let body = '';
    if(affSub === 'campaigns') body = await affCampaignsView();
    else if(affSub === 'leads') body = await affLeadsView();
    else if(affSub === 'withdrawals') body = await affWithdrawalsView();
    else if(affSub === 'marketers') body = affDetailId ? await affMarketerDetailView(affDetailId) : await affMarketersView();
    else body = await affSettingsView();
    const b = document.getElementById('aff-body'); if(b) b.innerHTML = body;
  }catch(e){ const b = document.getElementById('aff-body'); if(b) b.innerHTML = `<p class="note" style="color:#D9534F">${esc(e.message || e)}</p>`; }
}

/* 나브 카운트용 — 부팅 후 한 번 (관리자 로그인 상태에서만) */
async function affRefreshCounts(){
  try{
    const [ls, ws] = await Promise.all([AffAdmin.leads({ status:'pending' }), AffAdmin.withdrawals()]);
    affCache.pending = ls.length; affCache.wd = ws.filter(w => w.status === 'requested').length;
    if(typeof renderNav === 'function') renderNav();
  }catch(e){}
}

async function affCampaignsView(){
  const rows = await AffAdmin.products();
  if(affEditPid){ const r = rows.find(x => x.product_id === affEditPid); if(r) return affCampaignForm(r); }
  return `<p class="note">제품마다 CTV 캠페인을 켜고 리드 단가(VND)·상한을 정합니다. 켠 캠페인만 CTV 사이트에 보입니다. 단가·상한·추천은 표에서 바로 고치고 <b>저장</b>, 소재·문구·키워드·규정은 <b>수정</b>에서.</p>
  <div class="tbl-wrap"><table><thead><tr><th style="width:48px"></th><th>제품</th><th style="width:70px">노출</th><th style="width:130px">단가(₫)</th><th style="width:90px">상한</th><th style="width:60px">추천</th><th>승인/대기</th><th style="width:150px"></th></tr></thead><tbody>
  ${rows.map(r => { const c = r.campaign; return `<tr class="row-hover"${c.active ? '' : ' style="opacity:.6"'}><td><img class="thumb-sm" src="${esc(imgSrc(r.img))}" alt=""></td><td><b>${esc(r.name)}</b><div class="sub">${esc(r.brand)} · ${esc(r.product_id)}</div></td>
    <td><input type="checkbox" id="afc-on-${r.product_id}" ${c.active ? 'checked' : ''}></td>
    <td><input type="number" id="afc-cpa-${r.product_id}" value="${c.cpa_vnd || ''}" step="10000" min="0" placeholder="150000" style="width:120px"></td>
    <td><input type="number" id="afc-cap-${r.product_id}" value="${c.cap ?? ''}" min="0" placeholder="∞" style="width:80px"></td>
    <td><input type="checkbox" id="afc-feat-${r.product_id}" ${c.featured ? 'checked' : ''}></td>
    <td><b>${c.approved}</b> / ${c.pending}</td>
    <td><button class="btn btn-primary btn-sm" onclick="affSaveRow('${r.product_id}')">저장</button> <button class="btn btn-ghost btn-sm" onclick="affEditPid='${r.product_id}';renderAff()">수정</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
}
async function affSaveRow(pid){
  const cap = av('afc-cap-' + pid);
  try{ await AffAdmin.saveCampaign(pid, { active:ac('afc-on-' + pid), cpa_vnd:Number(av('afc-cpa-' + pid)) || 0, cap:cap === '' ? null : Number(cap), featured:ac('afc-feat-' + pid) }); toastA('저장했습니다'); renderAff(); }
  catch(e){ affFail(e); }
}
function affCampaignForm(r){
  const c = r.campaign;
  window._affMats = (c.materials || []).slice();
  return `<div class="bar" style="margin:0 0 12px"><h3 style="margin:0">캠페인 수정 — ${esc(r.name)}</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="affEditPid=null;renderAff()">목록</button><button class="btn btn-primary btn-sm" onclick="affSaveForm('${r.product_id}')">저장</button></div>
  <div class="fgrid two"><div class="fld"><label>노출 <input type="checkbox" id="afe-on" ${c.active ? 'checked' : ''} style="width:auto;margin-left:6px"> <span style="font-weight:400;color:var(--adm-sub);font-size:12px">추천</span> <input type="checkbox" id="afe-feat" ${c.featured ? 'checked' : ''} style="width:auto"></label></div><div class="fld"><label>정렬(작을수록 앞)</label><input id="afe-sort" type="number" value="${c.sort ?? 99}"></div></div>
  <div class="fgrid two"><div class="fld"><label>리드 단가 (VND)</label><input id="afe-cpa" type="number" step="10000" value="${c.cpa_vnd || ''}"></div><div class="fld"><label>리드 상한 (비우면 무제한)</label><input id="afe-cap" type="number" value="${c.cap ?? ''}"></div></div>
  <div class="fld"><label>헤드라인 (베트남어, 목록·상세 한 줄)</label><input id="afe-head" value="${esc(c.headline || '')}" placeholder="Kem dưỡng gót chân bán chạy tại Hàn Quốc"></div>
  <div class="fld"><label>홍보 문구 (베트남어 — CTV가 복사해 쓰는 글)</label><textarea id="afe-copy" rows="4">${esc(c.copy_text || '')}</textarea></div>
  <div class="fld"><label>추천 키워드 (쉼표로 구분, 베트남어)</label><input id="afe-kw" value="${esc((c.keywords || []).join(', '))}" placeholder="kem dưỡng gót chân, mỹ phẩm Hàn Quốc, sỉ mỹ phẩm"></div>
  <div class="fld"><label>규정 (줄바꿈 = 항목)</label><textarea id="afe-rules" rows="4">${esc(c.rules || '')}</textarea></div>
  <div class="sect"><h4>홍보 소재 이미지 <span style="color:var(--adm-sub);font-size:11px;font-weight:500">CTV가 내려받아 쓰는 사진. 비우면 제품 대표 이미지만</span></h4><div class="gal-grid" id="afe-mats">${affMatsHtml()}</div>
  <div class="bar" style="margin:12px 0 0"><button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('afe-mat-file').click()">사진 올리기</button><input type="file" id="afe-mat-file" accept="image/*" multiple hidden onchange="affMatUpload(this)"><input id="afe-mat-url" placeholder="또는 이미지 URL 붙여넣기" style="flex:1"><button class="btn btn-ghost btn-sm" onclick="affAddMat()">+ 추가</button></div></div>`;
}
function affMatsHtml(){ return (window._affMats || []).map((u, i) => `<div class="gal-item" style="position:relative"><img src="${esc(imgSrc(u))}" alt=""><button class="btn btn-ghost btn-sm" style="position:absolute;top:6px;right:6px" onclick="_affMats.splice(${i},1);document.getElementById('afe-mats').innerHTML=affMatsHtml()">✕</button></div>`).join('') || '<p class="hint" style="margin:0">아직 없음</p>'; }
function affAddMat(){ const u = av('afe-mat-url'); if(!u) return; window._affMats.push(u); document.getElementById('afe-mat-url').value = ''; document.getElementById('afe-mats').innerHTML = affMatsHtml(); }
/* 기존 제품 갤러리 업로드와 같은 저장소(storage/v1) — 서버 모드의 MkImg.save 는 절대 URL(ref)을 돌려준다 */
async function affMatUpload(input){
  const files = Array.from(input.files || []); input.value = '';
  for(const f of files){
    try{ const r = await MkImg.save(f); if(r && r.ref) window._affMats.push(r.ref); }
    catch(e){ toastA('업로드 실패: ' + (e.message || e)); }
  }
  document.getElementById('afe-mats').innerHTML = affMatsHtml();
}
async function affSaveForm(pid){
  const cap = av('afe-cap');
  try{
    await AffAdmin.saveCampaign(pid, { active:ac('afe-on'), featured:ac('afe-feat'), sort:Number(av('afe-sort')) || 99, cpa_vnd:Number(av('afe-cpa')) || 0, cap:cap === '' ? null : Number(cap),
      headline:av('afe-head'), copy_text:av('afe-copy'), rules:av('afe-rules'), keywords:av('afe-kw').split(',').map(s => s.trim()).filter(Boolean), materials:(window._affMats || []).slice() });
    toastA('캠페인을 저장했습니다'); affEditPid = null; renderAff();
  }catch(e){ affFail(e); }
}

async function affLeadsView(){
  const rows = await AffAdmin.leads({ status: affLeadFilter });
  if(affLeadFilter === 'pending'){ affCache.pending = rows.length; if(typeof renderNav === 'function') renderNav(); }
  const chips = [['pending', '대기'], ['approved', '승인'], ['rejected', '반려'], ['', '전체']];
  return `<div class="bchips" style="margin:0 0 12px">${chips.map(([k, t]) => `<button class="bchip${affLeadFilter === k ? ' on' : ''}" onclick="affLeadFilter='${k}';renderAff()">${t}</button>`).join('')}</div>
  <p class="note">CTV 링크로 들어온 유통사 문의입니다. <b>승인</b>하면 단가만큼 CTV 적립금이 올라가고, <b>반려</b>는 사유가 CTV 에게 보입니다. 자기 문의·중복·연락 불가는 반려하세요. 문의 원문은 문의함에도 있습니다.</p>
  ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th style="width:120px">일시</th><th>마케터</th><th>채널</th><th>유통사</th><th>제품</th><th>문의 내용</th><th style="width:100px">금액</th><th style="width:80px">상태</th><th style="width:130px"></th></tr></thead><tbody>
  ${rows.map(l => `<tr class="row-hover"><td>${esc(l.created_at)}</td><td><b>${esc(l.marketer.code || '')}</b><div class="sub">${esc(l.marketer.name || '')}</div></td><td>${esc(AFF_CH_KO[l.ch] || l.ch || '기타')}</td><td>${esc(l.buyer.company || '-')}<div class="sub">${esc(l.buyer.contact || '')} ${esc(l.buyer.phone || l.buyer.email || '')}</div></td><td>${esc(l.product_name)}</td><td style="max-width:300px;font-size:12px;color:var(--adm-sub)">${esc((l.message || '').slice(0, 140))}${l.reject_reason ? `<div style="color:#D9534F">반려: ${esc(l.reject_reason)}</div>` : ''}</td><td>${vndK(l.amount_vnd)}</td><td>${affBadge(l.status)}</td>
    <td>${l.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="affDecide('${l.id}','approved')">승인</button> <button class="btn btn-ghost btn-sm" onclick="affDecide('${l.id}','rejected')">반려</button>` : `<button class="btn btn-ghost btn-sm" onclick="affDecide('${l.id}','pending')">대기로</button>`}</td></tr>`).join('')}
  </tbody></table></div>` : `<p class="note" style="margin:0">해당 리드가 없습니다.</p>`}`;
}
async function affDecide(id, status){
  let reason = '';
  if(status === 'rejected'){ reason = prompt('반려 사유 (CTV 에게 베트남어로 보입니다)', 'Trùng với khách hàng đã có trong hệ thống'); if(reason === null) return; }
  try{ await AffAdmin.decideLead(id, status, reason); toastA(status === 'approved' ? '승인했습니다' : status === 'rejected' ? '반려했습니다' : '대기로 되돌렸습니다'); await affRefreshCounts(); renderAff(); }
  catch(e){ affFail(e); }
}

async function affWithdrawalsView(){
  const rows = await AffAdmin.withdrawals();
  affCache.wd = rows.filter(w => w.status === 'requested').length;
  return `<p class="note">CTV 출금 신청입니다. 계좌이체를 마친 뒤 <b>지급완료</b>를 누르세요. 잔액이 모자라거나 계좌가 이상하면 <b>반려</b>(메모가 CTV 에게 보입니다).</p>
  ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th style="width:120px">신청일</th><th>마케터</th><th>금액</th><th>입금 계좌</th><th style="width:90px">상태</th><th style="width:170px"></th></tr></thead><tbody>
  ${rows.map(w => { const b = w.bank_snapshot || {}; return `<tr class="row-hover"><td>${esc(w.created_at)}${w.paid_at ? `<div class="sub">지급 ${esc(w.paid_at)}</div>` : ''}</td><td><b>${esc(w.marketer.code || '')}</b><div class="sub">${esc(w.marketer.name || '')}</div></td><td><b>${vndK(w.amount_vnd)}</b></td><td>${esc(b.bank_name || '')} ${esc(b.bank_account || '')}<div class="sub">${esc(b.bank_holder || '')}</div>${w.memo ? `<div class="sub" style="color:#D9534F">${esc(w.memo)}</div>` : ''}</td><td>${affBadge(w.status)}</td>
    <td>${w.status === 'requested' ? `<button class="btn btn-primary btn-sm" onclick="affWd('${w.id}','paid')">지급완료</button> <button class="btn btn-ghost btn-sm" onclick="affWd('${w.id}','rejected')">반려</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div>` : `<p class="note" style="margin:0">출금 신청이 없습니다.</p>`}`;
}
async function affWd(id, status){
  let memo;
  if(status === 'rejected'){ memo = prompt('반려 메모 (CTV 에게 보입니다)', 'Thông tin tài khoản không hợp lệ'); if(memo === null) return; }
  else if(!confirm('계좌이체를 완료했습니까? 지급완료로 표시합니다.')) return;
  try{ await AffAdmin.setWithdrawal(id, status, memo); toastA(status === 'paid' ? '지급완료 처리했습니다' : '반려했습니다'); await affRefreshCounts(); renderAff(); }
  catch(e){ affFail(e); }
}

async function affMarketersView(){
  const rows = await AffAdmin.marketers();
  return `<p class="note">가입한 CTV 목록입니다. <b>상세</b>에서 링크 클릭(일자·채널·제품별)과 리드를 봅니다. 부정 홍보가 확인되면 <b>정지</b>(로그인 차단, 링크는 리드 미생성).</p>
  <div class="tbl-wrap"><table><thead><tr><th>코드</th><th>이름</th><th>연락처</th><th>클릭 30일</th><th>리드(대기)</th><th>승인률</th><th>전환율</th><th>승인 금액</th><th>잔액</th><th>상태</th><th style="width:180px"></th></tr></thead><tbody>
  ${rows.length ? rows.map(m => `<tr class="row-hover"><td><b>${esc(m.code)}</b><div class="sub">${esc(String(m.created_at || '').slice(0, 10))}</div></td><td>${esc(m.name)}<div class="sub">${esc(m.email)}</div></td><td>${esc(m.phone || '')}<div class="sub">Zalo ${esc(m.zalo || '-')}</div></td><td><b>${m.clicks30}</b></td><td>${m.leads} (${m.pending})</td><td>${m.approval_rate == null ? '<span class="sub">3건 미만</span>' : `<b style="color:${m.approval_rate >= .8 ? '#13A583' : m.approval_rate >= .5 ? '#B76E00' : '#D9534F'}">${Math.round(m.approval_rate * 100)}%</b>`}</td><td>${m.conv == null ? '-' : Math.round(m.conv * 100) + '%'}</td><td>${vndK(m.approved_vnd)}</td><td><b>${vndK(m.balance_vnd)}</b></td><td>${affBadge(m.status)}</td>
    <td><button class="btn btn-primary btn-sm" onclick="affDetailId='${m.id}';renderAff()">상세</button> <button class="btn btn-ghost btn-sm" onclick="affToggleM('${m.id}','${m.status === 'active' ? 'blocked' : 'active'}')">${m.status === 'active' ? '정지' : '해제'}</button> <button class="btn btn-ghost btn-sm" onclick="affMemo('${m.id}',${JSON.stringify(m.memo || '')})" title="${esc(m.memo || '')}">메모${m.memo ? '●' : ''}</button></td></tr>`).join('') : `<tr><td colspan="10" class="note">아직 가입한 CTV 가 없습니다</td></tr>`}
  </tbody></table></div>`;
}
async function affMarketerDetailView(id){
  const m = await AffAdmin.marketer(id);
  const days = m.clicks.days, max = Math.max(1, ...days.map(d => d.clicks)), total = days.reduce((a, d) => a + d.clicks, 0);
  const ch = Object.entries(m.clicks.channels || {}).sort((a, b) => b[1] - a[1]);
  const cnt = st => m.leads.filter(l => l.status === st).length;
  return `<div class="bar" style="margin:0 0 12px"><h3 style="margin:0">${esc(m.name)} <span style="color:var(--adm-sub);font-weight:500;font-size:13px">코드 ${esc(m.code)} · ${esc(m.email)} · ${esc(m.phone || '')} · Zalo ${esc(m.zalo || '-')}</span></h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="affDetailId=null;renderAff()">목록</button></div>
  <div class="kpi" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
    ${[['클릭 30일', total], ['리드 대기', cnt('pending')], ['승인', cnt('approved')], ['반려', cnt('rejected')], ['잔액', vndK(m.balance_vnd)]].map(([k, v]) => `<div class="card" style="margin:0;padding:14px"><div style="font-size:12px;color:var(--adm-sub)">${k}</div><div style="font-size:22px;font-weight:800">${v}</div></div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:16px">
    <div class="card" style="margin:0"><div class="card-head"><h3>일자별 링크 클릭 (30일)</h3></div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:110px;border-bottom:1px solid var(--adm-line)">${days.map(d => `<i title="${d.day}: ${d.clicks}" style="flex:1;background:var(--mk-primary);min-height:2px;height:${Math.round(d.clicks / max * 100)}%;border-radius:2px 2px 0 0"></i>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--adm-sub);margin-top:4px"><span>${days[0].day}</span><span>${days[days.length - 1].day}</span></div></div>
    <div class="card" style="margin:0"><div class="card-head"><h3>채널별</h3></div>
      ${ch.length ? `<table><tbody>${ch.map(([k, v]) => `<tr><td>${esc(AFF_CH_KO[k] || k)}</td><td style="text-align:right"><b>${v}</b> <span class="sub">(${Math.round(v / total * 100)}%)</span></td></tr>`).join('')}</tbody></table>` : '<p class="note" style="margin:0">클릭 없음</p>'}
      <div class="card-head" style="margin-top:14px"><h3>제품별</h3></div>
      ${m.clicks_by_product.length ? `<table><tbody>${m.clicks_by_product.map(p => `<tr><td>${esc(p.name)}</td><td style="text-align:right"><b>${p.clicks}</b></td></tr>`).join('')}</tbody></table>` : '<p class="note" style="margin:0">클릭 없음</p>'}</div>
  </div>
  <div class="card" style="margin:0"><div class="card-head"><h3>리드</h3></div>
    ${m.leads.length ? `<div class="tbl-wrap"><table><thead><tr><th>일시</th><th>제품</th><th>채널</th><th>상태</th><th>금액</th></tr></thead><tbody>${m.leads.map(l => `<tr><td>${esc(l.created_at)}</td><td>${esc(l.product_name)}</td><td>${esc(AFF_CH_KO[l.ch] || l.ch || '기타')}</td><td>${affBadge(l.status)}${l.reject_reason ? `<div class="sub" style="color:#D9534F">${esc(l.reject_reason)}</div>` : ''}</td><td>${vndK(l.amount_vnd)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note" style="margin:0">리드 없음</p>'}</div>
  <div class="bar" style="margin-top:14px"><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="affToggleM('${m.id}','${m.status === 'active' ? 'blocked' : 'active'}')">${m.status === 'active' ? '이 CTV 정지' : '정지 해제'}</button><button class="btn btn-ghost btn-sm" onclick="affMemo('${m.id}',${JSON.stringify(m.memo || '')})">메모</button></div>`;
}
async function affToggleM(id, status){
  if(status === 'blocked' && !confirm('이 CTV 를 정지합니다. 로그인이 막히고 링크로 리드가 생기지 않습니다.')) return;
  try{ await AffAdmin.setMarketer(id, { status }); toastA(status === 'blocked' ? '정지했습니다' : '해제했습니다'); renderAff(); }catch(e){ affFail(e); }
}
async function affMemo(id, cur){
  const v = prompt('관리자 메모 (CTV 에게는 안 보임)', cur || ''); if(v === null) return;
  try{ await AffAdmin.setMarketer(id, { memo:v }); toastA('메모 저장'); renderAff(); }catch(e){ affFail(e); }
}

async function affSettingsView(){
  const s = await AffAdmin.settings();
  return `<div class="fgrid two"><div class="fld"><label>최소 출금액 (VND)</label><input id="afs-min" type="number" step="10000" value="${s.minWithdraw}"></div><div class="fld"><label>링크 유효기간 (일) — 마지막 클릭 후 며칠까지 문의를 CTV 것으로 볼지</label><input id="afs-days" type="number" value="${s.cookieDays}"></div></div>
  <div class="fgrid two"><div class="fld"><label>CTV 지원 Zalo</label><input id="afs-zalo" value="${esc(s.zalo || '')}"></div><div class="fld"><label>CTV 지원 이메일</label><input id="afs-email" value="${esc(s.email || '')}"></div></div>
  <div class="bar"><button class="btn btn-primary btn-sm" onclick="affSaveSettings()">저장</button></div>`;
}
async function affSaveSettings(){
  try{ await AffAdmin.saveSettings({ minWithdraw:Number(av('afs-min')) || 0, cookieDays:Number(av('afs-days')) || 30, zalo:av('afs-zalo'), email:av('afs-email') }); toastA('설정을 저장했습니다'); }
  catch(e){ affFail(e); }
}

/* 관리자 부팅 뒤 카운트 채우기 — admin.js 의 boot 이 renderAll 을 부른 다음 */
document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { if(typeof Admin !== 'undefined' && Admin.isIn && Admin.isIn() && isSB()) affRefreshCounts(); }, 1500); });
