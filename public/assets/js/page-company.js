/* 공급사 상세 렌더 — company.html(?id=) 과 companies/<id>.html 이 같이 쓴다.
   정적 페이지에서는 window.MK_COID 로 id 를 넘긴다. */

function pageInit(){
  const id = window.MK_COID || new URLSearchParams(location.search).get('id');
  const c = mkCompany(id) || MK_COMPANIES[0];
  const prods = mkCompanyProducts(c.id);
  const cat = mkCat(c.cat);
  const totalInq = prods.reduce((s,p)=>s+p.inquiries,0);
  const yrs = new Date().getFullYear() - Number(c.since);
  document.title = L(c.name) + ' | MAKENOV';

  document.getElementById('co-root').innerHTML = `
    <div class="co-cover"><img src="${c.cover}" alt=""></div>

    <div class="co-wrap">
      <div class="co-head">
        <img class="lg" src="${c.logo}" alt="">
        <div class="tx">
          <h1>${esc(L(c.name))}</h1>
          <p class="sub">${esc(L(c.tagline))}</p>
          <div class="chips">
            <span>${esc(L(c.location))}</span>
            ${cat?`<span>${esc(L(cat.name))}</span>`:''}
            <span>${yrs}${t('co_years')}</span>
            ${c.brn?`<span>${esc(c.brn)}</span>`:''}
          </div>
        </div>
      </div>

      <div class="co-body">
        <div class="co-main">

          <section class="co-sec">
            <h2 data-i18n="co_metrics"></h2>
            <div class="co-metrics">
              <div class="co-metric"><b>${esc(c.since)}</b><span data-i18n="co_since"></span></div>
              <div class="co-metric"><b>${esc(c.staff)}</b><span data-i18n="co_staff"></span></div>
              <div class="co-metric"><b>${esc(c.export)}</b><span data-i18n="co_export"></span></div>
              <div class="co-metric"><b>${prods.length}</b><span data-i18n="co_prod_unit"></span></div>
            </div>
          </section>

          <section class="co-sec">
            <h2 data-i18n="co_about"></h2>
            <p class="co-intro">${esc(L(c.intro))}</p>
          </section>

          <section class="co-sec">
            <h2 data-i18n="co_certs_title"></h2>
            <div class="co-certs">${(c.certs||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
          </section>

          <section class="co-sec">
            <h2 data-i18n="co_basic"></h2>
            <table class="co-table">
              <tr><th data-i18n="co_th_name"></th><td>${esc(L(c.name))}</td></tr>
              ${c.ceo?`<tr><th data-i18n="co_th_ceo"></th><td>${esc(c.ceo)}</td></tr>`:''}
              <tr><th data-i18n="co_since"></th><td>${esc(c.since)}</td></tr>
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
            <div class="t" data-i18n="co_cta_title"></div>
            <p class="d" data-i18n="co_cta_desc"></p>
            <button class="btn btn-primary"
              onclick="openInquiry(${JSON.stringify(prods.map(p=>p.id)).replace(/"/g,"'")})"
              data-i18n="co_cta_btn"></button>
            <div class="meta">
              <div><span data-i18n="co_products"></span> <b>${prods.length}</b></div>
              <div><span data-i18n="inquiries_count"></span> <b>${totalInq}</b></div>
              <div><span data-i18n="co_since"></span> <b>${esc(c.since)}</b></div>
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
