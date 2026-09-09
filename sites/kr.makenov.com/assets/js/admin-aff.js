/* ============================================================
   admin-aff.js — 관리자 '제휴' 탭 (베트남 마케터 CTV 프로그램)
   ------------------------------------------------------------
   서브탭: 캠페인 · 리드 · 출금 · 마케터 · 설정
   데이터는 AffAdmin 어댑터 하나로만 읽고 쓴다. 지금은 mock —
   affiliate/aff-mock.js 와 같은 localStorage 저장소(AffApi._load/_save)를
   공유한다. 백엔드가 붙으면 AffAdmin 의 메서드 안만 REST 호출로 바뀐다.
   설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
   ============================================================ */
const AffAdmin = {
  _S(){ return AffApi._load(); },
  _save(S){ AffApi._save(S); },
  async campaigns(){
    const S = this._S();
    return S.campaigns.map(c => {
      const ls = S.leads.filter(l => l.product_id === c.product_id);
      return Object.assign({}, c, { approved: ls.filter(l => l.status === 'approved').length, pending: ls.filter(l => l.status === 'pending').length });
    }).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  },
  /* 캠페인 없는 제품도 목록에 보여 켤 수 있게 — MK_PRODUCTS 와 합친다 */
  async products(){
    const cs = await this.campaigns();
    const list = (typeof MK_PRODUCTS !== 'undefined' ? MK_PRODUCTS : []).filter(p => p.published !== false);
    return list.map(p => {
      const c = cs.find(x => x.product_id === p.id);
      return { product_id:p.id, name:triText(p.name), brand:p.brand, cat:p.cat, img:p.img,
        campaign: c || { product_id:p.id, cpa_vnd:0, cap:null, headline:'', materials:[], copy_text:'', rules:'', featured:false, active:false, sort:99, approved:0, pending:0 } };
    });
  },
  async saveCampaign(pid, patch){
    const S = this._S();
    let c = S.campaigns.find(x => x.product_id === pid);
    const p = (typeof MK_PRODUCTS !== 'undefined' ? MK_PRODUCTS : []).find(x => x.id === pid);
    if(!c){
      c = { product_id:pid, name:p ? (p.name.vi || triText(p.name)) : pid, brand:p ? p.brand : '', cat:p ? p.cat : '', img:p ? p.img : '',
        cpa_vnd:0, cap:null, headline:'', materials:[], copy_text:'', rules:'', featured:false, active:false, sort:S.campaigns.length + 1 };
      S.campaigns.push(c);
    }
    Object.assign(c, patch); this._save(S); return c;
  },
  async leads(o){
    const S = this._S();
    let ls = S.leads.slice();
    if(o && o.status) ls = ls.filter(l => l.status === o.status);
    ls.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return ls.map(l => Object.assign({}, l, { marketer:S.marketers.find(m => m.id === l.marketer_id) || {}, product:S.campaigns.find(c => c.product_id === l.product_id) || {} }));
  },
  async decideLead(id, status, reason){
    const S = this._S(); const l = S.leads.find(x => x.id === id); if(!l) throw new Error('리드 없음');
    l.status = status; l.reject_reason = status === 'rejected' ? (reason || '') : null; l.decided_at = new Date().toISOString().slice(0, 16).replace('T', ' ');
    this._save(S); return l;
  },
  async withdrawals(){
    const S = this._S();
    return S.withdrawals.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(w => Object.assign({}, w, { marketer:S.marketers.find(m => m.id === w.marketer_id) || {} }));
  },
  async setWithdrawal(id, status, memo){
    const S = this._S(); const w = S.withdrawals.find(x => x.id === id); if(!w) throw new Error('출금 없음');
    w.status = status; if(memo !== undefined) w.memo = memo; if(status === 'paid') w.paid_at = new Date().toISOString().slice(0, 16).replace('T', ' ');
    this._save(S); return w;
  },
  async marketers(){
    const S = this._S();
    return S.marketers.map(m => {
      const ls = S.leads.filter(l => l.marketer_id === m.id);
      const ok = ls.filter(l => l.status === 'approved').reduce((a, l) => a + l.amount_vnd, 0);
      const out = S.withdrawals.filter(w => w.marketer_id === m.id && w.status !== 'rejected').reduce((a, w) => a + w.amount_vnd, 0);
      const o = Object.assign({}, m, { leads:ls.length, pending:ls.filter(l => l.status === 'pending').length, approved_vnd:ok, balance_vnd:ok - out }); delete o.password; return o;
    }).sort((a, b) => b.approved_vnd - a.approved_vnd);
  },
  async setMarketer(id, patch){ const S = this._S(); const m = S.marketers.find(x => x.id === id); if(!m) throw new Error('마케터 없음'); Object.assign(m, patch); this._save(S); return m; },
  async settings(){ return Object.assign({ minWithdraw:500000, cookieDays:30, zalo:'', email:'' }, this._S().settings || {}); },
  async saveSettings(patch){ const S = this._S(); S.settings = Object.assign(S.settings || {}, patch); this._save(S); return S.settings; },
};

