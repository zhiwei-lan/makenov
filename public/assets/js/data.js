/* MAKENOV seed data — single source of truth (admin overrides via localStorage 'mk_products_override')
   Product content fields are {vi,ko,en} objects rendered via L(). Images: placeholder (교체 예정). */

/* ============================================================
   국가별 사업자 인증 설정
   method: 'mst'    베트남 세금코드 → 국세청 조회 API (무료·무키, 회사명 자동입력)
           'brn'    한국 사업자등록번호 → 체크섬 검증(무료·오프라인) + 국세청 API(키 발급 시)
           'domain' 회사 이메일 도메인 검증 (무료·오프라인, 무료메일 차단)
   ============================================================ */
const MK_COUNTRIES = [
  { code:'VN', dial:'+84', flag:'🇻🇳', method:'mst',    messenger:'Zalo',      phEx:'0901234567',
    name:{vi:'Việt Nam', ko:'베트남', en:'Vietnam'} },
  { code:'KR', dial:'+82', flag:'🇰🇷', method:'brn',    messenger:'KakaoTalk', phEx:'01012345678',
    name:{vi:'Hàn Quốc', ko:'대한민국', en:'South Korea'} },
  { code:'US', dial:'+1',  flag:'🇺🇸', method:'domain', messenger:'WhatsApp',  phEx:'2125550123',
    name:{vi:'Hoa Kỳ', ko:'미국', en:'United States'} },
  { code:'JP', dial:'+81', flag:'🇯🇵', method:'domain', messenger:'LINE',      phEx:'9012345678',
    name:{vi:'Nhật Bản', ko:'일본', en:'Japan'} },
  { code:'CN', dial:'+86', flag:'🇨🇳', method:'domain', messenger:'WeChat',    phEx:'13812345678',
    name:{vi:'Trung Quốc', ko:'중국', en:'China'} },
  { code:'TH', dial:'+66', flag:'🇹🇭', method:'domain', messenger:'LINE',      phEx:'812345678',
    name:{vi:'Thái Lan', ko:'태국', en:'Thailand'} },
  { code:'ID', dial:'+62', flag:'🇮🇩', method:'domain', messenger:'WhatsApp',  phEx:'81234567890',
    name:{vi:'Indonesia', ko:'인도네시아', en:'Indonesia'} },
  { code:'SG', dial:'+65', flag:'🇸🇬', method:'domain', messenger:'WhatsApp',  phEx:'81234567',
    name:{vi:'Singapore', ko:'싱가포르', en:'Singapore'} },
  { code:'MY', dial:'+60', flag:'🇲🇾', method:'domain', messenger:'WhatsApp',  phEx:'123456789',
    name:{vi:'Malaysia', ko:'말레이시아', en:'Malaysia'} },
  { code:'PH', dial:'+63', flag:'🇵🇭', method:'domain', messenger:'Viber',     phEx:'9171234567',
    name:{vi:'Philippines', ko:'필리핀', en:'Philippines'} },
  { code:'IN', dial:'+91', flag:'🇮🇳', method:'domain', messenger:'WhatsApp',  phEx:'9812345678',
    name:{vi:'Ấn Độ', ko:'인도', en:'India'} },
  { code:'OT', dial:'+',   flag:'', method:'domain', messenger:'WhatsApp',  phEx:'',
    name:{vi:'Quốc gia khác', ko:'기타 국가', en:'Other country'} },
];
function mkCountry(code){ return MK_COUNTRIES.find(c=>c.code===code) || MK_COUNTRIES[0]; }

/* ============================================================
   기업(공급사) — 제품과 1:N 연결. product.companyId → company.id
   ============================================================ */
