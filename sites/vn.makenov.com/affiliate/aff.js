/* ============================================================
   aff.js — 제휴(affiliate) 마케터 화면 공통
   ------------------------------------------------------------
   본 사이트 app.js 와 완전히 분리된 층이다(세션·스토어 공유 없음).
   CSS 만 style.css 를 같이 쓴다. 헤더·푸터를 그리고, 페이지가 넘긴
   pageInit 을 부른다. 데이터는 window.AffApi(aff-mock.js → 나중에 aff-api.js).
   ============================================================ */
const AFF_HOST = 'https://vn.makenov.com';
const AFF_CATS = [
  { id:'beauty', name:'Mỹ phẩm & Làm đẹp' }, { id:'food', name:'Thực phẩm & Đồ uống' }, { id:'living', name:'Đồ gia dụng' },
  { id:'health', name:'Sức khỏe & Thể thao' }, { id:'kids', name:'Mẹ & Bé' }, { id:'tech', name:'Thiết bị & Công nghệ' },
];
const AFF_ST = {   // 상태 뱃지 문구
  pending:'Chờ duyệt', approved:'Đã duyệt', rejected:'Từ chối', requested:'Đang xử lý', paid:'Đã chuyển',
};

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function vnd(n){ return (Math.round(Number(n) || 0)).toLocaleString('vi-VN') + ' ₫'; }
function catName(id){ const c = AFF_CATS.find(x => x.id === id); return c ? c.name : id; }
function affLink(code, pid){ return pid ? `${AFF_HOST}/products/${pid}.html?ref=${code}` : `${AFF_HOST}/?ref=${code}`; }
function qs(k){ return new URLSearchParams(location.search).get(k) || ''; }
function fmtDate(s){ return String(s || '').slice(0, 10); }
function stBadge(st){ return `<span class="aff-status ${esc(st)}">${esc(AFF_ST[st] || st)}</span>`; }

function toast(msg){
  let el = document.querySelector('.toast');
  if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600);
}
async function copyText(s){
  try{ await navigator.clipboard.writeText(s); }
  catch(e){ const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast('Đã sao chép');
}

/* 로그인 필요 페이지 — 없으면 login.html 로 보내고 돌아올 주소를 남긴다 */
function affGuard(){
  const m = AffApi.session();
  if(m) return m;
  const next = location.pathname.split('/').pop() + location.search;
  location.replace('login.html?next=' + encodeURIComponent(next));
  return null;
}

/* 헤더 — 본 사이트 .mk-header 구조(상단행 + 메뉴행). 검색·언어·장바구니 없음 */
function affHeader(active){
  const m = AffApi.session();
  const hdr = document.getElementById('mk-header'); if(!hdr) return;
  const nav = [['index.html','home','Trang chủ'], ['campaigns.html','campaigns','Chiến dịch'], ['index.html#rank','rank','Bảng xếp hạng'], ['index.html#how','how','Hướng dẫn']];
  hdr.innerHTML = `<div class="wrap"><div class="mk-head-top">
    <a class="mk-logo" href="index.html"><img src="../assets/img/logo.png" alt="MAKENOV" onerror="this.parentNode.classList.add('txt');this.remove()"><span>MAKE<b>NOV</b></span><em class="aff-tag">Cộng tác viên</em></a>
    <div class="mk-head-right">${m
      ? `<a class="aff-me" href="my.html"><b>${esc(m.name)}</b><span id="aff-head-bal"></span></a><a class="btn btn-ghost btn-sm" href="my.html">Tài khoản</a><button class="btn btn-ghost btn-sm" onclick="AffApi.logout().then(()=>location.href='index.html')">Đăng xuất</button>`
      : `<a class="btn btn-ghost btn-sm" href="login.html">Đăng nhập</a><a class="btn btn-primary btn-sm" href="join.html">Đăng ký</a>`}</div>
  </div><nav class="mk-nav mk-head-nav">${nav.map(([h, k, t]) => `<a href="${h}" class="${active === k ? 'on' : ''}">${t}</a>`).join('')}
    <span class="gnb"><a href="${AFF_HOST}/" target="_blank" rel="noopener">Về MAKENOV ↗</a></span></nav></div>`;
  if(m) AffApi.summary().then(s => { const el = document.getElementById('aff-head-bal'); if(el) el.textContent = vnd(s.balance_vnd); }).catch(() => {});
}

function affFooter(){
  const f = document.getElementById('mk-footer'); if(!f) return;
  f.innerHTML = `<div class="wrap"><div class="brand"><div class="logo"><img src="../assets/img/logo.png" alt="MAKENOV" onerror="this.parentNode.classList.add('txt');this.remove()"><span>MAKE<b>NOV</b></span></div>
    <p class="desc">Chương trình cộng tác viên của MAKENOV — giới thiệu sản phẩm Hàn Quốc tới nhà phân phối Việt Nam và nhận hoa hồng theo từng khách hàng được duyệt.</p><a class="mail" href="mailto:ctv@makenov.com">ctv@makenov.com</a></div>
    <div><h4>Cộng tác viên</h4><a href="campaigns.html">Chiến dịch</a><a href="index.html#rank">Bảng xếp hạng</a><a href="index.html#how">Cách hoạt động</a></div>
    <div><h4>Tài khoản</h4><a href="join.html">Đăng ký</a><a href="login.html">Đăng nhập</a><a href="my.html">Trang của tôi</a></div>
    <div><h4>MAKENOV</h4><a href="${AFF_HOST}/" target="_blank" rel="noopener">Trang chủ MAKENOV</a><a href="${AFF_HOST}/products.html" target="_blank" rel="noopener">Sản phẩm</a><a href="${AFF_HOST}/support.html" target="_blank" rel="noopener">Hỗ trợ</a></div></div>
    <div class="base"><span>© 2026 MAKENOV. All rights reserved.</span><span>Hỗ trợ CTV qua Zalo: 0901 234 567</span></div>`;
}

/* 캠페인 카드 — 홈·목록 공용 (본 사이트 p-card 문법) */
function campaignCard(c){
  const left = c.remaining == null ? 'Không giới hạn' : `Còn ${c.remaining}`;
  return `<a class="p-card" href="campaign.html?id=${esc(c.product_id)}"><div class="thumb"><img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy"></div>
    <div class="body"><span class="brand">${esc(c.brand)}</span><h3>${esc(c.name)}</h3>
    <div class="meta"><span class="aff-cpa">${vnd(c.cpa_vnd)}<small>/khách hàng</small></span><span class="aff-left">${left}</span></div></div></a>`;
}

function affBoot(active, pageInit){
  document.addEventListener('DOMContentLoaded', async () => {
    affHeader(active); affFooter();
    if(typeof pageInit === 'function'){ try{ await pageInit(); }catch(e){ console.error(e); toast(e.message || 'Có lỗi xảy ra'); } }
  });
}
