/* ============================================================
   aff.js — 제휴(affiliate) 마케터 화면 공통  (v2: 텐핑식 사이드바 틀)
   ------------------------------------------------------------
   본 사이트 app.js 와 완전히 분리된 층이다(세션·스토어 공유 없음).
   CSS 는 style.css 의 토큰·버튼만 같이 쓰고, 틀은 affiliate.css.
   틀: 왼쪽 고정 사이드바(로고·프로필·메뉴) + 오른쪽 본문(상단바 + 내용 + 푸터)
   레퍼런스: tenping.kr (2026-09-09 지시) — 구조만, 색·폰트는 MAKENOV.
   데이터는 window.AffApi (aff-mock.js → 나중에 aff-api.js).
   ============================================================ */
const AFF_HOST = 'https://vn.makenov.com';
const AFF_ZALO = '0901234567';
const AFF_CATS = [
  { id:'beauty', name:'Mỹ phẩm & Làm đẹp' }, { id:'food', name:'Thực phẩm & Đồ uống' }, { id:'living', name:'Đồ gia dụng' },
  { id:'health', name:'Sức khỏe & Thể thao' }, { id:'kids', name:'Mẹ & Bé' }, { id:'tech', name:'Thiết bị & Công nghệ' },
];
const AFF_ST = { pending:'Chờ duyệt', approved:'Đã duyệt', rejected:'Từ chối', requested:'Đang xử lý', paid:'Đã chuyển' };

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
async function copyText(s, msg){
  try{ await navigator.clipboard.writeText(s); }
  catch(e){ const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(msg || 'Đã sao chép');
}

/* 로그인 필요 페이지 — 없으면 login.html 로 보내고 돌아올 주소를 남긴다 */
function affGuard(){
  const m = AffApi.session();
  if(m) return m;
  location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
  return null;
}

/* ---------- 공유 ----------
   링크는 항상 마케터 코드가 붙은 것. 비로그인은 로그인으로 보낸다.
   Facebook 은 공유창, Zalo·TikTok 은 앱 안에서 붙여넣는 흐름이라 복사 + 안내. */
function affShareLink(pid){
  const m = AffApi.session();
  if(!m){ location.href = 'login.html?next=' + encodeURIComponent('campaign.html?id=' + pid); return null; }
  return affLink(m.code, pid);
}
function shareTo(where, pid, ev){
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const link = affShareLink(pid); if(!link) return;
  if(where === 'fb'){ window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link), '_blank', 'width=640,height=520'); return; }
  if(where === 'zalo'){ copyText(link, 'Đã sao chép link — dán vào Zalo để gửi'); return; }
  if(where === 'tiktok'){ copyText(link, 'Đã sao chép link — dán vào bio hoặc bình luận TikTok'); return; }
  copyText(link);
}
function shareIcons(pid, size){
  const s = size || '';
  return `<div class="aff-share ${s}">
    <button class="si fb" title="Chia sẻ lên Facebook" onclick="shareTo('fb','${pid}',event)">f</button>
    <button class="si zalo" title="Gửi qua Zalo" onclick="shareTo('zalo','${pid}',event)">Z</button>
    <button class="si tiktok" title="Dán vào TikTok" onclick="shareTo('tiktok','${pid}',event)">T</button>
    <button class="si copy" title="Sao chép link" onclick="shareTo('copy','${pid}',event)">⧉</button></div>`;
}

