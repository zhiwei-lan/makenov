/* ============================================================
   MAKENOV — 사업자 인증 (전부 무료)
   1) mst    베트남 세금코드 → 국세청 공개 API (무키·무료, 회사명·주소 자동입력)
   2) brn    한국 사업자등록번호 → 체크섬 검증 (오프라인·즉시·무료)
             + 국세청 진위확인 API 훅 (공공데이터포털 키 발급 시 NTS_KEY만 채우면 활성)
   3) domain 회사 이메일 도메인 (무료메일 차단 + 도메인 실존 확인, 무료)
   ============================================================ */

/* 공공데이터포털 "국세청_사업자등록정보 진위확인 및 상태조회" 일반 인증키(Decoding).
    배포 시에는 이 값을 Supabase Edge Function으로 옮겨야 합니다 (브라우저 소스에 노출됨). */
/* ⚠️ 이 저장소는 공개입니다. 이 키는 노출된 상태로 배포됩니다 (사용자 판단).
   쿼터 남용이 감지되면 공공데이터포털에서 키를 재발급하고,
   Edge Function(supabase/functions/verify-business)으로 옮기세요. */
const NTS_KEY = '35e50af9099593cd0d69a7eb7694c5d48b5695b209b2fb11fc1d38af16e3d772';

/* ---------- 1. 한국 사업자등록번호 체크섬 (국세청 공식 알고리즘) ----------
   가중치 [1,3,7,1,3,7,1,3,5]를 앞 9자리에 곱해 합산하고,
   9번째 자리×5의 십의 자리를 더한 뒤, (10 - 합%10)%10 이 마지막 자리와 일치해야 유효. */
function validateKoreanBRN(input){
  const d = String(input).replace(/\D/g,'');
  if(d.length !== 10) return false;
  const w = [1,3,7,1,3,7,1,3,5];
  let sum = 0;
  for(let i=0;i<9;i++) sum += Number(d[i]) * w[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return ((10 - (sum % 10)) % 10) === Number(d[9]);
}
function formatBRN(input){
  const d = String(input).replace(/\D/g,'').slice(0,10);
  if(d.length <= 3) return d;
  if(d.length <= 5) return d.slice(0,3)+'-'+d.slice(3);
  return d.slice(0,3)+'-'+d.slice(3,5)+'-'+d.slice(5);
}

/* 한국 인증: 체크섬(오프라인·즉시) → 국세청 상태조회(사업자등록번호만 필요)
   국세청 응답 b_stt: 계속사업자 | 휴업자 | 폐업자 | (빈값=미등록)
   반환 {ok, company, status, taxType, checked:'nts'|'checksum', err} */
async function verifyKR({ brn, company }){
  const d = String(brn).replace(/\D/g,'');
  if(!validateKoreanBRN(d)) return { ok:false, err:'invalid_brn' };
  if(!company) return { ok:false, err:'missing' };

  if(!NTS_KEY){
    return { ok:true, company, address:'', status:'체크섬 검증 통과 (국세청 대조 대기)', checked:'checksum' };
  }
  try{
    const r = await fetch('https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey='+encodeURIComponent(NTS_KEY), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ b_no:[d] })
    });
    const j = await r.json();
    const item = j && j.data && j.data[0];
    if(!item) return { ok:false, err:'nts_down' };

    const st = item.b_stt || '';
    if(!st) return { ok:false, err:'not_registered' };   // 국세청 미등록 번호
    if(/폐업/.test(st)) return { ok:false, err:'closed' };
    // 휴업자는 통과시키되 상태를 남겨 관리자가 판단
    return { ok:true, company, address:'',
             status: st + (item.tax_type ? ' · ' + item.tax_type : ''),
             taxType: item.tax_type || '', checked:'nts' };
  }catch(e){
    // 네트워크 실패 시 체크섬 결과로 폴백 → 관리자 검수 대상
    return { ok:true, company, address:'', status:'체크섬 검증 통과 (국세청 응답 없음)', checked:'checksum' };
  }
}

/* ---------- 2. 베트남 세금코드 (기존 방식, 무료·무키) ---------- */
async function verifyVN(mst){
  const d = String(mst).replace(/\D/g,'');
  if(d.length < 10) return { ok:false, err:'invalid_mst' };
  let data = null;
  try{
    const r = await fetch('https://api.vietqr.io/v2/business/'+d);
    const j = await r.json();
    if(j && j.data && j.data.name) data = j.data;
  }catch(e){
    try{
      const r2 = await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent('https://api.vietqr.io/v2/business/'+d));
      const j2 = await r2.json();
      if(j2 && j2.data && j2.data.name) data = j2.data;
    }catch(e2){}
  }
  if(!data) return { ok:false, err:'not_found' };
  return { ok:true, company:data.name, address:data.address||'', status:data.status||'', checked:'gov' };
}

/* ---------- 3. 회사 이메일 도메인 (무료·오프라인 + 실존 확인) ---------- */
function isCompanyEmail(email){
  const m = String(email).toLowerCase().match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  if(!m) return { ok:false, err:'invalid_email' };
  const domain = m[1];
  if(MK_FREE_MAIL.has(domain)) return { ok:false, err:'free_mail', domain };
  return { ok:true, domain };
}
/* 도메인에 실제 웹사이트가 살아있는지 확인 (무료 공개 DNS 조회) */
async function domainExists(domain){
  try{
    const r = await fetch('https://dns.google/resolve?name='+encodeURIComponent(domain)+'&type=A');
    const j = await r.json();
    return !!(j && j.Answer && j.Answer.length);
  }catch(e){ return true; }  // 조회 실패 시 통과시키고 관리자 검수로
}
async function verifyDomain({ email, company }){
  const chk = isCompanyEmail(email);
  if(!chk.ok) return { ok:false, err:chk.err };
  if(!company) return { ok:false, err:'missing' };
  const alive = await domainExists(chk.domain);
  if(!alive) return { ok:false, err:'domain_dead' };
  // 인증에 사용한 회사 이메일을 계정 이메일로 승격 (무료메일 계정이 남는 구멍 차단)
  return { ok:true, company, address:'', status:'회사 도메인 확인 ('+chk.domain+')',
           checked:'domain', accountEmail:String(email).trim().toLowerCase() };
}

/* ---------- 통합 진입점 ----------
   Supabase가 붙어 있으면 Edge Function으로 넘긴다. 그래야 국세청 키가 브라우저에 안 실린다.
   설정 전이거나 함수 호출이 실패하면 아래 브라우저 구현으로 되돌아간다. */
async function verifyBusiness(countryCode, payload){
  const c = mkCountry(countryCode);

  if(typeof MK_BACKEND !== 'undefined' && MK_BACKEND === 'supabase'
     && typeof MK_USE_EDGE_VERIFY !== 'undefined' && MK_USE_EDGE_VERIFY){
    try{
      const r = await fetch(MK_SUPABASE_URL.replace(/\/$/,'') + '/functions/v1/verify-business', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+MK_SUPABASE_ANON },
        body: JSON.stringify({ method:c.method, country:countryCode, regNo:payload.regNo,
                               company:payload.company, email:payload.email }),
      });
      if(r.ok) return await r.json();
      console.warn('verify-business 함수 응답 오류, 브라우저 검증으로 대체합니다', r.status);
    }catch(e){
      console.warn('verify-business 함수 호출 실패, 브라우저 검증으로 대체합니다', e);
    }
  }

  if(c.method === 'mst')    return verifyVN(payload.regNo);
  if(c.method === 'brn')    return verifyKR({ brn:payload.regNo, company:payload.company });
  return verifyDomain({ email:payload.email, company:payload.company });
}
