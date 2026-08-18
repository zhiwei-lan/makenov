/* ============================================================
   MAKENOV — Supabase 백엔드
   config.js 에 URL/키가 채워져 있을 때만 동작하며, store.js(localStorage)의
   Store / Admin / MkImg 를 같은 인터페이스로 덮어씁니다.

   설계 원칙: 렌더 코드는 동기(MK_PRODUCTS 전역 배열)로 짜여 있으므로
   부팅 시 콘텐츠를 한 번에 받아 전역 배열을 채운 뒤 렌더한다.
   쓰기(문의·관심제품·관리자 CRUD)만 async 로 바뀐다.
   ============================================================ */
if (typeof MK_BACKEND !== 'undefined' && MK_BACKEND === 'supabase') {

const SB = supabase.createClient(MK_SUPABASE_URL, MK_SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});
window.SB = SB;

/* ---------- 부팅: 세션 + 콘텐츠 로드 ---------- */
const MkData = {
  session: null,
  profile: null,
  admin: false,
  termsLoaded: false,   // 인증 유통 파트너일 때만 true

  async boot(){
    const { data:{ session } } = await SB.auth.getSession();
    this.session = session;

    if(session){
      const [{ data:prof }, { data:adm }] = await Promise.all([
        SB.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
        SB.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle(),
      ]);
      this.profile = prof || null;
      this.admin   = !!adm;
      /* 다음 페이지의 첫 헤더 렌더가 쓸 힌트 (sessionHint 참고) */
      try{ localStorage.setItem('mk_ui_auth', JSON.stringify({
        email: session.user.email, name: (prof && prof.contact_name) || '' })); }catch(e){}
    }else{
      try{ localStorage.removeItem('mk_ui_auth'); }catch(e){}
    }
    await this.loadContent();
  },

  /* 공개 콘텐츠를 전역 배열에 그대로 채운다 (기존 렌더 코드가 그대로 동작하도록) */
  async loadContent(){
    const [co, pr, cl, he] = await Promise.all([
      SB.from('companies').select('*').order('sort'),
      SB.from('products').select('*').eq('published', true).order('created_at', {ascending:false}),
      SB.from('columns_post').select('*').eq('published', true).order('date', {ascending:false}),
      SB.from('hero_slides').select('*').eq('active', true).order('sort'),
    ]);
    if(co.error || pr.error) { console.error('MAKENOV 콘텐츠 로드 실패', co.error || pr.error); return; }

    /* ★ 거래 조건은 별도 테이블. RLS 때문에 인증 유통 파트너가 아니면 0건이 돌아온다.
       즉 미인증 사용자에게는 가격이 애초에 전송되지 않는다. */
    const tm = await SB.from('product_terms').select('*');
    const terms = {};
    (tm.data || []).forEach(t => terms[t.product_id] = t);
    this.termsLoaded = (tm.data || []).length > 0;

    /* 표식만 넣는다 — 화면 문구는 lockVal()이 언어에 맞춰 만든다 (i18n.js) */
    const LOCKED = MK_LOCKED;

    MK_COMPANIES.length = 0;
    (co.data||[]).forEach(c => MK_COMPANIES.push({
      id:c.id, brand:c.brand, cat:c.cat, name:c.name, tagline:c.tagline, intro:c.intro,
      location:c.location, since:c.since, staff:c.staff, export:c.export, brn:c.brn,
      ceo:c.ceo, tel:c.tel, site:c.site, certs:c.certs||[], moqPolicy:c.moq_policy,
      logo:c.logo, cover:c.cover,
    }));

    MK_PRODUCTS.length = 0;
    (pr.data||[]).forEach(p => {
      const t = terms[p.id] || {};
      MK_PRODUCTS.push({
        id:p.id, companyId:p.company_id, cat:p.cat, brand:p.brand, origin:p.origin,
        name:p.name, tagline:p.tagline, brandStory:p.brand_story,
        img:p.img, gallery:p.gallery||[], video:p.video||'', detail:p.detail||[],
        inquiries:p.inquiries||0, views:p.views||0, wish:p.wish_count||0,
        featured:!!p.featured, isNew:!!p.is_new, createdAt:String(p.created_at||'').slice(0,10),
        negotiable:!!p.negotiable,
        price:t.price ?? LOCKED, moq:t.moq ?? LOCKED, lead:t.lead ?? LOCKED, terms:t.terms ?? LOCKED,
      });
    });

    MK_COLUMNS.length = 0;
    (cl.data||[]).forEach(c => MK_COLUMNS.push({
      id:c.id, cat:c.cat, title:c.title, excerpt:c.excerpt, body:c.body,
      img:c.img, date:String(c.date||'').slice(0,10),
      slug:c.slug||'', seoTitle:c.seo_title||'', seoDesc:c.seo_desc||'',
    }));

    /* FAQ — 06_faq_seo.sql 미적용이면 테이블이 없으므로 시드(data.js)를 그대로 둔다 */
    try{
      const fq = await SB.from('faqs').select('*').order('sort');
      /* 빈 테이블이면 시드 유지. 공지와 같은 이유(CI4 이관 누락) */
      if(!fq.error && fq.data && fq.data.length && typeof MK_FAQ !== 'undefined'){
        MK_FAQ.length = 0;
        fq.data.forEach(f => MK_FAQ.push({
          id:f.id, page:f.page||'home', q:f.q, a:f.a,
          sort:f.sort||0, published:!!f.published,
        }));
      }
    }catch(e){}

    /* 공지사항. 테이블이 없거나(에러) 비어 있으면 시드(data.js)를 그대로 둔다.
       CI4 이관 때 행이 안 넘어와 빈 테이블이 조회에 성공하면서,
       먼저 그려진 시드 공지를 지워 공지가 깜빨이다 사라졌다(2026-08-17). */
    try{
      const nt = await SB.from('notices').select('*').eq('published', true).order('date',{ascending:false});
      if(!nt.error && nt.data && nt.data.length && typeof MK_NOTICES !== 'undefined'){
        MK_NOTICES.length = 0;
        nt.data.forEach(n => MK_NOTICES.push({
          id:n.id, title:n.title, body:n.body,
          date:String(n.date||'').slice(0,10), published:!!n.published,
          cat:n.cat||'notice', pinned:!!n.pinned,
        }));
      }
    }catch(e){}

    /* 사이트 설정 — 07_settings.sql 미적용이면 시드(data.js) 값을 그대로 쓴다 */
    try{
      const st = await SB.from('settings').select('*').eq('key', 'site').maybeSingle();
      if(!st.error && st.data && st.data.value && typeof MK_SETTINGS !== 'undefined'){
        Object.assign(MK_SETTINGS, st.data.value);
      }
    }catch(e){}

    if(he.data && he.data.length){
      MK_HERO.length = 0;
      he.data.forEach(h => MK_HERO.push({
        art:h.art, link:h.link, kicker:h.kicker, title:h.title, sub:h.sub,
      }));
    }

    /* SEO 설정 — 관리자 > SEO 탭에서 고친 값.
       화면에는 영향이 없고, `node build.js` 가 이 값을 읽어 각 페이지 head 에 심는다.
       관리자 화면에서 지금 값을 보여줘야 하므로 여기서 함께 받아 둔다. */
    try{
      const se = await SB.from('settings').select('*').eq('key', 'seo').maybeSingle();
      if(!se.error && se.data && se.data.value) window.MK_SEO = se.data.value;
    }catch(e){}

    /* 관리자에서 고친 문구 — 원본 객체(I18N·AB·MKC·MK_MAKER·MK_HERO·MK_SETTINGS)에 덮어쓴다.
       ⚠ 반드시 맨 마지막이어야 한다. 앞서 채운 값 위에 덮어야 오버라이드가 이긴다.
          예전엔 히어로보다 먼저 적용해서, 히어로 문구를 고쳐도 곧바로 DB 값에 덮여 사라졌다. */
    try{
      const cp = await SB.from('settings').select('*').eq('key', 'copy').maybeSingle();
      if(!cp.error && cp.data && cp.data.value){
        window.MK_COPY_OVERRIDE = cp.data.value;
        if(typeof mkApplyCopy === 'function') mkApplyCopy(cp.data.value);
      }
    }catch(e){}
  },
};
window.MkData = MkData;

