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
  const p = mkProduct(id) || MK_PRODUCTS[0];
  if(!p) return;                       // 부팅 실패 등으로 데이터가 없으면 정적 내용을 그대로 둔다
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

  /* 대표 영상 — 등록된 제품만 노출 */
  const mainVideo = p.video
    ? `<div class="pd-sec"><h2 data-i18n="pd_video"></h2>
         ${mkVideoEmbed(p.video)}</div>`
    : '';

  document.getElementById('pd-root').innerHTML = `
  <div class="pd-row">

    <div class="pd-main">
      <div class="pd-gallery">
        <div class="main"><img id="pd-shot" src="${gImgs[0]}" alt="${esc(L(p.name))}"></div>
        ${gImgs.length>1?`<span class="cnt" id="pd-cnt">1 / ${gImgs.length}</span>`:''}
      </div>
      ${gImgs.length>1?`<div class="pd-thumbs">${gImgs.map((g,i)=>
        `<img src="${g}" class="${i===0?'on':''}" onclick="setShot(${i})" alt="">`).join('')}</div>`:''}

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
          <img src="${co.logo}" alt="" loading="lazy">
          <div class="tx">
            <div class="nm">${esc(L(co.name))}</div>
            <div class="sub">${esc(L(co.location))} · ${(co.certs||[]).slice(0,3).join(' · ')}</div>
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
      <div class="box">
        <div class="brand">${esc(p.brand)}</div>
        <h1>${esc(L(p.name))}</h1>
        <p class="tagline">${esc(L(p.tagline))}</p>

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
          <button class="btn btn-soft" onclick="openCatalog('${p.id}')" data-i18n="cta_catalog"></button>
        </div>
      </div>
    </aside>

  </div>`;

  applyI18n(document.getElementById('pd-root'));
  unlockIfAuthed();

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
