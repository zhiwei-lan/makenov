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

  { id:'daon', brand:'DAON COSMETIC', logo:'https://picsum.photos/seed/mkc-daon/200/200',
    cover:'https://picsum.photos/seed/mkc-daon-cv/1200/400', cat:'beauty',
    name:{vi:'DAON COSMETIC', ko:'다온코스메틱', en:'DAON COSMETIC'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'2014', staff:'52', export:'14', moqPolicy:'3,000',
    certs:['CGMP','CPNP','FDA','ISO 22716'],
    tagline:{vi:'12 năm OEM/ODM cho các thương hiệu K-Beauty', ko:'K-뷰티 브랜드 OEM/ODM 12년', en:'12 years of K-Beauty OEM/ODM'},
    intro:{vi:'DAON COSMETIC là nhà sản xuất mỹ phẩm tại Daegu với 12 năm kinh nghiệm OEM/ODM cho các thương hiệu K-Beauty. Nhà máy đạt chuẩn CGMP, xuất khẩu sang 14 quốc gia. Hỗ trợ đầy đủ hồ sơ công bố mỹ phẩm và phát triển công thức riêng.',
      ko:'다온코스메틱은 대구 소재 화장품 공급사로, K-뷰티 브랜드 OEM/ODM 12년 경력을 보유하고 있습니다. CGMP 인증 공장에서 14개국에 수출하고 있으며, 화장품 공고 서류 지원과 자체 처방 개발이 가능합니다.',
      en:'DAON COSMETIC is a Daegu-based manufacturer with 12 years of K-Beauty OEM/ODM experience. Its CGMP-certified factory exports to 14 countries, with full notification-dossier support and in-house formulation.'} },

  { id:'hanil', brand:'HANIL FOOD', logo:'https://picsum.photos/seed/mkc-hanil/200/200',
    cover:'https://picsum.photos/seed/mkc-hanil-cv/1200/400', cat:'food',
    name:{vi:'HANIL FOOD', ko:'하니일푸드', en:'HANIL FOOD'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'1998', staff:'120', export:'9', moqPolicy:'10,000',
    certs:['HACCP','ISO 22000','Halal(진행중)'],
    tagline:{vi:'Thực phẩm tiện lợi Hàn Quốc từ 1998', ko:'1998년부터 한국 간편식 전문', en:'Korean convenience food since 1998'},
    intro:{vi:'HANIL FOOD sản xuất thực phẩm tiện lợi Hàn Quốc từ năm 1998. Dây chuyền đạt chuẩn HACCP, sản phẩm có mặt tại CU và GS25 trên toàn Hàn Quốc. Chuyên các dòng tự sôi và ăn liền cho kênh cửa hàng tiện lợi.',
      ko:'하니일푸드는 1998년부터 한국 간편식품을 생산해온 기업입니다. HACCP 인증 라인을 갖추고 전국 CU·GS25에 입점해 있으며, 편의점 채널용 자체발열·즉석식 라인에 강점이 있습니다.',
      en:'HANIL FOOD has produced Korean convenience food since 1998. HACCP-certified lines supply CU and GS25 nationwide, with a focus on self-heating and instant lines for convenience-store channels.'} },

  { id:'cleanlab', brand:'CLEANLAB', logo:'https://picsum.photos/seed/mkc-clean/200/200',
    cover:'https://picsum.photos/seed/mkc-clean-cv/1200/400', cat:'living',
    name:{vi:'CLEANLAB', ko:'클린랩', en:'CLEANLAB'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'2019', staff:'28', export:'6', moqPolicy:'500',
    certs:['CE','KC','RoHS'],
    tagline:{vi:'Thiết bị vệ sinh nhà bếp thông minh', ko:'스마트 주방위생 가전', en:'Smart kitchen-hygiene devices'},
    intro:{vi:'CLEANLAB phát triển thiết bị vệ sinh nhà bếp thông minh, đạt giải thưởng thiết kế Hàn Quốc 2025. Sản phẩm dùng UV-C LED, có sẵn phiên bản điện áp 220V cho thị trường Đông Nam Á.',
      ko:'클린랩은 스마트 주방위생 가전 전문기업으로 2025 대한민국 디자인어워드 수상 기업입니다. UV-C LED 기반 제품을 개발하며 동남아 시장용 220V 사양을 보유하고 있습니다.',
      en:'CLEANLAB builds smart kitchen-hygiene devices and won the 2025 Korea Design Award. Its UV-C LED products ship with 220V variants for Southeast Asian markets.'} },

  { id:'jinseng', brand:'JINSENG HOUSE', logo:'https://picsum.photos/seed/mkc-jin/200/200',
    cover:'https://picsum.photos/seed/mkc-jin-cv/1200/400', cat:'health',
    name:{vi:'JINSENG HOUSE', ko:'진생하우스', en:'JINSENG HOUSE'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'2006', staff:'44', export:'20', moqPolicy:'1,000',
    certs:['HACCP','건강기능식품 GMP'],
    tagline:{vi:'Hồng sâm 6 năm tuổi, xuất khẩu 20 năm', ko:'6년근 홍삼 전문, 수출 20년', en:'6-year red ginseng, 20 years exporting'},
    intro:{vi:'JINSENG HOUSE chuyên chế biến hồng sâm từ vùng trồng sâm nổi tiếng của Hàn Quốc với 20 năm kinh nghiệm xuất khẩu. Cung cấp đa dạng quy cách quà tặng, phù hợp mùa cao điểm Tết.',
      ko:'진생하우스는 한국 대표 인삼 산지의 홍삼 전문 공급사로 수출 경력 20년입니다. 다양한 선물 패키지 규격을 보유해 뗏(설) 성수기 대응이 가능합니다.',
      en:'JINSENG HOUSE processes red ginseng from Korea\'s famous ginseng regions with 20 years of export experience, offering a range of gift formats for peak seasons.'} },

  { id:'toto', brand:'TOTO KIDS', logo:'https://picsum.photos/seed/mkc-toto/200/200',
    cover:'https://picsum.photos/seed/mkc-toto-cv/1200/400', cat:'kids',
    name:{vi:'TOTO KIDS', ko:'토토키즈', en:'TOTO KIDS'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'2011', staff:'36', export:'11', moqPolicy:'2,000',
    certs:['KC','CE','EN71'],
    tagline:{vi:'Đồ chơi giáo dục cho trường mầm non Hàn Quốc', ko:'한국 유치원 납품 교육완구', en:'Educational toys for Korean kindergartens'},
    intro:{vi:'TOTO KIDS sản xuất đồ chơi giáo dục trong 15 năm, cung cấp cho các trường mầm non Hàn Quốc. Vật liệu ABS không BPA, hỗ trợ in hộp theo yêu cầu.',
      ko:'토토키즈는 15년 경력의 교육완구 공급사로 한국 유치원·어린이집에 납품하고 있습니다. BPA-free ABS 소재를 사용하며 주문 패키지 인쇄를 지원합니다.',
      en:'TOTO KIDS has made educational toys for 15 years, supplying Korean kindergartens. BPA-free ABS materials with custom box printing available.'} },

  { id:'airio', brand:'AIRIO', logo:'https://picsum.photos/seed/mkc-airio/200/200',
    cover:'https://picsum.photos/seed/mkc-airio-cv/1200/400', cat:'tech',
    name:{vi:'AIRIO', ko:'에어리오', en:'AIRIO'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'2020', staff:'19', export:'5', moqPolicy:'1,000',
    certs:['CE','FCC','KC'],
    tagline:{vi:'Thiết bị môi trường trong nhà, giải Red Dot 2024', ko:'실내환경 가전, 2024 레드닷 수상', en:'Indoor-environment devices, Red Dot 2024'},
    intro:{vi:'AIRIO là startup thiết bị môi trường trong nhà, đạt giải Red Dot Design Award 2024. Sử dụng bộ lọc HEPA H13 và cảm biến PM2.5, tập trung vào dòng để bàn nhỏ gọn.',
      ko:'에어리오는 실내환경 가전 스타트업으로 2024 레드닷 디자인 어워드를 수상했습니다. HEPA H13 필터와 PM2.5 센서를 적용한 컴팩트 데스크 라인에 집중하고 있습니다.',
      en:'AIRIO is an indoor-environment device startup and 2024 Red Dot Design Award winner, focused on compact desktop units with HEPA H13 filters and PM2.5 sensors.'} },

  { id:'modam', brand:'MODAM', logo:'https://picsum.photos/seed/mkc-modam/200/200',
    cover:'https://picsum.photos/seed/mkc-modam-cv/1200/400', cat:'beauty',
    name:{vi:'MODAM', ko:'모담', en:'MODAM'},
    location:{vi:'Daegu, Hàn Quốc', ko:'대구광역시', en:'Daegu, Korea'},
    since:'2016', staff:'67', export:'8', moqPolicy:'30,000',
    certs:['CGMP','CPNP'],
    tagline:{vi:'Công suất 500.000 miếng mặt nạ mỗi ngày', ko:'일 50만 장 마스크팩 생산능력', en:'500,000 sheet masks per day'},
    intro:{vi:'MODAM chuyên sản xuất mặt nạ giấy với công suất 500.000 miếng mỗi ngày tại nhà máy Daegu. Nhận private label với giá vốn cạnh tranh cho các đơn hàng lớn.',
      ko:'모담은 대구 공장에서 일 50만 장 생산능력을 갖춘 마스크팩 전문 공급사입니다. 대량 주문에 경쟁력 있는 원가로 프라이빗 라벨을 제공합니다.',
      en:'MODAM specializes in sheet masks with 500,000 sheets/day capacity at its Daegu factory, offering private label at competitive cost for large orders.'} },

  { id:'dalsung', brand:'DALSUNG TEA', logo:'https://picsum.photos/seed/mkc-dal/200/200',
    cover:'https://picsum.photos/seed/mkc-dal-cv/1200/400', cat:'food',
    name:{vi:'DALSUNG TEA', ko:'달성티', en:'DALSUNG TEA'},
    location:{vi:'Dalseong, Daegu', ko:'대구 달성군', en:'Dalseong, Daegu'},
    since:'2009', staff:'14', export:'4', moqPolicy:'5,000',
    certs:['유기농 인증(한국)','HACCP'],
    tagline:{vi:'Trà hữu cơ trồng và chế biến tại Dalseong', ko:'달성군 직영 유기농 차 재배·가공', en:'Organic tea grown and processed in Dalseong'},
    intro:{vi:'DALSUNG TEA trồng và chế biến trà tại vùng Dalseong, Daegu theo chuẩn hữu cơ Hàn Quốc. Chuyên dòng trà ngũ cốc không caffeine, nhận OEM quy cách túi lọc.',
      ko:'달성티는 대구 달성군에서 유기농 인증 기준으로 차를 재배·가공합니다. 카페인 없는 곡물차 라인이 주력이며 티백 규격 OEM이 가능합니다.',
      en:'DALSUNG TEA grows and processes tea in Dalseong, Daegu under Korean organic standards, specializing in caffeine-free grain teas with tea-bag OEM available.'} },

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
    id:'p1', cat:'beauty', featured:true, isNew:true, createdAt:'2026-07-20',
    companyId:'daon', brand:'DAON COSMETIC', origin:'Daegu, Korea',
    name:{vi:'Serum tái tạo da Daon Cica Pro', ko:'다온 시카 프로 재생 세럼', en:'Daon Cica Pro Repair Serum'},
    tagline:{vi:'Serum phục hồi da chuyên sâu với 82% chiết xuất rau má Hàn Quốc', ko:'한국산 병풀 추출물 82% 고농축 진정 세럼', en:'Intensive repair serum with 82% Korean centella extract'},
    img:'https://picsum.photos/seed/mkv-serum/800/600',
    gallery:['https://picsum.photos/seed/mkv-serum/800/600','https://picsum.photos/seed/mkv-serum2/800/600','https://picsum.photos/seed/mkv-serum3/800/600'],
    video:'', inquiries:23, views:1840,
    price:'US$ 4.20 / unit (FOB Busan)', moq:'3,000 units', lead:'30 days', terms:'OEM/ODM available · Private label OK',
    brandStory:{vi:'DAON COSMETIC là nhà sản xuất mỹ phẩm tại Daegu với 12 năm kinh nghiệm OEM/ODM cho các thương hiệu K-Beauty. Nhà máy đạt chuẩn CGMP, xuất khẩu sang 14 quốc gia.',
      ko:'다온코스메틱은 대구 소재 화장품 공급사로, K-뷰티 브랜드 OEM/ODM 12년 경력을 보유하고 있습니다. CGMP 인증 공장, 14개국 수출 실적.',
      en:'DAON COSMETIC is a Daegu-based manufacturer with 12 years of K-Beauty OEM/ODM experience. CGMP-certified factory exporting to 14 countries.'},
    detail:[
      {type:'p', text:{vi:'Chứng nhận CPNP & FDA. Không paraben, không hương liệu nhân tạo — phù hợp làn da nhạy cảm của khí hậu nhiệt đới.', ko:'CPNP·FDA 인증. 파라벤·인공향료 무첨가로 열대기후 민감성 피부에 적합합니다.', en:'CPNP & FDA certified. Paraben-free, no artificial fragrance — ideal for sensitive skin in tropical climates.'}},
      {type:'img', src:'https://picsum.photos/seed/mkv-serum-d1/900/600'},
      {type:'p', text:{vi:'Đã có mặt tại Olive Young Hàn Quốc và các chuỗi drugstore lớn. Hỗ trợ đầy đủ hồ sơ công bố mỹ phẩm tại Việt Nam.', ko:'올리브영 및 주요 드럭스토어 입점 제품. 베트남 화장품 공고 서류 지원 가능.', en:'Available in Olive Young Korea and major drugstores. Full support for Vietnam cosmetic notification dossiers.'}},
      {type:'img', src:'https://picsum.photos/seed/mkv-serum-d2/900/600'},
    ]
  },
  {
    id:'p2', cat:'food', featured:true, isNew:false, createdAt:'2026-07-14',
    companyId:'hanil', brand:'HANIL FOOD', origin:'Daegu, Korea',
    name:{vi:'Tteokbokki tự sôi HanilPot', ko:'하니포트 자체발열 즉석 떡볶이', en:'HanilPot Self-Heating Tteokbokki'},
    tagline:{vi:'Món ăn Hàn Quốc tự làm nóng trong 8 phút — không cần bếp, không cần điện', ko:'불 없이 8분, 자체발열 즉석 떡볶이', en:'Self-heating Korean street food ready in 8 minutes — no stove needed'},
    img:'https://picsum.photos/seed/mkv-tteok/800/600',
    gallery:['https://picsum.photos/seed/mkv-tteok/800/600','https://picsum.photos/seed/mkv-tteok2/800/600'],
    video:'', inquiries:41, views:3120,
    price:'US$ 1.85 / pack (FOB Busan)', moq:'10,000 packs', lead:'25 days', terms:'Halal cert. in progress · Shelf life 12 months',
    brandStory:{vi:'HANIL FOOD sản xuất thực phẩm tiện lợi Hàn Quốc từ 1998. Dây chuyền HACCP, sản phẩm có mặt tại CU, GS25 toàn Hàn Quốc.',
      ko:'하니일푸드는 1998년부터 한국 간편식품을 생산해온 기업입니다. HACCP 인증 라인, 전국 CU·GS25 입점.',
      en:'HANIL FOOD has produced Korean convenience food since 1998. HACCP-certified lines; products in CU and GS25 nationwide.'},
    detail:[
      {type:'p', text:{vi:'Cơm hộp tự sôi là xu hướng lớn tại thị trường Đông Nam Á — phù hợp cửa hàng tiện lợi, khu du lịch, đồ ăn văn phòng.', ko:'자체발열 간편식은 동남아 시장의 큰 트렌드 — 편의점·관광지·오피스 판로에 적합합니다.', en:'Self-heating meals are a major SEA trend — perfect for convenience stores, tourist areas, and office snacking.'}},
      {type:'img', src:'https://picsum.photos/seed/mkv-tteok-d1/900/600'},
    ]
  },
  {
    id:'p3', cat:'living', featured:true, isNew:true, createdAt:'2026-07-22',
    companyId:'cleanlab', brand:'CLEANLAB', origin:'Daegu, Korea',
    name:{vi:'Máy khử trùng dao thớt UV CleanLab', ko:'클린랩 UV 도마·칼 살균기', en:'CleanLab UV Cutting Board Sterilizer'},
    tagline:{vi:'Khử 99.9% vi khuẩn trên dao thớt trong 10 phút bằng UV-C LED', ko:'UV-C LED로 10분 만에 도마·칼 99.9% 살균', en:'Kills 99.9% of germs on knives & boards in 10 minutes with UV-C LED'},
    img:'https://picsum.photos/seed/mkv-uv/800/600',
    gallery:['https://picsum.photos/seed/mkv-uv/800/600','https://picsum.photos/seed/mkv-uv2/800/600'],
    video:'', inquiries:17, views:980,
    price:'US$ 28.50 / unit (FOB Busan)', moq:'500 units', lead:'35 days', terms:'CE/KC certified · 220V SEA plug available',
    brandStory:{vi:'CLEANLAB phát triển thiết bị vệ sinh nhà bếp thông minh, đạt giải thưởng thiết kế Hàn Quốc 2025.', ko:'클린랩은 스마트 주방위생 가전 전문기업으로 2025 대한민국 디자인어워드 수상 기업입니다.', en:'CLEANLAB builds smart kitchen-hygiene devices; winner of the 2025 Korea Design Award.'},
    detail:[
      {type:'p', text:{vi:'Khí hậu nóng ẩm Việt Nam khiến dụng cụ bếp dễ nhiễm khuẩn — sản phẩm giải quyết đúng nỗi lo của gia đình hiện đại.', ko:'고온다습한 베트남 기후에서 주방도구 위생 문제를 정확히 해결하는 제품입니다.', en:'Vietnam\'s hot, humid climate makes kitchen tools prone to bacteria — this solves a real worry for modern families.'}},
      {type:'img', src:'https://picsum.photos/seed/mkv-uv-d1/900/600'},
    ]
  },
  {
    id:'p4', cat:'health', featured:false, isNew:true, createdAt:'2026-07-24',
    companyId:'jinseng', brand:'JINSENG HOUSE', origin:'Daegu, Korea',
    name:{vi:'Nước hồng sâm Hàn Quốc 6 năm tuổi', ko:'6년근 고려 홍삼액 스틱', en:'6-Year Korean Red Ginseng Extract Sticks'},
    tagline:{vi:'Hồng sâm 6 năm tuổi dạng gói tiện lợi — quà biếu cao cấp được ưa chuộng', ko:'휴대가 간편한 스틱형 6년근 홍삼액', en:'Premium 6-year red ginseng in convenient stick packs'},
    img:'https://picsum.photos/seed/mkv-ginseng/800/600',
    gallery:['https://picsum.photos/seed/mkv-ginseng/800/600'],
    video:'', inquiries:35, views:2540,
    price:'US$ 12.00 / box (30 sticks)', moq:'1,000 boxes', lead:'20 days', terms:'Gift packaging · OEM available',
    brandStory:{vi:'JINSENG HOUSE chuyên chế biến hồng sâm từ vùng trồng sâm nổi tiếng của Hàn Quốc, xuất khẩu 20 năm.', ko:'진생하우스는 한국 대표 인삼 산지의 홍삼 전문 공급사로 수출 경력 20년입니다.', en:'JINSENG HOUSE processes red ginseng from Korea\'s famous ginseng regions, exporting for 20 years.'},
    detail:[
      {type:'p', text:{vi:'Hồng sâm Hàn Quốc là mặt hàng quà biếu số 1 tại Việt Nam dịp Tết. Bao bì quà tặng sang trọng, sẵn sàng cho mùa cao điểm.', ko:'홍삼은 베트남 뗏(설) 시즌 1위 선물 품목입니다. 고급 선물 패키지로 성수기 대응이 가능합니다.', en:'Korean red ginseng is the #1 gift item in Vietnam during Tet. Luxury gift packaging ready for peak season.'}},
    ]
  },
  {
    id:'p5', cat:'kids', featured:false, isNew:false, createdAt:'2026-07-10',
    companyId:'toto', brand:'TOTO KIDS', origin:'Daegu, Korea',
    name:{vi:'Bộ đồ chơi khối nam châm ToTo Block', ko:'토토블럭 자석 블록 세트', en:'ToTo Block Magnetic Building Set'},
    tagline:{vi:'Đồ chơi giáo dục STEAM an toàn — nhựa ABS không BPA, chứng nhận KC/CE', ko:'BPA-free ABS 안전 소재 STEAM 교육 자석블록', en:'Safe STEAM educational toy — BPA-free ABS, KC/CE certified'},
    img:'https://picsum.photos/seed/mkv-block/800/600',
    gallery:['https://picsum.photos/seed/mkv-block/800/600'],
    video:'', inquiries:12, views:760,
    price:'US$ 9.80 / set (64pcs)', moq:'2,000 sets', lead:'40 days', terms:'CE/KC certified · Custom box printing',
    brandStory:{vi:'TOTO KIDS sản xuất đồ chơi giáo dục 15 năm, cung cấp cho các trường mầm non Hàn Quốc.', ko:'토토키즈는 15년 경력의 교육완구 공급사로 한국 유치원·어린이집에 납품하고 있습니다.', en:'TOTO KIDS has made educational toys for 15 years, supplying Korean kindergartens.'},
    detail:[
      {type:'p', text:{vi:'Tầng lớp trung lưu Việt Nam đầu tư mạnh cho giáo dục sớm — đồ chơi STEAM Hàn Quốc có vị thế thương hiệu cao.', ko:'베트남 중산층의 조기교육 투자가 급증 — 한국 STEAM 완구의 브랜드 위상이 높습니다.', en:'Vietnam\'s middle class invests heavily in early education — Korean STEAM toys carry strong brand equity.'}},
    ]
  },
  {
    id:'p6', cat:'tech', featured:true, isNew:false, createdAt:'2026-07-05',
    companyId:'airio', brand:'AIRIO', origin:'Daegu, Korea',
    name:{vi:'Máy lọc không khí mini AIRIO Cube', ko:'에어리오 큐브 미니 공기청정기', en:'AIRIO Cube Mini Air Purifier'},
    tagline:{vi:'Máy lọc không khí để bàn với cảm biến PM2.5 — thiết kế giải thưởng Red Dot', ko:'PM2.5 센서 탑재 데스크 공기청정기 — 레드닷 수상 디자인', en:'Desktop air purifier with PM2.5 sensor — Red Dot award design'},
    img:'https://picsum.photos/seed/mkv-air/800/600',
    gallery:['https://picsum.photos/seed/mkv-air/800/600','https://picsum.photos/seed/mkv-air2/800/600'],
    video:'', inquiries:28, views:2210,
    price:'US$ 32.00 / unit (FOB Busan)', moq:'1,000 units', lead:'45 days', terms:'CE/FCC · HEPA H13 filter',
    brandStory:{vi:'AIRIO là startup thiết bị môi trường trong nhà, đạt giải Red Dot Design Award 2024.', ko:'에어리오는 실내환경 가전 스타트업으로 2024 레드닷 디자인 어워드를 수상했습니다.', en:'AIRIO is an indoor-environment device startup and 2024 Red Dot Design Award winner.'},
    detail:[
      {type:'p', text:{vi:'Ô nhiễm không khí đô thị là mối quan tâm hàng đầu tại Hà Nội và TP.HCM — thị trường máy lọc khí tăng 30%/năm.', ko:'하노이·호치민의 대기오염 이슈로 공기청정기 시장이 연 30% 성장 중입니다.', en:'Urban air pollution is a top concern in Hanoi and HCMC — the purifier market grows 30% yearly.'}},
    ]
  },
  {
    id:'p7', cat:'beauty', featured:false, isNew:false, createdAt:'2026-06-28',
    companyId:'modam', brand:'MODAM', origin:'Daegu, Korea',
    name:{vi:'Mặt nạ dưỡng ẩm collagen MODAM', ko:'모담 콜라겐 수분 마스크팩', en:'MODAM Collagen Hydration Mask Pack'},
    tagline:{vi:'Mặt nạ K-Beauty với collagen thủy phân — bán chạy trên Shopee Hàn', ko:'가수분해 콜라겐 함유 K-뷰티 마스크팩', en:'K-Beauty sheet mask with hydrolyzed collagen — Shopee bestseller'},
    img:'https://picsum.photos/seed/mkv-mask/800/600',
    gallery:['https://picsum.photos/seed/mkv-mask/800/600'],
    video:'', inquiries:19, views:1430,
    price:'US$ 0.45 / sheet (FOB Busan)', moq:'30,000 sheets', lead:'20 days', terms:'Private label OK · CPNP',
    brandStory:{vi:'MODAM chuyên sản xuất mặt nạ giấy với công suất 500,000 miếng/ngày tại nhà máy Daegu.', ko:'모담은 대구 공장에서 일 50만 장 생산능력을 갖춘 마스크팩 전문 공급사입니다.', en:'MODAM specializes in sheet masks with 500,000 sheets/day capacity at its Daegu factory.'},
    detail:[
      {type:'p', text:{vi:'Mặt nạ giấy Hàn Quốc là sản phẩm K-Beauty phổ biến nhất tại Việt Nam với giá vốn thấp, biên lợi nhuận cao.', ko:'마스크팩은 베트남에서 가장 대중적인 K-뷰티 품목 — 낮은 원가와 높은 마진이 강점입니다.', en:'Korean sheet masks are Vietnam\'s most popular K-Beauty item — low cost, high margin.'}},
    ]
  },
  {
    id:'p8', cat:'food', featured:false, isNew:true, createdAt:'2026-07-25',
    companyId:'dalsung', brand:'DALSUNG TEA', origin:'Daegu, Korea',
    name:{vi:'Trà gạo rang hữu cơ Dalsung', ko:'달성 유기농 현미 누룽지차', en:'Dalsung Organic Roasted Rice Tea'},
    tagline:{vi:'Trà gạo rang hữu cơ không caffeine — vị ấm quen thuộc với người Việt', ko:'카페인 없는 유기농 현미 누룽지차', en:'Caffeine-free organic roasted rice tea — a familiar warm taste'},
    img:'https://picsum.photos/seed/mkv-tea/800/600',
    gallery:['https://picsum.photos/seed/mkv-tea/800/600'],
    video:'', inquiries:8, views:520,
    price:'US$ 3.10 / box (20 bags)', moq:'5,000 boxes', lead:'30 days', terms:'Organic cert. (Korea) · OEM',
    brandStory:{vi:'DALSUNG TEA trồng và chế biến trà tại vùng Dalseong, Daegu theo chuẩn hữu cơ Hàn Quốc.', ko:'달성티는 대구 달성군에서 유기농 인증 기준으로 차를 재배·가공합니다.', en:'DALSUNG TEA grows and processes tea in Dalseong, Daegu under Korean organic standards.'},
    detail:[
      {type:'p', text:{vi:'Người tiêu dùng Việt ngày càng tìm đồ uống lành mạnh không caffeine — trà gạo rang Hàn Quốc đang lên xu hướng.', ko:'베트남 소비자의 건강음료 수요 증가로 한국 곡물차가 트렌드로 부상 중입니다.', en:'Vietnamese consumers increasingly seek healthy caffeine-free drinks — Korean grain teas are trending.'}},
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
       바이어가 실제로 읽는 정보는 텍스트 블록에 담는다. 수치는 이미지의 시험성적서 기재값. */
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
    body:{"ko":"<p>안녕하세요, 메이크노브입니다. 견적 요청 메일을 보내고 답이 오지 않는 경우가 많습니다. 상대가 무시해서가 아니라, 받은 내용만으로는 단가를 계산할 수 없어서 답을 못 하는 경우가 대부분입니다.</p>\n\n<h2>견적 회신이 늦어지는 이유는 무엇일까?</h2>\n<p>공급사가 단가를 뽑으려면 최소한 몇 개를, 언제까지 필요한지를 알아야 합니다. 이 두 가지가 없으면 담당자는 \"수량이 어떻게 되나요\"를 다시 물어야 하고, 그 왕복에만 며칠이 갑니다.</p>\n<p>\"가격이 얼마인가요\"만 적힌 메일은 답하기 어려운 질문입니다. 100개와 10,000개의 단가가 다르고, 다음 주 선적과 3개월 뒤 선적의 조건이 다르기 때문입니다.</p>\n\n<h2>견적 요청에 반드시 들어가야 할 항목은?</h2>\n<p>아래 여섯 가지만 채우면 대부분의 공급사가 한 번에 답을 줄 수 있습니다.</p>\n<table>\n<tr><th>희망 수량</th><td>첫 주문 기준 수량. 재주문 계획이 있다면 함께 적으면 조건이 좋아집니다.</td></tr>\n<tr><th>필요 시기</th><td>언제까지 받아야 하는지. 시즌이 걸려 있으면 그것도 적어주세요.</td></tr>\n<tr><th>판매 채널</th><td>약국, 화장품 매장, 마트, 온라인 등. 채널에 따라 포장과 조건이 달라집니다.</td></tr>\n<tr><th>도착지</th><td>도착 항구나 도시. 운임을 포함한 견적을 받으려면 필요합니다.</td></tr>\n<tr><th>필요 서류</th><td>전성분표, 원산지증명서, 시험성적서 등 수입 절차에 필요한 것.</td></tr>\n<tr><th>샘플 여부</th><td>본 발주 전에 샘플을 볼 것인지.</td></tr>\n</table>\n<p>메이크노브의 견적 요청 폼은 이 항목들을 그대로 받게 만들어져 있습니다. 빈칸을 채우면 공급사에게 정리된 형태로 전달됩니다.</p>\n\n<h2>MOQ가 부담될 때는 어떻게 말해야 할까?</h2>\n<p>최소주문수량이 높다고 대화를 접을 필요는 없습니다. 시장 테스트용 소량 주문에 열려 있는 공급사가 생각보다 많습니다. 다만 그냥 \"깎아 달라\"고 하면 답이 어렵습니다.</p>\n<p>대신 이렇게 적으면 협의가 시작됩니다. \"MOQ가 3,000개인 것으로 보입니다. 첫 주문은 500개로 시작해 반응을 보고 분기마다 재주문할 계획입니다. 500개로 가능한 조건이 있을까요?\"</p>\n<p>수량만 낮추는 요청이 아니라 이후 계획까지 보여주는 요청이기 때문입니다. 제품 페이지에 <strong>협의 가능</strong> 표시가 붙은 제품은 이런 논의가 가능한 제품입니다.</p>\n\n<h2>수입 공고용 서류는 언제 요청해야 할까?</h2>\n<p>가장 흔한 실수가 발주를 확정한 다음에 서류를 찾는 것입니다. 화장품·식품·의료기기는 수입 전에 제품 공고나 등록 절차를 밟아야 하고, 여기에는 공급사만 줄 수 있는 자료가 들어갑니다.</p>\n<p>그래서 서류는 <strong>견적 단계에서 함께 요청</strong>하는 것이 맞습니다. 공급사가 그 자료를 만들어 본 적이 있는지도 이때 확인됩니다. 없다고 하면 일정을 다시 잡아야 하는데, 그 사실을 발주 후에 아는 것보다 지금 아는 편이 낫습니다.</p>\n\n<h2>메이크노브는</h2>\n<p>전 세계 공급사의 혁신 제품을 한자리에 모아두고, 사업자 인증을 통과한 바이어에게 단가와 최소주문수량을 공개하는 B2B 플랫폼입니다. 문의는 중간상 없이 공급사에 바로 전달되며, 필요하면 화상 미팅도 요청할 수 있습니다.</p>\n<p>가입과 인증은 무료이고 1분 정도 걸립니다.</p>","vi":"<p>Xin chào, MAKENOV đây. Rất nhiều yêu cầu báo giá gửi đi mà không nhận được hồi âm. Phần lớn không phải vì bên kia bỏ qua, mà vì với những gì nhận được họ không thể tính ra đơn giá.</p>\n\n<h2>Vì sao báo giá hay bị chậm?</h2>\n<p>Để tính giá, nhà cung cấp cần biết tối thiểu là bao nhiêu cái và cần khi nào. Thiếu hai điều đó, người phụ trách phải hỏi lại \"số lượng bao nhiêu\", và chỉ riêng vòng hỏi đáp ấy đã mất vài ngày.</p>\n<p>Email chỉ ghi \"giá bao nhiêu\" là câu rất khó trả lời. Giá của 100 cái khác 10.000 cái, và điều kiện giao tuần sau khác giao sau ba tháng.</p>\n\n<h2>Yêu cầu báo giá phải có những mục nào?</h2>\n<p>Chỉ cần điền sáu mục dưới đây, phần lớn nhà cung cấp trả lời được ngay trong một lần.</p>\n<table>\n<tr><th>Số lượng dự kiến</th><td>Số lượng cho đơn đầu. Có kế hoạch đặt lại thì ghi luôn, điều kiện sẽ tốt hơn.</td></tr>\n<tr><th>Thời điểm cần</th><td>Cần nhận trước ngày nào. Nếu gắn với mùa vụ thì ghi rõ.</td></tr>\n<tr><th>Kênh bán</th><td>Nhà thuốc, cửa hàng mỹ phẩm, siêu thị, online. Kênh khác nhau thì đóng gói và điều kiện khác nhau.</td></tr>\n<tr><th>Nơi nhận hàng</th><td>Cảng hoặc thành phố đến. Cần có để nhận báo giá gồm cước.</td></tr>\n<tr><th>Giấy tờ cần</th><td>Bảng thành phần, C/O, phiếu kiểm nghiệm và những gì thủ tục nhập khẩu đòi hỏi.</td></tr>\n<tr><th>Hàng mẫu</th><td>Có cần xem mẫu trước khi đặt chính thức hay không.</td></tr>\n</table>\n<p>Biểu mẫu yêu cầu báo giá của MAKENOV được dựng đúng theo các mục này. Bạn điền vào ô trống, nội dung được chuyển tới nhà cung cấp ở dạng đã sắp xếp.</p>\n\n<h2>Khi MOQ quá cao thì nên nói thế nào?</h2>\n<p>Số lượng tối thiểu cao không có nghĩa là phải dừng câu chuyện. Số nhà cung cấp sẵn sàng nhận đơn thử nghiệm nhiều hơn bạn nghĩ. Nhưng chỉ nói \"giảm giúp tôi\" thì họ khó trả lời.</p>\n<p>Thay vào đó, viết như thế này thì cuộc thương lượng bắt đầu: \"MOQ đang là 3.000 cái. Đơn đầu tôi muốn bắt đầu với 500 cái, xem phản ứng thị trường rồi đặt lại theo quý. Có phương án nào cho mức 500 cái không?\"</p>\n<p>Vì đó không chỉ là xin giảm số lượng mà còn cho thấy kế hoạch phía sau. Sản phẩm có nhãn <strong>có thể thương lượng</strong> trên trang chi tiết là sản phẩm bàn được chuyện này.</p>\n\n<h2>Khi nào nên xin giấy tờ công bố sản phẩm?</h2>\n<p>Sai lầm phổ biến nhất là chốt đơn xong mới đi tìm giấy tờ. Mỹ phẩm, thực phẩm và thiết bị y tế phải công bố hoặc đăng ký trước khi nhập, mà hồ sơ đó có những phần chỉ nhà cung cấp mới cấp được.</p>\n<p>Vì vậy nên <strong>xin ngay ở bước báo giá</strong>. Đây cũng là lúc biết được nhà cung cấp đã từng làm hồ sơ này chưa. Nếu chưa thì phải tính lại lịch, và biết điều đó bây giờ vẫn hơn là biết sau khi đã đặt hàng.</p>\n\n<h2>Về MAKENOV</h2>\n<p>MAKENOV là nền tảng B2B tập hợp sản phẩm đổi mới của các nhà cung cấp toàn cầu, và mở đơn giá cùng số lượng tối thiểu cho nhà mua đã xác thực doanh nghiệp. Yêu cầu đi thẳng tới nhà cung cấp, không qua trung gian, và bạn có thể đặt lịch gặp qua video khi cần.</p>\n<p>Đăng ký và xác thực miễn phí, mất khoảng một phút.</p>","en":"<p>Hello, this is MAKENOV. A lot of quote requests go out and never come back. Usually it is not that the other side ignored you: with what they received, they simply cannot work out a price.</p>\n\n<h2>Why do quotes come back slowly?</h2>\n<p>To price anything, a supplier needs to know how many and by when. Without those two, the person handling it has to write back asking \"what quantity?\", and that round trip alone costs days.</p>\n<p>An email that only asks \"how much is it?\" is a hard question to answer. A hundred units and ten thousand units are different prices, and shipping next week is a different arrangement from shipping in three months.</p>\n\n<h2>What must a quote request contain?</h2>\n<p>Fill in these six and most suppliers can answer in one pass.</p>\n<table>\n<tr><th>Target quantity</th><td>For the first order. If you plan to reorder, say so and the terms usually improve.</td></tr>\n<tr><th>When you need it</th><td>The date you must have it by, and the season if one applies.</td></tr>\n<tr><th>Sales channel</th><td>Pharmacy, cosmetics stores, supermarket, online. Packaging and terms follow the channel.</td></tr>\n<tr><th>Destination</th><td>Arrival port or city, needed for any quote that includes freight.</td></tr>\n<tr><th>Documents</th><td>Ingredient list, certificate of origin, test reports and whatever your import process requires.</td></tr>\n<tr><th>Samples</th><td>Whether you want to see samples before the main order.</td></tr>\n</table>\n<p>The MAKENOV quote form is built around exactly these fields. Fill the blanks and the supplier receives it already organised.</p>\n\n<h2>What if the MOQ is too high?</h2>\n<p>A high minimum is not a reason to end the conversation. More suppliers are open to trial orders than you would expect. But \"can you lower it\" on its own is hard to answer.</p>\n<p>This gets a negotiation started instead: \"Your MOQ appears to be 3,000 units. We would like to start at 500, see how the market responds, and reorder quarterly. Is there an arrangement that works at 500?\"</p>\n<p>It is not only a request to cut the quantity; it shows what comes after. Products tagged <strong>negotiable</strong> on the detail page are the ones where this discussion is possible.</p>\n\n<h2>When should you ask for import documents?</h2>\n<p>The most common mistake is going looking for paperwork after the order is placed. Cosmetics, food and medical devices need product notification or registration before import, and parts of that dossier only the supplier can provide.</p>\n<p>So ask for them <strong>at the quote stage</strong>. That is also when you find out whether the supplier has produced such a dossier before. If they have not, the schedule needs rethinking, and it is better to learn that now than after you have ordered.</p>\n\n<h2>About MAKENOV</h2>\n<p>MAKENOV is a B2B platform that gathers innovative products from suppliers worldwide and opens unit prices and minimum order quantities to buyers who pass business verification. Requests go straight to the supplier with no middleman, and you can request a video meeting when you need one.</p>\n<p>Signing up and verifying is free and takes about a minute.</p>"}
  },
  {
    id:"c-sample", cat:{"ko":"가이드","vi":"Hướng dẫn","en":"Guide"}, date:"2026-08-04",
    img:"assets/img/columns/sample-request.svg", slug:"sample-request-checklist",
    seoTitle:"수입 샘플 요청 체크리스트 — 수량·비용 부담·확인 항목", seoDesc:"샘플 요청이 흐지부지되는 이유, 요청 전에 정할 여섯 가지, 샘플비와 배송비 부담 관행, 받은 뒤 남겨야 할 기록까지 정리했습니다.",
    title:{"ko":"샘플을 요청하기 전에, 무엇을 정해두어야 할까?","vi":"Trước khi xin hàng mẫu, cần quyết những gì?","en":"What to settle before you ask for samples"},
    excerpt:{"ko":"샘플은 받는 것보다 무엇을 볼지 정해두고 받는 것이 중요합니다. 요청 전에 정할 여섯 가지와 받은 뒤 남겨야 할 기록을 정리했습니다.","vi":"Quan trọng không phải là nhận được mẫu, mà là biết mình sẽ kiểm tra gì trước khi nhận. Bài này tóm tắt sáu việc cần quyết trước và những gì phải ghi lại sau khi nhận.","en":"What matters is not receiving a sample but knowing what you will check before it arrives. Six things to settle first, and what to record afterwards."},
    body:{"ko":"<p>안녕하세요, 메이크노브입니다. 샘플은 받아보는 것보다, 무엇을 볼지 정해두고 받는 것이 중요합니다. 기준 없이 받으면 대개 \"괜찮네요\"에서 대화가 멈춥니다.</p>\n\n<h2>샘플까지 받고도 흐지부지되는 이유는 무엇일까?</h2>\n<p>받기 전에 확인 항목을 정하지 않았기 때문입니다. 무엇을 보려고 받는지가 없으면 결국 한두 사람의 인상만 남고, 사내에서 다음 단계를 설득할 근거가 되지 않습니다.</p>\n<p>공급사 쪽도 마찬가지입니다. \"샘플 보내주세요\"만 받으면 어느 규격으로, 어떤 포장으로, 라벨은 어느 언어로 보낼지 알 수 없습니다. 결국 되묻게 되고 일정이 밀립니다.</p>\n\n<h2>샘플을 요청하기 전에 정해둘 것은?</h2>\n<p>여섯 가지면 충분합니다. 이것만 정리해서 보내면 대부분 한 번에 진행됩니다.</p>\n<table>\n<tr><th>확인 항목</th><td>무엇을 보려고 받는지. 향과 발림성인지, 포장 강도인지, 표기 사항인지.</td></tr>\n<tr><th>수량</th><td>몇 개가 필요한지. 내부 검토용과 매장 반응 테스트용은 수량이 다릅니다.</td></tr>\n<tr><th>규격</th><td>판매용 완제품인지 벌크인지, 라벨을 현지어로 볼 것인지.</td></tr>\n<tr><th>비용 부담</th><td>샘플비와 배송비를 누가 낼지, 본 발주 시 차감이 되는지.</td></tr>\n<tr><th>기한</th><td>언제까지 받아야 하는지. 내부 회의 날짜가 있으면 그 날짜를 적습니다.</td></tr>\n<tr><th>함께 받을 자료</th><td>전성분표, 시험성적서, 인증서 사본 등.</td></tr>\n</table>\n<p>여기까지 정해두면 샘플이 도착했을 때 볼 것이 이미 정해져 있습니다. 판단이 빨라집니다.</p>\n\n<h2>샘플 비용은 누가 내는 것이 맞을까?</h2>\n<p>정해진 규칙은 없습니다. 다만 <strong>샘플비는 공급사, 국제 배송비는 바이어</strong>가 부담하는 형태가 가장 흔합니다. 배송비는 목적지와 무게에 따라 달라져서 공급사가 미리 떠안기 어렵기 때문입니다.</p>\n<p>무료를 먼저 요구하기보다 조건을 제시하는 편이 빠릅니다. \"샘플비는 지불하겠습니다. 본 발주가 성사되면 차감해 주실 수 있을까요?\" 이렇게 적으면 대부분 협의가 됩니다.</p>\n\n<h2>샘플을 받은 뒤에는 무엇을 남겨야 할까?</h2>\n<p>도착 날짜, 로트번호, 개봉 사진, 확인 항목별 결과를 남겨두세요. 나중에 본 발주 물량이 들어왔을 때 이 기록이 품질을 따지는 유일한 기준이 됩니다.</p>\n<p>문제가 있으면 구체적으로 알려야 합니다. \"품질이 별로다\"로는 아무것도 바뀌지 않습니다. 어느 부분이 어떻게 다른지 사진과 함께 보내면 대체 규격이나 다른 라인을 제안받을 수 있습니다.</p>\n<p>통과든 보류든 결론은 공급사에 알려주는 편이 좋습니다. 다음 거래가 훨씬 수월해집니다.</p>\n\n<h2>메이크노브는</h2>\n<p>전 세계 공급사의 혁신 제품을 한자리에 모아두고, 사업자 인증을 통과한 바이어에게 단가와 최소주문수량을 공개하는 B2B 플랫폼입니다. 샘플 요청은 견적 문의와 함께 공급사에 바로 전달됩니다.</p>\n<p>가입과 인증은 무료이고 1분 정도 걸립니다.</p>","vi":"<p>Xin chào, MAKENOV đây. Với hàng mẫu, việc nhận được không quan trọng bằng việc biết trước mình sẽ kiểm tra gì. Không có tiêu chí thì câu chuyện thường dừng ở một câu \"cũng được đấy\".</p>\n\n<h2>Vì sao nhận mẫu rồi mà mọi việc vẫn bỏ dở?</h2>\n<p>Vì trước khi nhận đã không định ra mục cần kiểm. Không biết nhận để xem gì thì cuối cùng chỉ còn lại cảm nhận của một hai người, không đủ làm căn cứ thuyết phục nội bộ đi tiếp.</p>\n<p>Phía nhà cung cấp cũng vậy. Chỉ nhận được câu \"gửi mẫu giúp tôi\" thì họ không biết gửi quy cách nào, đóng gói ra sao, nhãn bằng tiếng gì. Cuối cùng lại phải hỏi lại và lịch bị lùi.</p>\n\n<h2>Trước khi xin mẫu cần quyết những gì?</h2>\n<p>Sáu mục là đủ. Chỉ cần gửi đi bấy nhiêu, phần lớn trường hợp chạy được ngay một lần.</p>\n<table>\n<tr><th>Mục cần kiểm</th><td>Nhận để xem gì: mùi và độ thẩm thấu, độ bền bao bì, hay nội dung ghi nhãn.</td></tr>\n<tr><th>Số lượng</th><td>Cần bao nhiêu. Xem xét nội bộ và thử phản ứng tại cửa hàng là hai con số khác nhau.</td></tr>\n<tr><th>Quy cách</th><td>Hàng thành phẩm để bán hay hàng bulk, nhãn có cần tiếng bản địa không.</td></tr>\n<tr><th>Chi phí</th><td>Ai trả tiền mẫu và cước, có được trừ vào đơn chính thức không.</td></tr>\n<tr><th>Thời hạn</th><td>Cần nhận trước ngày nào. Có lịch họp nội bộ thì ghi đúng ngày đó.</td></tr>\n<tr><th>Hồ sơ kèm theo</th><td>Bảng thành phần, phiếu kiểm nghiệm, bản sao chứng nhận.</td></tr>\n</table>\n<p>Quyết xong đến đây thì lúc mẫu tới, việc cần xem đã có sẵn. Quyết định sẽ nhanh hơn.</p>\n\n<h2>Tiền mẫu ai trả là hợp lý?</h2>\n<p>Không có quy tắc cố định. Nhưng phổ biến nhất là <strong>nhà cung cấp chịu tiền mẫu, người mua chịu cước quốc tế</strong>. Cước thay đổi theo điểm đến và trọng lượng nên nhà cung cấp khó ôm trước.</p>\n<p>Đề xuất điều kiện sẽ nhanh hơn là đòi miễn phí ngay. \"Tôi sẽ trả tiền mẫu. Nếu đơn chính thức thành công thì trừ lại giúp tôi được không?\" — viết vậy thì phần lớn thương lượng được.</p>\n\n<h2>Sau khi nhận mẫu cần ghi lại gì?</h2>\n<p>Ghi ngày nhận, số lô, ảnh lúc mở hộp và kết quả theo từng mục đã định. Về sau khi hàng của đơn chính thức về, đây là căn cứ duy nhất để nói chuyện chất lượng.</p>\n<p>Có vấn đề thì phải nói cụ thể. \"Chất lượng không tốt\" thì không thay đổi được gì. Chỉ rõ chỗ nào khác ra sao kèm ảnh thì bạn có thể được đề xuất quy cách thay thế hoặc dòng hàng khác.</p>\n<p>Dù đạt hay tạm gác lại, nên báo kết luận cho nhà cung cấp. Lần giao dịch sau sẽ dễ hơn nhiều.</p>\n\n<h2>Về MAKENOV</h2>\n<p>MAKENOV là nền tảng B2B tập hợp sản phẩm đổi mới của các nhà cung cấp toàn cầu, và mở đơn giá cùng số lượng tối thiểu cho nhà mua đã xác thực doanh nghiệp. Yêu cầu hàng mẫu được chuyển thẳng tới nhà cung cấp cùng với yêu cầu báo giá.</p>\n<p>Đăng ký và xác thực miễn phí, mất khoảng một phút.</p>","en":"<p>Hello, this is MAKENOV. With samples, receiving one matters less than knowing what you will check before it arrives. Without criteria, the conversation usually stops at \"seems fine\".</p>\n\n<h2>Why do sample requests fizzle out?</h2>\n<p>Because nobody decided what to look at beforehand. If there is no stated purpose, all that remains is one or two people's impressions, which is not enough to justify the next step internally.</p>\n<p>It is the same on the supplier's side. \"Please send samples\" does not say which specification, what packaging, or which language on the label. They have to write back, and the schedule slips.</p>\n\n<h2>What should you settle before asking?</h2>\n<p>Six items are enough. Send these and most requests go through in one pass.</p>\n<table>\n<tr><th>What to check</th><td>The reason you want it: scent and texture, packaging strength, or label content.</td></tr>\n<tr><th>Quantity</th><td>How many. Internal review and an in-store response test are different numbers.</td></tr>\n<tr><th>Specification</th><td>Retail-ready or bulk, and whether you need the label in the local language.</td></tr>\n<tr><th>Who pays</th><td>Sample cost and freight, and whether it is deductible from the main order.</td></tr>\n<tr><th>Deadline</th><td>The date you need it by. If there is an internal meeting, use that date.</td></tr>\n<tr><th>Documents</th><td>Ingredient list, test reports, copies of certificates.</td></tr>\n</table>\n<p>Decide these and the moment the sample lands, you already know what to examine. The decision comes faster.</p>\n\n<h2>Who normally pays for samples?</h2>\n<p>There is no fixed rule, but the most common split is <strong>the supplier covers the sample, the buyer covers international freight</strong>. Freight varies by destination and weight, so suppliers are reluctant to absorb it up front.</p>\n<p>Proposing terms works better than asking for free. \"We will pay for the samples. Could that be credited against the main order if it goes ahead?\" — that usually opens a negotiation.</p>\n\n<h2>What should you record afterwards?</h2>\n<p>Record the arrival date, lot number, unboxing photos, and the result against each item you set. When the main shipment arrives later, this is the only basis you have for a quality discussion.</p>\n<p>If something is wrong, be specific. \"The quality is poor\" changes nothing. Point out what differs and how, with photos, and you may be offered an alternative specification or a different line.</p>\n<p>Pass or hold, tell the supplier your conclusion. The next deal goes far more smoothly.</p>\n\n<h2>About MAKENOV</h2>\n<p>MAKENOV is a B2B platform that gathers innovative products from suppliers worldwide and opens unit prices and minimum order quantities to buyers who pass business verification. Sample requests go straight to the supplier alongside your quote request.</p>\n<p>Signing up and verifying is free and takes about a minute.</p>"}
  },
  {
    id:"c-reply", cat:{"ko":"공급사","vi":"Nhà cung cấp","en":"Suppliers"}, date:"2026-08-03",
    img:"assets/img/columns/supplier-reply.svg", slug:"supplier-first-reply",
    seoTitle:"해외 바이어 문의 회신 작성법 — 첫 답장에 넣을 6가지", seoDesc:"회신이 늦으면 왜 불리한지, 첫 답장에 반드시 넣을 여섯 항목, 아직 정해지지 않은 조건을 적는 법, 수출 경험이 없을 때의 대응까지 정리했습니다.",
    title:{"ko":"해외 바이어 문의가 왔을 때, 무엇부터 답해야 할까?","vi":"Khi có nhà mua nước ngoài hỏi, nên trả lời điều gì trước?","en":"An overseas buyer just enquired. What do you answer first?"},
    excerpt:{"ko":"첫 회신에 무엇을 담느냐로 다음 연락이 올지가 갈립니다. 길게 쓸 필요는 없고, 바이어가 결정하는 데 필요한 여섯 가지만 있으면 됩니다.","vi":"Hồi âm đầu tiên chứa gì sẽ quyết định có liên lạc tiếp hay không. Không cần viết dài, chỉ cần sáu mục mà người mua dùng để ra quyết định.","en":"What goes in the first reply decides whether there is a second one. It need not be long — just the six things the buyer needs to decide."},
    body:{"ko":"<p>안녕하세요, 메이크노브입니다. 해외 바이어의 첫 문의에 무엇을 담아 답하느냐로 다음 연락이 올지가 갈립니다. 길게 쓸 필요는 없습니다. 바이어가 결정을 내리는 데 필요한 것만 있으면 됩니다.</p>\n\n<h2>회신이 늦으면 왜 불리할까?</h2>\n<p>바이어는 보통 같은 품목으로 여러 곳에 동시에 문의합니다. 먼저 도착한 회신의 조건이 기준이 되고, 뒤에 온 곳은 그 기준과 비교당하는 자리에서 시작합니다.</p>\n<p>완벽한 답을 만들다가 늦는 것보다, 확정된 것을 먼저 보내고 나머지는 언제까지 회신하겠다고 적는 편이 낫습니다. 답이 왔다는 사실 자체가 이미 판단 재료입니다.</p>\n\n<h2>첫 회신에 반드시 넣을 것은?</h2>\n<p>여섯 항목이면 충분합니다. 이것이 갖춰진 회신은 바로 내부 검토로 넘어갑니다.</p>\n<table>\n<tr><th>단가와 기준</th><td>FOB인지 CIF인지, 그리고 이 가격이 언제까지 유효한지.</td></tr>\n<tr><th>최소주문수량</th><td>수량 구간별 단가가 있으면 함께. 협의 여지가 있으면 그 사실도 적습니다.</td></tr>\n<tr><th>납기</th><td>발주 확정 후 며칠인지. 재고가 있으면 그것도 적습니다.</td></tr>\n<tr><th>결제 조건</th><td>T/T 선금 비율, 잔금 시점 등.</td></tr>\n<tr><th>보유 서류</th><td>전성분표, 시험성적서, 인증서 목록. 있는 것만 적습니다.</td></tr>\n<tr><th>담당자</th><td>이름, 직접 연락 가능한 수단, 연락 가능한 시간대.</td></tr>\n</table>\n<p>메이크노브를 통해 오는 문의에는 회사명, 담당자, 연락처, 요청 내용이 이미 정리되어 있습니다. 상대가 누구인지 확인한 뒤 회신하시면 됩니다.</p>\n\n<h2>아직 정해지지 않은 항목은 어떻게 적을까?</h2>\n<p>빈칸으로 두지 마세요. 빠진 항목은 바이어가 \"이 회사는 준비가 안 되어 있다\"로 읽습니다.</p>\n<p>대신 이렇게 적습니다. \"베트남향 라벨 제작 여부는 확인 중이며, 이번 주 금요일까지 회신드리겠습니다.\" 언제까지 답하겠다는 문장 하나가 빈칸을 대신합니다.</p>\n<p>확정되지 않은 숫자를 급하게 던지는 것이 가장 위험합니다. 나중에 조건이 달라지면 그때부터는 가격 문제가 아니라 신뢰 문제가 됩니다. 확실하지 않으면 범위로 적고 어떤 조건에서 그 범위가 정해지는지 함께 적으세요.</p>\n\n<h2>수출 경험이 없어도 문의를 받아도 될까?</h2>\n<p>됩니다. 첫 거래는 대부분 소량 테스트 오더로 시작합니다. 경험이 없다는 사실을 숨기지 말고, 지금 준비된 것과 아직 없는 것을 그대로 적는 편이 낫습니다.</p>\n<p>다만 <strong>수출 단가와 최소주문수량은 미리 정해두셔야</strong> 합니다. 바이어가 가장 먼저 묻는 두 가지이고, 이것이 없으면 문의가 와도 대화가 진행되지 않습니다.</p>\n<p>서류가 없다면 준비 기간을 함께 제시하면 됩니다. \"해당 시험성적서는 보유하고 있지 않으며, 발급까지 약 3주가 소요됩니다.\" 이렇게 적으면 바이어가 일정을 계산할 수 있습니다.</p>\n\n<h2>메이크노브는</h2>\n<p>메이크노브는 공급사의 제품을 해외 바이어에게 상시 노출하고, 사업자 인증을 통과한 바이어의 문의만 전달합니다. 제품 정보와 기업 프로필은 베트남어·영어·한국어로 등록됩니다. 등록비는 받지 않고, 다른 채널과 병행하셔도 됩니다.</p>\n<p>제품 등록 문의는 회사와 제품만 남겨주시면 됩니다.</p>","vi":"<p>Xin chào, MAKENOV đây. Hồi âm đầu tiên cho yêu cầu của nhà mua nước ngoài chứa những gì sẽ quyết định có liên lạc tiếp hay không. Không cần viết dài, chỉ cần đủ những gì người mua dùng để ra quyết định.</p>\n\n<h2>Vì sao hồi âm chậm lại bất lợi?</h2>\n<p>Người mua thường hỏi nhiều nơi cùng lúc cho cùng một mặt hàng. Điều kiện của thư đến trước trở thành mốc, và những nơi trả lời sau bắt đầu ở thế bị đem ra so với mốc đó.</p>\n<p>Thay vì chuẩn bị một câu trả lời hoàn hảo rồi trễ, hãy gửi trước những gì đã chốt và ghi rõ khi nào sẽ trả lời phần còn lại. Bản thân việc có hồi âm đã là dữ liệu để họ đánh giá.</p>\n\n<h2>Thư trả lời đầu tiên phải có gì?</h2>\n<p>Sáu mục là đủ. Một hồi âm có đủ chừng đó sẽ được chuyển thẳng vào khâu xem xét nội bộ.</p>\n<table>\n<tr><th>Giá và điều kiện</th><td>FOB hay CIF, và giá này có hiệu lực đến khi nào.</td></tr>\n<tr><th>Số lượng tối thiểu</th><td>Có bậc giá theo số lượng thì ghi kèm. Có thể thương lượng thì nói rõ.</td></tr>\n<tr><th>Thời gian giao</th><td>Bao nhiêu ngày sau khi chốt đơn. Có sẵn hàng tồn thì ghi luôn.</td></tr>\n<tr><th>Điều kiện thanh toán</th><td>Tỷ lệ đặt cọc T/T, thời điểm thanh toán phần còn lại.</td></tr>\n<tr><th>Hồ sơ đang có</th><td>Bảng thành phần, phiếu kiểm nghiệm, danh mục chứng nhận. Chỉ ghi cái đang có.</td></tr>\n<tr><th>Người phụ trách</th><td>Tên, cách liên hệ trực tiếp, khung giờ liên lạc được.</td></tr>\n</table>\n<p>Yêu cầu đến qua MAKENOV đã có sẵn tên công ty, người phụ trách, liên hệ và nội dung yêu cầu. Bạn xem đối tác là ai rồi hồi âm.</p>\n\n<h2>Những mục chưa chốt thì ghi thế nào?</h2>\n<p>Đừng để trống. Mục bị bỏ trống sẽ được đọc thành \"công ty này chưa sẵn sàng\".</p>\n<p>Hãy viết thế này: \"Việc làm nhãn cho thị trường Việt Nam đang được xác nhận, chúng tôi sẽ phản hồi trước thứ Sáu tuần này.\" Một câu hẹn ngày thay được cho ô trống.</p>\n<p>Nguy hiểm nhất là vội đưa ra con số chưa chốt. Về sau điều kiện đổi thì đó không còn là chuyện giá mà thành chuyện tin cậy. Chưa chắc thì ghi theo khoảng và nói rõ khoảng đó phụ thuộc điều kiện nào.</p>\n\n<h2>Chưa có kinh nghiệm xuất khẩu thì có nên nhận không?</h2>\n<p>Nên. Giao dịch đầu phần lớn bắt đầu bằng đơn thử số lượng nhỏ. Đừng giấu việc chưa có kinh nghiệm, cứ ghi đúng những gì đã sẵn sàng và những gì chưa có.</p>\n<p>Nhưng <strong>giá xuất khẩu và số lượng tối thiểu thì phải định trước</strong>. Đó là hai câu người mua hỏi đầu tiên, thiếu chúng thì có yêu cầu tới cũng không đi tiếp được.</p>\n<p>Nếu chưa có hồ sơ, hãy đưa kèm thời gian chuẩn bị: \"Chúng tôi chưa có phiếu kiểm nghiệm này, thời gian cấp khoảng ba tuần.\" Viết vậy thì người mua tính được lịch.</p>\n\n<h2>Về MAKENOV</h2>\n<p>MAKENOV đưa sản phẩm của nhà cung cấp tiếp cận nhà mua nước ngoài liên tục, và chỉ chuyển những yêu cầu từ người mua đã xác thực doanh nghiệp. Trang chi tiết và hồ sơ công ty do chúng tôi biên soạn bằng tiếng Việt, tiếng Anh và tiếng Hàn. Không thu phí đăng ký, và bạn vẫn có thể bán song song qua kênh khác.</p>\n<p>Để đăng ký sản phẩm, bạn chỉ cần để lại tên công ty và sản phẩm.</p>","en":"<p>Hello, this is MAKENOV. What you put in the first reply to an overseas buyer decides whether a second message ever comes. It does not need to be long — only what the buyer needs in order to decide.</p>\n\n<h2>Why does a slow reply cost you?</h2>\n<p>Buyers usually enquire with several suppliers at once for the same item. The terms in the first reply become the benchmark, and everyone answering later starts out being compared against it.</p>\n<p>Rather than being late while assembling a perfect answer, send what is confirmed and state when the rest will follow. The fact that you replied at all is already information.</p>\n\n<h2>What must the first reply carry?</h2>\n<p>Six items are enough. A reply with these goes straight into internal review.</p>\n<table>\n<tr><th>Price and basis</th><td>FOB or CIF, and how long the price holds.</td></tr>\n<tr><th>Minimum order</th><td>Include volume tiers if you have them, and say so if there is room to negotiate.</td></tr>\n<tr><th>Lead time</th><td>Days from order confirmation. Mention stock on hand if there is any.</td></tr>\n<tr><th>Payment terms</th><td>T/T deposit percentage, when the balance falls due.</td></tr>\n<tr><th>Documents held</th><td>Ingredient list, test reports, certificates. List only what you actually have.</td></tr>\n<tr><th>Contact</th><td>Name, a direct channel, and the hours you can be reached.</td></tr>\n</table>\n<p>Enquiries arriving through MAKENOV already carry the company name, contact person, contact details and the request itself. Check who you are dealing with, then reply.</p>\n\n<h2>How do you write the parts that are not settled?</h2>\n<p>Do not leave them blank. A missing line reads as \"this company is not ready\".</p>\n<p>Write it out instead: \"Vietnamese labelling is being confirmed and we will come back to you by Friday.\" One sentence with a date does the work of the blank.</p>\n<p>The riskiest move is throwing out a number you have not confirmed. If the terms change later it stops being a pricing question and becomes a trust question. When unsure, give a range and say what determines where in that range it lands.</p>\n\n<h2>Can you take enquiries with no export experience?</h2>\n<p>Yes. First deals almost always start as small trial orders. Do not hide the lack of experience — write down what is ready and what is not.</p>\n<p>But <strong>you must have an export price and a minimum order quantity</strong> decided in advance. They are the first two things a buyer asks, and without them the conversation cannot move even when an enquiry arrives.</p>\n<p>If a document is missing, offer the lead time with it: \"We do not hold that test report; issuance takes about three weeks.\" That lets the buyer plan around it.</p>\n\n<h2>About MAKENOV</h2>\n<p>MAKENOV keeps supplier products in front of overseas buyers continuously and forwards only enquiries from buyers who have passed business verification. We produce the detail pages and company profiles in Vietnamese, English and Korean. There is no listing fee, and you may keep selling through other channels.</p>\n<p>To list a product, just leave your company and product details.</p>"}
  },
];

/* spotlight feed — kind: new|inquiry|webinar, ts: ISO date */
const MK_SPOTLIGHT = [
  { kind:'inquiry', ts:'2026-07-27T09:10:00', pid:'p2' },
  { kind:'new',     ts:'2026-07-25T14:00:00', pid:'p8' },
  { kind:'inquiry', ts:'2026-07-25T11:30:00', pid:'p4' },
  { kind:'new',     ts:'2026-07-24T10:00:00', pid:'p4' },
  { kind:'inquiry', ts:'2026-07-23T16:20:00', pid:'p6' },
  { kind:'new',     ts:'2026-07-22T09:00:00', pid:'p3' },
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
   확인되지 않은 수치(예: 등록 바이어 10,000명)는 절대 넣지 말 것.
   지금은 우리가 실제로 보장하는 것만 적어둔다. 실적이 쌓이면 교체. */
const MK_MAKER = {
  stats: [
    { n:'0원',       label:'제품 등록비',           note:'' },
    { n:'3개 언어',   label:'제품 정보 등록 지원',     note:'' },
    { n:'사업자 인증', label:'바이어 거래조건 열람 기준', note:'' },
    { n:'365일',     label:'제품 상시 노출',         note:'' },
  ],
  markets: [
    { name:'베트남', desc:'유통사·도매상·리테일 사업자 등 현지 바이어에게 제품을 소개합니다.' },
    { name:'한국',   desc:'유통사·벤더·수출 파트너 등 새로운 제품을 찾는 사업자와 연결합니다.' },
    { name:'중국',   desc:'도매상과 크로스보더 셀러 등 다양한 판매 채널을 운영하는 바이어를 대상으로 합니다.' },
    { name:'미얀마', desc:'수입사·유통사 등 해외 제품을 찾는 현지 사업자에게 제품을 소개합니다.' },
  ],
  contactEmail: 'contact@makenov.com',
  contactTel: '',
};

/* ---------- 메인페이지 FAQ (바이어용) ----------
   관리자 FAQ 탭에서 편집. Supabase 모드에선 faqs 테이블이 이 시드를 덮어쓴다. */
const MK_FAQ = [
  { id:'f1', page:'home', sort:1, published:true,
    q:{vi:'Đăng ký và sử dụng có mất phí không?', ko:'가입과 이용은 무료인가요?', en:'Is it free to join and use?'},
    a:{vi:'Hoàn toàn miễn phí — đăng ký, xem sản phẩm, gửi yêu cầu báo giá và xác thực doanh nghiệp đều không mất phí.',
       ko:'네. 가입, 제품 열람, 견적 문의, 사업자 인증 모두 무료입니다.',
       en:'Yes. Signing up, browsing products, sending quotation requests and business verification are all free.'} },
  { id:'f2', page:'home', sort:2, published:true,
    q:{vi:'Vì sao giá và MOQ bị khóa?', ko:'가격과 최소주문수량(MOQ)이 왜 잠겨 있나요?', en:'Why are prices and MOQs locked?'},
    a:{vi:'Giá, MOQ, thời gian giao hàng và điều kiện cung ứng chỉ hiển thị cho nhà mua đã xác thực doanh nghiệp. Đăng ký miễn phí và xác thực để xem ngay.',
       ko:'가격·MOQ·납기·공급 조건은 사업자 인증을 통과한 바이어에게만 공개됩니다. 무료 가입 후 인증하면 바로 열람할 수 있습니다.',
       en:'Price, MOQ, lead time and supply terms are visible only to verified buyers. Sign up free and verify your business to unlock them.'} },
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
    body:{vi:'<p>MAKENOV — nền tảng B2B kết nối sản phẩm sáng tạo Hàn Quốc với nhà mua toàn cầu — đã chính thức hoạt động. Đăng ký và xác thực doanh nghiệp miễn phí để xem giá và gửi yêu cầu báo giá.</p>',
          ko:'<p>한국 혁신제품과 해외 바이어를 잇는 B2B 플랫폼 메이크노브가 문을 열었습니다. 무료 가입·사업자 인증 후 가격 열람과 견적 문의를 이용하실 수 있습니다.</p>',
          en:'<p>MAKENOV — the B2B platform connecting innovative Korean products with global buyers — is live. Sign up and verify free to unlock pricing and send quotation requests.</p>'} },
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
