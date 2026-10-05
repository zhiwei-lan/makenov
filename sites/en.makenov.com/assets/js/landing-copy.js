/* ============================================================
   MAKENOV — 개편 홈(랜딩) 카피 (annotate-landing.py 가 생성)
   ------------------------------------------------------------
   랜딩 본문은 정적 HTML 이라 i18n 을 타지 않는다. 관리자 카피 탭에서
   고칠 수 있도록 주요 문구를 LND 로 들고, data-mkl 로 DOM 과 잇는다.
   기본값 = 세 랜딩 파일의 현재 문구. 랜딩을 파일에서 직접 고쳤으면
   python annotate-landing.py 를 다시 돌려 이 파일을 재생성할 것.
   _br=1 인 키만 개행을 <br> 로 그린다(원문에 <br> 이 있던 요소).
   ============================================================ */
const LND = {
 "hero": {
  "kick": {
   "vi": "NỀN TẢNG NHÀ PHÂN PHỐI TẠI VIỆT NAM",
   "ko": "베트남 유통 파트너 플랫폼",
   "en": "DISTRIBUTION PARTNER PLATFORM FOR VIETNAM"
  },
  "h1a": {
   "vi": "Ai cũng có thể trở thành nhà phân phối chính thức",
   "ko": "누구나 글로벌 혁신 제품의",
   "en": "Anyone can become the official distributor"
  },
  "h1b": {
   "vi": "của sản phẩm tiên phong toàn cầu",
   "ko": "공식 유통사가 될 수 있습니다",
   "en": "of a global innovative product"
  },
  "sub": {
   "vi": "Xem điều kiện phân phối của những sản phẩm chưa có mặt tại Việt Nam\nvà trao đổi trực tiếp với nhà cung cấp. \nChưa có kinh nghiệm nhập khẩu vẫn bắt đầu được",
   "ko": "아직 베트남에 들어오지 않은 제품의 유통 조건을 확인하고\n공급사와 직접 상담하세요. 수입 경험이 없어도 시작할 수 있습니다",
   "en": "Check the trade terms of products that have not entered Vietnam yet\nand talk directly with suppliers. No import experience needed.",
   "_br": 1
  },
  "cta1": {
   "vi": "Khám phá sản phẩm",
   "ko": "제품 둘러보기",
   "en": "Browse products"
  },
  "cta2": {
   "vi": "Xem hướng dẫn sử dụng",
   "ko": "이용 가이드 보기",
   "en": "See the user guide"
  }
 },
 "stats": {
  "b1": {
   "vi": "Đăng ký miễn phí",
   "ko": "가입 무료",
   "en": "Free to join"
  },
  "b2": {
   "vi": "Xác thực doanh nghiệp ~1 phút",
   "ko": "사업자 인증 약 1분",
   "en": "Business verification in about a minute"
  },
  "b3": {
   "vi": "Đăng ký·xác thực·hỏi đáp đều miễn phí",
   "ko": "가입·인증·문의 전부 무료",
   "en": "Signup, verification and inquiries are all free"
  },
  "l1": {
   "vi": "Thương hiệu đăng ký",
   "ko": "등록 브랜드",
   "en": "Registered brands"
  },
  "l2": {
   "vi": "Nhà phân phối tham gia",
   "ko": "유통 파트너 가입",
   "en": "Distribution partners"
  },
  "l3": {
   "vi": "Lượt yêu cầu tư vấn",
   "ko": "누적 상담 문의",
   "en": "Inquiries received"
  }
 },
 "cat": {
  "h": {
   "vi": "Chọn sản phẩm đổi mới phù hợp\nvới kênh bán hàng của bạn",
   "ko": "내 판매 채널에 맞는 혁신 제품을,\n카테고리에서 골라보세요",
   "en": "Innovative products that fit your sales channels —\nbrowse by category",
   "_br": 1
  },
  "sub": {
   "vi": "Sản phẩm từ nhà cung cấp Hàn Quốc đang được đăng tải lần lượt. Hãy xem trước danh mục bạn quan tâm.",
   "ko": "한국 공급사의 제품이 순차 등록되고 있습니다. 관심 카테고리를 먼저 살펴보세요.",
   "en": "Products from Korean suppliers are being added. Start with the category you care about."
  }
 },
 "steps": {
  "kick": {
   "vi": "Đừng mãi trăn trở một mình về bài toán phân phối chính hãng thương hiệu quốc tế",
   "ko": "막막했던 해외 브랜드 공식 유통, 이제 혼자 고민하지 마세요",
   "en": "Official distribution of overseas brands, without figuring it out alone"
  },
  "h": {
   "vi": "Đã có MAKENOV thay bạn kết nối với các thương hiệu toàn cầu",
   "ko": "메이크노브가 전 세계 브랜드와의 연결을 대신합니다",
   "en": "MAKENOV handles the connection with brands worldwide"
  },
  "s1k": {
   "vi": "Khám phá sản phẩm toàn cầu",
   "ko": "글로벌 제품 발굴",
   "en": "Global product discovery"
  },
  "s1h": {
   "vi": "Không cần ra nước ngoài, vẫn có thể tiếp cận các sản phẩm tiên phong trên thế giới",
   "ko": "해외로 가지 않아도 세계의\n혁신 제품을 만날 수 있어요",
   "en": "Meet the world's innovative products\nwithout leaving your desk",
   "_br": 1
  },
  "s1p": {
   "vi": "Không cần trực tiếp đến các triển lãm hay thị trường nước ngoài, bạn vẫn có thể khám phá đa dạng sản phẩm tiên phong toàn cầu và tìm kiếm cơ hội phân phối chính thức.",
   "ko": "전시회나 해외 현장을 직접 찾아다니지 않아도 다양한 글로벌 혁신 제품을 살펴보고 공식 유통 기회를 발견할 수 있습니다.",
   "en": "Browse innovative products from around the world and find official distribution opportunities — no trade shows or overseas trips required."
  },
  "s2k": {
   "vi": "Gặp gỡ kinh doanh",
   "ko": "비즈니스 미팅",
   "en": "Business meetings"
  },
  "s2h": {
   "vi": "Không chỉ dừng lại ở việc tìm sản phẩm\nHãy gặp trực tiếp đối tác kinh doanh",
   "ko": "제품을 찾는 것에서 끝나지 않습니다\n비즈니스 파트너를 직접 만나보세요",
   "en": "It doesn't end with finding products\nMeet your business partners in person",
   "_br": 1
  },
  "s2p": {
   "vi": "MAKENOV kết nối các buổi gặp trực tiếp để nhà cung cấp Hàn Quốc và nhà phân phối Việt Nam cùng trao đổi về cơ hội kinh doanh thực tế.",
   "ko": "MAKENOV는 한국 공급사와 베트남 유통사가 실제 비즈니스 기회를 논의할 수 있도록 직접 미팅을 연결합니다.",
   "en": "MAKENOV arranges in-person meetings so Korean suppliers and Vietnamese distributors can discuss real business opportunities."
  },
  "s3k": {
   "vi": "Hỗ trợ toàn bộ quá trình kết nối",
   "ko": "연결 전 과정 지원",
   "en": "Support at every step"
  },
  "s3h": {
   "vi": "Khi gặp khó khăn trong việc kết nối với nhà cung cấp, MAKENOV sẽ đồng hành cùng bạn",
   "ko": "공급사와의 연결이 어려울 때\n메이크노브가 함께할게요",
   "en": "When reaching a supplier is hard,\nMAKENOV works alongside you",
   "_br": 1
  },
  "s3p": {
   "vi": "Chỉ cần để lại yêu cầu, chúng tôi sẽ hỗ trợ kết nối với nhà cung cấp, phiên dịch, đồng thời phối hợp các nội dung trao đổi và lịch trình cần thiết, từ các cuộc gặp trực tuyến đến trực tiếp.",
   "ko": "문의만 남겨주시면 공급사 연결과 통역부터 온·오프라인 미팅까지 필요한 소통과 일정을 함께 조율해 드립니다.",
   "en": "Leave an inquiry and we coordinate everything needed — supplier connection, interpretation, and online or in-person meetings."
  }
 },
 "cols": {
  "h": {
   "vi": "Cẩm nang cho nhà phân phối",
   "ko": "유통을 준비하는 분들을 위한 가이드",
   "en": "Guides for future distributors"
  }
 },
 "faq": {
  "q1": {
   "vi": "MAKENOV là dịch vụ gì?",
   "ko": "메이크노브는 어떤 서비스인가요?",
   "en": "What is MAKENOV?"
  },
  "a1": {
   "vi": "MAKENOV là nền tảng B2B kết nối nhà cung cấp sản phẩm tiên phong toàn cầu với nhà phân phối tại Việt Nam.\nBạn xem sản phẩm, đăng ký gặp mặt và trao đổi trực tiếp với đại diện nhà cung cấp.\nChúng tôi cũng hỗ trợ giao tiếp và sắp xếp lịch gặp.",
   "ko": "메이크노브는 글로벌 혁신 제품의 공급사와 베트남 유통사를 연결하는 B2B 플랫폼입니다.\n제품을 살펴보고 미팅을 신청하면 공급사 담당자를 직접 만나 상담할 수 있습니다.\n소통과 일정 조율도 함께 지원합니다.",
   "en": "MAKENOV is a B2B platform connecting suppliers of innovative global products with distributors in Vietnam.\nBrowse products, request a meeting and talk to the supplier in person.\nWe also support communication and scheduling.",
   "_br": 1
  },
  "q2": {
   "vi": "Sử dụng có mất phí không?",
   "ko": "이용에 비용이 드나요?",
   "en": "Does it cost anything?"
  },
  "a2": {
   "vi": "Không. Từ xem sản phẩm, đăng ký gặp mặt đến tham dự sự kiện đều miễn phí.\nViệc kết nối nhà cung cấp, phiên dịch và sắp xếp lịch gặp cũng được hỗ trợ miễn phí.",
   "ko": "아니요. 제품 탐색부터 미팅 신청, 행사 참가까지 모두 무료입니다.\n공급사 연결과 통역, 미팅 조율도 별도 비용 없이 지원합니다.",
   "en": "No. Browsing products, requesting meetings and attending events are all free.\nSupplier introductions, interpretation and meeting coordination are free as well.",
   "_br": 1
  },
  "q3": {
   "vi": "Đăng ký gặp mặt như thế nào?",
   "ko": "미팅은 어떻게 신청하나요?",
   "en": "How do I request a meeting?"
  },
  "a3": {
   "vi": "Bấm «Đăng ký gặp mặt» trên trang sản phẩm hoặc trang lịch sự kiện, rồi để lại tên công ty và thông tin liên hệ.\nKhông cần tạo tài khoản, chỉ mất khoảng 1 phút.",
   "ko": "제품 페이지나 행사 일정에서 ‘미팅 신청’을 누르고 회사명과 연락처를 남기면 됩니다.\n회원 가입은 필요 없고 1분이면 끝납니다.",
   "en": "Click \"Request a meeting\" on a product page or the event schedule and leave your company name and contact details.\nNo account is needed and it takes about a minute.",
   "_br": 1
  },
  "q4": {
   "vi": "Sau khi đăng ký thì quy trình tiếp theo ra sao?",
   "ko": "신청한 뒤에는 어떻게 진행되나요?",
   "en": "What happens after I apply?"
  },
  "a4": {
   "vi": "Người phụ trách sẽ liên hệ theo thông tin bạn để lại để xác nhận đăng ký.\nSau đó chúng tôi thông báo thời gian và địa điểm gặp.",
   "ko": "담당자가 남겨주신 연락처로 연락드려 신청 내용을 확인합니다.\n이후 미팅 일정과 장소를 안내해 드립니다.",
   "en": "Our coordinator contacts you to confirm your request.\nWe then let you know the meeting time and place.",
   "_br": 1
  },
  "q5": {
   "vi": "Tôi có giao dịch trực tiếp với nhà cung cấp không?",
   "ko": "공급사와 직접 거래하게 되나요?",
   "en": "Do I deal directly with the supplier?"
  },
  "a5": {
   "vi": "Có. Báo giá và điều kiện giao dịch chi tiết sẽ đàm phán trực tiếp với nhà cung cấp.\nMAKENOV hỗ trợ kết nối nhà cung cấp, giao tiếp và điều phối cuộc họp để giao dịch diễn ra thuận lợi.",
   "ko": "네. 견적과 세부 거래 조건은 공급사와 직접 협의하게 됩니다.\n메이크노브는 원활한 거래를 위해 공급사 연결과 소통, 미팅 조율 등 필요한 과정을 지원합니다.",
   "en": "Yes. Quotes and detailed terms are negotiated directly with the supplier.\nMAKENOV supports the process — connection, communication and meeting coordination.",
   "_br": 1
  },
  "q6": {
   "vi": "Hiện có những sự kiện nào sắp diễn ra?",
   "ko": "어떤 행사가 예정되어 있나요?",
   "en": "Which events are coming up?"
  },
  "a6": {
   "vi": "Bạn có thể xem các sự kiện sắp tới và nhà cung cấp tham gia tại trang Lịch gặp mặt.\nDanh sách nhà cung cấp sẽ tiếp tục được bổ sung.",
   "ko": "방문 일정 페이지에서 예정된 행사와 참가 공급사를 확인할 수 있습니다.\n참가 공급사는 순차적으로 추가됩니다.",
   "en": "See upcoming events and the participating suppliers on the Meetings page.\nMore suppliers are being added.",
   "_br": 1
  },
  "q7": {
   "vi": "Chưa có kinh nghiệm nhập khẩu có bắt đầu được không?",
   "ko": "수입 경험이 없어도 시작할 수 있나요?",
   "en": "Can I start without import experience?"
  },
  "a7": {
   "vi": "Được. Bạn có thể bắt đầu từ việc tìm sản phẩm quan tâm và đăng ký gặp mặt.\nNếu việc giao tiếp hay họp với nhà cung cấp còn khó khăn, MAKENOV sẽ hỗ trợ, nên chưa có kinh nghiệm nhập khẩu vẫn có thể tìm hiểu cơ hội phân phối một cách thoải mái.",
   "ko": "네. 관심 있는 제품을 찾고 미팅을 신청하는 것부터 시작할 수 있습니다.\n공급사와의 소통이나 미팅 진행이 어려운 경우 메이크노브가 필요한 과정을 지원하므로 수입 경험이 없어도 부담 없이 유통 가능성을 살펴볼 수 있습니다.",
   "en": "Yes. Start by finding a product you like and requesting a meeting.\nIf communicating with suppliers or running meetings is difficult, MAKENOV supports those steps, so you can explore distribution opportunities without prior import experience.",
   "_br": 1
  },
  "q8": {
   "vi": "Đàm phán quyền phân phối độc quyền diễn ra thế nào?",
   "ko": "독점 유통권 협의는 어떻게 진행되나요?",
   "en": "How does exclusive distribution negotiation work?"
  },
  "a8": {
   "vi": "Hãy kiểm tra khả năng đàm phán độc quyền hoặc phân phối chính thức trên trang sản phẩm rồi đăng ký gặp mặt.\nChúng tôi hỗ trợ trọn quá trình cần cho đàm phán, từ kết nối nhà cung cấp, xác nhận điều kiện đến giao tiếp và điều phối cuộc họp.\nĐiều kiện phân phối cuối cùng được quyết định qua thỏa thuận với nhà cung cấp.",
   "ko": "제품 페이지에서 독점 또는 공식 유통 협의 가능 여부를 확인한 뒤 미팅을 신청해 주세요.\n공급사와의 연결부터 조건 확인, 소통과 미팅 조율까지 협의에 필요한 과정을 지원합니다.\n최종 유통 조건은 공급사와의 협의를 통해 결정됩니다.",
   "en": "Check on the product page whether exclusive or official distribution is negotiable, then request a meeting.\nWe support the whole negotiation process — connection, term checks, communication and meeting coordination.\nFinal distribution terms are decided through negotiation with the supplier.",
   "_br": 1
  },
  "q9": {
   "vi": "Tôi có thể trao đổi bằng ngôn ngữ nào?",
   "ko": "어떤 언어로 상담할 수 있나요?",
   "en": "Which languages can I use?"
  },
  "a9": {
   "vi": "Bạn có thể trao đổi bằng tiếng Hàn, tiếng Việt hoặc tiếng Anh.\nTại các buổi gặp có phiên dịch hỗ trợ để việc đàm phán diễn ra suôn sẻ.",
   "ko": "한국어, 베트남어 또는 영어로 상담할 수 있습니다.\n미팅에는 통역이 함께해 원활하게 협의할 수 있도록 지원합니다.",
   "en": "You can talk in Korean, Vietnamese or English.\nInterpreters join the meetings so the conversation goes smoothly.",
   "_br": 1
  }
 },
 "cta": {
  "h1": {
   "vi": "Bạn muốn gặp nhà cung cấp nào?",
   "ko": "만나고 싶은 공급사가 있다면,",
   "en": "Found a supplier you want to meet?"
  },
  "h2": {
   "vi": "Đăng ký gặp mặt ngay hôm nay",
   "ko": "지금 미팅을 신청하세요",
   "en": "Request a meeting today"
  },
  "p": {
   "vi": "Đăng ký miễn phí, không cần tạo tài khoản, chỉ mất 1 phút.",
   "ko": "신청은 무료이고, 가입 없이 1분이면 됩니다.",
   "en": "It is free, needs no account and takes a minute."
  },
  "btn": {
   "vi": "Xem lịch sự kiện",
   "ko": "행사 일정 보기",
   "en": "See the event schedule"
  }
 },
 "float": {
  "btn": {
   "vi": "Khám phá sản phẩm tiên phong",
   "ko": "혁신 제품 둘러보기",
   "en": "Browse innovative products"
  }
 }
};