const MK_COMPANIES = [
  /*  실제 기업 — lgind.com / firessak.com 공개정보 기준, 사업자번호 국세청 조회 완료 */
  { id:'lgind', brand:'FIRESSAK', logo:'https://picsum.photos/seed/mkc-lgind/200/200',
    cover:'https://picsum.photos/seed/mkc-lgind-cv/1200/400', cat:'tech',
    name:{vi:'LARGE Co., Ltd. (FIRESSAK)', ko:'(주)라지 · 파이어싹', en:'LARGE Co., Ltd. (FIRESSAK)'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구 달성군 테크노폴리스', en:'Daegu, Korea'},
    since:'2009', staff:'—', export:'—', moqPolicy:'문의',
    brn:'503-81-87451', ceo:'박철현', tel:'1533-3840', site:'firessak.com',
    certs:['IATF 16949:2016','이노비즈','벤처기업','강소기업','소재부품 전문기업','기업부설연구소'],
    tagline:{vi:'Chăn chữa cháy chuyên dụng cho xe điện, từ nền tảng vật liệu composite ô tô',
      ko:'자동차 복합소재 기술로 만든 전기차 화재 진압 솔루션',
      en:'EV fire-suppression solutions built on automotive composite materials'},
    intro:{vi:'LARGE Co., Ltd. (thành lập 12/2009, Daegu) là nhà sản xuất linh kiện ô tô chuyên về vải sợi thủy tinh, vật liệu composite nhiệt dẻo và vật liệu cách nhiệt hệ thống xả. Công ty đạt chứng nhận IATF 16949:2016 và có viện nghiên cứu riêng từ năm 2010, từng ký thỏa thuận phát triển chung với Fraunhofer ICT (Đức) năm 2016. Thương hiệu FIRESSAK ứng dụng nền tảng vật liệu chịu nhiệt này vào chăn chữa cháy cho xe điện, đã cung cấp cho các cơ quan công như Sở PCCC Gyeongnam và Tổng công ty Phát triển Đô thị Seongnam.',
      ko:'(주)라지는 2009년 12월 설립된 대구 소재 자동차부품 공급사로, 유리섬유 직물·열가소성 복합재료·배기계 단열재를 주력으로 합니다. IATF 16949:2016 인증을 보유하고 2010년 기업부설연구소를 설립했으며, 2016년 독일 Fraunhofer ICT와 복합재 공동 기술개발 협약을 체결했습니다. 이 내열소재 기술을 응용한 브랜드가 파이어싹으로, 경남소방본부·성남도시개발공사 등 공공기관에 납품 실적이 있습니다.',
      en:'LARGE Co., Ltd. (founded Dec 2009, Daegu) manufactures automotive components centred on glass-fibre textiles, thermoplastic composites and exhaust-system insulation. It holds IATF 16949:2016, established an in-house research institute in 2010, and signed a joint composite development agreement with Germany\'s Fraunhofer ICT in 2016. Its FIRESSAK brand applies that heat-resistant material base to EV fire blankets, with supply records to public bodies including the Gyeongnam Fire Department and Seongnam Urban Development Corp.'} },

  

  

  

  

  

  

  

  

  /*  실제 기업 — 웰빙헬스팜 3wbmall.com / wh-pharm.com 공개정보 기준 (사업자번호·주소·대표 실값) */
  { id:'wellbeing', brand:'WELLBEING HEALTHFARM', logo:'https://3wbmall.com/web/upload/weskin11/kr/main/logo.png',
    cover:'https://3wbmall.com/web/upload/weskin11/kr/main/210114_pc_top.jpg', cat:'beauty',
    name:{vi:'WELLBEING HEALTHFARM', ko:'(주)웰빙헬스팜', en:'WELLBEING HEALTHFARM Co., Ltd.'},
    location:{vi:'Incheon, Hàn Quốc', ko:'인천 남동구', en:'Incheon, Korea'},
    since:'2018', staff:'—', export:'—', moqPolicy:'문의',
    brn:'118-81-22304', ceo:'박진수', tel:'070-7532-4508', site:'wh-pharm.com',
    certs:['화장품 제조판매업'],
    tagline:{vi:'Thương hiệu chăm sóc bàn chân K-Beauty — Goeunbal (Bàn chân mịn màng)',
      ko:'대표 풋케어 브랜드 명품 고운발 — 발 각질·보습 전문',
      en:'K-Beauty foot-care brand behind Goeunbal premium foot cream'},
    intro:{vi:'WELLBEING HEALTHFARM (Incheon, Hàn Quốc) là nhà sản xuất mỹ phẩm chăm sóc sức khỏe, nổi bật với thương hiệu chăm sóc bàn chân "Goeunbal". Sản phẩm chủ lực là kem dưỡng gót chân chứa urea, được bán trực tiếp qua kênh chính hãng 3wbmall và Naver, với hàng nghìn đánh giá của người dùng Hàn Quốc.',
      ko:'(주)웰빙헬스팜은 인천 남동구에 위치한 건강·화장품 제조기업으로, 대표 풋케어 브랜드 "명품 고운발"을 운영합니다. 우레아 성분 기반 발 각질·보습 크림을 자사몰(3wbmall)과 네이버에서 직접 판매하며 다수의 국내 사용후기를 보유하고 있습니다.',
      en:'WELLBEING HEALTHFARM (Incheon, Korea) is a health & cosmetics manufacturer known for its "Goeunbal" foot-care brand. Its flagship urea-based foot cream sells directly through its own mall (3wbmall) and Naver, with thousands of Korean user reviews.'} },

  /*  실제 기업 — (주)인코아 / INCORE. 사업자번호·주소·대표·설립일은 기업정보 조회값,
      제품 정보는 자사몰(kr.incoreshop.com)과 미라렛 상세페이지 기재값 기준.
      ★ 의료기기 회사가 만든 화장품이라는 점이 이 회사의 판매 논거다. */
  { id:'incore', brand:'MIRALET', logo:'assets/img/products/miralet/ampoule.jpg',
    cover:'assets/img/products/miralet/skinbooster.jpg', cat:'beauty',
    name:{vi:'INCORE (MIRALET)', ko:'주식회사 인코아', en:'INCORE Co., Ltd. (MIRALET)'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구 동구', en:'Daegu, Korea'},
    since:'2014', staff:'—', export:'—', moqPolicy:'문의',
    brn:'503-86-14502', ceo:'김동탁', tel:'010-6219-3514', site:'incoremedi.com',
    certs:['의료기기 제조', 'FDA Class III (Hemoblock S)', '기능성화장품(미백)'],
    tagline:{vi:'Nhà sản xuất thiết bị y tế làm mỹ phẩm — thương hiệu MIRALET',
      ko:'의료기기 공급사가 만드는 화장품 — 더마코스메틱 브랜드 미라렛',
      en:'A medical device maker turned dermacosmetic brand — MIRALET'},
    intro:{vi:'INCORE (thành lập 2014, Daegu) nghiên cứu và sản xuất thiết bị y tế từ chitosan — nổi bật là băng cầm máu HEMOBLOCK và băng vết thương hydrogel HYLACELL được bác sĩ da liễu kê đơn. MIRALET là dòng dermacosmetic ra đời từ chính công thức đó: sản phẩm chăm sóc da chứa PDRN thực vật và exosome thực vật, dùng hằng ngày.',
      ko:'(주)인코아는 2014년 설립된 대구 소재 의료기기 연구·제조기업으로, 키토산 지혈재 헤모블럭(HEMOBLOCK)과 피부과에서 처방되는 하이드로겔 창상피복재 하이라셀(HYLACELL)을 만듭니다. 미라렛(MIRALET)은 그 포뮬러를 바탕으로 만든 더마코스메틱 라인으로, 식물성 PDRN과 식물 엑소좀을 담아 매일 쓰는 스킨케어로 풀어냈습니다.',
      en:'INCORE (founded 2014, Daegu) develops and manufactures chitosan-based medical devices — notably the HEMOBLOCK hemostatic dressing and HYLACELL, a hydrogel wound dressing prescribed by dermatologists. MIRALET is its dermacosmetic line built on the same formulation work, delivering plant-based PDRN and plant exosomes in daily-use skincare.'} },
];
function mkCompany(id){ return MK_COMPANIES.find(c=>c.id===id); }
function mkCompanyOf(product){
  if(!product) return null;
  return MK_COMPANIES.find(c=>c.id===product.companyId)
      || MK_COMPANIES.find(c=>c.brand===product.brand) || null;
}
function mkCompanyProducts(id){
  const c = mkCompany(id); if(!c) return [];
  return MK_PRODUCTS.filter(p => p.companyId===id || p.brand===c.brand);
}

/* 무료 이메일 도메인 — 회사 도메인 인증에서 차단 */
const MK_FREE_MAIL = new Set(['gmail.com','googlemail.com','naver.com','daum.net','hanmail.net','nate.com','kakao.com',
  'yahoo.com','yahoo.co.jp','ymail.com','hotmail.com','outlook.com','live.com','msn.com','icloud.com','me.com','aol.com',
  'qq.com','163.com','126.com','sina.com','foxmail.com','proton.me','protonmail.com','mail.ru','yandex.com','gmx.com',
  'zoho.com','tutanota.com','hushmail.com','mail.com','inbox.com','fastmail.com','yopmail.com','mailinator.com']);

const MK_CATEGORIES = [
  { id:'beauty',  name:{vi:'Mỹ phẩm & Làm đẹp', ko:'뷰티·화장품', en:'Beauty & Cosmetics'} },
  { id:'food',    name:{vi:'Thực phẩm & Đồ uống', ko:'식품·음료', en:'Food & Beverage'} },
  { id:'living',  name:{vi:'Đồ gia dụng', ko:'리빙·생활용품', en:'Home & Living'} },
  { id:'health',  name:{vi:'Sức khỏe & Thể thao', ko:'헬스·건강', en:'Health & Wellness'} },
  { id:'kids',    name:{vi:'Mẹ & Bé', ko:'키즈·육아', en:'Kids & Baby'} },
  { id:'tech',    name:{vi:'Thiết bị & Công nghệ', ko:'테크·가전', en:'Tech & Devices'} },
];

const MK_PRODUCTS = [
  /*  실제 제품 — 파이어싹 질식소화덮개 FS-EV54S ((주)라지) */
  {
    id:'p0', cat:'tech', featured:true, isNew:true, createdAt:'2026-07-27',
    companyId:'lgind', brand:'FIRESSAK', origin:'Daegu, Korea',
    name:{vi:'Chăn chữa cháy xe điện FIRESSAK FS-EV54S',
          ko:'파이어싹 질식소화덮개 FS-EV54S',
          en:'FIRESSAK EV Fire Blanket FS-EV54S'},
    tagline:{vi:'Chăn phủ dập lửa xe điện — cách ly oxy, kiểm soát cháy pin lithium tại chỗ',
             ko:'전기차 화재를 덮어서 진압하는 질식소화덮개 — 산소를 차단해 현장에서 확산을 막습니다',
             en:'Smothering blanket for EV fires — cuts off oxygen to contain lithium battery fires on the spot'},
    img:'https://picsum.photos/seed/mkv-firessak/800/600',
    gallery:['https://picsum.photos/seed/mkv-firessak/800/600',
             'https://picsum.photos/seed/mkv-firessak2/800/600',
             'https://picsum.photos/seed/mkv-firessak3/800/600'],
    video:'', inquiries:0, views:0,
    price:'문의 (Ask for quotation)', moq:'문의', lead:'문의',
    terms:'모델 FS-EV54S · 시험성적서 보유 · 공공기관 납품 실적',
    brandStory:{vi:'FIRESSAK là thương hiệu của LARGE Co., Ltd., ứng dụng công nghệ vật liệu chịu nhiệt dùng trong ngành ô tô vào thiết bị chữa cháy.',
                ko:'파이어싹은 (주)라지의 브랜드로, 자동차용 내열 복합소재 기술을 화재 진압 장비에 적용한 제품입니다.',
                en:'FIRESSAK is a brand of LARGE Co., Ltd., applying automotive heat-resistant composite technology to fire-suppression equipment.'},
    detail:[
      {type:'p', text:{
        vi:'Xe điện cháy do pin lithium rất khó dập bằng nước vì hiện tượng tự bốc cháy lại. Chăn FS-EV54S phủ trùm toàn bộ phương tiện để cách ly oxy, ngăn lửa lan sang xe và công trình lân cận trong lúc chờ lực lượng chữa cháy.',
        ko:'전기차 배터리 화재는 재발화 특성 때문에 물만으로는 진압이 어렵습니다. FS-EV54S는 차량 전체를 덮어 산소를 차단함으로써, 소방대 도착 전까지 인접 차량·건물로의 확산을 막는 역할을 합니다.',
        en:'EV battery fires are hard to extinguish with water alone because of re-ignition. The FS-EV54S covers the whole vehicle to cut off oxygen, containing spread to adjacent vehicles and structures until fire crews arrive.'}},
      {type:'img', src:'https://picsum.photos/seed/mkv-firessak-d1/900/600'},
      {type:'p', text:{
        vi:'Phù hợp cho bãi đỗ xe ngầm, trạm sạc, kho logistics, bến xe và đội xe doanh nghiệp. Nhà sản xuất có chứng nhận IATF 16949:2016 và giấy chứng nhận kết quả thử nghiệm cho model này.',
        ko:'지하주차장·충전소·물류창고·차고지·법인 차량 운영처에 적합합니다. 공급사는 IATF 16949:2016 인증을 보유하고 있으며, 해당 모델의 시험성적서를 제공합니다.',
        en:'Suited to underground car parks, charging stations, logistics warehouses, depots and corporate fleets. The maker holds IATF 16949:2016 and provides a test report for this model.'}},
    ]
  },
  
  
  
  
  
  
  
  
  {
    id:'p9', cat:'beauty', featured:false, isNew:true, createdAt:'2026-07-29',
    companyId:'wellbeing', brand:'WELLBEING HEALTHFARM', origin:'Incheon, Korea',
    name:{vi:'Kem dưỡng gót chân Goeunbal (Bàn chân mịn màng)', ko:'명품 고운발 풋크림', en:'Goeunbal Premium Foot Cream'},
    tagline:{vi:'Kem chứa urea làm mềm da chai sần, nứt gót chân — dưỡng ẩm cho bàn chân mịn màng',
             ko:'우레아 성분으로 굳은살·갈라진 발뒤꿈치를 부드럽게, 발 각질 관리 풋크림',
             en:'Urea foot cream that softens calluses and cracked heels while deeply moisturizing'},
    /* 이미지는 3wbmall 핫링크를 끊고 내려받아 자체 호스팅 (핫링크는 상대 서버가 막으면 그대로 깨짐) */
    img:'assets/img/products/goeunbal/main.jpg',
    gallery:['assets/img/products/goeunbal/main.jpg'],
    video:'', inquiries:0, views:0,
    price:'US$ 3.50 / tube (FOB Incheon)', negotiable:true, moq:'문의', lead:'문의',
    terms:'K-뷰티 풋케어 · 우레아 함유 · OEM/ODM 문의 · 국내 소비자가 9,900원(참고)',
    brandStory:{vi:'Goeunbal là thương hiệu chăm sóc bàn chân của WELLBEING HEALTHFARM (Incheon, Hàn Quốc), bán trực tiếp qua kênh chính hãng với nhiều đánh giá của người dùng Hàn Quốc.',
                ko:'명품 고운발은 (주)웰빙헬스팜(인천)의 풋케어 브랜드로, 자사몰 직판 및 다수의 국내 사용후기를 보유한 제품입니다.',
                en:'Goeunbal is the foot-care brand of WELLBEING HEALTHFARM (Incheon, Korea), sold directly through its own mall with many Korean user reviews.'},
    /* 본문 = 공급사 상세페이지(3wbmall) 내용을 3개 국어로 옮긴 것.
       원본 상세 이미지는 전부 한국어라 아래 seq 이미지로 붙이되,
       유통 파트너가 실제로 읽는 정보는 텍스트 블록에 담는다. 수치는 이미지의 시험성적서 기재값. */
    detail:[
      {type:'p', text:{
        vi:'Kem chứa urea giúp làm mềm và loại bỏ da chai sần, da khô nứt nẻ ở gót chân, đồng thời cấp ẩm để giữ bàn chân mềm mịn. Kết cấu thẩm thấu nhanh, dùng hằng ngày sau khi tắm.',
        ko:'우레아 성분이 발뒤꿈치의 굳은살과 건조하게 갈라진 각질을 부드럽게 정돈하고, 동시에 수분을 공급해 매끈한 발을 유지해 줍니다. 흡수가 빠른 제형으로 목욕 후 매일 사용하기 좋습니다.',
        en:'A urea-based cream that softens and smooths calluses and dry, cracked heels while supplying moisture for soft feet. Its fast-absorbing texture suits daily use after bathing.'}},

      {type:'p', text:{
        vi:'Thành phần chính: urea làm mềm sừng, cùng chiết xuất sữa ong chúa và keo ong (propolis). Ngoài ra còn có chiết xuất hoa kim ngân, hoa cúc La Mã, acerola, gạo và natri hyaluronate. Kết cấu nhẹ, không cần chà xát hay dũa gót — phù hợp cho cả nam và nữ, mọi lứa tuổi.',
        ko:'핵심 성분은 각질을 연화시키는 우레아, 그리고 로얄젤리·프로폴리스 추출물입니다. 인동덩굴꽃·마트리카리아(캐모마일)·아세로라·쌀 추출물과 소듐하알루로네이트가 함께 들어갑니다. 가볍게 발리고, 각질을 깎거나 미는 물리적 제거가 필요 없어 남녀노소 모두 사용할 수 있습니다.',
        en:'Key actives are urea for keratin softening, plus royal jelly and propolis extracts. The formula also carries honeysuckle, chamomile, acerola and rice extracts with sodium hyaluronate. It absorbs lightly and needs no filing or scrubbing, so it suits all ages and genders.'}},

      {type:'p', text:{
        vi:'Kết quả thử nghiệm (theo phiếu kiểm nghiệm của nhà sản xuất): thử nghiệm trên người trong 2 tuần cho thấy vùng da sừng ở gót chân giảm 56,95%; 95,54% người tham gia hài lòng (20 người, tuổi trung bình 34,1 — Human Skin Clinical Trial Center, HD-P24-0036 / IRB HD-IRB-P24-0036, 26/12/2024–09/01/2025). Thử nghiệm patch test kích ứng sơ cấp cho chỉ số 0,00 — xếp loại “không kích ứng (Excellent)”. Kiểm nghiệm 6 kim loại nặng, 6 chất độc hại và giới hạn vi sinh vật: tất cả “không phát hiện” (Korea Institute of Dermatological Sciences).',
        ko:'시험 결과(공급사 시험성적서 기재값): 2주 인체적용시험에서 뒤꿈치 각질 면적 56.95% 개선, 시험대상자 만족도 95.54%(20명, 평균 34.1세 · 휴먼피부임상시험센터 HD-P24-0036 / IRB HD-IRB-P24-0036, 2024.12.26~2025.01.09). 피부첩포 일차자극 시험 자극지수 0.00 — "비자극(Excellent)" 판정. 중금속 6종·유해물질 6종·미생물 한도 시험은 전 항목 불검출(한국피부과학연구원).',
        en:'Test results as stated on the manufacturer\'s reports: a 2-week human application study showed 56.95% reduction in heel callus area and 95.54% subject satisfaction (20 subjects, mean age 34.1 — Human Skin Clinical Trial Center, HD-P24-0036 / IRB HD-IRB-P24-0036, 26 Dec 2024–09 Jan 2025). A primary skin irritation patch test returned an index of 0.00, rated "non-irritating (Excellent)". Six heavy metals, six hazardous substances and microbial limits were all reported as not detected (Korea Institute of Dermatological Sciences).'}},

      {type:'p', text:{
        vi:'Thành tích tại thị trường Hàn Quốc (theo tư liệu của nhà sản xuất): hạng 1 doanh số kem dưỡng gót chân trên 11st (12/07/2020) và hạng 1 hạng mục foot cream trong Naver BEST 100 (22/10/2020). Trích dẫn tháng 5/2025: 31.454 đánh giá trên Coupang và 9.630 đánh giá đạt 4,83/5 trên Naver Shopping. Đây là số liệu bán lẻ nội địa Hàn Quốc, dùng để tham khảo mức độ chấp nhận của người tiêu dùng.',
        ko:'한국 시장 실적(공급사 자료 기준): 11번가 풋크림 판매 BEST 1위(2020.07.12), 네이버 BEST 100 풋크림 부문 1위(2020.10.22). 2025년 5월 발췌 기준 쿠팡 상품평 31,454건, 네이버쇼핑 리뷰 9,630건 평점 4.83/5. 한국 내수 리테일 지표이며 소비자 수용도 참고용입니다.',
        en:'Korean market track record per the manufacturer\'s materials: #1 foot-cream seller on 11st (12 Jul 2020) and #1 in the foot-cream category of Naver BEST 100 (22 Oct 2020). As captured in May 2025: 31,454 reviews on Coupang and 9,630 reviews averaging 4.83/5 on Naver Shopping. These are Korean domestic retail figures, offered as a proxy for consumer acceptance.'}},

      {type:'p', text:{
        vi:'Cách dùng: da sừng ít — dùng 2–3 lần/tuần, rửa chân, lau khô rồi massage cho kem thấm. Da sừng nhiều — dùng từ 5 lần/tuần trở lên, ngâm chân nước ấm, lau khô rồi massage. Bôi trước khi ngủ và mang tất sẽ cho hiệu quả tốt hơn.',
        ko:'사용법: 각질이 적은 경우 주 2~3회 — 발을 씻고 물기를 없앤 뒤 마사지하듯 발라 흡수시킵니다. 각질이 많은 경우 주 5회 이상 — 따뜻한 물에 발을 불린 뒤 물기를 제거하고 마사지하듯 흡수시킵니다. 자기 전에 바르고 수면양말을 신으면 효과가 더 좋습니다.',
        en:'How to use: for light calluses, apply 2–3 times a week — wash feet, pat dry, then massage in until absorbed. For heavy calluses, apply 5 or more times a week — soak feet in warm water, dry, then massage in. Applying before bed and wearing socks improves results.'}},

      {type:'p', text:{
        vi:'Thông tin sản phẩm: dung tích 110g · sản xuất tại Hàn Quốc · nhà sản xuất và chịu trách nhiệm phân phối: WELLBEING HEALTHFARM Co., Ltd. · dùng được cho mọi loại da · hạn dùng sau khi mở nắp 12 tháng · số bằng sáng chế 10-1777280. Dòng sản phẩm gồm 3 phiên bản: Goeunbal Premium 110g (sữa ong chúa + keo ong), WHB Goeunbal 100g (dưỡng ẩm) và Cheongchun Goeunbal 100g.',
        ko:'제품 정보: 용량 110g · 제조국 대한민국 · 제조업자 및 책임판매업자 (주)웰빙헬스팜 · 모든 피부에 사용 · 개봉 후 사용기간 12개월 · 특허 제10-1777280호. 라인업은 명품 고운발 110g(로얄젤리·프로폴리스), WHB 고운발 100g(보습), 청춘 고운발 100g 3종입니다.',
        en:'Product information: 110g · made in Korea · manufacturer and responsible distributor WELLBEING HEALTHFARM Co., Ltd. · suitable for all skin types · 12 months after opening · patent no. 10-1777280. The line comprises Goeunbal Premium 110g (royal jelly + propolis), WHB Goeunbal 100g (moisturizing) and Cheongchun Goeunbal 100g.'}},

      {type:'p', text:{
        vi:'Khí hậu nóng ẩm và thói quen đi dép hở của người Việt khiến nhu cầu chăm sóc gót chân tăng cao — dòng foot cream Hàn Quốc có dư địa tốt tại kênh nhà thuốc, cửa hàng mỹ phẩm và bán lẻ trực tuyến.',
        ko:'덥고 습한 기후와 샌들 착용 문화로 베트남의 발 관리 수요가 높아, 한국산 풋크림은 약국·화장품 매장·온라인 리테일 채널에서 성장 여지가 큽니다.',
        en:'Vietnam\'s hot, humid climate and open-sandal culture drive strong foot-care demand — Korean foot creams have room to grow across pharmacies, cosmetics stores and online retail.'}},

      /* 공급사 원본 상세페이지 (한국어) — seq:true 라 틈 없이 이어 붙는다 */
      {type:'img', seq:true, src:'assets/img/products/goeunbal/01.jpg', w:861, h:3002},
      {type:'img', seq:true, src:'assets/img/products/goeunbal/03.jpg', w:861, h:2006},
      {type:'img', seq:true, src:'assets/img/products/goeunbal/04.jpg', w:861, h:3561},
      {type:'img', seq:true, src:'assets/img/products/goeunbal/05.jpg', w:861, h:3201},
      {type:'img', seq:true, src:'assets/img/products/goeunbal/06.jpg', w:861, h:2921},
      {type:'img', seq:true, src:'assets/img/products/goeunbal/02.jpg', w:861, h:2010},
      {type:'img', seq:true, src:'assets/img/products/goeunbal/07.jpg', w:861, h:2986},
    ]
  },

  /* ---------- 미라렛 (인코아) 3종 ----------
     수치는 전부 공급사 상세페이지·상품정보제공고시 기재값.
     ⚠️ 가격·MOQ·납기는 아직 공급사에서 못 받음 → '문의' 유지, 받는 대로 교체할 것. */
  {
    id:'p10', cat:'beauty', featured:true, isNew:true, createdAt:'2026-08-04',
    companyId:'incore', brand:'MIRALET', origin:'Daegu, Korea',
    name:{vi:'Tinh chất MIRALET Phyto Intensive Ampoule 30ml', ko:'미라렛 피토 인텐시브 앰플 30ml', en:'MIRALET Phyto Intensive Ampoule 30ml'},
    tagline:{vi:'PDRN thực vật 20.000ppm + 3 loại exosome thực vật — tinh chất dưỡng sáng dùng hằng ngày',
             ko:'식물성 PDRN 20,000ppm + 식물 엑소좀 3종 — 매일 쓰는 미백 기능성 앰플',
             en:'Plant-based PDRN 20,000ppm with three plant exosomes — a daily brightening ampoule'},
    img:'assets/img/products/miralet/ampoule.jpg',
    gallery:['assets/img/products/miralet/ampoule.jpg','assets/img/products/miralet/skinbooster.jpg','assets/img/products/miralet/mist.jpg'],
    video:'', inquiries:0, views:0,
    price:'문의', negotiable:true, moq:'문의', lead:'문의',
    terms:'K-뷰티 더마코스메틱 · 미백 기능성 · OEM/ODM 문의',
    brandStory:{vi:'MIRALET là dòng dermacosmetic của INCORE — nhà sản xuất thiết bị y tế tại Daegu, Hàn Quốc, đứng sau băng cầm máu chitosan HEMOBLOCK và băng vết thương hydrogel HYLACELL được bác sĩ da liễu kê đơn.',
                ko:'미라렛은 키토산 지혈재 헤모블럭과 피부과 처방 하이드로겔 창상피복재 하이라셀을 만드는 대구 의료기기 공급사 (주)인코아의 더마코스메틱 브랜드입니다.',
                en:'MIRALET is the dermacosmetic brand of INCORE, the Daegu medical-device maker behind the HEMOBLOCK chitosan hemostatic dressing and HYLACELL, a dermatologist-prescribed hydrogel wound dressing.'},
    detail:[
      {type:'p', text:{
        vi:'MIRALET Phyto Intensive Ampoule là tinh chất dưỡng da dùng hằng ngày, chứa PDRN thực vật (sodium DNA) ở nồng độ 20.000ppm. Sản phẩm được cấp phép là mỹ phẩm chức năng làm trắng da tại Hàn Quốc, dùng được cho mọi loại da kể cả da nhạy cảm và da khô bên trong.',
        ko:'미라렛 피토 인텐시브 앰플은 식물성 PDRN(소듐디엔에이)을 20,000ppm 담은 데일리 앰플입니다. 국내 미백 기능성 화장품으로 심사를 받았고, 민감·속건조 피부를 포함한 모든 피부에 사용할 수 있습니다.',
        en:'MIRALET Phyto Intensive Ampoule is a daily serum carrying plant-based PDRN (sodium DNA) at 20,000ppm. It is registered in Korea as a functional whitening cosmetic and suits all skin types, including sensitive and dehydrated skin.'}},

      {type:'p', text:{
        vi:'Điểm khác biệt: sản phẩm do một công ty thiết bị y tế trực tiếp phát triển. INCORE là nhà sản xuất HYLACELL — băng vết thương hydrogel được bác sĩ da liễu và bác sĩ phẫu thuật thẩm mỹ kê dùng. MIRALET đưa hướng nghiên cứu đó vào sản phẩm chăm sóc da hằng ngày.',
        ko:'차별점은 의료기기 회사가 직접 만들었다는 점입니다. 인코아는 피부과·성형외과에서 시술에 쓰이는 하이드로겔 창상피복재 하이라셀(HYLACELL)의 공급사이며, 미라렛은 그 연구를 매일 쓰는 스킨케어로 옮긴 라인입니다.',
        en:'The differentiator is that a medical device company developed it directly. INCORE manufactures HYLACELL, a hydrogel wound dressing used in dermatology and plastic surgery clinics, and MIRALET carries that research into daily skincare.'}},

      {type:'p', text:{
        vi:'Thành phần chính: PDRN thực vật (sodium DNA), 3 loại exosome thực vật (bào tử lá quyển bá, lá diếp cá, hạt lựu), niacinamide, dexpanthenol, phức hợp hyaluronic acid nhiều phân tử lượng, chiết xuất rau má, madecassoside, asiaticoside, allantoin và glutathione.',
        ko:'주요 성분은 식물성 PDRN(소듐디엔에이), 식물 엑소좀 3종(부처손잎소포·약모밀잎소포·석류씨소포), 나이아신아마이드, 덱스판테놀, 분자량이 다른 복합 히알루론산, 병풀추출물·마데카소사이드·아시아티코사이드, 알란토인, 글루타치온입니다.',
        en:'Key ingredients: plant-based PDRN (sodium DNA), three plant exosomes (spikemoss leaf, houttuynia leaf and pomegranate seed), niacinamide, dexpanthenol, a multi-weight hyaluronic acid complex, centella extract with madecassoside and asiaticoside, allantoin and glutathione.'}},

      {type:'p', text:{
        vi:'Kết quả thử nghiệm do nhà sản xuất công bố (sử dụng 4 tuần): độ ẩm da tăng từ 62,394 lên 70,033 — cải thiện trên 13%; tông da cải thiện 1,166% (58,000 → 58,667). Số liệu trích từ trang chi tiết sản phẩm của nhà sản xuất.',
        ko:'공급사가 공개한 4주 사용 시험 결과: 피부 수분 함유량 62.394 → 70.033으로 13% 이상 개선, 피부 톤 58.000 → 58.667로 1.166% 개선. 공급사가 제공한 자료 기재값입니다.',
        en:'Manufacturer-published four-week results: skin moisture rose from 62.394 to 70.033, an improvement of over 13%; skin tone improved 1.166% (58.000 → 58.667). Figures as stated on the manufacturer\'s product page.'}},

      {type:'p', text:{
        vi:'Dòng sản phẩm có hai nồng độ. Ampoule 30ml (PDRN 20.000ppm) dùng cho bước dưỡng cơ bản hằng ngày, mọi loại da. Skinbooster dạng bơm tiêm 2,0ml × 4 (PDRN 100.000ppm) là bản cô đặc dùng cho chăm sóc ban đêm, thiên về da khô và da cần độ đàn hồi.',
        ko:'라인업은 농도가 두 가지입니다. 앰플 30ml(PDRN 20,000ppm)은 일상 기초 루틴 단계로 모든 피부에, 스킨부스터 2.0ml×4ea(PDRN 100,000ppm)는 고농축 집중 케어로 건성·탄력 피부의 나이트케어에 맞춰져 있습니다.',
        en:'The line comes in two strengths. The 30ml ampoule (PDRN 20,000ppm) is the everyday base-routine step for all skin types; the 2.0ml × 4ea syringe skinbooster (PDRN 100,000ppm) is the concentrated night-care option aimed at dry skin and elasticity.'}},

      {type:'p', text:{
        vi:'Thông tin sản phẩm: dung tích 30ml · sản xuất tại Hàn Quốc · dùng cho mọi loại da · mỹ phẩm chức năng làm trắng đã qua thẩm định.',
        ko:'제품 정보: 용량 30ml · 제조국 대한민국 · 모든 피부용 · 미백 기능성 화장품 심사필.',
        en:'Product information: 30ml · made in Korea · for all skin types · reviewed as a functional whitening cosmetic.'}},

      /* 공급사 원본 상세페이지 3장 (848px 폭) → 2400px 단위 17조각. seq라 화면에서 이어 붙는다 */
      {type:'img', seq:true, src:'assets/img/products/miralet/d01.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d02.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d03.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d04.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d05.jpg', w:848, h:1552},
      {type:'img', seq:true, src:'assets/img/products/miralet/d06.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d07.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d08.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d09.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d10.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d11.jpg', w:848, h:1270},
      {type:'img', seq:true, src:'assets/img/products/miralet/d12.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d13.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d14.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d15.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d16.jpg', w:848, h:2400},
      {type:'img', seq:true, src:'assets/img/products/miralet/d17.jpg', w:848, h:716},
    ]
  },
  {
    id:'p11', cat:'beauty', featured:false, isNew:true, createdAt:'2026-08-04',
    companyId:'incore', brand:'MIRALET', origin:'Daegu, Korea',
    name:{vi:'MIRALET Phyto Intensive Skinbooster 2,0ml × 4', ko:'미라렛 피토 인텐시브 스킨부스터 2.0ml×4ea', en:'MIRALET Phyto Intensive Skinbooster 2.0ml × 4ea'},
    tagline:{vi:'PDRN thực vật 100.000ppm dạng bơm tiêm — chăm sóc cô đặc ban đêm',
             ko:'식물성 PDRN 100,000ppm 시린지 타입 — 고농축 나이트케어',
             en:'Plant-based PDRN at 100,000ppm in a syringe — concentrated night care'},
    img:'assets/img/products/miralet/skinbooster.jpg',
    gallery:['assets/img/products/miralet/skinbooster.jpg','assets/img/products/miralet/ampoule.jpg'],
    video:'', inquiries:0, views:0,
    price:'문의', negotiable:true, moq:'문의', lead:'문의',
    terms:'K-뷰티 더마코스메틱 · 시린지 4개입 · OEM/ODM 문의',
    brandStory:{vi:'MIRALET là dòng dermacosmetic của INCORE — nhà sản xuất thiết bị y tế tại Daegu, Hàn Quốc, đứng sau băng cầm máu chitosan HEMOBLOCK và băng vết thương hydrogel HYLACELL được bác sĩ da liễu kê đơn.',
                ko:'미라렛은 키토산 지혈재 헤모블럭과 피부과 처방 하이드로겔 창상피복재 하이라셀을 만드는 대구 의료기기 공급사 (주)인코아의 더마코스메틱 브랜드입니다.',
                en:'MIRALET is the dermacosmetic brand of INCORE, the Daegu medical-device maker behind the HEMOBLOCK chitosan hemostatic dressing and HYLACELL, a dermatologist-prescribed hydrogel wound dressing.'},
    detail:[
      {type:'p', text:{
        vi:'Phiên bản cô đặc của dòng Phyto Intensive: PDRN thực vật ở nồng độ 100.000ppm, gấp năm lần bản ampoule. Đóng gói dạng bơm tiêm dùng một lần 2,0ml × 4 ống, lấy đúng liều mỗi lần và hạn chế tiếp xúc không khí.',
        ko:'피토 인텐시브 라인의 고농축 버전으로, 식물성 PDRN을 앰플의 다섯 배인 100,000ppm 담았습니다. 2.0ml 시린지 4개입이라 매번 정량만 덜어 쓰고 공기 접촉을 줄일 수 있습니다.',
        en:'The concentrated version of the Phyto Intensive line, carrying plant-based PDRN at 100,000ppm — five times the ampoule. It ships as four 2.0ml single-use syringes, so each application is dosed and air exposure stays low.'}},

      {type:'p', text:{
        vi:'Định vị: chăm sóc cô đặc vào ban đêm, thiên về da khô và da cần độ đàn hồi. Có bổ sung dexpanthenol cùng 3 loại exosome thực vật. Dùng xen kẽ với ampoule dùng hằng ngày là cách nhà sản xuất khuyến nghị.',
        ko:'포지션은 나이트케어 고농축 집중 케어로, 건성·탄력 피부를 중심에 둡니다. 덱스판테놀과 식물 엑소좀 3종이 함께 들어가며, 데일리 앰플과 번갈아 쓰는 것이 공급사 권장 사용법입니다.',
        en:'Positioned as concentrated night care aimed at dry skin and elasticity, with dexpanthenol and three plant exosomes added. The manufacturer recommends alternating it with the daily ampoule.'}},

      {type:'p', text:{
        vi:'Thông tin sản phẩm: 2,0ml × 4 ống · sản xuất tại Hàn Quốc · thương hiệu MIRALET của INCORE (Daegu). Trang chi tiết riêng của sản phẩm sẽ được bổ sung.',
        ko:'제품 정보: 2.0ml × 4개입 · 제조국 대한민국 · (주)인코아(대구) 미라렛 브랜드. 제품 정보는 추후 보강 예정입니다.',
        en:'Product information: 2.0ml × 4 units · made in Korea · MIRALET brand by INCORE (Daegu). More product information will be added later.'}},
    ]
  },
  {
    id:'p12', cat:'beauty', featured:false, isNew:true, createdAt:'2026-08-04',
    companyId:'incore', brand:'MIRALET', origin:'Daegu, Korea',
    name:{vi:'Xịt khoáng MIRALET Phyto Double Mist 50g', ko:'미라렛 피토 더블 미스트 50g', en:'MIRALET Phyto Double Mist 50g'},
    tagline:{vi:'Xịt khoáng hai lớp chứa PDRN thực vật — cấp ẩm và làm dịu tông da trong ngày',
             ko:'식물성 PDRN 담은 이중층 미스트 — 낮 동안 수분·톤 정돈',
             en:'A two-phase mist with plant-based PDRN for hydration and tone through the day'},
    img:'assets/img/products/miralet/mist.jpg',
    gallery:['assets/img/products/miralet/mist.jpg','assets/img/products/miralet/ampoule.jpg'],
    video:'', inquiries:0, views:0,
    price:'문의', negotiable:true, moq:'문의', lead:'문의',
    terms:'K-뷰티 더마코스메틱 · 50g / 1.69oz · OEM/ODM 문의',
    brandStory:{vi:'MIRALET là dòng dermacosmetic của INCORE — nhà sản xuất thiết bị y tế tại Daegu, Hàn Quốc, đứng sau băng cầm máu chitosan HEMOBLOCK và băng vết thương hydrogel HYLACELL được bác sĩ da liễu kê đơn.',
                ko:'미라렛은 키토산 지혈재 헤모블럭과 피부과 처방 하이드로겔 창상피복재 하이라셀을 만드는 대구 의료기기 공급사 (주)인코아의 더마코스메틱 브랜드입니다.',
                en:'MIRALET is the dermacosmetic brand of INCORE, the Daegu medical-device maker behind the HEMOBLOCK chitosan hemostatic dressing and HYLACELL, a dermatologist-prescribed hydrogel wound dressing.'},
    detail:[
      {type:'p', text:{
        vi:'Xịt khoáng dạng hai lớp của dòng MIRALET Phyto, dung tích 50g (1,69oz). Lắc trước khi dùng để hai lớp hòa vào nhau, xịt để cấp ẩm lại trong ngày mà không làm trôi lớp trang điểm.',
        ko:'미라렛 피토 라인의 이중층 미스트로 용량은 50g(1.69oz)입니다. 흔들어 두 층을 섞은 뒤 뿌리면 메이크업 위에도 낮 동안 수분을 덧입힐 수 있습니다.',
        en:'A two-phase mist in the MIRALET Phyto line, 50g (1.69oz). Shake to combine the layers, then mist to re-hydrate through the day without disturbing makeup.'}},

      {type:'p', text:{
        vi:'Giữ nguyên hướng thành phần của cả dòng: PDRN thực vật và 3 loại exosome thực vật, hướng đến cấp ẩm và làm đều tông da. Đây là bước bổ sung giữa ngày cho ampoule và skinbooster.',
        ko:'라인 공통 성분 방향을 그대로 가져갑니다 — 식물성 PDRN과 식물 엑소좀 3종으로 수분과 피부 톤 정돈에 초점을 둡니다. 앰플·스킨부스터를 낮에 보완하는 단계입니다.',
        en:'It keeps the line\'s ingredient direction — plant-based PDRN and three plant exosomes focused on hydration and tone — as the midday step that complements the ampoule and skinbooster.'}},

      {type:'p', text:{
        vi:'Thông tin sản phẩm: 50g / 1,69oz · sản xuất tại Hàn Quốc · thương hiệu MIRALET của INCORE (Daegu). Trang chi tiết riêng của sản phẩm sẽ được bổ sung.',
        ko:'제품 정보: 50g / 1.69oz · 제조국 대한민국 · (주)인코아(대구) 미라렛 브랜드. 제품 정보는 추후 보강 예정입니다.',
        en:'Product information: 50g / 1.69oz · made in Korea · MIRALET brand by INCORE (Daegu). More product information will be added later.'}},
    ]
  },
];

const MK_COLUMNS = [
  {
    id:"c-quote", cat:{"ko":"가이드","vi":"Hướng dẫn","en":"Guide"}, date:"2026-08-05",
    img:"assets/img/columns/quote-request.svg", slug:"quote-request-checklist",
    seoTitle:"해외 공급사 견적 요청서 작성법 — 수량·MOQ·납기 체크리스트", seoDesc:"견적 회신이 늦는 이유와 요청서에 반드시 들어가야 할 6가지 항목, MOQ 협의 요령, 수입 공고용 서류 요청 시점까지 정리했습니다.",
    title:{"ko":"해외 공급사에 견적을 요청할 때, 무엇을 적어야 할까?","vi":"Gửi yêu cầu báo giá cho nhà cung cấp nước ngoài: cần ghi những gì?","en":"What to put in a quote request to an overseas supplier"},
    excerpt:{"ko":"견적 요청을 보내고 답이 없다면 대부분 상대가 답을 못 하는 상황입니다. 수량·시기·조건을 어떻게 적어야 하루 만에 회신이 오는지 정리했습니다.","vi":"Gửi yêu cầu báo giá mà không có hồi âm thì phần lớn là do bên kia không thể trả lời. Bài này tóm tắt cách ghi số lượng, thời điểm và điều kiện để nhận phản hồi trong một ngày.","en":"When a quote request goes unanswered, it is usually because the other side cannot answer it. Here is how to state quantity, timing and terms so a reply comes back within a day."},
    body:{"ko":"<p>안녕하세요, 메이크노브입니다. 견적 요청 메일을 보내고 답이 오지 않는 경우가 많습니다. 상대가 무시해서가 아니라, 받은 내용만으로는 단가를 계산할 수 없어서 답을 못 하는 경우가 대부분입니다.</p>\n\n<h2>견적 회신이 늦어지는 이유는 무엇일까?</h2>\n<p>공급사가 단가를 뽑으려면 최소한 몇 개를, 언제까지 필요한지를 알아야 합니다. 이 두 가지가 없으면 담당자는 \"수량이 어떻게 되나요\"를 다시 물어야 하고, 그 왕복에만 며칠이 갑니다.</p>\n<p>\"가격이 얼마인가요\"만 적힌 메일은 답하기 어려운 질문입니다. 100개와 10,000개의 단가가 다르고, 다음 주 선적과 3개월 뒤 선적의 조건이 다르기 때문입니다.</p>\n\n<h2>견적 요청에 반드시 들어가야 할 항목은?</h2>\n<p>아래 여섯 가지만 채우면 대부분의 공급사가 한 번에 답을 줄 수 있습니다.</p>\n<table>\n<tr><th>희망 수량</th><td>첫 주문 기준 수량. 재주문 계획이 있다면 함께 적으면 조건이 좋아집니다.</td></tr>\n<tr><th>필요 시기</th><td>언제까지 받아야 하는지. 시즌이 걸려 있으면 그것도 적어주세요.</td></tr>\n<tr><th>판매 채널</th><td>약국, 화장품 매장, 마트, 온라인 등. 채널에 따라 포장과 조건이 달라집니다.</td></tr>\n<tr><th>도착지</th><td>도착 항구나 도시. 운임을 포함한 견적을 받으려면 필요합니다.</td></tr>\n<tr><th>필요 서류</th><td>전성분표, 원산지증명서, 시험성적서 등 수입 절차에 필요한 것.</td></tr>\n<tr><th>샘플 여부</th><td>본 발주 전에 샘플을 볼 것인지.</td></tr>\n</table>\n<p>메이크노브의 견적 요청 폼은 이 항목들을 그대로 받게 만들어져 있습니다. 빈칸을 채우면 공급사에게 정리된 형태로 전달됩니다.</p>\n\n<h2>MOQ가 부담될 때는 어떻게 말해야 할까?</h2>\n<p>최소주문수량이 높다고 대화를 접을 필요는 없습니다. 시장 테스트용 소량 주문에 열려 있는 공급사가 생각보다 많습니다. 다만 그냥 \"깎아 달라\"고 하면 답이 어렵습니다.</p>\n<p>대신 이렇게 적으면 협의가 시작됩니다. \"MOQ가 3,000개인 것으로 보입니다. 첫 주문은 500개로 시작해 반응을 보고 분기마다 재주문할 계획입니다. 500개로 가능한 조건이 있을까요?\"</p>\n<p>수량만 낮추는 요청이 아니라 이후 계획까지 보여주는 요청이기 때문입니다. 제품 페이지에 <strong>협의 가능</strong> 표시가 붙은 제품은 이런 논의가 가능한 제품입니다.</p>\n\n<h2>수입 공고용 서류는 언제 요청해야 할까?</h2>\n<p>가장 흔한 실수가 발주를 확정한 다음에 서류를 찾는 것입니다. 화장품·식품·의료기기는 수입 전에 제품 공고나 등록 절차를 밟아야 하고, 여기에는 공급사만 줄 수 있는 자료가 들어갑니다.</p>\n<p>그래서 서류는 <strong>견적 단계에서 함께 요청</strong>하는 것이 맞습니다. 공급사가 그 자료를 만들어 본 적이 있는지도 이때 확인됩니다. 없다고 하면 일정을 다시 잡아야 하는데, 그 사실을 발주 후에 아는 것보다 지금 아는 편이 낫습니다.</p>\n\n<h2>메이크노브는</h2>\n<p>전 세계 공급사의 혁신 제품을 한자리에 모아두고, 사업자 인증을 통과한 유통 파트너에게 단가와 최소주문수량을 공개하는 B2B 플랫폼입니다. 문의는 중간상 없이 공급사에 바로 전달되며, 필요하면 화상 미팅도 요청할 수 있습니다.</p>\n<p>가입과 인증은 무료이고 1분 정도 걸립니다.</p>","vi":"<p>Xin chào, MAKENOV đây. Rất nhiều yêu cầu báo giá gửi đi mà không nhận được hồi âm. Phần lớn không phải vì bên kia bỏ qua, mà vì với những gì nhận được họ không thể tính ra đơn giá.</p>\n\n<h2>Vì sao báo giá hay bị chậm?</h2>\n<p>Để tính giá, nhà cung cấp cần biết tối thiểu là bao nhiêu cái và cần khi nào. Thiếu hai điều đó, người phụ trách phải hỏi lại \"số lượng bao nhiêu\", và chỉ riêng vòng hỏi đáp ấy đã mất vài ngày.</p>\n<p>Email chỉ ghi \"giá bao nhiêu\" là câu rất khó trả lời. Giá của 100 cái khác 10.000 cái, và điều kiện giao tuần sau khác giao sau ba tháng.</p>\n\n<h2>Yêu cầu báo giá phải có những mục nào?</h2>\n<p>Chỉ cần điền sáu mục dưới đây, phần lớn nhà cung cấp trả lời được ngay trong một lần.</p>\n<table>\n<tr><th>Số lượng dự kiến</th><td>Số lượng cho đơn đầu. Có kế hoạch đặt lại thì ghi luôn, điều kiện sẽ tốt hơn.</td></tr>\n<tr><th>Thời điểm cần</th><td>Cần nhận trước ngày nào. Nếu gắn với mùa vụ thì ghi rõ.</td></tr>\n<tr><th>Kênh bán</th><td>Nhà thuốc, cửa hàng mỹ phẩm, siêu thị, online. Kênh khác nhau thì đóng gói và điều kiện khác nhau.</td></tr>\n<tr><th>Nơi nhận hàng</th><td>Cảng hoặc thành phố đến. Cần có để nhận báo giá gồm cước.</td></tr>\n<tr><th>Giấy tờ cần</th><td>Bảng thành phần, C/O, phiếu kiểm nghiệm và những gì thủ tục nhập khẩu đòi hỏi.</td></tr>\n<tr><th>Hàng mẫu</th><td>Có cần xem mẫu trước khi đặt chính thức hay không.</td></tr>\n</table>\n<p>Biểu mẫu yêu cầu báo giá của MAKENOV được dựng đúng theo các mục này. Bạn điền vào ô trống, nội dung được chuyển tới nhà cung cấp ở dạng đã sắp xếp.</p>\n\n<h2>Khi MOQ quá cao thì nên nói thế nào?</h2>\n<p>Số lượng tối thiểu cao không có nghĩa là phải dừng câu chuyện. Số nhà cung cấp sẵn sàng nhận đơn thử nghiệm nhiều hơn bạn nghĩ. Nhưng chỉ nói \"giảm giúp tôi\" thì họ khó trả lời.</p>\n<p>Thay vào đó, viết như thế này thì cuộc thương lượng bắt đầu: \"MOQ đang là 3.000 cái. Đơn đầu tôi muốn bắt đầu với 500 cái, xem phản ứng thị trường rồi đặt lại theo quý. Có phương án nào cho mức 500 cái không?\"</p>\n<p>Vì đó không chỉ là xin giảm số lượng mà còn cho thấy kế hoạch phía sau. Sản phẩm có nhãn <strong>có thể thương lượng</strong> trên trang chi tiết là sản phẩm bàn được chuyện này.</p>\n\n<h2>Khi nào nên xin giấy tờ công bố sản phẩm?</h2>\n<p>Sai lầm phổ biến nhất là chốt đơn xong mới đi tìm giấy tờ. Mỹ phẩm, thực phẩm và thiết bị y tế phải công bố hoặc đăng ký trước khi nhập, mà hồ sơ đó có những phần chỉ nhà cung cấp mới cấp được.</p>\n<p>Vì vậy nên <strong>xin ngay ở bước báo giá</strong>. Đây cũng là lúc biết được nhà cung cấp đã từng làm hồ sơ này chưa. Nếu chưa thì phải tính lại lịch, và biết điều đó bây giờ vẫn hơn là biết sau khi đã đặt hàng.</p>\n\n<h2>Về MAKENOV</h2>\n<p>MAKENOV là nền tảng B2B tập hợp sản phẩm đổi mới của các nhà cung cấp toàn cầu, và mở đơn giá cùng số lượng tối thiểu cho nhà phân phối đã xác thực doanh nghiệp. Yêu cầu đi thẳng tới nhà cung cấp, không qua trung gian, và bạn có thể đặt lịch gặp qua video khi cần.</p>\n<p>Đăng ký và xác thực miễn phí, mất khoảng một phút.</p>","en":"<p>Hello, this is MAKENOV. A lot of quote requests go out and never come back. Usually it is not that the other side ignored you: with what they received, they simply cannot work out a price.</p>\n\n<h2>Why do quotes come back slowly?</h2>\n<p>To price anything, a supplier needs to know how many and by when. Without those two, the person handling it has to write back asking \"what quantity?\", and that round trip alone costs days.</p>\n<p>An email that only asks \"how much is it?\" is a hard question to answer. A hundred units and ten thousand units are different prices, and shipping next week is a different arrangement from shipping in three months.</p>\n\n<h2>What must a quote request contain?</h2>\n<p>Fill in these six and most suppliers can answer in one pass.</p>\n<table>\n<tr><th>Target quantity</th><td>For the first order. If you plan to reorder, say so and the terms usually improve.</td></tr>\n<tr><th>When you need it</th><td>The date you must have it by, and the season if one applies.</td></tr>\n<tr><th>Sales channel</th><td>Pharmacy, cosmetics stores, supermarket, online. Packaging and terms follow the channel.</td></tr>\n<tr><th>Destination</th><td>Arrival port or city, needed for any quote that includes freight.</td></tr>\n<tr><th>Documents</th><td>Ingredient list, certificate of origin, test reports and whatever your import process requires.</td></tr>\n<tr><th>Samples</th><td>Whether you want to see samples before the main order.</td></tr>\n</table>\n<p>The MAKENOV quote form is built around exactly these fields. Fill the blanks and the supplier receives it already organised.</p>\n\n<h2>What if the MOQ is too high?</h2>\n<p>A high minimum is not a reason to end the conversation. More suppliers are open to trial orders than you would expect. But \"can you lower it\" on its own is hard to answer.</p>\n<p>This gets a negotiation started instead: \"Your MOQ appears to be 3,000 units. We would like to start at 500, see how the market responds, and reorder quarterly. Is there an arrangement that works at 500?\"</p>\n<p>It is not only a request to cut the quantity; it shows what comes after. Products tagged <strong>negotiable</strong> on the detail page are the ones where this discussion is possible.</p>\n\n<h2>When should you ask for import documents?</h2>\n<p>The most common mistake is going looking for paperwork after the order is placed. Cosmetics, food and medical devices need product notification or registration before import, and parts of that dossier only the supplier can provide.</p>\n<p>So ask for them <strong>at the quote stage</strong>. That is also when you find out whether the supplier has produced such a dossier before. If they have not, the schedule needs rethinking, and it is better to learn that now than after you have ordered.</p>\n\n<h2>About MAKENOV</h2>\n<p>MAKENOV is a B2B platform that gathers innovative products from suppliers worldwide and opens unit prices and minimum order quantities to distribution partners who pass business verification. Requests go straight to the supplier with no middleman, and you can request a video meeting when you need one.</p>\n<p>Signing up and verifying is free and takes about a minute.</p>"}
  },
  {
    id:"c-sample", cat:{"ko":"가이드","vi":"Hướng dẫn","en":"Guide"}, date:"2026-08-04",
    img:"assets/img/columns/sample-request.svg", slug:"sample-request-checklist",
    seoTitle:"수입 샘플 요청 체크리스트 — 수량·비용 부담·확인 항목", seoDesc:"샘플 요청이 흐지부지되는 이유, 요청 전에 정할 여섯 가지, 샘플비와 배송비 부담 관행, 받은 뒤 남겨야 할 기록까지 정리했습니다.",
    title:{"ko":"샘플을 요청하기 전에, 무엇을 정해두어야 할까?","vi":"Trước khi xin hàng mẫu, cần quyết những gì?","en":"What to settle before you ask for samples"},
    excerpt:{"ko":"샘플은 받는 것보다 무엇을 볼지 정해두고 받는 것이 중요합니다. 요청 전에 정할 여섯 가지와 받은 뒤 남겨야 할 기록을 정리했습니다.","vi":"Quan trọng không phải là nhận được mẫu, mà là biết mình sẽ kiểm tra gì trước khi nhận. Bài này tóm tắt sáu việc cần quyết trước và những gì phải ghi lại sau khi nhận.","en":"What matters is not receiving a sample but knowing what you will check before it arrives. Six things to settle first, and what to record afterwards."},
    body:{"ko":"<p>안녕하세요, 메이크노브입니다. 샘플은 받아보는 것보다, 무엇을 볼지 정해두고 받는 것이 중요합니다. 기준 없이 받으면 대개 \"괜찮네요\"에서 대화가 멈춥니다.</p>\n\n<h2>샘플까지 받고도 흐지부지되는 이유는 무엇일까?</h2>\n<p>받기 전에 확인 항목을 정하지 않았기 때문입니다. 무엇을 보려고 받는지가 없으면 결국 한두 사람의 인상만 남고, 사내에서 다음 단계를 설득할 근거가 되지 않습니다.</p>\n<p>공급사 쪽도 마찬가지입니다. \"샘플 보내주세요\"만 받으면 어느 규격으로, 어떤 포장으로, 라벨은 어느 언어로 보낼지 알 수 없습니다. 결국 되묻게 되고 일정이 밀립니다.</p>\n\n<h2>샘플을 요청하기 전에 정해둘 것은?</h2>\n<p>여섯 가지면 충분합니다. 이것만 정리해서 보내면 대부분 한 번에 진행됩니다.</p>\n<table>\n<tr><th>확인 항목</th><td>무엇을 보려고 받는지. 향과 발림성인지, 포장 강도인지, 표기 사항인지.</td></tr>\n<tr><th>수량</th><td>몇 개가 필요한지. 내부 검토용과 매장 반응 테스트용은 수량이 다릅니다.</td></tr>\n<tr><th>규격</th><td>판매용 완제품인지 벌크인지, 라벨을 현지어로 볼 것인지.</td></tr>\n<tr><th>비용 부담</th><td>샘플비와 배송비를 누가 낼지, 본 발주 시 차감이 되는지.</td></tr>\n<tr><th>기한</th><td>언제까지 받아야 하는지. 내부 회의 날짜가 있으면 그 날짜를 적습니다.</td></tr>\n<tr><th>함께 받을 자료</th><td>전성분표, 시험성적서, 인증서 사본 등.</td></tr>\n</table>\n<p>여기까지 정해두면 샘플이 도착했을 때 볼 것이 이미 정해져 있습니다. 판단이 빨라집니다.</p>\n\n<h2>샘플 비용은 누가 내는 것이 맞을까?</h2>\n<p>정해진 규칙은 없습니다. 다만 <strong>샘플비는 공급사, 국제 배송비는 유통 파트너</strong>가 부담하는 형태가 가장 흔합니다. 배송비는 목적지와 무게에 따라 달라져서 공급사가 미리 떠안기 어렵기 때문입니다.</p>\n<p>무료를 먼저 요구하기보다 조건을 제시하는 편이 빠릅니다. \"샘플비는 지불하겠습니다. 본 발주가 성사되면 차감해 주실 수 있을까요?\" 이렇게 적으면 대부분 협의가 됩니다.</p>\n\n<h2>샘플을 받은 뒤에는 무엇을 남겨야 할까?</h2>\n<p>도착 날짜, 로트번호, 개봉 사진, 확인 항목별 결과를 남겨두세요. 나중에 본 발주 물량이 들어왔을 때 이 기록이 품질을 따지는 유일한 기준이 됩니다.</p>\n<p>문제가 있으면 구체적으로 알려야 합니다. \"품질이 별로다\"로는 아무것도 바뀌지 않습니다. 어느 부분이 어떻게 다른지 사진과 함께 보내면 대체 규격이나 다른 라인을 제안받을 수 있습니다.</p>\n<p>통과든 보류든 결론은 공급사에 알려주는 편이 좋습니다. 다음 거래가 훨씬 수월해집니다.</p>\n\n<h2>메이크노브는</h2>\n<p>전 세계 공급사의 혁신 제품을 한자리에 모아두고, 사업자 인증을 통과한 유통 파트너에게 단가와 최소주문수량을 공개하는 B2B 플랫폼입니다. 샘플 요청은 견적 문의와 함께 공급사에 바로 전달됩니다.</p>\n<p>가입과 인증은 무료이고 1분 정도 걸립니다.</p>","vi":"<p>Xin chào, MAKENOV đây. Với hàng mẫu, việc nhận được không quan trọng bằng việc biết trước mình sẽ kiểm tra gì. Không có tiêu chí thì câu chuyện thường dừng ở một câu \"cũng được đấy\".</p>\n\n<h2>Vì sao nhận mẫu rồi mà mọi việc vẫn bỏ dở?</h2>\n<p>Vì trước khi nhận đã không định ra mục cần kiểm. Không biết nhận để xem gì thì cuối cùng chỉ còn lại cảm nhận của một hai người, không đủ làm căn cứ thuyết phục nội bộ đi tiếp.</p>\n<p>Phía nhà cung cấp cũng vậy. Chỉ nhận được câu \"gửi mẫu giúp tôi\" thì họ không biết gửi quy cách nào, đóng gói ra sao, nhãn bằng tiếng gì. Cuối cùng lại phải hỏi lại và lịch bị lùi.</p>\n\n<h2>Trước khi xin mẫu cần quyết những gì?</h2>\n<p>Sáu mục là đủ. Chỉ cần gửi đi bấy nhiêu, phần lớn trường hợp chạy được ngay một lần.</p>\n<table>\n<tr><th>Mục cần kiểm</th><td>Nhận để xem gì: mùi và độ thẩm thấu, độ bền bao bì, hay nội dung ghi nhãn.</td></tr>\n<tr><th>Số lượng</th><td>Cần bao nhiêu. Xem xét nội bộ và thử phản ứng tại cửa hàng là hai con số khác nhau.</td></tr>\n<tr><th>Quy cách</th><td>Hàng thành phẩm để bán hay hàng bulk, nhãn có cần tiếng bản địa không.</td></tr>\n<tr><th>Chi phí</th><td>Ai trả tiền mẫu và cước, có được trừ vào đơn chính thức không.</td></tr>\n<tr><th>Thời hạn</th><td>Cần nhận trước ngày nào. Có lịch họp nội bộ thì ghi đúng ngày đó.</td></tr>\n<tr><th>Hồ sơ kèm theo</th><td>Bảng thành phần, phiếu kiểm nghiệm, bản sao chứng nhận.</td></tr>\n</table>\n<p>Quyết xong đến đây thì lúc mẫu tới, việc cần xem đã có sẵn. Quyết định sẽ nhanh hơn.</p>\n\n<h2>Tiền mẫu ai trả là hợp lý?</h2>\n<p>Không có quy tắc cố định. Nhưng phổ biến nhất là <strong>nhà cung cấp chịu tiền mẫu, người mua chịu cước quốc tế</strong>. Cước thay đổi theo điểm đến và trọng lượng nên nhà cung cấp khó ôm trước.</p>\n<p>Đề xuất điều kiện sẽ nhanh hơn là đòi miễn phí ngay. \"Tôi sẽ trả tiền mẫu. Nếu đơn chính thức thành công thì trừ lại giúp tôi được không?\" — viết vậy thì phần lớn thương lượng được.</p>\n\n<h2>Sau khi nhận mẫu cần ghi lại gì?</h2>\n<p>Ghi ngày nhận, số lô, ảnh lúc mở hộp và kết quả theo từng mục đã định. Về sau khi hàng của đơn chính thức về, đây là căn cứ duy nhất để nói chuyện chất lượng.</p>\n<p>Có vấn đề thì phải nói cụ thể. \"Chất lượng không tốt\" thì không thay đổi được gì. Chỉ rõ chỗ nào khác ra sao kèm ảnh thì bạn có thể được đề xuất quy cách thay thế hoặc dòng hàng khác.</p>\n<p>Dù đạt hay tạm gác lại, nên báo kết luận cho nhà cung cấp. Lần giao dịch sau sẽ dễ hơn nhiều.</p>\n\n<h2>Về MAKENOV</h2>\n<p>MAKENOV là nền tảng B2B tập hợp sản phẩm đổi mới của các nhà cung cấp toàn cầu, và mở đơn giá cùng số lượng tối thiểu cho nhà phân phối đã xác thực doanh nghiệp. Yêu cầu hàng mẫu được chuyển thẳng tới nhà cung cấp cùng với yêu cầu báo giá.</p>\n<p>Đăng ký và xác thực miễn phí, mất khoảng một phút.</p>","en":"<p>Hello, this is MAKENOV. With samples, receiving one matters less than knowing what you will check before it arrives. Without criteria, the conversation usually stops at \"seems fine\".</p>\n\n<h2>Why do sample requests fizzle out?</h2>\n<p>Because nobody decided what to look at beforehand. If there is no stated purpose, all that remains is one or two people's impressions, which is not enough to justify the next step internally.</p>\n<p>It is the same on the supplier's side. \"Please send samples\" does not say which specification, what packaging, or which language on the label. They have to write back, and the schedule slips.</p>\n\n<h2>What should you settle before asking?</h2>\n<p>Six items are enough. Send these and most requests go through in one pass.</p>\n<table>\n<tr><th>What to check</th><td>The reason you want it: scent and texture, packaging strength, or label content.</td></tr>\n<tr><th>Quantity</th><td>How many. Internal review and an in-store response test are different numbers.</td></tr>\n<tr><th>Specification</th><td>Retail-ready or bulk, and whether you need the label in the local language.</td></tr>\n<tr><th>Who pays</th><td>Sample cost and freight, and whether it is deductible from the main order.</td></tr>\n<tr><th>Deadline</th><td>The date you need it by. If there is an internal meeting, use that date.</td></tr>\n<tr><th>Documents</th><td>Ingredient list, test reports, copies of certificates.</td></tr>\n</table>\n<p>Decide these and the moment the sample lands, you already know what to examine. The decision comes faster.</p>\n\n<h2>Who normally pays for samples?</h2>\n<p>There is no fixed rule, but the most common split is <strong>the supplier covers the sample, the distribution partner covers international freight</strong>. Freight varies by destination and weight, so suppliers are reluctant to absorb it up front.</p>\n<p>Proposing terms works better than asking for free. \"We will pay for the samples. Could that be credited against the main order if it goes ahead?\" — that usually opens a negotiation.</p>\n\n<h2>What should you record afterwards?</h2>\n<p>Record the arrival date, lot number, unboxing photos, and the result against each item you set. When the main shipment arrives later, this is the only basis you have for a quality discussion.</p>\n<p>If something is wrong, be specific. \"The quality is poor\" changes nothing. Point out what differs and how, with photos, and you may be offered an alternative specification or a different line.</p>\n<p>Pass or hold, tell the supplier your conclusion. The next deal goes far more smoothly.</p>\n\n<h2>About MAKENOV</h2>\n<p>MAKENOV is a B2B platform that gathers innovative products from suppliers worldwide and opens unit prices and minimum order quantities to distribution partners who pass business verification. Sample requests go straight to the supplier alongside your quote request.</p>\n<p>Signing up and verifying is free and takes about a minute.</p>"}
  },
  ];

/* spotlight feed — kind: new|inquiry|webinar, ts: ISO date */
const MK_SPOTLIGHT = [
  
  
  
  
  
  
];

/* ---------- 히어로 메시지 (홈 최상단 슬라이더) ----------
   제품 자랑이 아니라 "왜 메이크노브인가"를 말하는 자리.
   art  = 배경 그래픽(브랜드 컬러로 직접 그린 SVG, assets/img/hero/)
   link = CTA가 아닌 배경 클릭 시 이동할 곳
   kicker/title/sub = 3개 국어 (title의 \n은 줄바꿈) */
const MK_HERO = [
  { art:'assets/img/hero/hero-global.svg', link:'directory.html',
    kicker:{ vi:'Không cần bay, không cần hội chợ', ko:'전시회, 수출상담회', en:'No flights. No trade fairs.' },
    title:{ vi:'Đi hội chợ đến bao giờ?\nMột cú click là đủ.',
            ko:'전시회, 수출상담회\n언제까지 다니실 건가요?',
            en:'How long will you keep\nflying to trade shows?' },
    sub:{ vi:'Ngồi tại văn phòng, click một lần — thông tin sản phẩm đổi mới từ khắp thế giới đến với bạn.',
          ko:'사무실에 앉아서 클릭 한 번이면, 전 세계 혁신제품 정보가 찾아옵니다.',
          en:'Stay at your desk. One click brings the world\'s innovative products to you.' } },

  { art:'assets/img/hero/hero-scale.svg', link:'directory.html',
    kicker:{ vi:'Chi phí một chuyến công tác', ko:'출장 한 번 비용으로', en:'The cost of one business trip' },
    title:{ vi:'Một chuyến công tác gặp 5 nhà máy.\nỞ đây gặp hàng trăm.',
            ko:'출장 한 번에 공장 다섯 곳,\n여기선 수백 개 제품.',
            en:'One trip: five factories.\nHere: hundreds of products.' },
    sub:{ vi:'Vé máy bay, khách sạn, thông dịch — thay bằng danh mục mở 24 giờ mỗi ngày.',
          ko:'항공권·숙박·통역 대신, 24시간 열려 있는 제품 디렉토리로.',
          en:'Skip the airfare, hotels and interpreters — browse a directory that never closes.' } },

  { art:'assets/img/hero/hero-spec.svg', link:'companies.html',
    kicker:{ vi:'Chỉ nhà sản xuất đã xác thực', ko:'검증된 공급사만', en:'Verified manufacturers only' },
    title:{ vi:'Giá, MOQ, thời gian giao hàng\ntrên cùng một màn hình.',
            ko:'가격, MOQ, 납기까지\n한 화면에서 확인하세요.',
            en:'Price, MOQ and lead time\non a single screen.' },
    sub:{ vi:'Mọi nhà sản xuất đều qua xác thực doanh nghiệp. Không còn phải dò hỏi từng nơi.',
          ko:'모든 공급사가 사업자 인증을 거칩니다. 하나하나 수소문할 필요 없습니다.',
          en:'Every manufacturer passes business verification. No more chasing down each supplier.' } },

  { art:'assets/img/hero/hero-inquiry.svg', link:'mypage.html',
    kicker:{ vi:'Gửi yêu cầu hàng loạt', ko:'일괄 견적 요청', en:'Bulk inquiry' },
    title:{ vi:'Chọn sản phẩm quan tâm,\ngửi báo giá một lần.',
            ko:'관심 제품을 담고,\n한 번에 견적을 받으세요.',
            en:'Save what interests you,\nrequest every quote at once.' },
    sub:{ vi:'Không cần liên hệ từng nhà sản xuất. Thêm vào danh sách rồi gửi yêu cầu cùng lúc.',
          ko:'공급사마다 따로 연락할 필요 없습니다. 담아두고 한 번에 문의하세요.',
          en:'Stop emailing suppliers one by one. Add to your list and send a single request.' } },
];

/* ---------- 공급사 유치 랜딩(maker.html) 설정 ----------
   ⚠️ stats 수치는 랜딩에 그대로 노출됩니다. 공급사는 반드시 근거를 묻습니다.
      공개 전에 실제 값으로 바꾸거나, 근거를 댈 수 있는 지표(광고 도달수 등)로 교체하세요.
      숫자를 바꿀 곳은 여기 한 곳뿐입니다. */
/* ⚠️ 여기 숫자는 공급사가 반드시 근거를 묻는 자리다.
   확인되지 않은 수치(예: 등록 유통 파트너 10,000명)는 절대 넣지 말 것.
   지금은 우리가 실제로 보장하는 것만 적어둔다. 실적이 쌓이면 교체. */
const MK_MAKER = {
  stats: [
    { n:'0원',       label:'제품 등록비',           note:'' },
    { n:'3개 언어',   label:'제품 정보 등록 지원',     note:'' },
    { n:'사업자 인증', label:'유통 파트너 거래조건 열람 기준', note:'' },
    { n:'365일',     label:'제품 상시 노출',         note:'' },
  ],
  markets: [
    { name:'베트남', desc:'유통사·도매상·리테일 사업자 등 현지 유통 파트너에게 제품을 소개합니다.' },
    { name:'한국',   desc:'유통사·벤더·수출 파트너 등 새로운 제품을 찾는 사업자와 연결합니다.' },
    { name:'중국',   desc:'도매상과 크로스보더 셀러 등 다양한 판매 채널을 운영하는 유통 파트너를 대상으로 합니다.' },
    { name:'미얀마', desc:'수입사·유통사 등 해외 제품을 찾는 현지 사업자에게 제품을 소개합니다.' },
  ],
  contactEmail: 'contact@makenov.com',
  contactTel: '',
};

/* ---------- 메인페이지 FAQ (유통 파트너용) ----------
   관리자 FAQ 탭에서 편집. Supabase 모드에선 faqs 테이블이 이 시드를 덮어쓴다. */
const MK_FAQ = [
  { id:'f1', page:'home', sort:1, published:true,
    q:{vi:'Đăng ký và sử dụng có mất phí không?', ko:'가입과 이용은 무료인가요?', en:'Is it free to join and use?'},
    a:{vi:'Hoàn toàn miễn phí — đăng ký, xem sản phẩm, gửi yêu cầu báo giá và xác thực doanh nghiệp đều không mất phí.',
       ko:'네. 가입, 제품 열람, 견적 문의, 사업자 인증 모두 무료입니다.',
       en:'Yes. Signing up, browsing products, sending quotation requests and business verification are all free.'} },
  { id:'f2', page:'home', sort:2, published:true,
    q:{vi:'Vì sao giá và MOQ bị khóa?', ko:'가격과 최소주문수량(MOQ)이 왜 잠겨 있나요?', en:'Why are prices and MOQs locked?'},
    a:{vi:'Giá, MOQ, thời gian giao hàng và điều kiện cung ứng chỉ hiển thị cho nhà phân phối đã xác thực doanh nghiệp. Đăng ký miễn phí và xác thực để xem ngay.',
       ko:'가격·MOQ·납기·공급 조건은 사업자 인증을 통과한 유통 파트너에게만 공개됩니다. 무료 가입 후 인증하면 바로 열람할 수 있습니다.',
       en:'Price, MOQ, lead time and supply terms are visible only to verified distribution partners. Sign up free and verify your business to unlock them.'} },
  { id:'f3', page:'home', sort:3, published:true,
    q:{vi:'Xác thực doanh nghiệp như thế nào?', ko:'사업자 인증은 어떻게 하나요?', en:'How does business verification work?'},
    a:{vi:'Việt Nam dùng mã số thuế (MST), Hàn Quốc dùng số đăng ký kinh doanh, các quốc gia khác xác thực bằng email tên miền công ty. Thường chỉ mất khoảng 1 phút.',
       ko:'베트남은 세금코드(MST), 한국은 사업자등록번호, 그 외 국가는 회사 이메일 도메인으로 인증합니다. 보통 1분이면 끝납니다.',
       en:'Vietnam verifies by tax code (MST), Korea by business registration number, and other countries by company email domain. It usually takes about a minute.'} },
  { id:'f4', page:'home', sort:4, published:true,
    q:{vi:'Có làm việc trực tiếp với nhà sản xuất không?', ko:'공급사와 직접 거래하나요?', en:'Do I deal directly with manufacturers?'},
    a:{vi:'Có. Yêu cầu của bạn được chuyển thẳng đến nhà sản xuất, không qua trung gian. MAKENOV đảm nhận việc kết nối và xác thực.',
       ko:'네. 문의는 공급사에 직접 전달되며 중간 유통 마진이 없습니다. MAKENOV는 연결과 검증을 담당합니다.',
       en:'Yes. Your inquiry goes straight to the manufacturer with no middleman margins. MAKENOV handles matching and verification.'} },
  { id:'f5', page:'home', sort:5, published:true,
    q:{vi:'Có thể thương lượng MOQ không?', ko:'최소주문수량은 협의할 수 있나요?', en:'Can MOQs be negotiated?'},
    a:{vi:'Tùy sản phẩm, nhưng nhiều nhà sản xuất sẵn sàng thương lượng đơn hàng nhỏ để thử nghiệm thị trường. Hãy ghi số lượng mong muốn khi gửi yêu cầu báo giá.',
       ko:'제품마다 다르지만, 많은 공급사가 테스트 오더용 소량 주문 협의에 열려 있습니다. 견적 문의 시 희망 수량을 적어주세요.',
       en:'It varies by product, but many manufacturers are open to smaller trial orders. State your desired quantity in the quotation request.'} },
  { id:'f6', page:'home', sort:6, published:true,
    q:{vi:'Tôi có thể gửi yêu cầu bằng ngôn ngữ nào?', ko:'어떤 언어로 문의할 수 있나요?', en:'Which languages can I use?'},
    a:{vi:'Tiếng Việt, tiếng Anh và tiếng Hàn đều được. Khi cần, đội ngũ MAKENOV sẽ hỗ trợ trao đổi.',
       ko:'베트남어·영어·한국어 모두 가능합니다. 필요하면 MAKENOV 팀이 소통을 지원합니다.',
       en:'Vietnamese, English and Korean are all fine. The MAKENOV team can assist with communication when needed.'} },
];

/* ---------- 공지사항 (고객센터 게시판) ----------
   관리자 공지사항 탭에서 편집. Supabase 모드에선 notices 테이블이 이 시드를 덮어쓴다.
   신제품 등록·업데이트 소식이 여기 쌓인다. (자동 발행은 아직 안 붙임 — 수동 작성) */
const MK_NOTICES = [
  { id:'n3', date:'2026-08-04', published:true, cat:'new', pinned:false,
    title:{vi:'Ra mắt 3 sản phẩm MIRALET của INCORE (Daegu)', ko:'인코아 더마코스메틱 미라렛 3종 등록', en:'Three MIRALET dermacosmetics by INCORE now listed'},
    body:{vi:'<p>Nhà sản xuất thiết bị y tế INCORE (Daegu) đã đăng dòng dermacosmetic MIRALET: tinh chất Phyto Intensive Ampoule 30ml (PDRN thực vật 20.000ppm), Skinbooster 2,0ml×4 (100.000ppm) và Phyto Double Mist 50g. Xác thực doanh nghiệp để xem điều kiện giao dịch.</p>',
          ko:'<p>대구 의료기기 공급사 (주)인코아의 더마코스메틱 브랜드 미라렛이 등록됐습니다. 피토 인텐시브 앰플 30ml(식물성 PDRN 20,000ppm), 스킨부스터 2.0ml×4, 피토 더블 미스트 50g 3종입니다. 사업자 인증 후 거래 조건을 확인하세요.</p>',
          en:'<p>MIRALET, the dermacosmetic brand of Daegu medical-device maker INCORE, is now listed: Phyto Intensive Ampoule 30ml (plant PDRN 20,000ppm), Skinbooster 2.0ml×4 and Phyto Double Mist 50g. Verify your business to see trade terms.</p>'} },
  { id:'n2', date:'2026-08-04', published:true, cat:'new', pinned:false,
    title:{vi:'Kem dưỡng gót chân Goeunbal — trang chi tiết đầy đủ', ko:'명품 고운발 풋크림 상세페이지 공개', en:'Goeunbal foot cream — full detail page published'},
    body:{vi:'<p>Trang chi tiết đầy đủ của kem dưỡng gót chân Goeunbal (WELLBEING HEALTHFARM) đã lên: kết quả thử nghiệm 4 tuần, chứng nhận không kích ứng và thành tích bán hàng tại Hàn Quốc.</p>',
          ko:'<p>웰빙헬스팜 명품 고운발 풋크림의 상세페이지가 공개됐습니다. 2주 인체적용시험 결과, 비자극 판정, 한국 리테일 실적까지 담았습니다.</p>',
          en:'<p>The full detail page for Goeunbal foot cream (WELLBEING HEALTHFARM) is up — four-week test results, non-irritation rating and Korean retail track record included.</p>'} },
  { id:'n1', date:'2026-07-29', published:true, cat:'notice', pinned:true,
    title:{vi:'MAKENOV chính thức mở cửa', ko:'메이크노브 오픈 안내', en:'MAKENOV is open'},
    body:{vi:'<p>MAKENOV — nền tảng B2B kết nối sản phẩm sáng tạo Hàn Quốc với nhà phân phối toàn cầu — đã chính thức hoạt động. Đăng ký và xác thực doanh nghiệp miễn phí để xem giá và gửi yêu cầu báo giá.</p>',
          ko:'<p>한국 혁신제품과 해외 유통 파트너를 잇는 B2B 플랫폼 메이크노브가 문을 열었습니다. 무료 가입·사업자 인증 후 가격 열람과 견적 문의를 이용하실 수 있습니다.</p>',
          en:'<p>MAKENOV — the B2B platform connecting innovative Korean products with global distribution partners — is live. Sign up and verify free to unlock pricing and send quotation requests.</p>'} },
];
function mkNotice(id){ return MK_NOTICES.find(n=>n.id===id); }

/* ---------- 사이트 설정 (관리자 '설정' 탭에서 편집) ----------
   지금은 상단 띠배너만. 문구를 코드(i18n.js)에 박아두면 운영 중에 못 바꾸므로
   여기로 뺐다. Supabase 모드에선 settings 테이블이 이 값을 덮어쓴다. */
const MK_SETTINGS = {
  topbarOn: true,
  topbarLink: '',            // 비우면 링크 없는 안내 배너
  topbar: {
    vi: 'Xác thực doanh nghiệp là mở ngay giá và MOQ. Miễn phí, khoảng một phút',
    ko: '사업자 인증하면 가격과 MOQ가 바로 열립니다. 인증은 무료, 1분이면 끝납니다',
    en: 'Verify your business and prices unlock instantly. Free, about a minute',
  },
};

/* ---------- 관리자 오버라이드 (관리자에서 저장하면 여기로 들어옴) ----------
   원본 시드는 위 배열, 관리자 편집분은 localStorage. 배포 시 '내보내기'로 data.js에 구움. */
(function(){
  try{
    const p = JSON.parse(localStorage.getItem('mk_products_override')||'null');
    if(Array.isArray(p)) { MK_PRODUCTS.length = 0; p.forEach(x=>MK_PRODUCTS.push(x)); }
  }catch(e){}
  try{
    const c = JSON.parse(localStorage.getItem('mk_columns_override')||'null');
    if(Array.isArray(c)) { MK_COLUMNS.length = 0; c.forEach(x=>MK_COLUMNS.push(x)); }
  }catch(e){}
  try{
    const s = JSON.parse(localStorage.getItem('mk_spotlight_override')||'null');
    if(Array.isArray(s)) { MK_SPOTLIGHT.length = 0; s.forEach(x=>MK_SPOTLIGHT.push(x)); }
  }catch(e){}
  try{
    const h = JSON.parse(localStorage.getItem('mk_hero_override')||'null');
    if(Array.isArray(h)) { MK_HERO.length = 0; h.forEach(x=>MK_HERO.push(x)); }
  }catch(e){}
  try{
    const f = JSON.parse(localStorage.getItem('mk_faqs_override')||'null');
    if(Array.isArray(f)) { MK_FAQ.length = 0; f.forEach(x=>MK_FAQ.push(x)); }
  }catch(e){}
  try{
    const st = JSON.parse(localStorage.getItem('mk_settings_override')||'null');
    if(st && typeof st === 'object') Object.assign(MK_SETTINGS, st);
  }catch(e){}
  try{
    const n = JSON.parse(localStorage.getItem('mk_notices_override')||'null');
    if(Array.isArray(n)) { MK_NOTICES.length = 0; n.forEach(x=>MK_NOTICES.push(x)); }
  }catch(e){}
})();

const MK_STATS = { products: MK_PRODUCTS.length, inquiries: MK_PRODUCTS.reduce((s,p)=>s+p.inquiries,0), buyers: 87 };

function mkProduct(id){ return MK_PRODUCTS.find(p=>p.id===id); }
function mkCat(id){ return MK_CATEGORIES.find(c=>c.id===id); }
function mkColumn(id){ return MK_COLUMNS.find(c=>c.id===id); }