/* ---------- 틀: 사이드바 + 상단바 + 푸터 ---------- */
const AFF_MENU = [
  ['index.html', 'home', 'Chiến dịch', ''],
  ['rank.html', 'rank', 'Bảng xếp hạng', ''],
  ['guide.html', 'guide', 'Hướng dẫn cho người mới', 'Tip'],
  ['guide.html#calc', 'calc', 'Tính thu nhập', 'New'],
  ['guide.html#rules', 'rules', 'Quy định chia sẻ', ''],
];
function affSidebar(active){
  const m = AffApi.session();
  const side = document.getElementById('aff-side'); if(!side) return;
  side.innerHTML = `
    <a class="aff-logo" href="index.html"><img src="../assets/img/logo.png" alt="MAKENOV" onerror="this.parentNode.classList.add('txt');this.remove()"><span>MAKE<b>NOV</b></span><em>Cộng tác viên</em></a>
    <div class="aff-profile">
      <div class="av">${m ? esc(m.name.trim().slice(0, 1).toUpperCase()) : ''}</div>
      ${m ? `<div class="nm">${esc(m.name)}</div><div class="sub">Mã CTV <b>${esc(m.code)}</b></div><div class="bal" id="aff-side-bal">—</div>
             <div class="acts"><a class="btn btn-primary btn-sm" href="my.html">Trang của tôi</a><button class="btn btn-ghost btn-sm" onclick="AffApi.logout().then(()=>location.href='index.html')">Đăng xuất</button></div>`
          : `<div class="sub">Đăng nhập để lấy link và nhận hoa hồng</div>
             <div class="acts"><a class="btn btn-primary btn-sm" href="login.html">Đăng nhập</a><a class="btn btn-ghost btn-sm" href="join.html">Đăng ký</a></div>`}
    </div>
    <nav class="aff-menu">${AFF_MENU.map(([h, k, t, tag]) => `<a href="${h}" class="${active === k ? 'on' : ''}">${t}${tag ? `<i class="tag ${tag.toLowerCase()}">${tag}</i>` : ''}</a>`).join('')}</nav>
    <div class="aff-side-cta"><b>Bạn là nhà sản xuất?</b><span>Đăng sản phẩm lên MAKENOV để cộng tác viên giới thiệu.</span><a class="btn btn-ghost btn-sm" href="${AFF_HOST}/maker.html" target="_blank" rel="noopener">Đăng sản phẩm ↗</a></div>
    <div class="aff-side-links"><a href="${AFF_HOST}/" target="_blank" rel="noopener">Về MAKENOV</a><a href="https://zalo.me/${AFF_ZALO}" target="_blank" rel="noopener">Hỗ trợ Zalo</a><a href="guide.html#rules">Quy định</a></div>`;
  if(m) AffApi.summary().then(s => { const el = document.getElementById('aff-side-bal'); if(el) el.textContent = vnd(s.balance_vnd); }).catch(() => {});
}
function affTopbar(opts){
  const m = AffApi.session();
  const top = document.getElementById('aff-top'); if(!top) return;
  const left = opts.back ? `<a class="back" href="${esc(opts.back)}" aria-label="Quay lại">←</a><h1>${esc(opts.title || '')}</h1>` : `<h1>${esc(opts.title || '')}</h1>`;
  top.innerHTML = `<button class="aff-burger" onclick="document.body.classList.toggle('aff-side-open')" aria-label="Menu">☰</button>
    <a class="aff-logo m" href="index.html"><img src="../assets/img/logo.png" alt="MAKENOV" onerror="this.parentNode.classList.add('txt');this.remove()"><span>MAKE<b>NOV</b></span></a>
    <div class="ttl">${left}</div>
    <div class="mid" id="aff-top-mid">${opts.mid || ''}</div>
    <div class="right">${m ? `<a href="my.html"><b>${esc(m.name)}</b></a>` : `<a href="login.html">Đăng nhập</a>`}</div>`;
}
function affFooter(){
  const f = document.getElementById('aff-foot'); if(!f) return;
  f.innerHTML = `<span>© 2026 MAKENOV · Chương trình cộng tác viên</span><span><a href="${AFF_HOST}/" target="_blank" rel="noopener">makenov.com</a> · <a href="guide.html#rules">Quy định</a> · <a href="https://zalo.me/${AFF_ZALO}" target="_blank" rel="noopener">Zalo hỗ trợ</a></span>`;
}
function affBoot(active, opts, pageInit){
  document.addEventListener('DOMContentLoaded', async () => {
    affSidebar(active); affTopbar(opts || {}); affFooter();
    document.addEventListener('click', e => { if(document.body.classList.contains('aff-side-open') && !e.target.closest('#aff-side,.aff-burger')) document.body.classList.remove('aff-side-open'); });
    if(typeof pageInit === 'function'){ try{ await pageInit(); }catch(e){ console.error(e); toast(e.message || 'Có lỗi xảy ra'); } }
  });
}

/* ---------- 캠페인 행 (홈 목록) — 텐핑 행 구조: 썸네일 | 카테고리·브랜드 / 제목 / 한줄 | 공유 아이콘 | 버튼 2개 ---------- */
function campaignRow(c){
  const left = c.remaining == null ? 'Không giới hạn' : `Còn ${c.remaining} suất`;
  return `<article class="aff-row" onclick="location.href='campaign.html?id=${esc(c.product_id)}'">
    <a class="th" href="campaign.html?id=${esc(c.product_id)}"><img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy"></a>
    <div class="bd">
      <div class="meta"><b>${esc(catName(c.cat))}</b><i>|</i>${esc(c.brand)}</div>
      <h3><a href="campaign.html?id=${esc(c.product_id)}">${esc(c.name)}</a></h3>
      <p>${esc(c.headline || '')}</p>
      <div class="foot">${shareIcons(c.product_id)}<span class="cpa">${vnd(c.cpa_vnd)}<small>/khách hàng</small></span><span class="left">${left}</span></div>
    </div>
    <div class="acts">
      <a class="btn btn-primary btn-sm" href="campaign.html?id=${esc(c.product_id)}" onclick="event.stopPropagation()">Thông tin chia sẻ</a>
      <a class="btn btn-ghost btn-sm" href="${AFF_HOST}/products/${esc(c.product_id)}.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Trang sản phẩm ↗</a>
    </div></article>`;
}
