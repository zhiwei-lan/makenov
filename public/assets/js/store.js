/* MAKENOV store — localStorage MVP. 2단계에서 이 파일만 Supabase 구현으로 치환한다.
   인터페이스: Store.session()/login()/signup()/logout(), Store.cart*, Store.addInquiry(), Store.myInquiries() */
const Store = {
  /* ---- session ---- */
  session(){ try{ return JSON.parse(localStorage.getItem('mk_session')||'null'); }catch(e){ return null; } },
  _users(){ try{ return JSON.parse(localStorage.getItem('mk_users')||'[]'); }catch(e){ return []; } },
  signup(user){                       // user: {email,password,mst,company,address,status,contactName,position,zalo}
    const users = this._users();
    if(users.some(u=>u.email===user.email)) return {ok:false, err:'exists'};
    user.createdAt = new Date().toISOString();
    users.push(user);
    localStorage.setItem('mk_users', JSON.stringify(users));
    const s = {...user}; delete s.password;
    localStorage.setItem('mk_session', JSON.stringify(s));
    return {ok:true, session:s};
  },
  login(email, password){
    const u = this._users().find(u=>u.email===email && u.password===password);
    if(!u) return {ok:false, err:'invalid'};
    const s = {...u}; delete s.password;
    localStorage.setItem('mk_session', JSON.stringify(s));
    return {ok:true, session:s};
  },
  logout(){ localStorage.removeItem('mk_session'); },
  reverify(v){
    return this.updateProfile({ country:v.country, company:v.company, address:v.address,
      regNo:v.regNo, mst:v.regNo, verifiedBy:v.checked, status:v.status });
  },
  updateProfile(patch){
    const s = this.session(); if(!s) return {ok:false, err:'auth'};
    const users = this._users();
    const u = users.find(u=>u.email===s.email);
    if(u) Object.assign(u, patch);
    localStorage.setItem('mk_users', JSON.stringify(users));
    localStorage.setItem('mk_session', JSON.stringify({...s, ...patch}));
    return {ok:true};
  },

  /* ---- wishlist cart ---- */
  cart(){ try{ return JSON.parse(localStorage.getItem('mk_cart')||'[]'); }catch(e){ return []; } },
  cartHas(pid){ return this.cart().includes(pid); },
  cartToggle(pid){
    let c = this.cart();
    const had = c.includes(pid);
    c = had ? c.filter(x=>x!==pid) : [...c, pid];
    localStorage.setItem('mk_cart', JSON.stringify(c));
    return !had; // true = added
  },
  cartRemove(pid){ localStorage.setItem('mk_cart', JSON.stringify(this.cart().filter(x=>x!==pid))); },
  cartClear(){ localStorage.setItem('mk_cart','[]'); },

  /* ---- inquiries ---- */
  _inqs(){ try{ return JSON.parse(localStorage.getItem('mk_inquiries')||'[]'); }catch(e){ return []; } },
  addInquiry(pid, message){
    const s = this.session(); if(!s) return {ok:false, err:'auth'};
    const inqs = this._inqs();
    inqs.push({ id:'inq_'+Date.now()+'_'+pid, pid, message, buyerEmail:s.email, company:s.company, mst:s.mst,
      contactName:s.contactName, zalo:s.zalo, createdAt:new Date().toISOString() });
    localStorage.setItem('mk_inquiries', JSON.stringify(inqs));
    return {ok:true};
  },
  myInquiries(){
    const s = this.session(); if(!s) return [];
    return this._inqs().filter(i=>i.buyerEmail===s.email).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  },
  allInquiries(){ return this._inqs(); },   // admin
  allBuyers(){ return this._users().map(u=>{const c={...u}; delete c.password; return c;}); }, // admin

  /* ---- 공급사 입점 문의 (maker.html) — 로그인 없이 접수 ---- */
  _leads(){ try{ return JSON.parse(localStorage.getItem('mk_maker_leads')||'[]'); }catch(e){ return []; } },
  addMakerLead(lead){
    const list = this._leads();
    lead.id = 'lead_' + Date.now();
    lead.createdAt = new Date().toISOString();
    list.push(lead);
    localStorage.setItem('mk_maker_leads', JSON.stringify(list));
    return { ok:true, id:lead.id };
  },
  allMakerLeads(){ return this._leads().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); },
};

/* ============================================================
   Admin — 관리자 전용 저장 계층
    클라이언트 사이드 게이트입니다. 실제 인증은 2단계 Supabase Auth로 교체.
   ============================================================ */
