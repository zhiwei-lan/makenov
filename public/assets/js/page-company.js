/* 공급사 상세 렌더 — company.html(?id=) 과 companies/<id>.html 이 같이 쓴다.
   정적 페이지에서는 window.MK_COID 로 id 를 넘긴다. */

function pageInit(){
  const id = window.MK_COID || new URLSearchParams(location.search).get('id');
  const c = mkCompany(id) || MK_COMPANIES[0];
  const prods = mkCompanyProducts(c.id);
  const cat = mkCat(c.cat);
  /* 이 공급사의 제품이 모집 중인 행사에 걸려 있으면 그 미팅 신청으로 바로 — 예전엔 가입·사업자 인증 창이 떴다(2026-10-05 전체 점검) */
  const meetHit = (typeof MkMeet !== 'undefined' ? prods.map(p => MkMeet.forProduct(p.id)) : []).find(h => h && h.trip && h.trip.open) || null;
  /* 값이 없는 항목(빈 칸·'—'·'-')은 칸째 숨긴다 */
  const has = v => !!String(v ?? '').replace(/[\s\-—–.·]/g, '');
  const yrs = has(c.since) ? new Date().getFullYear() - Number(c.since) : NaN;
  const metrics = [
    has(c.since)  ? `<div class="co-metric"><b>${esc(c.since)}</b><span data-i18n="co_since"></span></div>` : '',
    has(c.staff)  ? `<div class="co-metric"><b>${esc(c.staff)}</b><span data-i18n="co_staff"></span></div>` : '',
    has(c.export) ? `<div class="co-metric"><b>${esc(c.export)}</b><span data-i18n="co_export"></span></div>` : '',
    `<div class="co-metric"><b>${prods.length}</b><span data-i18n="co_prod_unit"></span></div>`,
  ].filter(Boolean);
  document.title = L(c.name) + ' | MAKENOV';
  /* 공급사 상세 조회 — 제품과 같은 ViewContent 지만 content_type 으로 구분. 언어 전환 재렌더는 한 번만 */
  if(window._vcSentCo !== c.id){
    window._vcSentCo = c.id;
    mkTrack('ViewContent', { content_type:'company', content_ids:[c.id], content_name:L(c.name), content_category:c.cat || '' });
  }

  document.getElementById('co-root').innerHTML = `
    <div class="co-cover"><img src="${c.cover}" alt=""></div>

    <div class="co-wrap">
      <div class="co-head">
        <img class="lg" src="${c.logo}" alt="" onload="window.mkLogoTrim&&mkLogoTrim(this)">
        <div class="tx">
          <h1>${esc(L(c.name))}</h1>
          <p class="sub">${esc(L(c.tagline))}</p>
          <div class="chips">
            <span>${esc(L(c.location))}</span>
            ${cat?`<span>${esc(L(cat.name))}</span>`:''}
            ${yrs > 0 ? `<span>${yrs}${t('co_years')}</span>` : ''}
            ${c.brn?`<span>${esc(c.brn)}</span>`:''}
          </div>
        </div>
      </div>

      <div class="co-body">
        <div class="co-main">

          <section class="co-sec">
            <h2 data-i18n="co_metrics"></h2>
            <div class="co-metrics n${metrics.length}" style="--n:${metrics.length}">${metrics.join('')}</div>
          </section>

          <section class="co-sec">
            <h2 data-i18n="co_about"></h2>
            <p class="co-intro">${esc(L(c.intro))}</p>
          </section>

          <section class="co-sec">
            <h2 data-i18n="co_certs_title"></h2>
            <div class="co-certs">${(c.certs||[]).map(x=>`<span>${esc(L(x))}</span>`).join('')}</div>
          </section>

          <section class="co-sec">
            <h2 data-i18n="co_basic"></h2>
            <table class="co-table">
              <tr><th data-i18n="co_th_name"></th><td>${esc(L(c.name))}</td></tr>
              ${c.ceo?`<tr><th data-i18n="co_th_ceo"></th><td>${esc(c.ceo)}</td></tr>`:''}
              ${has(c.since)?`<tr><th data-i18n="co_since"></th><td>${esc(c.since)}</td></tr>`:''}
              <tr><th data-i18n="auth_address"></th><td>${esc(L(c.location))}</td></tr>
              ${c.brn?`<tr><th data-i18n="auth_brn"></th><td>${esc(c.brn)}</td></tr>`:''}
              ${c.moqPolicy?`<tr><th data-i18n="moq"></th><td>${esc(c.moqPolicy)}</td></tr>`:''}
              ${c.site?`<tr><th data-i18n="co_th_site"></th><td>${esc(c.site)}</td></tr>`:''}
            </table>
          </section>

          <section class="co-sec">
            <h2><span data-i18n="co_products"></span><span class="n">${prods.length}</span></h2>
            <div class="co-prods">${prods.map(productCard).join('')}</div>
          </section>

        </div>

        <aside class="co-aside">
          <div class="co-box">
            <div class="t" data-i18n="co_meet_t"></div>
            <p class="d" data-i18n="${meetHit ? 'co_meet_d' : 'co_meet_none'}"></p>
            ${meetHit
              ? `<button class="btn btn-primary" onclick="openMeetApply('${esc(meetHit.trip.id)}','${esc(meetHit.item.product_id)}')" data-i18n="mt_btn_apply"></button>`
              : `<a class="btn btn-primary" href="${mkUrl('meetings.html')}" data-i18n="pd_nomeet_cta"></a>`}
            <div class="meta">
              <div><span data-i18n="co_products"></span> <b>${prods.length}</b></div>
              ${has(c.since)?`<div><span data-i18n="co_since"></span> <b>${esc(c.since)}</b></div>`:''}
            </div>
          </div>
        </aside>
      </div>

      <section class="co-sec" style="border-top:1px solid var(--mk-line);padding-top:36px">
        <div class="sec-head">
          <h2 data-i18n="co_other"></h2>
          <a class="more" href="companies.html" data-i18n="view_more"></a>
        </div>
        <div class="co-grid">${MK_COMPANIES.filter(x=>x.id!==c.id).slice(0,3).map(companyCard).join('')}</div>
      </section>
    </div>`;

  applyI18n(document.getElementById('co-root'));
}