/* ---------- 렌더 ---------- */
let affSub = 'campaigns', affLeadFilter = 'pending', affEditPid = null;
const AFF_ST_KO = { pending:'대기', approved:'승인', rejected:'반려', requested:'신청', paid:'지급완료', active:'정상', blocked:'정지' };
const vndK = n => (Math.round(Number(n) || 0)).toLocaleString('vi-VN') + ' ₫';
const affBadge = st => `<span class="pill ${st === 'approved' || st === 'paid' || st === 'active' ? 'ok' : st === 'rejected' || st === 'blocked' ? 'bad' : ''}" style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${st === 'approved' || st === 'paid' || st === 'active' ? '#EEFBF7' : st === 'rejected' || st === 'blocked' ? '#FDECEC' : '#F2F4F6'};color:${st === 'approved' || st === 'paid' || st === 'active' ? '#13A583' : st === 'rejected' || st === 'blocked' ? '#D9534F' : '#4E5968'}">${AFF_ST_KO[st] || st}</span>`;

function affPendingCount(){ try{ return AffApi._load().leads.filter(l => l.status === 'pending').length; }catch(e){ return 0; } }

async function renderAff(){
  const el = document.getElementById('tab-aff'); if(!el) return;
  if(typeof AffApi === 'undefined'){ el.innerHTML = `<div class="card"><p class="note">affiliate/aff-mock.js 가 로드되지 않았습니다.</p></div>`; return; }
  const S = AffApi._load();
  const nPend = S.leads.filter(l => l.status === 'pending').length, nWd = S.withdrawals.filter(w => w.status === 'requested').length;
  const subs = [['campaigns', '캠페인'], ['leads', `리드 ${nPend ? `<b>${nPend}</b>` : ''}`], ['withdrawals', `출금 ${nWd ? `<b>${nWd}</b>` : ''}`], ['marketers', '마케터'], ['settings', '설정']];
  let body = '';
  if(affSub === 'campaigns') body = await affCampaignsView();
  else if(affSub === 'leads') body = await affLeadsView();
  else if(affSub === 'withdrawals') body = await affWithdrawalsView();
  else if(affSub === 'marketers') body = await affMarketersView();
  else body = await affSettingsView();
  el.innerHTML = `<div class="card"><div class="bar" style="margin:0 0 14px"><div class="bchips">${subs.map(([k, t]) => `<button class="bchip${affSub === k ? ' on' : ''}" onclick="affSub='${k}';affEditPid=null;renderAff()">${t}</button>`).join('')}</div><span class="grow"></span><a class="btn btn-ghost btn-sm" href="../affiliate/" target="_blank">CTV 사이트 열기 ↗</a></div>${body}</div>`;
}