const Admin = {
  /* ---- 로그인 게이트 ---- */
  DEFAULT_PW: 'makenov2026',
  _hash(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return String(h); },
  password(){ return localStorage.getItem('mk_admin_pw') || this._hash(this.DEFAULT_PW); },
  login(pw){
    if(this._hash(pw) !== this.password()) return false;
    sessionStorage.setItem('mk_admin_in','1'); return true;
  },
  changePassword(pw){ localStorage.setItem('mk_admin_pw', this._hash(pw)); },
  isIn(){ return sessionStorage.getItem('mk_admin_in')==='1'; },
  logout(){ sessionStorage.removeItem('mk_admin_in'); },

  /* ---- 제품 CRUD ---- */
  saveProducts(list){ localStorage.setItem('mk_products_override', JSON.stringify(list)); },
  upsertProduct(p){
    const list = [...MK_PRODUCTS];
    const i = list.findIndex(x=>x.id===p.id);
    if(i>=0) list[i]=p; else list.unshift(p);
    this.saveProducts(list);
    if(i<0) this.addSpotlight('new', p.id);
    return list;
  },
  deleteProduct(id){
    this.saveProducts(MK_PRODUCTS.filter(p=>p.id!==id));
    this.saveSpotlight(MK_SPOTLIGHT.filter(s=>s.pid!==id));
  },
  newProductId(){
    let n = 1; const ids = new Set(MK_PRODUCTS.map(p=>p.id));
    while(ids.has('p'+n)) n++;
    return 'p'+n;
  },

  /* ---- 칼럼 CRUD ---- */
  saveColumns(list){ localStorage.setItem('mk_columns_override', JSON.stringify(list)); },
  upsertColumn(c){
    const list = [...MK_COLUMNS];
    const i = list.findIndex(x=>x.id===c.id);
    if(i>=0) list[i]=c; else list.unshift(c);
    this.saveColumns(list); return list;
  },
  deleteColumn(id){ this.saveColumns(MK_COLUMNS.filter(c=>c.id!==id)); },
  newColumnId(){
    let n = 1; const ids = new Set(MK_COLUMNS.map(c=>c.id));
    while(ids.has('c'+n)) n++;
    return 'c'+n;
  },

  /* ---- FAQ CRUD (메인페이지) ---- */
  saveFaqs(list){ localStorage.setItem('mk_faqs_override', JSON.stringify(list)); },
  upsertFaq(f){
    const list = [...MK_FAQ];
    const i = list.findIndex(x=>x.id===f.id);
    if(i>=0) list[i]=f; else list.push(f);
    this.saveFaqs(list); return list;
  },
  deleteFaq(id){ this.saveFaqs(MK_FAQ.filter(f=>f.id!==id)); },
  newFaqId(){
    let n = 1; const ids = new Set(MK_FAQ.map(f=>f.id));
    while(ids.has('f'+n)) n++;
    return 'f'+n;
  },

  /* ---- 공지사항 CRUD ---- */
  saveNotices(list){ localStorage.setItem('mk_notices_override', JSON.stringify(list)); },
  upsertNotice(n){
    const list = [...MK_NOTICES];
    const i = list.findIndex(x=>x.id===n.id);
    if(i>=0) list[i]=n; else list.unshift(n);
    list.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    this.saveNotices(list); return list;
  },
  deleteNotice(id){ this.saveNotices(MK_NOTICES.filter(n=>n.id!==id)); },
  newNoticeId(){
    let i = 1; const ids = new Set(MK_NOTICES.map(n=>n.id));
    while(ids.has('n'+i)) i++;
    return 'n'+i;
  },

  /* ---- 사이트 설정 (상단 띠배너 등) ---- */
  saveSettings(patch){
    Object.assign(MK_SETTINGS, patch);
    localStorage.setItem('mk_settings_override', JSON.stringify(MK_SETTINGS));
    return MK_SETTINGS;
  },

  /* ---- Spotlight (홈 실시간 피드) ---- */
  saveSpotlight(list){ localStorage.setItem('mk_spotlight_override', JSON.stringify(list)); },
  /* 시드 데이터와 동일한 '현지시각' 형식으로 기록 (toISOString은 UTC라 9시간 어긋남) */
  _localTs(){
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
  },
  addSpotlight(kind, pid){
    const list = [{ kind, ts:this._localTs(), pid }, ...MK_SPOTLIGHT].slice(0,20);
    this.saveSpotlight(list);
  },

  /* ---- 문의 처리상태 / 메모 ---- */
  _meta(){ try{ return JSON.parse(localStorage.getItem('mk_inq_meta')||'{}'); }catch(e){ return {}; } },
  inqMeta(id){ return this._meta()[id] || { status:'new', memo:'' }; },
  setInqMeta(id, patch){
    const m = this._meta();
    m[id] = { ...(m[id]||{status:'new',memo:''}), ...patch };
    localStorage.setItem('mk_inq_meta', JSON.stringify(m));
  },
  deleteInquiry(id){
    const list = Store.allInquiries().filter(i=>i.id!==id);
    localStorage.setItem('mk_inquiries', JSON.stringify(list));
  },

  /* ---- 공급사 입점 문의 처리상태 ---- */
  _leadMeta(){ try{ return JSON.parse(localStorage.getItem('mk_lead_meta')||'{}'); }catch(e){ return {}; } },
  leadMeta(id){ return this._leadMeta()[id] || { status:'new', memo:'' }; },
  setLeadMeta(id, patch){
    const m = this._leadMeta();
    m[id] = { ...(m[id]||{status:'new',memo:''}), ...patch };
    localStorage.setItem('mk_lead_meta', JSON.stringify(m));
  },
  deleteLead(id){
    localStorage.setItem('mk_maker_leads', JSON.stringify(Store.allMakerLeads().filter(l=>l.id!==id)));
  },

  /* ---- 바이어 등급 (VIP 승격) ---- */
  _tiers(){ try{ return JSON.parse(localStorage.getItem('mk_buyer_tier')||'{}'); }catch(e){ return {}; } },
  tier(email){ return this._tiers()[email] || 'verified'; },
  setTier(email, tier){
    const t = this._tiers(); t[email] = tier;
    localStorage.setItem('mk_buyer_tier', JSON.stringify(t));
  },

  /* ---- 초기화 ---- */
  resetContent(){
    ['mk_products_override','mk_columns_override','mk_spotlight_override','mk_faqs_override','mk_settings_override','mk_notices_override'].forEach(k=>localStorage.removeItem(k));
  },
};