/* ---------- Store 치환 ---------- */
const _cartMem = { list:null };

Object.assign(Store, {
  /* ---------- 첫 렌더용 세션 힌트 (동기) ----------
     boot()가 끝나기 전에 헤더를 그리면 비로그인으로 보였다가 로그인으로 바뀌어
     페이지를 옮길 때마다 깜빡였다. Supabase가 localStorage에 저장한 토큰을
     동기로 읽어 "아마 로그인 상태"를 먼저 그리고, boot 후 실제 상태로 확정한다. */
  sessionHint(){
    if(MkData.session) return this.session();
    try{
      const ref = (MK_SUPABASE_URL.match(/\/\/([^.]+)\./) || [])[1];
      const raw = localStorage.getItem('sb-' + ref + '-auth-token');
      if(!raw) return null;
      const tok = JSON.parse(raw);
      if(!tok || !tok.user || (tok.expires_at && tok.expires_at * 1000 < Date.now() - 60000)) return null;
      let ui = {}; try{ ui = JSON.parse(localStorage.getItem('mk_ui_auth')||'{}'); }catch(e){}
      return { email: tok.user.email, contactName: ui.name || '', _hint: true };
    }catch(e){ return null; }
  },

  session(){
    if(!MkData.session) return null;
    const p = MkData.profile || {};
    /* ⚠️ 화면(마이페이지)이 읽는 필드는 여기서 전부 넘겨야 한다.
       phone·regNo·countryName 이 빠져 있어 프로필 화면이 빈칸으로 보였다. */
    return {
      email: MkData.session.user.email,
      company: p.company, address: p.address,
      mst: p.reg_no, regNo: p.reg_no,
      country: p.country,
      countryName: p.country && typeof mkCountry === 'function' ? L(mkCountry(p.country).name) : '',
      status: p.status, verifiedBy: p.verified_by,
      contactName: p.contact_name, position: p.position,
      phone: p.phone, zalo: p.messenger, messengerId: p.messenger,
      tier: p.tier, createdAt: p.created_at, isAdmin: MkData.admin,
    };
  },

  async signup(user){
    const { data, error } = await SB.auth.signUp({
      email: user.email, password: user.password,
    });
    if(error) return { ok:false, err: error.message };
    if(!data.user) return { ok:false, err:'signup_failed' };

    /* 이메일 확인이 켜져 있으면 세션이 없다. 그 경우 로그인 후 프로필이 채워진다. */
    /* DB 컬럼과 1:1 대응 — 여기에 컬럼이 아닌 값을 섞으면 update 가 통째로 실패한다 */
    const patch = {
      country:user.country, company:user.company, address:user.address,
      reg_no:user.mst, verified_by:user.verifiedBy, verify_note:user.status,
      status:'verified', contact_name:user.contactName, position:user.position,
      phone:user.phone,
    };
    if(data.session){
      /* ★ 인증 상태는 서버(Edge Function)가 확정한다.
         클라이언트가 직접 status='verified' 를 쓰면 누구나 자가 승격이 가능하다.
         함수가 아직 배포 전이면 예전 방식으로 되돌아간다(03_lockdown.sql 적용 전까지만 동작). */
      const srv = await this._serverVerify(user.verifyPayload);
      if(!srv.ok){
        console.warn('서버 인증 기록 실패 — 클라이언트 기록으로 대체합니다:', srv.why);
        await SB.from('profiles').update(patch).eq('id', data.user.id);
      }else{
        /* 서버가 못 채우는 담당자 정보만 클라이언트가 채운다 (권한과 무관한 필드) */
        await SB.from('profiles').update({
          contact_name:user.contactName, position:user.position, phone:user.phone,
        }).eq('id', data.user.id);
      }
      await MkData.boot();
      return { ok:true, session:this.session() };
    }
    /* ★ 이메일 확인이 켜져 있으면 여기서 세션이 없다.
       그러면 프로필이 pending 으로 남고, RLS 때문에 문의 등록이 막힌다.
       인증 결과를 보관해 두었다가 첫 로그인 때 반영한다. */
    try{
      localStorage.setItem('mk_pending_profile',
        JSON.stringify({ ...patch, verifyPayload:user.verifyPayload }));
    }catch(e){}
    return { ok:true, needConfirm:true, pending:patch };
  },

  /* 사업자 인증을 서버에서 다시 검증하고, 통과하면 서버 권한으로 프로필을 확정한다.
     JWT 를 실어 보내야 함수가 '누구를 인증할지' 알 수 있다. */
  async _serverVerify(payload){
    if(!payload) return { ok:false, why:'no_payload' };
    const { data:{ session } } = await SB.auth.getSession();
    if(!session) return { ok:false, why:'no_session' };
    try{
      const r = await fetch(MK_SUPABASE_URL.replace(/\/$/,'') + '/functions/v1/verify-business', {
        method:'POST',
        headers:{ 'Content-Type':'application/json',
                  'apikey': MK_SUPABASE_ANON,
                  'Authorization':'Bearer ' + session.access_token },
        body: JSON.stringify(payload),
      });
      if(!r.ok) return { ok:false, why:'fn_http_'+r.status };
      const j = await r.json();
      if(!j.ok) return { ok:false, why:'verify_'+(j.err||'failed') };
      if(!j.profileWritten) return { ok:false, why: j.profileError || 'not_written' };
      return { ok:true };
    }catch(e){ return { ok:false, why:'fn_unreachable' }; }
  },

  /* 보관해 둔 인증 결과를 프로필에 반영 (아직 pending 인 경우에만) */
  async _flushPendingProfile(){
    if(!MkData.session) return;
    if(MkData.profile && MkData.profile.status === 'verified') return;
    let saved = null;
    try{ saved = JSON.parse(localStorage.getItem('mk_pending_profile') || 'null'); }catch(e){}
    if(!saved) return;

    const srv = await this._serverVerify(saved.verifyPayload);
    if(srv.ok){
      await SB.from('profiles').update({
        contact_name:saved.contact_name, position:saved.position, phone:saved.phone,
      }).eq('id', MkData.session.user.id);
      localStorage.removeItem('mk_pending_profile');
      await MkData.boot();
      return;
    }
    /* 함수 미배포 상태에서는 예전 경로로 (lockdown 적용 후엔 트리거가 막는다) */
    console.warn('서버 인증 기록 실패 — 클라이언트 기록으로 대체합니다:', srv.why);
    const { verifyPayload, ...patch } = saved;
    const { error } = await SB.from('profiles').update(patch).eq('id', MkData.session.user.id);
    if(!error){
      localStorage.removeItem('mk_pending_profile');
      await MkData.boot();
    }
  },

  async login(email, password){
    const { error } = await SB.auth.signInWithPassword({ email, password });
    if(error){
      /* ★ 예전엔 전부 'invalid' 로 뭉뚱그려 "비밀번호가 틀렸다"고만 떴다.
         실제로는 '이메일 미확인'이 가장 흔한 원인이라 사용자가 원인을 못 찾는다. */
      const m = String(error.message || '');
      const ec = String(error.code || '');
      let code = 'invalid';
      if(/email not confirmed|not confirmed/i.test(m)) code = 'unconfirmed';
      else if(/rate limit|too many/i.test(m))          code = 'rate';
      else if(ec === 'email_provider_disabled' || /logins are disabled|provider.*disabled/i.test(m)) code = 'provider_off';
      console.warn('로그인 실패:', m);
      return { ok:false, err:code, raw:m };
    }
    await MkData.boot();
    await this._flushPendingProfile();
    return { ok:true, session:this.session() };
  },

  /* 확인 메일 재발송 */
  async resendConfirm(email){
    const { error } = await SB.auth.resend({ type:'signup', email });
    return error ? { ok:false, err:error.message } : { ok:true };
  },

  async logout(){
    await SB.auth.signOut();
    MkData.session = null; MkData.profile = null;
    try{ localStorage.removeItem('mk_ui_auth'); }catch(e){}   // 힌트도 지워야 다음 렌더가 로그인으로 안 보인다
  },

  /* ---- 관심제품 ---- */
  cart(){ return _cartMem.list || []; },
  cartHas(pid){ return this.cart().includes(pid); },
  async loadCart(){
    if(!MkData.session){ _cartMem.list = []; return []; }
    const { data } = await SB.from('wishlist').select('product_id').eq('buyer_id', MkData.session.user.id);
    _cartMem.list = (data||[]).map(r=>r.product_id);
    return _cartMem.list;
  },
  cartToggle(pid){
    if(!MkData.session) return false;
    const uid = MkData.session.user.id;
    const had = this.cartHas(pid);
    /* 화면은 즉시 바꾸되(낙관적), DB가 거부하면 되돌리고 알린다.
       ⚠️ 예전엔 결과를 버려서 RLS가 막아도 담긴 것처럼 보였다가 새로고침하면 사라졌다. */
    _cartMem.list = had ? _cartMem.list.filter(x=>x!==pid) : [..._cartMem.list, pid];
    const q = had
      ? SB.from('wishlist').delete().eq('buyer_id',uid).eq('product_id',pid)
      : SB.from('wishlist').insert({ buyer_id:uid, product_id:pid });
    q.then(({error})=>{
      if(!error) return;
      _cartMem.list = had ? [..._cartMem.list, pid] : _cartMem.list.filter(x=>x!==pid);
      console.error('관심제품 저장 실패:', error.message);
      if(typeof toast==='function') toast(/security|permission/i.test(error.message) ? t('inq_err_verify') : t('inq_err'));
      if(typeof updateCartBadge==='function') updateCartBadge();
      document.dispatchEvent(new CustomEvent('mk:cart'));
    });
    return !had;
  },
  cartRemove(pid){ if(this.cartHas(pid)) this.cartToggle(pid); },
  async cartClear(){
    if(!MkData.session) return;
    await SB.from('wishlist').delete().eq('buyer_id', MkData.session.user.id);
    _cartMem.list = [];
  },

  /* ---- 문의 ---- */
  /* 기업 재인증 — 인증 결과(회사명·번호·주소)를 프로필에 다시 쓴다.
     인증 상태 확정은 signup 과 같은 서버 함수를 먼저 거치고, 실패 시 직접 기록으로 폴백. */
  async reverify(v){
    if(!MkData.session) return { ok:false, err:'auth' };
    const payload = { method: mkCountry(v.country).method, country: v.country,
                      regNo: v.regNo, company: v.company,
                      email: v.accountEmail || MkData.session.user.email };
    const patch = { country:v.country, company:v.company, address:v.address,
                    reg_no:v.regNo, verified_by:v.checked, verify_note:v.status, status:'verified' };
    const srv = await this._serverVerify(payload);
    if(!srv.ok){
      const { error } = await SB.from('profiles').update(patch).eq('id', MkData.session.user.id);
      if(error) return { ok:false, err:error.message };
    }
    Object.assign(MkData.profile, patch);
    return { ok:true };
  },

  /* 담당자 정보 수정 — 회사·사업자번호·인증 상태는 못 바꾼다(인증으로 확정된 값) */
  async updateProfile(patch){
    if(!MkData.session) return { ok:false, err:'auth' };
    const row = {};
    if(patch.contactName !== undefined) row.contact_name = patch.contactName;
    if(patch.position    !== undefined) row.position     = patch.position;
    if(patch.phone       !== undefined) row.phone        = patch.phone;
    if(patch.messenger   !== undefined) row.messenger    = patch.messenger;
    const { error } = await SB.from('profiles').update(row).eq('id', MkData.session.user.id);
    if(error) return { ok:false, err:error.message };
    Object.assign(MkData.profile, row);     // 화면이 바로 갱신되게 캐시도 맞춰둔다
    return { ok:true };
  },

  async addInquiry(pid, message){
    if(!MkData.session) return { ok:false, err:'auth' };
    const { error } = await SB.from('inquiries').insert({
      product_id:pid, buyer_id:MkData.session.user.id, message,
    });
    if(error) return { ok:false, err:error.message };
    return { ok:true };
  },
  async myInquiries(){
    if(!MkData.session) return [];
    const { data } = await SB.from('inquiries').select('*')
      .eq('buyer_id', MkData.session.user.id).order('created_at',{ascending:false});
    return (data||[]).map(i=>({ id:i.id, pid:i.product_id, message:i.message,
      createdAt:i.created_at, status:i.status }));
  },
  /* ⚠ profiles 를 임베드(select('*, profiles(...)'))하면 안 된다.
     inquiries.buyer_id 는 auth.users 를 참조하고 profiles 와는 외래키가 없어서
     PostgREST 가 관계를 찾지 못하고 에러를 낸다. 그 에러를 삼키는 바람에
     관리자 문의함이 DB에 문의가 있어도 계속 0건으로 보였다.
     두 번 나눠 읽고 자바스크립트에서 붙인다. */
  async allInquiries(){
    const { data, error } = await SB.from('inquiries').select('*')
      .order('created_at',{ascending:false});
    if(error){ console.warn('문의 로드 실패:', error.message); return []; }
    const rows = data || [];

    const ids = [...new Set(rows.map(i=>i.buyer_id).filter(Boolean))];
    const prof = {};
    if(ids.length){
      const { data:ps } = await SB.from('profiles').select('*').in('id', ids);
      (ps||[]).forEach(p=>{ prof[p.id] = p; });
    }
    return rows.map(i=>{
      const p = prof[i.buyer_id] || {};
      return {
        id:i.id, pid:i.product_id, message:i.message, createdAt:i.created_at,
        status:i.status, memo:i.memo,
        buyerId:i.buyer_id, buyerEmail:p.email, company:p.company, mst:p.reg_no,
        contactName:p.contact_name, position:p.position, zalo:p.messenger,
        phone:p.phone, address:p.address, country:p.country,
        verifiedBy:p.verified_by, tier:p.tier,
      };
    });
  },
  async allBuyers(){
    const { data } = await SB.from('profiles').select('*').order('created_at',{ascending:false});
    return (data||[]).map(p=>({
      email:p.email, company:p.company, mst:p.reg_no, regNo:p.reg_no,
      country:p.country, address:p.address, phone:p.phone,
      contactName:p.contact_name, position:p.position, zalo:p.messenger, messenger:p.messenger,
      verifiedBy:p.verified_by, status:p.verify_note, tier:p.tier, createdAt:p.created_at, _id:p.id,
    }));
  },

  /* ---- 공급사 입점 문의 ---- */
  async addMakerLead(lead){
    const { error } = await SB.from('maker_leads').insert(lead);
    return error ? { ok:false, err:error.message } : { ok:true };
  },
  async allMakerLeads(){
    const { data } = await SB.from('maker_leads').select('*').order('created_at',{ascending:false});
    return (data||[]).map(l=>({ ...l, createdAt:l.created_at }));
  },
});

