/* ============================================================
   aff.js — 제휴(CTV) 마케터 화면 공통  (v3: i18n ko/vi + 정리된 틀)
   ------------------------------------------------------------
   본 사이트 app.js 와 완전히 분리(세션·스토어 공유 없음). CSS 토큰만 style.css.
   틀: 왼쪽 사이드바(로고·언어·프로필·메뉴) + 본문(상단바 + 내용 + 푸터). 레퍼런스 tenping.kr.
   문구: aff-i18n.js (AFF_I18N) — 기본 vi, 토글/?lang=ko 로 한국어. 데이터: window.AffApi(aff-api.js).
   ============================================================ */
const AFF_HOST = 'https://vn.makenov.com';
const AFF_ZALO = '0901234567';
const AFF_CATS = ['beauty', 'food', 'living', 'health', 'kids', 'tech'];

/* ---------- 언어 ---------- */
const AFF_LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if(q === 'ko' || q === 'vi'){ try{ localStorage.setItem('aff_lang', q); }catch(e){} return q; }
  try{ const s = localStorage.getItem('aff_lang'); if(s === 'ko' || s === 'vi') return s; }catch(e){}
  return 'vi';
})();
function t(key, vars){
  let s = (AFF_I18N[AFF_LANG] && AFF_I18N[AFF_LANG][key]) ?? AFF_I18N.vi[key] ?? key;
  if(vars) Object.entries(vars).forEach(([k, v]) => { s = s.split('{' + k + '}').join(v); });
  return s;
}
function affSetLang(l){ try{ localStorage.setItem('aff_lang', l); }catch(e){} const u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.toString(); }
/* data-i18n / data-i18n-ph 채우기 (HTML 허용 — 문구는 우리 것) */
function affApplyI18n(root){
  (root || document).querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n')); });
  (root || document).querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.documentElement.lang = AFF_LANG;
}

/* ---------- 헬퍼 ---------- */
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function vnd(n){ return (Math.round(Number(n) || 0)).toLocaleString('vi-VN') + ' ₫'; }
function cName(c){ return (AFF_LANG === 'ko' && c.name_ko) ? c.name_ko : c.name; }
function catName(id){ return AFF_CATS.includes(id) ? t('cat_' + id) : id; }
function affLink(code, pid, ch){ const c = ch ? `&ch=${ch}` : ''; return pid ? `${AFF_HOST}/products/${pid}.html?ref=${code}${c}` : `${AFF_HOST}/?ref=${code}${c}`; }
function qs(k){ return new URLSearchParams(location.search).get(k) || ''; }
function fmtDate(s){ return String(s || '').slice(0, 10); }
function stBadge(st){ return `<span class="aff-status ${esc(st)}">${esc(t('st_' + st + '_b'))}</span>`; }
function chName(k){ return t('ch_' + (k || 'other')) === 'ch_' + (k || 'other') ? k : t('ch_' + (k || 'other')); }

function toast(msg){
  let el = document.querySelector('.toast');
  if(!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600);
}
async function copyText(s, msg){
  try{ await navigator.clipboard.writeText(s); }
  catch(e){ const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(msg || t('copied'));
}
function affGuard(){
  const m = AffApi.session();
  if(m) return m;
  location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
  return null;
}

/* ---------- 공유 (캠페인 상세에서만) ---------- */
function shareTo(where, pid, ev){
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const m = AffApi.session();
  if(!m){ location.href = 'login.html?next=' + encodeURIComponent('campaign.html?id=' + pid); return; }
  const link = affLink(m.code, pid, where);
  if(where === 'fb'){ window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link), '_blank', 'width=640,height=520'); return; }
  if(where === 'zalo'){ copyText(link, t('copied_zalo')); return; }
  if(where === 'tiktok'){ copyText(link, t('copied_tiktok')); return; }
  copyText(link, t('copied_link'));
}
function shareIcons(pid){
  return `<div class="aff-share">
    <button class="si fb" title="${t('share_fb')}" onclick="shareTo('fb','${pid}',event)">f</button>
    <button class="si zalo" title="${t('share_zalo')}" onclick="shareTo('zalo','${pid}',event)">Z</button>
    <button class="si tiktok" title="${t('share_tiktok')}" onclick="shareTo('tiktok','${pid}',event)">T</button>
    <button class="si copy" title="${t('share_copy')}" onclick="shareTo('copy','${pid}',event)">⧉</button></div>`;
}

