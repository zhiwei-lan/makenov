/* ============================================================
   aff-mock.js — 제휴(affiliate) 가짜 백엔드
   ------------------------------------------------------------
   1차(프론트 확정) 단계용. window.AffApi 를 구현하고 모든 상태를
   localStorage 'aff_mock' 한 칸에 둔다. 응답 모양은 설계서
   (docs/superpowers/specs/2026-09-09-affiliate-design.md 4절) 의
   실제 API 와 같다 — 백엔드가 붙으면 이 파일만 aff-api.js 로 바뀌고
   페이지 코드는 그대로다.

   데모 계정: demo@makenov.com / demo1234  (코드 DEMO01)
   ============================================================ */
(function(){
  const KEY = 'aff_mock', SESS = 'aff_session';
  const IMG = 'https://makenov.com/storage/v1/object/public/product-images/2026/';
  const nowIso = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 16).replace('T', ' '); };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const code6 = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for(let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

  function seed(){
    const campaigns = [
      { product_id:'p9', name:'Kem dưỡng chân cao cấp 3WB Gounbal', brand:'WELLBEING HEALTH FARM', cat:'beauty',
        img: IMG + 'mszejcol5ldjob.png', cpa_vnd:150000, cap:100,
        headline:'Kem dưỡng gót chân bán chạy tại Hàn Quốc',
        materials:[IMG + 'mszejcol5ldjob.png'],
        copy_text:'Kem dưỡng chân 3WB Gounbal (Hàn Quốc) — làm mềm da chai sần, nứt gót chân. Hàng chính hãng từ nhà sản xuất, tìm nhà phân phối tại Việt Nam. Xem giá & MOQ sau khi xác thực doanh nghiệp (miễn phí).',
        rules:'- Không cam kết công dụng ngoài mô tả của nhà sản xuất\n- Không dùng hình ảnh bác sĩ, bệnh viện\n- Link phải giữ nguyên mã CTV (?ref=)\n- Khách hàng tự gửi yêu cầu qua link mới được tính',
        featured:true, active:true, sort:1 },
      { product_id:'p11', name:'MIRALET Phyto Intensive Skinbooster 2,0ml × 4', brand:'MIRALET', cat:'beauty',
        img:'https://vn.makenov.com/assets/img/products/miralet/skinbooster.jpg', cpa_vnd:250000, cap:null,
        headline:'Skinbooster PDRN thực vật 100.000 ppm cho spa & clinic',
        materials:['https://vn.makenov.com/assets/img/products/miralet/skinbooster.jpg'],
        copy_text:'MIRALET Phyto Intensive Skinbooster — PDRN nguồn gốc thực vật 100.000 ppm, 4 ống × 2,0 ml. Nhà sản xuất Hàn Quốc tìm nhà phân phối cho spa, clinic tại Việt Nam.',
        rules:'- Chỉ giới thiệu tới spa, clinic, nhà phân phối mỹ phẩm\n- Không quảng cáo là thuốc hoặc tiêm\n- Link phải giữ nguyên mã CTV (?ref=)',
        featured:true, active:true, sort:2 },
      { product_id:'p0', name:'Chăn chữa cháy cách ly oxy FIRESSAK FS-EV54S', brand:'FIRESSAK', cat:'tech',
        img: IMG + 'ms3xqo636sut.png', cpa_vnd:200000, cap:50,
        headline:'Chăn chữa cháy xe điện cho bãi đỗ, trạm sạc, kho',
        materials:[IMG + 'ms3xqo636sut.png', IMG + 'ms3xqvece6md.png'],
        copy_text:'FIRESSAK FS-EV54S — chăn chữa cháy cách ly oxy cho xe điện. Phù hợp bãi đỗ ngầm, trạm sạc, kho logistics. Nhà sản xuất Hàn Quốc (IATF 16949) tìm nhà phân phối tại Việt Nam.',
        rules:'- Đối tượng: công ty PCCC, bãi đỗ, trạm sạc, đội xe doanh nghiệp\n- Không cam kết dập tắt hoàn toàn, chỉ mô tả theo tài liệu\n- Link phải giữ nguyên mã CTV (?ref=)',
        featured:true, active:true, sort:3 },
    ];
    const m1 = { id:'m1', code:'DEMO01', email:'demo@makenov.com', password:'demo1234', name:'Nguyễn Văn A', phone:'0901 234 567', zalo:'0901 234 567',
      bank_name:'Vietcombank', bank_account:'0123456789', bank_holder:'NGUYEN VAN A', status:'active', created_at:'2026-08-20 09:00' };
    const others = ['Trần Thị B','Lê Văn C','Phạm Thị D','Hoàng Văn E','Võ Thị F','Đặng Văn G','Bùi Thị H','Đỗ Văn I','Ngô Thị K'].map((n, i) =>
      ({ id:'m' + (i + 2), code:code6(), email:'ctv' + (i + 2) + '@example.vn', password:'x', name:n, phone:'', zalo:'', bank_name:'', bank_account:'', bank_holder:'', status:'active', created_at:'2026-08-0' + ((i % 9) + 1) + ' 10:00' }));
    const marketers = [m1, ...others];
    const leads = [];
    const push = (mid, pid, status, d, reason) => leads.push({ id:'l' + (leads.length + 1), inquiry_id:'i' + uid(), marketer_id:mid, product_id:pid, status,
      amount_vnd: campaigns.find(c => c.product_id === pid).cpa_vnd, created_at:daysAgo(d), decided_at: status === 'pending' ? null : daysAgo(Math.max(0, d - 1)), reject_reason: reason || null,
      message:'Chúng tôi là nhà phân phối mỹ phẩm tại Hà Nội, muốn nhận báo giá và MOQ cho sản phẩm này.' });
    /* 데모 마케터: 승인 12 · 대기 3 · 반려 2 */
    [['p9',28],['p9',26],['p11',24],['p0',22],['p9',20],['p11',18],['p9',16],['p0',14],['p11',12],['p9',10],['p9',8],['p11',6]].forEach(([p, d]) => push('m1', p, 'approved', d));
    [['p9',3],['p0',2],['p11',1]].forEach(([p, d]) => push('m1', p, 'pending', d));
    push('m1', 'p9', 'rejected', 9, 'Trùng với khách hàng đã có trong hệ thống');
    push('m1', 'p0', 'rejected', 5, 'Thông tin liên hệ không đúng');
    /* 다른 마케터들 — 랭킹용 */
    others.forEach((m, i) => { for(let k = 0; k < (i + 2) * 2; k++) push(m.id, ['p9','p11','p0'][k % 3], k % 5 === 0 ? 'pending' : 'approved', (k * 3) % 29); });
    const withdrawals = [{ id:'w1', marketer_id:'m1', amount_vnd:500000, bank_snapshot:{ bank_name:'Vietcombank', bank_account:'0123456789', bank_holder:'NGUYEN VAN A' }, status:'paid', memo:'', created_at:daysAgo(6), paid_at:daysAgo(5) }];
    const settings = { minWithdraw:500000, cookieDays:30, zalo:'0901 234 567', email:'ctv@makenov.com' };
    return { campaigns, marketers, leads, withdrawals, settings };
  }

  function load(){ try{ const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if(s && s.campaigns) return s; }catch(e){} const s = seed(); save(s); return s; }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }
  const delay = v => new Promise(r => setTimeout(() => r(v), 120));   // 네트워크 느낌
  const pub = m => { const o = Object.assign({}, m); delete o.password; return o; };
  const sess = () => { try{ return JSON.parse(localStorage.getItem(SESS) || 'null'); }catch(e){ return null; } };
  const me = () => { const s = sess(); if(!s) return null; const m = load().marketers.find(x => x.id === s.id); return m ? pub(m) : null; };
  const need = () => { const m = me(); if(!m) throw new Error('Vui lòng đăng nhập'); return m; };
  const mask = n => n.trim().slice(0, 2) + '***';
  const monthStart = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; };

  function withStats(c, S){
    const ls = S.leads.filter(l => l.product_id === c.product_id);
    const approved = ls.filter(l => l.status === 'approved').length, pending = ls.filter(l => l.status === 'pending').length;
    return Object.assign({}, c, { approved, pending, remaining: c.cap == null ? null : Math.max(0, c.cap - approved - pending) });
  }
  function balance(S, mid){
    const ok = S.leads.filter(l => l.marketer_id === mid && l.status === 'approved').reduce((a, l) => a + l.amount_vnd, 0);
    const out = S.withdrawals.filter(w => w.marketer_id === mid && w.status !== 'rejected').reduce((a, w) => a + w.amount_vnd, 0);
    return { approved_vnd: ok, withdrawn_vnd: out, balance_vnd: ok - out };
  }
  /* 30일 클릭 — 시드 고정 난수(코드 문자 합 기반) */
  function clicksFor(code, days){
    let h = 0; for(const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const out = [];
    for(let i = days - 1; i >= 0; i--){ h = (h * 1103515245 + 12345) >>> 0; const d = new Date(); d.setDate(d.getDate() - i); out.push({ day:d.toISOString().slice(0, 10), clicks:(h >>> 8) % 13 }); }
    return out;
  }

  window.AffApi = {
    session: me,
    async campaigns(o){
      o = o || {}; const S = load();
      let list = S.campaigns.filter(c => c.active).map(c => withStats(c, S));
      if(o.featured) list = list.filter(c => c.featured);
      if(o.cat) list = list.filter(c => c.cat === o.cat);
      if(o.sort === 'new') list.sort((a, b) => b.sort - a.sort); else list.sort((a, b) => b.cpa_vnd - a.cpa_vnd);
      return delay(list);
    },
    async campaign(pid){ const S = load(); const c = S.campaigns.find(c => c.product_id === pid && c.active); return delay(c ? withStats(c, S) : null); },
    async rankings(){
      const S = load(), ms = monthStart();
      const byM = {}; S.leads.filter(l => l.status === 'approved' && l.decided_at >= ms).forEach(l => { byM[l.marketer_id] = (byM[l.marketer_id] || 0) + l.amount_vnd; });
      const marketers = Object.entries(byM).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, vnd], i) => ({ rank:i + 1, name:mask(S.marketers.find(m => m.id === id).name), vnd }));
      const byC = {}; S.leads.forEach(l => { byC[l.product_id] = byC[l.product_id] || { n:0, ok:0 }; byC[l.product_id].n++; if(l.status === 'approved') byC[l.product_id].ok++; });
      const nm = pid => S.campaigns.find(c => c.product_id === pid).name;
      const campaigns = Object.entries(byC).sort((a, b) => b[1].n - a[1].n).slice(0, 10).map(([pid, v], i) => ({ rank:i + 1, product_id:pid, name:nm(pid), leads:v.n }));
      const approval = Object.entries(byC).filter(([, v]) => v.n >= 3).sort((a, b) => b[1].ok / b[1].n - a[1].ok / a[1].n).slice(0, 10).map(([pid, v], i) => ({ rank:i + 1, product_id:pid, name:nm(pid), rate:v.ok / v.n }));
      return delay({ marketers, campaigns, approval });
    },
    async signup(o){
      const S = load();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email || '')) throw new Error('Email không hợp lệ');
      if((o.password || '').length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự');
      if(!(o.name || '').trim()) throw new Error('Vui lòng nhập họ tên');
      if(S.marketers.some(m => m.email.toLowerCase() === o.email.toLowerCase())) throw new Error('Email này đã được đăng ký');
      const m = { id:'m' + uid(), code:code6(), email:o.email.trim(), password:o.password, name:o.name.trim(), phone:o.phone || '', zalo:o.zalo || '',
        bank_name:'', bank_account:'', bank_holder:'', status:'active', created_at:nowIso() };
      S.marketers.push(m); save(S); localStorage.setItem(SESS, JSON.stringify({ id:m.id }));
      return delay(pub(m));
    },
    async login(email, password){
      const m = load().marketers.find(x => x.email.toLowerCase() === String(email || '').toLowerCase());
      if(!m || m.password !== password) throw new Error('Email hoặc mật khẩu không đúng');
      if(m.status !== 'active') throw new Error('Tài khoản đang bị tạm khóa. Liên hệ hỗ trợ.');
      localStorage.setItem(SESS, JSON.stringify({ id:m.id }));
      return delay(pub(m));
    },
    async logout(){ localStorage.removeItem(SESS); return delay(true); },
    async me(){ return delay(need()); },
    async updateMe(patch){
      const m = need(), S = load(), row = S.marketers.find(x => x.id === m.id);
      ['name','phone','zalo','bank_name','bank_account','bank_holder'].forEach(k => { if(patch[k] !== undefined) row[k] = String(patch[k]).trim(); });
      save(S); return delay(pub(row));
    },
    async changePassword(oldPw, newPw){
      const m = need(), S = load(), row = S.marketers.find(x => x.id === m.id);
      if(row.password !== oldPw) throw new Error('Mật khẩu hiện tại không đúng');
      if((newPw || '').length < 8) throw new Error('Mật khẩu mới tối thiểu 8 ký tự');
      row.password = newPw; save(S); return delay(true);
    },
    async summary(){
      const m = need(), S = load();
      const ls = S.leads.filter(l => l.marketer_id === m.id);
      const cnt = st => ls.filter(l => l.status === st).length;
      return delay(Object.assign({ clicks30: clicksFor(m.code, 30).reduce((a, d) => a + d.clicks, 0),
        leads:{ pending:cnt('pending'), approved:cnt('approved'), rejected:cnt('rejected') }, min_withdraw:S.settings.minWithdraw }, balance(S, m.id)));
    },
    async leads(o){
      const m = need(), S = load();
      let ls = S.leads.filter(l => l.marketer_id === m.id);
      if(o && o.status) ls = ls.filter(l => l.status === o.status);
      ls.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return delay(ls.map(l => ({ id:l.id, product_id:l.product_id, product_name:S.campaigns.find(c => c.product_id === l.product_id).name,
        status:l.status, amount_vnd:l.amount_vnd, created_at:l.created_at, decided_at:l.decided_at, reject_reason:l.reject_reason })));
    },
    async clicks(days){ const m = need(); return delay(clicksFor(m.code, days || 30)); },
    async withdrawals(){
      const m = need(), S = load();
      return delay(S.withdrawals.filter(w => w.marketer_id === m.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(w => ({ id:w.id, amount_vnd:w.amount_vnd, status:w.status, created_at:w.created_at, paid_at:w.paid_at, memo:w.memo })));
    },
    async requestWithdrawal(amount){
      const m = need(), S = load(), row = S.marketers.find(x => x.id === m.id);
      amount = Math.floor(Number(amount) || 0);
      if(!row.bank_account || !row.bank_holder) throw new Error('Vui lòng thêm tài khoản ngân hàng trước');
      if(amount < S.settings.minWithdraw) throw new Error('Số tiền rút tối thiểu là ' + S.settings.minWithdraw.toLocaleString('vi-VN') + ' ₫');
      if(amount > balance(S, m.id).balance_vnd) throw new Error('Số tiền vượt quá số dư hiện có');
      const w = { id:'w' + uid(), marketer_id:m.id, amount_vnd:amount, bank_snapshot:{ bank_name:row.bank_name, bank_account:row.bank_account, bank_holder:row.bank_holder }, status:'requested', memo:'', created_at:nowIso(), paid_at:null };
      S.withdrawals.push(w); save(S); return delay({ id:w.id, amount_vnd:w.amount_vnd, status:w.status, created_at:w.created_at, paid_at:null });
    },
    /* 관리자 mock(admin-aff.js) 이 같은 저장소를 쓰도록 노출 */
    _load: load, _save: save, _reset(){ localStorage.removeItem(KEY); localStorage.removeItem(SESS); },
  };
})();
