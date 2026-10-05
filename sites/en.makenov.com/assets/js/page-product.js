/* 제품 상세 페이지 렌더 — product.html(동적)과 products/*.html(정적 굽기) 공용.
   구운 페이지는 window.MK_PID 로 제품을 지정하고, 동적 페이지는 ?id= 를 읽는다. */
let gIdx = 0, gImgs = [];

function setShot(i){
  gIdx = i;
  const m = document.getElementById('pd-shot');
  if(m) m.src = gImgs[i];
  document.querySelectorAll('.pd-thumbs img').forEach((el,n)=>el.classList.toggle('on', n===i));
  const c = document.getElementById('pd-cnt');
  if(c) c.textContent = (i+1)+' / '+gImgs.length;
}

function pageInit(){
  const id = window.MK_PID || new URLSearchParams(location.search).get('id');
  /* id 가 있는데 목록에 없으면(숨김·삭제된 제품) 첫 제품으로 바꿔치기하지 않는다.
     구워진 정적 페이지(MK_PID)는 정적 내용을 그대로 두고, 동적 뷰어(product.html?id=)만 안내문을 띄운다. */
  const p = mkProduct(id) || (id ? null : MK_PRODUCTS[0]);
  if(!p){
    if(id && !window.MK_PID){
      const root = document.getElementById('pd-root');
      if(root) root.innerHTML = `<div class="pd-row"><div class="pd-main" style="padding:64px 0;text-align:center"><p style="font-size:16px;margin:0 0 18px">${t('pd_not_found')}</p><a class="btn btn-primary" href="${mkUrl('products.html')}">${t('nav_directory')}</a></div></div>`;
    }
    return;                            // 부팅 실패 등으로 데이터가 없으면 정적 내용을 그대로 둔다
  }
  const co = mkCompanyOf(p);
  const inCart = Store.cartHas(p.id);
  gImgs = (p.gallery && p.gallery.length) ? p.gallery : [p.img];
  gIdx = 0;
  document.title = L(p.name) + ' | MAKENOV';

  /* 상세 본문 — 문단 / 이미지 / 영상 블록
     seq:true 인 이미지는 통상세페이지를 세로로 자른 조각이므로
     연속된 것끼리 .pd-strip 으로 묶어 틈 없이 이어 붙인다. */
  const blocks = p.detail || [];
  let detail = '', i = 0;
  while(i < blocks.length){
    const b = blocks[i];
    if(b.type === 'img' && b.seq){
      const group = [];
      while(i < blocks.length && blocks[i].type === 'img' && blocks[i].seq){
        group.push(blocks[i]); i++;
      }
      detail += `<div class="pd-strip">${group.map((g,n)=>
        `<img src="${g.src}" alt="${esc(L(p.name))} 상세 ${n+1}"${g.w?` width="${g.w}" height="${g.h}"`:''} loading="${n<2?'eager':'lazy'}">`).join('')}</div>`;
      continue;
    }
    if(b.type==='p')          detail += `<p>${esc(L(b.text))}</p>`;
    else if(b.type==='img')   detail += `<img src="${b.src}" alt="${esc(L(p.name))}" loading="lazy">`;
    else if(b.type==='video') detail += mkVideoEmbed(b.src);
    i++;
  }

  /* 유통 파트너 모집 — 모든 제품 공통(MK_SETTINGS.pdDist), 관리자 > 제품 탭에서 편집.
     bake-products.js 의 distHtml 과 같은 마크업이어야 하이드레이션 교체가 안 보인다. */
  const distSec = mkPdDistHtml(p);

  /* 대표 영상 — 등록된 제품만 노출 */
  const mainVideo = p.video
    ? `<div class="pd-sec"><h2 data-i18n="pd_video"></h2>
         ${mkVideoEmbed(p.video)}</div>`
    : '';

  /* 미팅 펀딩 — 이 제품이 다가오는 방문 일정에 걸려 있으면 이 페이지가 곧 펀딩 페이지다 */
  const mtOn = typeof MkMeet !== 'undefined' && !!MkMeet.forProduct(p.id);

  /* 후킹 제목·서브 카피(관리자 › 제품) — 있으면 h1 자리에 후킹 제목, 제품명은 그 위에 작게.
     bake-products.js 의 정적 마크업과 같아야 하이드레이션 교체가 안 보인다. */
  const hkT = p.hook ? L(p.hook.title) : '', hkS = p.hook ? L(p.hook.sub) : '';

  document.getElementById('pd-root').innerHTML = `
  <div class="pd-row ${mtOn ? 'mt-on' : ''}">

    <div class="pd-main">
      <div class="pd-gallery">
        <div class="main"><img id="pd-shot" src="${gImgs[0]}" alt="${esc(L(p.name))}"></div>
        ${gImgs.length>1?`<span class="cnt" id="pd-cnt">1 / ${gImgs.length}</span>`:''}
      </div>
      ${gImgs.length>1?`<div class="pd-thumbs">${gImgs.map((g,i)=>
        `<img src="${g}" class="${i===0?'on':''}" onclick="setShot(${i})" alt="">`).join('')}</div>`:''}

      ${distSec}

      ${mainVideo}

      <div class="pd-sec">
        <h2 data-i18n="detail_title"></h2>
        <div class="pd-body">${detail || `<p>${esc(L(p.tagline))}</p>`}</div>
      </div>

      <div class="pd-sec">
        <h2 data-i18n="brand_story"></h2>
        <div class="pd-body"><p>${esc(L(p.brandStory))}</p></div>
        ${co?`
        <a class="co-inline" href="${mkDocUrl('company',co.id)}">
          <img src="${co.logo}" alt="" loading="lazy" onload="mkLogoTrim(this)">
          <div class="tx">
            <div class="nm">${esc(L(co.name))}</div>
            <div class="sub">${esc(L(co.location))} · ${(co.certs||[]).slice(0,3).map(x=>esc(L(x))).join(' · ')}</div>
          </div>
          <span class="go" data-i18n="co_view"></span>
        </a>`:''}
      </div>

      <div class="pd-sec">
        <h2 data-i18n="sec_related"></h2>
        <div class="co-prods">${MK_PRODUCTS.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,2).map(productCard).join('')}</div>
      </div>
    </div>

    <aside class="pd-side">
      <div class="box ${mtOn ? 'mt-box-on' : ''}">
        <div class="brand">${esc(p.brand)}</div>
        ${hkT ? `<div class="pd-name">${esc(L(p.name))}</div>` : ''}
        <h1 class="${hkT ? 'hooked' : ''}">${esc(hkT || L(p.name))}</h1>
        <p class="tagline">${esc(hkS || L(p.tagline))}</p>

        ${mtOn ? `
        <!-- 미팅 펀딩 중(2026-09-29): 이 박스는 펀딩 패널 하나만 — 숫자 · 일정 · [관심][공유][미팅 신청].
             가격·MOQ 박스와 견적 버튼은 사용자 지시로 뺐다(미팅이 이 페이지의 유일한 행동). app.js mtFundingPanel / mtFillSlots -->
        <div data-mt-product="${esc(p.id)}">${mtFundingPanel(p.id)}</div>` : `
        <div class="stat">
          <div><b>${p.inquiries}</b><span data-i18n="inquiries_count"></span></div>
          <div><b>${p.views.toLocaleString()}</b><span data-i18n="views_label"></span></div>
        </div>

        <div class="lockbox">
          <div class="lockrow"><span class="lbl" data-i18n="price"></span><span class="lockval">${esc(lockVal(L(p.price)))}</span>${p.negotiable?`<span class="nego" data-i18n="negotiable_badge"></span>`:''}</div>
          <div class="lockrow"><span class="lbl" data-i18n="moq"></span><span class="lockval">${esc(lockVal(L(p.moq)))}</span></div>
          <div class="lockrow"><span class="lbl" data-i18n="lead_time"></span><span class="lockval">${esc(lockVal(L(p.lead)))}</span></div>
          <div class="lockrow"><span class="lbl" data-i18n="supply_terms"></span><span class="lockval">${esc(lockVal(L(p.terms)))}</span></div>
          ${Store.session()?'':`<div class="locknote" data-i18n="locked_note"></div>`}
        </div>

        <div class="pd-ctas">
          <button class="btn btn-primary" onclick="openInquiry(['${p.id}'])" data-i18n="cta_inquiry"></button>
          <button class="btn btn-ghost" id="pd-cart" onclick="toggleCart('${p.id}');pdCartLabel('${p.id}')">
            <span data-i18n="${inCart?'cta_wishlist_on':'cta_wishlist'}"></span></button>
          ${mkCatalogHidden(p)?'':`<button class="btn btn-soft" onclick="openCatalog('${p.id}')" data-i18n="cta_catalog"></button>`}
        </div>`}
      </div>
    </aside>

  </div>`;

  applyI18n(document.getElementById('pd-root'));
  unlockIfAuthed();

  /* 일정 페이지 카드에서 #meet 로 들어오면 펀딩 패널로 (한 번만) */
  if(mtOn && location.hash === '#meet' && !window._mtJumped){
    /* 사진이 늦게 로드되면 높이가 늘어 패널이 밀려난다 — 로드가 끝난 뒤 한 번 더 맞춘다 */
    const go = ()=>{ const el = document.getElementById('meet'); if(el) el.scrollIntoView({ block:'center' }); };
    window._mtJumped = true;
    setTimeout(go, 80);
    if(document.readyState !== 'complete') addEventListener('load', ()=>setTimeout(go, 50), { once:true });
    else setTimeout(go, 600);
  }

  /* 광고 목적지 = 이 페이지. 언어를 바꾸면 pageInit이 다시 도는데,
     그때마다 쏘면 조회수가 부풀려지므로 제품당 한 번만 보낸다. */
  if(_vcSent !== p.id){
    _vcSent = p.id;
    mkTrack('ViewContent', mkProductParams(p));
  }
}
let _vcSent = null;