/* ---------- 틀 ---------- */
const AFF_MENU = [['index.html', 'home', 'menu_home'], ['rank.html', 'rank', 'menu_rank'], ['guide.html', 'guide', 'menu_guide'], ['guide.html#calc', 'calc', 'menu_calc'], ['guide.html#rules', 'rules', 'menu_rules']];
function affSidebar(active){
  const m = AffApi.session();
  const side = document.getElementById('aff-side'); if(!side) return;
  side.innerHTML = `
    <div class="aff-side-head"><a class="aff-logo" href="index.html"><img src="../assets/img/logo.png" alt="MAKENOV" onerror="this.parentNode.classList.add('txt');this.remove()"><span>MAKE<b>NOV</b></span></a>
      <div class="aff-lang"><button class="${AFF_LANG === 'vi' ? 'on' : ''}" onclick="affSetLang('vi')">VI</button><button class="${AFF_LANG === 'ko' ? 'on' : ''}" onclick="affSetLang('ko')">KO</button></div></div>
    <div class="aff-tagline">${t('brand_tag')}</div>
    <div class="aff-profile">
      ${m ? `<div class="av">${esc(m.name.trim().slice(0, 1).toUpperCase())}</div><div class="nm">${esc(m.name)}</div><div class="sub">${t('code')} <b>${esc(m.code)}</b></div><div class="bal" id="aff-side-bal">—</div>
             <div class="acts"><a class="btn btn-primary btn-sm" href="my.html">${t('my')}</a><button class="btn btn-ghost btn-sm" onclick="AffApi.logout().then(()=>location.href='index.html')">${t('logout')}</button></div>`
          : `<div class="av"></div><div class="sub">${t('side_guest')}</div>
             <div class="acts"><a class="btn btn-primary btn-sm" href="login.html">${t('login')}</a><a class="btn btn-ghost btn-sm" href="join.html">${t('join')}</a></div>`}
    </div>
    <nav class="aff-menu">${AFF_MENU.map(([h, k, key]) => `<a href="${h}" class="${active === k ? 'on' : ''}">${t(key)}</a>`).join('')}</nav>
    <div class="aff-side-links"><a href="${AFF_HOST}/" target="_blank" rel="noopener">${t('side_about')}</a><a href="https://zalo.me/${AFF_ZALO}" target="_blank" rel="noopener">${t('side_zalo')}</a></div>`;
  if(m) AffApi.summary().then(s => { const el = document.getElementById('aff-side-bal'); if(el) el.textContent = vnd(s.balance_vnd); }).catch(() => {});
}
function affTopbar(opts){
  const m = AffApi.session();
  const top = document.getElementById('aff-top'); if(!top) return;
  const title = opts.titleKey ? t(opts.titleKey) : (opts.title || '');
  top.innerHTML = `<button class="aff-burger" onclick="document.body.classList.toggle('aff-side-open')" aria-label="Menu">☰</button>
    <a class="aff-logo m" href="index.html"><img src="../assets/img/logo.png" alt="MAKENOV" onerror="this.parentNode.classList.add('txt');this.remove()"><span>MAKE<b>NOV</b></span></a>
    <div class="ttl">${opts.back ? `<a class="back" href="${esc(opts.back)}">←</a>` : ''}<h1>${esc(title)}</h1></div>
    <div class="mid">${opts.mid || ''}</div>
    <div class="right">${m ? `<a href="my.html"><b>${esc(m.name)}</b></a>` : `<a href="login.html">${t('login')}</a>`}</div>`;
}
function affFooter(){
  const f = document.getElementById('aff-foot'); if(!f) return;
  f.innerHTML = `<span>© 2026 MAKENOV · ${t('foot_prog')}</span><span><a href="${AFF_HOST}/" target="_blank" rel="noopener">makenov.com</a> · <a href="guide.html#rules">${t('side_rules')}</a> · <a href="https://zalo.me/${AFF_ZALO}" target="_blank" rel="noopener">Zalo</a></span>`;
}
function affBoot(active, opts, pageInit){
  document.addEventListener('DOMContentLoaded', async () => {
    affApplyI18n(); affSidebar(active); affTopbar(opts || {}); affFooter();
    document.addEventListener('click', e => { if(document.body.classList.contains('aff-side-open') && !e.target.closest('#aff-side,.aff-burger')) document.body.classList.remove('aff-side-open'); });
    if(typeof pageInit === 'function'){ try{ await pageInit(); }catch(e){ console.error(e); toast(e.message || t('err')); } }
  });
}

/* ---------- 캠페인 행 (홈) — 썸네일 | 카테고리·브랜드 / 제품명 / 한 줄 | 단가·잔여 ---------- */
function campaignRow(c){
  const left = c.remaining == null ? t('unlimited') : t('left', { n: c.remaining });
  return `<a class="aff-row" href="campaign.html?id=${esc(c.product_id)}">
    <span class="th"><img src="${esc(c.img)}" alt="${esc(c.name)}" loading="lazy"></span>
    <span class="bd"><span class="meta"><b>${esc(catName(c.cat))}</b><i>|</i>${esc(c.brand)}</span><span class="nm">${esc(cName(c))}</span><span class="hl">${esc(c.headline || '')}</span></span>
    <span class="rt"><span class="cpa">${vnd(c.cpa_vnd)}<small>${t('per_lead')}</small></span><span class="left">${left}</span><span class="go">${t('detail')} →</span></span></a>`;
}
