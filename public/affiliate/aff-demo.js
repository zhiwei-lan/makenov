/* ============================================================
   aff-demo.js — 데모 데이터 (검토·시연용). 라이브 DB 는 건드리지 않는다.
   ------------------------------------------------------------
   켜기: 주소 뒤 ?demo=1 (localStorage 'aff_demo' 에 기억) · 끄기: ?demo=0
   켜져 있으면 aff-api.js 의 window.AffApi 를 이 파일이 덮어쓴다(같은 인터페이스).
   데모 계정: demo@makenov.com / demo1234 (코드 DEMO01)
   ============================================================ */
(function(){
  const q = new URLSearchParams(location.search).get('demo');
  if(q === '1'){ try{ localStorage.setItem('aff_demo', '1'); }catch(e){} }
  if(q === '0'){ try{ localStorage.removeItem('aff_demo'); localStorage.removeItem('aff_mock'); localStorage.removeItem('aff_session_demo'); }catch(e){} }
  let on = false; try{ on = localStorage.getItem('aff_demo') === '1'; }catch(e){}
  window.AFF_DEMO = on;
  if(!on) return;

  const KEY = 'aff_mock', SESS = 'aff_session_demo';
  const IMG = 'https://makenov.com/storage/v1/object/public/product-images/2026/';
  const nowIso = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 16).replace('T', ' '); };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const code6 = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for(let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

  function seed(){
    const campaigns = [
      { product_id:'p9', name:'Kem dưỡng chân cao cấp 3WB Gounbal', name_ko:'3WB 고운발 프리미엄 발 크림', brand:'WELLBEING HEALTH FARM', cat:'beauty', img: IMG + 'mszejcol5ldjob.png', cpa_vnd:150000, cap:100,
        headline:'Kem dưỡng gót chân bán chạy tại Hàn Quốc', keywords:['kem dưỡng gót chân','nứt gót chân','mỹ phẩm Hàn Quốc','nguồn hàng Hàn Quốc','sỉ mỹ phẩm','nhà phân phối mỹ phẩm'], materials:[IMG + 'mszejcol5ldjob.png'],
        copy_text:'Kem dưỡng chân 3WB Gounbal (Hàn Quốc) — làm mềm da chai sần, nứt gót chân. Hàng chính hãng từ nhà sản xuất, tìm nhà phân phối tại Việt Nam. Xem giá & MOQ sau khi xác thực doanh nghiệp (miễn phí).',
        rules:'- Không cam kết công dụng ngoài mô tả của nhà sản xuất\n- Không dùng hình ảnh bác sĩ, bệnh viện\n- Link phải giữ nguyên mã CTV (?ref=)', featured:true, active:true, sort:1 },
      { product_id:'p11', name:'MIRALET Phyto Intensive Skinbooster 2,0ml × 4', name_ko:'미라렛 파이토 인텐시브 스킨부스터 2.0ml × 4', brand:'MIRALET', cat:'beauty', img:'https://vn.makenov.com/assets/img/products/miralet/skinbooster.jpg', cpa_vnd:250000, cap:null,
        headline:'Skinbooster PDRN thực vật 100.000 ppm cho spa & clinic', keywords:['skinbooster','PDRN','mỹ phẩm spa','clinic thẩm mỹ','nguồn hàng spa Hàn Quốc','sỉ skinbooster'], materials:['https://vn.makenov.com/assets/img/products/miralet/skinbooster.jpg'],
        copy_text:'MIRALET Phyto Intensive Skinbooster — PDRN nguồn gốc thực vật 100.000 ppm, 4 ống × 2,0 ml. Nhà sản xuất Hàn Quốc tìm nhà phân phối cho spa, clinic tại Việt Nam.',
        rules:'- Chỉ giới thiệu tới spa, clinic, nhà phân phối mỹ phẩm\n- Không quảng cáo là thuốc hoặc tiêm\n- Link phải giữ nguyên mã CTV (?ref=)', featured:true, active:true, sort:2 },
      { product_id:'p0', name:'Chăn chữa cháy cách ly oxy FIRESSAK FS-EV54S', name_ko:'파이어싹 질식소화덮개 FS-EV54S', brand:'FIRESSAK', cat:'tech', img: IMG + 'ms3xqo636sut.png', cpa_vnd:200000, cap:50,
        headline:'Chăn chữa cháy xe điện cho bãi đỗ, trạm sạc, kho', keywords:['chăn chữa cháy','cháy xe điện','PCCC','trạm sạc xe điện','bãi đỗ xe ngầm','thiết bị PCCC Hàn Quốc'], materials:[IMG + 'ms3xqo636sut.png', IMG + 'ms3xqvece6md.png'],
        copy_text:'FIRESSAK FS-EV54S — chăn chữa cháy cách ly oxy cho xe điện. Phù hợp bãi đỗ ngầm, trạm sạc, kho logistics. Nhà sản xuất Hàn Quốc (IATF 16949) tìm nhà phân phối tại Việt Nam.',
        rules:'- Đối tượng: công ty PCCC, bãi đỗ, trạm sạc, đội xe doanh nghiệp\n- Không cam kết dập tắt hoàn toàn\n- Link phải giữ nguyên mã CTV (?ref=)', featured:true, active:true, sort:3 },
    ];
    const m1 = { id:'m1', code:'DEMO01', email:'demo@makenov.com', password:'demo1234', name:'Nguyễn Văn A', phone:'0901 234 567', zalo:'0901 234 567', bank_name:'Vietcombank', bank_account:'0123456789', bank_holder:'NGUYEN VAN A', status:'active', created_at:'2026-08-20 09:00' };
    const others = ['Trần Thị B','Lê Văn C','Phạm Thị D','Hoàng Văn E','Võ Thị F','Đặng Văn G','Bùi Thị H','Đỗ Văn I','Ngô Thị K'].map((n, i) =>
      ({ id:'m' + (i + 2), code:code6(), email:'ctv' + (i + 2) + '@example.vn', password:'x', name:n, phone:'', zalo:'', bank_name:'', bank_account:'', bank_holder:'', status:'active', created_at:'2026-08-0' + ((i % 9) + 1) + ' 10:00' }));
    const marketers = [m1, ...others];
    const leads = [];
    const push = (mid, pid, status, d, ch, reason) => leads.push({ id:'l' + (leads.length + 1), inquiry_id:'i' + uid(), marketer_id:mid, product_id:pid, status, ch: ch || ['fb','zalo','tiktok','copy'][leads.length % 4],
      amount_vnd: campaigns.find(c => c.product_id === pid).cpa_vnd, created_at:daysAgo(d), decided_at: status === 'pending' ? null : daysAgo(Math.max(0, d - 1)), reject_reason: reason || null });
    [['p9',28,'fb'],['p9',26,'zalo'],['p11',24,'fb'],['p0',22,'zalo'],['p9',20,'tiktok'],['p11',18,'fb'],['p9',16,'zalo'],['p0',14,'fb'],['p11',12,'zalo'],['p9',10,'fb'],['p9',8,'zalo'],['p11',6,'tiktok']].forEach(([p, d, c]) => push('m1', p, 'approved', d, c));
    [['p9',3,'zalo'],['p0',2,'fb'],['p11',1,'zalo']].forEach(([p, d, c]) => push('m1', p, 'pending', d, c));
    push('m1', 'p9', 'rejected', 9, 'fb', 'Trùng với khách hàng đã có trong hệ thống');
    push('m1', 'p0', 'rejected', 5, 'tiktok', 'Thông tin liên hệ không đúng');
    others.forEach((m, i) => { for(let k = 0; k < (i + 2) * 2; k++) push(m.id, ['p9','p11','p0'][k % 3], k % 7 === 0 ? 'rejected' : k % 5 === 0 ? 'pending' : 'approved', (k * 3) % 29); });
    const withdrawals = [{ id:'w1', marketer_id:'m1', amount_vnd:500000, bank_snapshot:{ bank_name:'Vietcombank', bank_account:'0123456789', bank_holder:'NGUYEN VAN A' }, status:'paid', memo:'', created_at:daysAgo(6), paid_at:daysAgo(5) }];
    return { campaigns, marketers, leads, withdrawals, settings:{ minWithdraw:500000, cookieDays:30 } };
  }
  function load(){ try{ const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if(s && s.campaigns && s.campaigns[0].name_ko) return s; }catch(e){} const s = seed(); save(s); return s; }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  const delay = v => new Promise(r => setTimeout(() => r(v), 80));
  const pub = m => { const o = Object.assign({}, m); delete o.password; return o; };
  const sess = () => { try{ return JSON.parse(localStorage.getItem(SESS) || 'null'); }catch(e){ return null; } };
  const me = () => { const s = sess(); if(!s) return null; const m = load().marketers.find(x => x.id === s.id); return m ? pub(m) : null; };
  const need = () => { const m = me(); if(!m) throw new Error('Vui lòng đăng nhập'); return m; };
  const rate = (ok, rej) => (ok + rej) >= 3 ? Math.round(ok / (ok + rej) * 1000) / 1000 : null;
  function withStats(c, S){
    const ls = S.leads.filter(l => l.product_id === c.product_id);
    const approved = ls.filter(l => l.status === 'approved').length, pending = ls.filter(l => l.status === 'pending').length, rejected = ls.filter(l => l.status === 'rejected').length;
    return Object.assign({}, c, { approved, pending, rejected, approval_rate: rate(approved, rejected), remaining: c.cap == null ? null : Math.max(0, c.cap - approved - pending) });
  }
  function balance(S, mid){
    const ok = S.leads.filter(l => l.marketer_id === mid && l.status === 'approved').reduce((a, l) => a + l.amount_vnd, 0);
    const out = S.withdrawals.filter(w => w.marketer_id === mid && w.status !== 'rejected').reduce((a, w) => a + w.amount_vnd, 0);
    return { approved_vnd: ok, withdrawn_vnd: out, balance_vnd: ok - out };
  }
  function clicksFor(code, days){
    let h = 0; for(const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const out = []; const channels = { fb:0, zalo:0, tiktok:0, copy:0 };
    for(let i = days - 1; i >= 0; i--){ h = (h * 1103515245 + 12345) >>> 0; const d = new Date(); d.setDate(d.getDate() - i); const n = (h >>> 8) % 13; out.push({ day:d.toISOString().slice(0, 10), clicks:n });
      channels.fb += Math.round(n * .45); channels.zalo += Math.round(n * .35); channels.tiktok += Math.round(n * .15); channels.copy += n - Math.round(n * .45) - Math.round(n * .35) - Math.round(n * .15); }
    return { days: out, channels };
  }

  window.AffApi = {
    session: me,
    async campaigns(o){ o = o || {}; const S = load(); let list = S.campaigns.filter(c => c.active).map(c => withStats(c, S));
      if(o.featured) list = list.filter(c => c.featured); if(o.cat) list = list.filter(c => c.cat === o.cat);
      if(o.sort === 'new') list.sort((a, b) => b.sort - a.sort); else list.sort((a, b) => b.cpa_vnd - a.cpa_vnd); return delay(list); },
    async campaign(pid){ const S = load(); const c = S.campaigns.find(c => c.product_id === pid && c.active); return delay(c ? withStats(c, S) : null); },
    async rankings(){
      const S = load(), ms = new Date(); ms.setDate(1); const msS = ms.toISOString().slice(0, 10);
      const byM = {}; S.leads.filter(l => l.status === 'approved' && l.decided_at >= msS).forEach(l => { byM[l.marketer_id] = (byM[l.marketer_id] || 0) + l.amount_vnd; });
      const marketers = Object.entries(byM).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, vnd], i) => ({ rank:i + 1, name:S.marketers.find(m => m.id === id).name.slice(0, 2) + '***', vnd }));
      const byC = {}; S.leads.forEach(l => { byC[l.product_id] = byC[l.product_id] || { n:0, ok:0, rej:0 }; byC[l.product_id].n++; if(l.status === 'approved') byC[l.product_id].ok++; if(l.status === 'rejected') byC[l.product_id].rej++; });
      const nm = pid => { const c = S.campaigns.find(c => c.product_id === pid); return { name:c.name, name_ko:c.name_ko }; };
      const campaigns = Object.entries(byC).sort((a, b) => b[1].n - a[1].n).slice(0, 10).map(([pid, v], i) => Object.assign({ rank:i + 1, product_id:pid, leads:v.n }, nm(pid)));
      const approval = Object.entries(byC).filter(([, v]) => v.ok + v.rej >= 3).sort((a, b) => b[1].ok / (b[1].ok + b[1].rej) - a[1].ok / (a[1].ok + a[1].rej)).slice(0, 10).map(([pid, v], i) => Object.assign({ rank:i + 1, product_id:pid, rate:v.ok / (v.ok + v.rej) }, nm(pid)));
      return delay({ marketers, campaigns, approval });
    },
    async settings(){ return delay({ minWithdraw:500000, cookieDays:30 }); },
    async signup(o){ const S = load(); if(S.marketers.some(m => m.email.toLowerCase() === (o.email || '').toLowerCase())) throw new Error('Email này đã được đăng ký');
      const m = { id:'m' + uid(), code:code6(), email:o.email, password:o.password, name:o.name, phone:o.phone || '', zalo:o.zalo || '', bank_name:'', bank_account:'', bank_holder:'', status:'active', created_at:nowIso() };
      S.marketers.push(m); save(S); localStorage.setItem(SESS, JSON.stringify({ id:m.id })); return delay(pub(m)); },
    async login(email, password){ const m = load().marketers.find(x => x.email.toLowerCase() === String(email || '').toLowerCase()); if(!m || m.password !== password) throw new Error('Email hoặc mật khẩu không đúng'); localStorage.setItem(SESS, JSON.stringify({ id:m.id })); return delay(pub(m)); },
    async logout(){ localStorage.removeItem(SESS); return delay(true); },
    async me(){ return delay(need()); },
    async updateMe(patch){ const m = need(), S = load(), row = S.marketers.find(x => x.id === m.id); ['name','phone','zalo','bank_name','bank_account','bank_holder'].forEach(k => { if(patch[k] !== undefined) row[k] = String(patch[k]).trim(); }); save(S); return delay(pub(row)); },
    async changePassword(o, n){ const m = need(), S = load(), row = S.marketers.find(x => x.id === m.id); if(row.password !== o) throw new Error('Mật khẩu hiện tại không đúng'); row.password = n; save(S); return delay(true); },
    async summary(){ const m = need(), S = load(); const ls = S.leads.filter(l => l.marketer_id === m.id); const cnt = st => ls.filter(l => l.status === st).length;
      return delay(Object.assign({ clicks30: clicksFor(m.code, 30).days.reduce((a, d) => a + d.clicks, 0), leads:{ pending:cnt('pending'), approved:cnt('approved'), rejected:cnt('rejected') }, approval_rate: rate(cnt('approved'), cnt('rejected')), min_withdraw:500000 }, balance(S, m.id))); },
    async leads(o){ const m = need(), S = load(); let ls = S.leads.filter(l => l.marketer_id === m.id); if(o && o.status) ls = ls.filter(l => l.status === o.status); ls.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return delay(ls.map(l => { const c = S.campaigns.find(c => c.product_id === l.product_id); return { id:l.id, product_id:l.product_id, product_name:c.name, product_name_ko:c.name_ko, status:l.status, amount_vnd:l.amount_vnd, ch:l.ch, created_at:l.created_at, decided_at:l.decided_at, reject_reason:l.reject_reason }; })); },
    async clicks(days){ const m = need(); return delay(clicksFor(m.code, days || 30).days); },
    async clicksFull(days){ const m = need(); return delay(clicksFor(m.code, days || 30)); },
    async withdrawals(){ const m = need(), S = load(); return delay(S.withdrawals.filter(w => w.marketer_id === m.id).map(w => ({ id:w.id, amount_vnd:w.amount_vnd, status:w.status, created_at:w.created_at, paid_at:w.paid_at, memo:w.memo }))); },
    async requestWithdrawal(amount){ const m = need(), S = load(), row = S.marketers.find(x => x.id === m.id); amount = Math.floor(Number(amount) || 0);
      if(!row.bank_account) throw new Error('Vui lòng thêm tài khoản ngân hàng trước'); if(amount < 500000) throw new Error('Số tiền rút tối thiểu là 500.000 ₫'); if(amount > balance(S, m.id).balance_vnd) throw new Error('Số tiền vượt quá số dư hiện có');
      const w = { id:'w' + uid(), marketer_id:m.id, amount_vnd:amount, bank_snapshot:{}, status:'requested', memo:'', created_at:nowIso(), paid_at:null }; S.withdrawals.push(w); save(S); return delay(w); },
    _reset(){ localStorage.removeItem(KEY); localStorage.removeItem(SESS); },
  };
})();
