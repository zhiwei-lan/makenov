/* ============================================================
   aff-api.js — 제휴(affiliate) 실제 API 어댑터  (aff-mock.js 와 같은 인터페이스)
   ------------------------------------------------------------
   서버: app/Controllers/Api/Aff.php  (/aff/v1/*)
   세션: localStorage 'aff_session' = { access_token, refresh_token, expires_at, me }
   401 이면 refresh 한 번 시도, 실패하면 세션을 지운다. 페이지 코드는 아무것도 모른다.
   ============================================================ */
(function(){
  const BASE = (typeof MK_SUPABASE_URL !== 'undefined' ? MK_SUPABASE_URL : 'https://makenov.com/').replace(/\/$/, '') + '/aff/v1/';
  const ANON = typeof MK_SUPABASE_ANON !== 'undefined' ? MK_SUPABASE_ANON : '';
  const SESS = 'aff_session';
  const sess = () => { try{ return JSON.parse(localStorage.getItem(SESS) || 'null'); }catch(e){ return null; } };
  const setSess = s => { if(s) localStorage.setItem(SESS, JSON.stringify(s)); else localStorage.removeItem(SESS); };

  async function raw(method, path, body, token){
    const h = { apikey: ANON, Accept: 'application/json' };
    if(body !== undefined) h['Content-Type'] = 'application/json';
    if(token) h.Authorization = 'Bearer ' + token;
    const r = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    let data = null; try{ data = await r.json(); }catch(e){}
    return { ok: r.ok, status: r.status, data };
  }
  async function call(method, path, body, auth){
    let s = sess();
    let res = await raw(method, path, body, auth ? (s && s.access_token) : null);
    if(auth && res.status === 401 && s && s.refresh_token){
      const rf = await raw('POST', 'token', { refresh_token: s.refresh_token });
      if(rf.ok && rf.data && rf.data.access_token){ setSess(rf.data); res = await raw(method, path, body, rf.data.access_token); }
      else setSess(null);
    }
    if(!res.ok){
      const msg = (res.data && res.data.message) || (res.status === 401 ? 'Vui lòng đăng nhập' : 'Có lỗi xảy ra (' + res.status + ')');
      if(res.status === 401) setSess(null);
      throw new Error(msg);
    }
    return res.data;
  }
  const q = o => { const p = Object.entries(o || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => k + '=' + encodeURIComponent(v)); return p.length ? '?' + p.join('&') : ''; };

  window.AffApi = {
    session(){ const s = sess(); return s && s.me ? s.me : null; },
    campaigns: o => call('GET', 'campaigns' + q(o)),
    campaign: pid => call('GET', 'campaigns/' + encodeURIComponent(pid)),
    rankings: () => call('GET', 'rankings', undefined, !!sess()),
    settings: () => call('GET', 'settings'),
    async signup(o){ const s = await call('POST', 'signup', o); setSess(s); return s.me; },
    async login(email, password){ const s = await call('POST', 'login', { email, password }); setSess(s); return s.me; },
    async logout(){ try{ await call('POST', 'logout', {}, true); }catch(e){} setSess(null); return true; },
    async me(){ const me = await call('GET', 'me', undefined, true); const s = sess(); if(s){ s.me = me; setSess(s); } return me; },
    async updateMe(patch){ const me = await call('PATCH', 'me', patch, true); const s = sess(); if(s){ s.me = me; setSess(s); } return me; },
    changePassword: (oldPw, newPw) => call('POST', 'me/password', { old: oldPw, new: newPw }, true),
    summary: () => call('GET', 'me/summary', undefined, true),
    leads: o => call('GET', 'me/leads' + q(o), undefined, true),
    async clicks(days){ const r = await call('GET', 'me/clicks' + q({ days }), undefined, true); return r.days || []; },
    async clicksFull(days){ return call('GET', 'me/clicks' + q({ days }), undefined, true); },
    withdrawals: () => call('GET', 'me/withdrawals', undefined, true),
    requestWithdrawal: amount => call('POST', 'me/withdrawals', { amount }, true),
    _reset(){ setSess(null); },
  };
})();