function mkApplyLanding(){
  if(typeof document === 'undefined' || typeof LND === 'undefined') return;
  var esc = function(x){ return String(x).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); };
  var lang = (typeof MK_LANG !== 'undefined') ? MK_LANG : 'vi';
  document.querySelectorAll('[data-mkl]').forEach(function(el){
    var path = el.getAttribute('data-mkl').split('.');
    var node = LND;
    for(var i = 1; i < path.length && node; i++) node = node[path[i]];
    if(!node) return;
    var v = node[lang] || node.vi || node.ko || node.en;
    if(v == null || v === '') return;
    if(node._br) el.innerHTML = esc(v).replace(/\n/g, '<br>');
    else el.textContent = v;
  });
}
window.mkApplyLanding = mkApplyLanding;

/* 부트 타이밍: DB 카피가 이 파일보다 먼저 적용됐을 수 있어(app.js 의 MK_COPY_BAKED)
   저장된 landing.* 오버라이드를 다시 반영하고 나서 그린다 */
document.addEventListener('DOMContentLoaded', function(){
  try{
    var ov = window.MK_COPY_OVERRIDE || {};
    var mine = {};
    Object.keys(ov).forEach(function(k){ if(k.indexOf('landing.') === 0) mine[k] = ov[k]; });
    if(Object.keys(mine).length && typeof mkApplyCopy === 'function') mkApplyCopy(mine);
    else mkApplyLanding();
  }catch(e){ mkApplyLanding(); }
});
document.addEventListener('mk:lang', mkApplyLanding);