/* ---------- Admin 치환 ---------- */
Object.assign(Admin, {
  isIn(){ return MkData.admin; },
  async login(pw){ return false; },            // 관리자도 일반 로그인 → admins 테이블로 판별
  logout(){ return Store.logout(); },
  changePassword(){ return false; },

  async upsertProduct(p){
    const row = {
      id:p.id, company_id:p.companyId||null, cat:p.cat, brand:p.brand, origin:p.origin,
      name:p.name, tagline:p.tagline, brand_story:p.brandStory,
      img:p.img, gallery:p.gallery, video:p.video, detail:p.detail,
      featured:p.featured, is_new:p.isNew, created_at:p.createdAt,
      inquiries:p.inquiries, views:p.views, negotiable:!!p.negotiable,
    };
    const { error } = await SB.from('products').upsert(row);
    if(error) throw error;

    /* 거래조건이 '잠김' 표식이면 이 계정이 product_terms를 못 읽은 상태다.
       그대로 올리면 실제 가격이 표식으로 덮여 사라진다 — 저장하지 않고 넘어간다.
       다국어 객체는 세 언어가 모두 비어 있으면 잠김과 같은 취급. */
    const termEmpty = v => isLocked(v) || (typeof v==='object' && !String((v.ko||'')+(v.vi||'')+(v.en||'')).trim());
    if(termEmpty(p.price) && termEmpty(p.moq) && termEmpty(p.lead) && termEmpty(p.terms)){
      console.warn('MAKENOV: 거래조건을 읽지 못해 product_terms 저장을 건너뜁니다', p.id);
    }else{
      const { error:e2 } = await SB.from('product_terms').upsert({
        product_id:p.id, price:p.price, moq:p.moq, lead:p.lead, terms:p.terms, updated_at:new Date().toISOString(),
      });
      if(e2) throw e2;
    }
    await MkData.loadContent();
  },
  async deleteProduct(id){
    const { error } = await SB.from('products').delete().eq('id', id);
    if(error) throw error;
    await MkData.loadContent();
  },
  newProductId(){
    let n = 1; const ids = new Set(MK_PRODUCTS.map(p=>p.id));
    while(ids.has('p'+n)) n++;
    return 'p'+n;
  },

  async upsertColumn(c){
    const row = {
      id:c.id, cat:c.cat, title:c.title, excerpt:c.excerpt, body:c.body, img:c.img, date:c.date,
      slug:c.slug||null, seo_title:c.seoTitle||null, seo_desc:c.seoDesc||null,
    };
    let { error } = await SB.from('columns_post').upsert(row);
    if(error && /slug|seo_title|seo_desc/.test(String(error.message||''))){
      /* 06_faq_seo.sql 미적용 DB — SEO 필드를 빼고 본문만이라도 저장한다 */
      delete row.slug; delete row.seo_title; delete row.seo_desc;
      ({ error } = await SB.from('columns_post').upsert(row));
    }
    if(error) throw error;
    await MkData.loadContent();
  },

  /* ---- 공지사항 CRUD ---- */
  async upsertNotice(n){
    const { error } = await SB.from('notices').upsert({
      id:n.id, title:n.title, body:n.body, date:n.date, published:n.published!==false,
      cat:n.cat||'notice', pinned:!!n.pinned,
    });
    if(error) throw error;
    await MkData.loadContent();
  },
  async deleteNotice(id){
    await SB.from('notices').delete().eq('id', id);
    await MkData.loadContent();
  },
  newNoticeId(){
    let i = 1; const ids = new Set((typeof MK_NOTICES!=='undefined'?MK_NOTICES:[]).map(n=>n.id));
    while(ids.has('n'+i)) i++;
    return 'n'+i;
  },

  /* ---- 사이트 설정 ---- */
  async saveSettings(patch){
    Object.assign(MK_SETTINGS, patch);
    const { error } = await SB.from('settings').upsert({
      key:'site', value:MK_SETTINGS, updated_at:new Date().toISOString(),
    });
    /* 테이블이 아직 없으면(07_settings.sql 미적용) 브라우저에만 저장해 두고 알린다 */
    if(error){
      localStorage.setItem('mk_settings_override', JSON.stringify(MK_SETTINGS));
      throw new Error('settings 테이블이 없습니다 — supabase/07_settings.sql 을 실행하세요 (' + error.message + ')');
    }
    await MkData.loadContent();
  },

  /* ---- 카피 오버라이드 ----
     바꾼 문구만 settings 의 key='copy' 한 줄에 모은다. 원본 파일은 건드리지 않는다. */
  async saveCopy(map){
    window.MK_COPY_OVERRIDE = map;
    const { error } = await SB.from('settings').upsert({
      key:'copy', value:map, updated_at:new Date().toISOString(),
    });
    if(error) throw new Error('카피 저장 실패: ' + error.message);
    if(typeof mkApplyCopy === 'function') mkApplyCopy(map);
  },

  /* ---- SEO 설정 ----
     settings 의 key='seo' 한 줄. bake.js 가 굽는 시점에 읽어 head 에 심는다.
     ⚠ 저장만으로는 검색엔진이 보는 HTML 이 바뀌지 않는다. 굽기를 한 번 돌려야 한다. */
  async saveSeo(map){
    window.MK_SEO = map;
    const { error } = await SB.from('settings').upsert({
      key:'seo', value:map, updated_at:new Date().toISOString(),
    });
    if(error) throw new Error('SEO 저장 실패: ' + error.message);
  },

  /* ---- FAQ CRUD ---- */
  async upsertFaq(f){
    const { error } = await SB.from('faqs').upsert({
      id:f.id, page:f.page||'home', q:f.q, a:f.a, sort:f.sort||0, published:f.published!==false,
    });
    if(error) throw error;
    await MkData.loadContent();
  },
  async deleteFaq(id){
    await SB.from('faqs').delete().eq('id', id);
    await MkData.loadContent();
  },
  newFaqId(){
    let n = 1; const ids = new Set((typeof MK_FAQ!=='undefined'?MK_FAQ:[]).map(f=>f.id));
    while(ids.has('f'+n)) n++;
    return 'f'+n;
  },
  async deleteColumn(id){
    await SB.from('columns_post').delete().eq('id', id);
    await MkData.loadContent();
  },
  newColumnId(){
    let n = 1; const ids = new Set(MK_COLUMNS.map(c=>c.id));
    while(ids.has('c'+n)) n++;
    return 'c'+n;
  },

  /* 문의 상태·메모는 DB 컬럼으로 */
  _inqCache: {},
  inqMeta(id){ const i = this._inqCache[id]; return { status:i?.status||'new', memo:i?.memo||'' }; },
  primeInq(list){ list.forEach(i=>this._inqCache[i.id] = { status:i.status, memo:i.memo }); },
  async setInqMeta(id, patch){
    this._inqCache[id] = { ...(this._inqCache[id]||{status:'new',memo:''}), ...patch };
    await SB.from('inquiries').update(patch).eq('id', id);
  },
  async deleteInquiry(id){ await SB.from('inquiries').delete().eq('id', id); },

  _leadCache: {},
  leadMeta(id){ const l = this._leadCache[id]; return { status:l?.status||'new', memo:l?.memo||'' }; },
  primeLeads(list){ list.forEach(l=>this._leadCache[l.id] = { status:l.status, memo:l.memo }); },
  async setLeadMeta(id, patch){
    this._leadCache[id] = { ...(this._leadCache[id]||{status:'new',memo:''}), ...patch };
    await SB.from('maker_leads').update(patch).eq('id', id);
  },
  async deleteLead(id){ await SB.from('maker_leads').delete().eq('id', id); },

  _tierCache: {},
  tier(email){ return this._tierCache[email] || 'verified'; },
  primeTiers(list){ list.forEach(b=>this._tierCache[b.email] = b.tier || 'verified'); },
  async setTier(email, tier){
    this._tierCache[email] = tier;
    await SB.from('profiles').update({ tier }).eq('email', email);
  },

  resetContent(){ /* Supabase 모드에서는 SQL로 처리 */ },
});