async function affCampaignsView(){
  const rows = await AffAdmin.products();
  if(affEditPid){ const r = rows.find(x => x.product_id === affEditPid); if(r) return affCampaignForm(r); }
  return `<p class="note">제품마다 CTV 캠페인을 켜고 리드 단가(VND)·상한을 정합니다. 켠 캠페인만 CTV 사이트에 보입니다. 단가·상한·추천은 표에서 바로 고치고 <b>저장</b>, 소재·문구·규정은 <b>수정</b>에서.</p>
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
  await AffAdmin.saveCampaign(pid, { active:ac('afc-on-' + pid), cpa_vnd:Number(av('afc-cpa-' + pid)) || 0, cap:cap === '' ? null : Number(cap), featured:ac('afc-feat-' + pid) });
  toastA('저장했습니다'); renderAff();
}
function affCampaignForm(r){
  const c = r.campaign;
  window._affMats = (c.materials || []).slice();
  return `<div class="bar" style="margin:0 0 12px"><h3 style="margin:0">캠페인 수정 — ${esc(r.name)}</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="affEditPid=null;renderAff()">목록</button><button class="btn btn-primary btn-sm" onclick="affSaveForm('${r.product_id}')">저장</button></div>
  <div class="fgrid two"><div class="fld"><label>노출 <input type="checkbox" id="afe-on" ${c.active ? 'checked' : ''} style="width:auto;margin-left:6px"> <span style="font-weight:400;color:var(--adm-sub);font-size:12px">추천</span> <input type="checkbox" id="afe-feat" ${c.featured ? 'checked' : ''} style="width:auto"></label></div><div class="fld"><label>정렬(작을수록 앞)</label><input id="afe-sort" type="number" value="${c.sort ?? 99}"></div></div>
  <div class="fgrid two"><div class="fld"><label>리드 단가 (VND)</label><input id="afe-cpa" type="number" step="10000" value="${c.cpa_vnd || ''}"></div><div class="fld"><label>리드 상한 (비우면 무제한)</label><input id="afe-cap" type="number" value="${c.cap ?? ''}"></div></div>
  <div class="fld"><label>헤드라인 (베트남어, 카드·상세 상단 한 줄)</label><input id="afe-head" value="${esc(c.headline || '')}" placeholder="Kem dưỡng gót chân bán chạy tại Hàn Quốc"></div>
  <div class="fld"><label>홍보 문구 (베트남어 — CTV가 복사해 쓰는 글)</label><textarea id="afe-copy" rows="4">${esc(c.copy_text || '')}</textarea></div>
  <div class="fld"><label>규정 (줄바꿈 = 항목)</label><textarea id="afe-rules" rows="4">${esc(c.rules || '')}</textarea></div>
  <div class="sect"><h4>홍보 소재 이미지 <span style="color:var(--adm-sub);font-size:11px;font-weight:500">CTV가 내려받아 쓰는 사진. 비우면 제품 대표 이미지만</span></h4><div class="gal-grid" id="afe-mats">${affMatsHtml()}</div>
  <div class="bar" style="margin:12px 0 0"><input id="afe-mat-url" placeholder="이미지 URL 붙여넣기 (업로드는 백엔드 연결 후)" style="flex:1"><button class="btn btn-ghost btn-sm" onclick="affAddMat()">+ 추가</button></div></div>`;
}
function affMatsHtml(){ return (window._affMats || []).map((u, i) => `<div class="gal-item" style="position:relative"><img src="${esc(u)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px"><button class="btn btn-ghost btn-sm" style="position:absolute;top:6px;right:6px" onclick="_affMats.splice(${i},1);document.getElementById('afe-mats').innerHTML=affMatsHtml()">✕</button></div>`).join('') || '<p class="hint" style="margin:0">아직 없음</p>'; }
function affAddMat(){ const u = av('afe-mat-url'); if(!u) return; window._affMats.push(u); document.getElementById('afe-mat-url').value = ''; document.getElementById('afe-mats').innerHTML = affMatsHtml(); }
async function affSaveForm(pid){
  const cap = av('afe-cap');
  await AffAdmin.saveCampaign(pid, { active:ac('afe-on'), featured:ac('afe-feat'), sort:Number(av('afe-sort')) || 99, cpa_vnd:Number(av('afe-cpa')) || 0, cap:cap === '' ? null : Number(cap),
    headline:av('afe-head'), copy_text:av('afe-copy'), rules:av('afe-rules'), materials:(window._affMats || []).slice() });
  toastA('캠페인을 저장했습니다'); affEditPid = null; renderAff();
}

async function affLeadsView(){
  const rows = await AffAdmin.leads({ status: affLeadFilter });
  const chips = [['pending', '대기'], ['approved', '승인'], ['rejected', '반려'], ['', '전체']];
  return `<div class="bchips" style="margin:0 0 12px">${chips.map(([k, t]) => `<button class="bchip${affLeadFilter === k ? ' on' : ''}" onclick="affLeadFilter='${k}';renderAff()">${t}</button>`).join('')}</div>
  <p class="note">CTV 링크로 들어온 유통사 문의입니다. <b>승인</b>하면 단가만큼 CTV 적립금이 올라가고, <b>반려</b>는 사유가 CTV 에게 보입니다. 자기 문의·중복·연락 불가는 반려하세요.</p>
  ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th style="width:120px">일시</th><th>마케터</th><th>제품</th><th>문의 내용</th><th style="width:100px">금액</th><th style="width:80px">상태</th><th style="width:130px"></th></tr></thead><tbody>
  ${rows.map(l => `<tr class="row-hover"><td>${esc(l.created_at)}</td><td><b>${esc(l.marketer.code || '')}</b><div class="sub">${esc(l.marketer.name || '')}</div></td><td>${esc(l.product.name || l.product_id)}</td><td style="max-width:320px;font-size:12px;color:var(--adm-sub)">${esc((l.message || '').slice(0, 120))}${l.reject_reason ? `<div style="color:#D9534F">반려: ${esc(l.reject_reason)}</div>` : ''}</td><td>${vndK(l.amount_vnd)}</td><td>${affBadge(l.status)}</td>
    <td>${l.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="affDecide('${l.id}','approved')">승인</button> <button class="btn btn-ghost btn-sm" onclick="affDecide('${l.id}','rejected')">반려</button>` : `<button class="btn btn-ghost btn-sm" onclick="affDecide('${l.id}','pending')">대기로</button>`}</td></tr>`).join('')}
  </tbody></table></div>` : `<p class="note" style="margin:0">해당 리드가 없습니다.</p>`}`;
}
async function affDecide(id, status){
  let reason = '';
  if(status === 'rejected'){ reason = prompt('반려 사유 (CTV 에게 베트남어로 보입니다)', 'Trùng với khách hàng đã có trong hệ thống'); if(reason === null) return; }
  await AffAdmin.decideLead(id, status, reason); toastA(status === 'approved' ? '승인했습니다' : status === 'rejected' ? '반려했습니다' : '대기로 되돌렸습니다'); renderAff(); if(typeof renderNav === 'function') renderNav();
}

async function affWithdrawalsView(){
  const rows = await AffAdmin.withdrawals();
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
  await AffAdmin.setWithdrawal(id, status, memo); toastA(status === 'paid' ? '지급완료 처리했습니다' : '반려했습니다'); renderAff();
}

async function affMarketersView(){
  const rows = await AffAdmin.marketers();
  return `<p class="note">가입한 CTV 목록입니다. 부정 홍보가 확인되면 <b>정지</b>하세요(로그인 차단, 링크는 리드 미생성).</p>
  <div class="tbl-wrap"><table><thead><tr><th>코드</th><th>이름</th><th>연락처</th><th>은행</th><th>리드(대기)</th><th>승인 금액</th><th>잔액</th><th>상태</th><th style="width:130px"></th></tr></thead><tbody>
  ${rows.map(m => `<tr class="row-hover"><td><b>${esc(m.code)}</b><div class="sub">${esc(m.created_at.slice(0, 10))}</div></td><td>${esc(m.name)}<div class="sub">${esc(m.email)}</div></td><td>${esc(m.phone || '')}<div class="sub">Zalo ${esc(m.zalo || '-')}</div></td><td>${esc(m.bank_name || '-')}<div class="sub">${esc(m.bank_account || '')} ${esc(m.bank_holder || '')}</div></td><td>${m.leads} (${m.pending})</td><td>${vndK(m.approved_vnd)}</td><td><b>${vndK(m.balance_vnd)}</b></td><td>${affBadge(m.status)}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="affToggleM('${m.id}','${m.status === 'active' ? 'blocked' : 'active'}')">${m.status === 'active' ? '정지' : '해제'}</button> <button class="btn btn-ghost btn-sm" onclick="affMemo('${m.id}')" title="${esc(m.memo || '')}">메모${m.memo ? '●' : ''}</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
async function affToggleM(id, status){ if(status === 'blocked' && !confirm('이 CTV 를 정지합니다. 로그인이 막히고 링크로 리드가 생기지 않습니다.')) return; await AffAdmin.setMarketer(id, { status }); toastA(status === 'blocked' ? '정지했습니다' : '해제했습니다'); renderAff(); }
async function affMemo(id){ const S = AffApi._load(); const m = S.marketers.find(x => x.id === id); const v = prompt('관리자 메모 (CTV 에게는 안 보임)', m.memo || ''); if(v === null) return; await AffAdmin.setMarketer(id, { memo:v }); toastA('메모 저장'); renderAff(); }

async function affSettingsView(){
  const s = await AffAdmin.settings();
  return `<div class="fgrid two"><div class="fld"><label>최소 출금액 (VND)</label><input id="afs-min" type="number" step="10000" value="${s.minWithdraw}"></div><div class="fld"><label>링크 유효기간 (일) — 마지막 클릭 후 며칠까지 문의를 CTV 것으로 볼지</label><input id="afs-days" type="number" value="${s.cookieDays}"></div></div>
  <div class="fgrid two"><div class="fld"><label>CTV 지원 Zalo</label><input id="afs-zalo" value="${esc(s.zalo || '')}"></div><div class="fld"><label>CTV 지원 이메일</label><input id="afs-email" value="${esc(s.email || '')}"></div></div>
  <div class="bar"><button class="btn btn-primary btn-sm" onclick="affSaveSettings()">저장</button><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="if(confirm('mock 데이터를 초기 시드로 되돌립니다 (백엔드 연결 전 테스트용)')){AffApi._reset();renderAff();}">mock 초기화</button></div>`;
}
async function affSaveSettings(){
  await AffAdmin.saveSettings({ minWithdraw:Number(av('afs-min')) || 0, cookieDays:Number(av('afs-days')) || 30, zalo:av('afs-zalo'), email:av('afs-email') });
  toastA('설정을 저장했습니다');
}