function pdCartLabel(pid){
  const b = document.getElementById('pd-cart');
  if(!b) return;
  b.innerHTML = `<span data-i18n="${Store.cartHas(pid)?'cta_wishlist_on':'cta_wishlist'}"></span>`;
  applyI18n(b);
}

/* 제품 상세 공통 섹션(유통 파트너 모집) 마크업 — 제목 + ✅ 항목 목록.
   꺼져 있거나(on:false) 현재 언어 문구가 하나도 없으면 아예 그리지 않는다. */
function mkPdDistHtml(p){
  /* 제품별 설정(p.dist)이 있으면 그것, 없으면 공통(MK_SETTINGS.pdDist) */
  const pd = p && p.dist;
  if(pd && pd.mode === 'off') return '';
  const d = (pd && pd.mode === 'custom') ? pd : ((typeof MK_SETTINGS !== 'undefined' && MK_SETTINGS.pdDist) || null);
  if(!d || (d.on === false && !(pd && pd.mode === 'custom'))) return '';
  const title = L(d.title);
  const items = (d.items || []).map(it => L(it)).filter(x => String(x).trim());
  if(!title && !items.length) return '';
  return `<section class="pd-sec pd-dist">${title ? `<h2>${esc(title)}</h2>` : ''}${items.length
    ? `<ul class="pd-checks">${items.map(x => `<li><span class="ck">✓</span><span>${esc(x)}</span></li>`).join('')}</ul>` : ''}</section>`;
}