/* ---------- 이미지: IndexedDB → Supabase Storage ---------- */
const BUCKET = 'product-images';
Object.assign(MkImg, {
  /* dataUrl → Storage 업로드 → 공개 URL 반환.
     ★ 상세페이지 분할(saveDetail/sliceTall)도 이 함수를 거치므로
       이것만 갈아끼우면 조각들도 IndexedDB가 아니라 Storage로 간다. */
  async _store(dataUrl){
    const blob = await (await fetch(dataUrl)).blob();
    const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${new Date().getFullYear()}/${Date.now().toString(36)}${Math.floor(Math.random()*1e9).toString(36)}.${ext}`;
    /* storage-js v2 최신은 Blob 을 multipart/form-data 로 보내는데,
       이 CI4 미믹 서버는 multipart 본문을 읽지 못한다(php://input 기본값 그대로 →
       'php://input' 문자열이 파일로 저장되는 버그). storage 클라이언트를 우회하고
       원본 바이너리 본문을 직접 POST 한다. */
    const { data:{ session } } = await SB.auth.getSession();
    const base = MK_SUPABASE_URL.replace(/\/$/,'');
    const res = await fetch(base + '/storage/v1/object/product-images/' + path, {
      method:'POST',
      headers:{ 'Content-Type': blob.type,
                'apikey': MK_SUPABASE_ANON,
                'Authorization':'Bearer ' + (session ? session.access_token : '') },
      body: blob,
    });
    if(!res.ok) throw new Error('업로드 실패: ' + await res.text());
    return base + '/storage/v1/object/public/product-images/' + path;
  },
  async save(file){
    const { dataUrl, w, h, bytes } = await this.compress(file);
    const ref = await this._store(dataUrl);
    return { ref, dataUrl, w, h, bytes };   // 공개 URL을 그대로 저장
  },
  isRef(){ return false; },        // Storage 공개 URL이라 참조 치환이 필요 없다
  resolve(v){ return v; },
  async hydrate(){},
  async loadCache(){ return true; },
  async usage(){ return { count:0, used:0, quota:0 }; },
  async gc(){ return 0; },
});

/* ---------- 관리자 계정 관리 ----------
   admins 테이블은 REST 에서 쓰기가 잠겨 있다(누구나 스스로를 관리자로
   만들 수 있으므로). 전용 창구 /functions/v1/admin-users 로만 오간다.
   응답은 언제나 {ok, ...} — 네트워크 실패도 같은 모양으로 감싼다. */
window.MkAdminApi = {
  async call(action, payload){
    const { data:{ session } } = await SB.auth.getSession();
    if(!session) return { ok:false, err:'no_session' };
    try{
      const r = await fetch(MK_SUPABASE_URL.replace(/\/$/,'') + '/functions/v1/admin-users', {
        method:'POST',
        headers:{ 'Content-Type':'application/json',
                  'apikey': MK_SUPABASE_ANON,
                  'Authorization':'Bearer ' + session.access_token },
        body: JSON.stringify(Object.assign({ action }, payload || {})),
      });
      const j = await r.json().catch(()=>null);
      if(j && typeof j.ok === 'boolean') return j;
      return { ok:false, err:'http_' + r.status };
    }catch(e){ return { ok:false, err:'unreachable' }; }
  },
};

}  /* end supabase mode */
