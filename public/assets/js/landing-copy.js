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
   "vi": "của sản phẩm đổi mới toàn cầu",
   "ko": "공식 유통사가 될 수 있습니다",
   "en": "of a global innovative product"
  },
  "sub": {
   "vi": "Xem điều kiện phân phối của những sản phẩm chưa có mặt tại Việt Nam\nvà trao đổi trực tiếp với nhà cung cấp. Chưa có kinh nghiệm nhập khẩu vẫn bắt đầu được",
   "ko": "아직 베트남에 들어오지 않은 제품의 유통 조건을 확인하고\n공급사와 직접 상담하세요. 수입 경험이 없어도 시작할 수 있습니다",
   "en": "Check the trade terms of products that have not entered Vietnam yet\nand talk directly with suppliers. No import experience needed."
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
   "vi": "Phân phối chính thức thương hiệu nước ngoài từng là bài toán khó, giờ bạn không phải tự xoay xở nữa",
   "ko": "막막했던 해외 브랜드 공식 유통, 이제 혼자 고민하지 마세요",
   "en": "Official distribution of overseas brands, without figuring it out alone"
  },
  "h": {
   "vi": "MAKENOV thay bạn kết nối với các thương hiệu trên toàn thế giới",
   "ko": "메이크노브가 전 세계 브랜드와의 연결을 대신합니다",
   "en": "MAKENOV handles the connection with brands worldwide"
  },
  "s1k": {
   "vi": "Khám phá sản phẩm toàn cầu",
   "ko": "글로벌 제품 발굴",
   "en": "Global product discovery"
  },
  "s1h": {
   "vi": "Không cần ra nước ngoài\nvẫn gặp được sản phẩm đổi mới thế giới",
   "ko": "해외로 가지 않아도 세계의\n혁신 제품을 만날 수 있어요",
   "en": "Meet the world's innovative products\nwithout leaving your desk"
  },
  "s1p": {
   "vi": "Không phải tự tìm đến hội chợ hay thị trường nước ngoài, bạn vẫn có thể xem đa dạng sản phẩm đổi mới toàn cầu và phát hiện cơ hội phân phối chính thức.",
   "ko": "전시회나 해외 현장을 직접 찾아다니지 않아도 다양한 글로벌 혁신 제품을 살펴보고 공식 유통 기회를 발견할 수 있습니다.",
   "en": "Browse innovative products from around the world and find official distribution opportunities — no trade shows or overseas trips required."
  },
  "s2k": {
   "vi": "Xem điều kiện giao dịch",
   "ko": "거래 조건 확인",
   "en": "Trade terms"
  },
  "s2h": {
   "vi": "Xem nhanh mọi điều kiện\ncần thiết cho việc phân phối",
   "ko": "유통에 필요한 조건을\n한눈에 확인해 보세요",
   "en": "Everything you need to decide,\non a single screen"
  },
  "s2p": {
   "vi": "Giá cung cấp, số lượng đặt hàng tối thiểu, thời gian giao hàng theo từng sản phẩm — mọi điều kiện cần để quyết định phân phối đều xem được dễ dàng và nhanh chóng.",
   "ko": "제품별 공급가와 최소 주문 수량, 납기 등 유통을 결정하는 데 필요한 거래 조건을 쉽고 빠르게 확인할 수 있습니다.",
   "en": "Quickly check the trade terms that decide a deal — supply price, minimum order quantity and lead time for each product."
  },
  "s3k": {
   "vi": "Hỗ trợ trọn quá trình kết nối",
   "ko": "연결 전 과정 지원",
   "en": "Support at every step"
  },
  "s3h": {
   "vi": "Khi kết nối với nhà cung cấp còn khó khăn\nMAKENOV sẽ đồng hành cùng bạn",
   "ko": "공급사와의 연결이 어려울 때\n메이크노브가 함께할게요",
   "en": "When reaching a supplier is hard,\nMAKENOV works alongside you"
  },
  "s3p": {
   "vi": "Chỉ cần để lại yêu cầu, MAKENOV cùng bạn điều phối mọi giao tiếp và lịch trình — từ kết nối nhà cung cấp, phiên dịch đến họp online·offline.",
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
 "pain": {
  "h1": {
   "vi": "Năng lực cạnh tranh trong phân phối",
   "ko": "유통의 경쟁력은",
   "en": "Competitive distribution starts with"
  },
  "h2": {
   "vi": "bắt đầu từ việc bạn bán gì",
   "ko": "무엇을 파느냐에서 시작됩니다",
   "en": "what you choose to sell"
  },
  "p": {
   "vi": "MAKENOV phát hiện những sản phẩm đổi mới toàn cầu chưa được phân phối chính thức tại Việt Nam.\nHãy xem trước tiềm năng của sản phẩm và chuẩn bị cho một thị trường mới.",
   "ko": "메이크노브는 아직 베트남에 공식 유통되지 않은 글로벌 혁신 제품을 발굴합니다.\n제품이 가진 가능성을 먼저 살펴보고 새로운 시장을 준비해 보세요.",
   "en": "MAKENOV discovers global innovative products not yet officially distributed in Vietnam.\nSee a product's potential first and get ready for a new market."
  }
 },
 "cost": {
  "kick": {
   "vi": "Chi phí",
   "ko": "비용 안내",
   "en": "Pricing"
  },
  "h1": {
   "vi": "Từ tìm sản phẩm đến khi được kết nối",
   "ko": "제품을 찾고 연결되는 과정까지",
   "en": "From finding a product to getting connected,"
  },
  "h2": {
   "vi": "MAKENOV hoàn toàn miễn phí",
   "ko": "메이크노브는 무료입니다",
   "en": "MAKENOV is free"
  },
  "p": {
   "vi": "Từ khám phá sản phẩm toàn cầu, xem điều kiện giao dịch đến gửi yêu cầu báo giá cho nhà cung cấp — tất cả đều không mất phí sử dụng.\nKhi cần, chúng tôi còn hỗ trợ miễn phí kết nối nhà cung cấp, giao tiếp và điều phối cuộc họp.",
   "ko": "글로벌 제품 탐색부터 거래 조건 확인, 공급사 견적 문의까지 별도의 이용료 없이 이용할 수 있습니다.\n필요한 경우 공급사 연결과 소통, 미팅 조율까지 무료로 지원합니다.",
   "en": "Product discovery, trade-term checks and supplier quote requests come with no usage fee.\nWhen needed, supplier connection, communication and meeting coordination are also supported for free."
  }
 },
 "faq": {
  "q1": {
   "vi": "MAKENOV là dịch vụ gì?",
   "ko": "메이크노브는 어떤 서비스인가요?",
   "en": "What is MAKENOV?"
  },
  "a1": {
   "vi": "MAKENOV là nền tảng B2B kết nối sản phẩm đổi mới toàn cầu với nhà phân phối tại Việt Nam.\nBạn có thể xem điều kiện giao dịch và khả năng phân phối chính thức của nhiều sản phẩm, rồi hỏi trực tiếp nhà cung cấp.\nKhi cần, chúng tôi còn hỗ trợ giao tiếp và tiến hành cuộc họp.",
   "ko": "메이크노브는 글로벌 혁신 제품과 베트남 유통 파트너를 연결하는 B2B 플랫폼입니다.\n다양한 제품의 거래 조건과 공식 유통 가능성을 확인하고 공급사에 직접 문의할 수 있습니다.\n필요한 경우 소통과 미팅 진행도 지원합니다.",
   "en": "MAKENOV is a B2B platform that connects global innovative products with distribution partners in Vietnam.\nYou can check trade terms and official distribution opportunities across many products and contact suppliers directly.\nWhen needed, we also support communication and meetings.",
   "_br": 1
  },
  "q2": {
   "vi": "Đăng ký và sử dụng có mất phí không?",
   "ko": "가입과 이용에 비용이 드나요?",
   "en": "Does it cost anything to join and use?"
  },
  "a2": {
   "vi": "Không. Từ đăng ký tài khoản, khám phá sản phẩm, xem điều kiện giao dịch đến gửi yêu cầu báo giá cho nhà cung cấp đều không mất phí sử dụng.\nKhi cần, việc kết nối nhà cung cấp, giao tiếp và điều phối cuộc họp cũng được hỗ trợ miễn phí.",
   "ko": "아니요. 회원가입부터 제품 탐색, 거래 조건 확인, 공급사 견적 문의까지 별도의 이용료 없이 이용할 수 있습니다.\n필요한 경우 공급사 연결과 소통, 미팅 조율도 무료로 지원합니다.",
   "en": "No. From signup to browsing products, checking trade terms and requesting quotes, there is no usage fee.\nSupplier connection, communication and meeting coordination are also supported for free when needed.",
   "_br": 1
  },
  "q3": {
   "vi": "Vì sao giá và MOQ bị khóa?",
   "ko": "가격과 MOQ는 왜 잠겨 있나요?",
   "en": "Why are price and MOQ locked?"
  },
  "a3": {
   "vi": "Giá cung cấp và MOQ là thông tin B2B phục vụ giao dịch thực tế nên chỉ hiển thị với doanh nghiệp đã xác thực.\nHoàn tất xác thực doanh nghiệp đơn giản là bạn xem được các điều kiện giao dịch chính như giá cung cấp, số lượng đặt hàng tối thiểu, thời gian giao hàng theo từng sản phẩm.",
   "ko": "공급가와 MOQ는 실제 거래를 위한 B2B 정보이기 때문에 인증된 사업자에게만 공개됩니다.\n간단한 사업자 인증을 완료하면 제품별 공급가와 최소 주문 수량, 납기 등 주요 거래 조건을 확인할 수 있습니다.",
   "en": "Supply price and MOQ are B2B information for real transactions, so they are shown only to verified businesses.\nComplete a quick business verification to see each product’s supply price, minimum order quantity and lead time.",
   "_br": 1
  },
  "q4": {
   "vi": "Xác thực doanh nghiệp như thế nào?",
   "ko": "사업자 인증은 어떻게 하나요?",
   "en": "How does business verification work?"
  },
  "a4": {
   "vi": "Sau khi đăng ký tài khoản, bạn nộp thông tin đăng ký kinh doanh để tiến hành xác thực.\nXác thực mất khoảng 1 phút, hoàn tất là xem ngay được các điều kiện giao dịch đang khóa.",
   "ko": "회원가입 후 사업자 등록 정보를 제출하면 인증을 진행할 수 있습니다.\n인증에는 약 1분이 소요되며, 완료 후 잠겨 있던 제품의 거래 조건을 바로 확인할 수 있습니다.",
   "en": "After signing up, submit your business registration details to start verification.\nIt takes about a minute, and locked trade terms open right after completion.",
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
   "vi": "Có thể đàm phán MOQ không?",
   "ko": "MOQ 협의가 가능한가요?",
   "en": "Can the MOQ be negotiated?"
  },
  "a6": {
   "vi": "Khả năng đàm phán MOQ tùy theo sản phẩm và nhà cung cấp.\nHãy ghi số lượng mong muốn trong yêu cầu, chúng tôi sẽ xác nhận với nhà cung cấp và hỗ trợ trao đổi cần thiết.",
   "ko": "MOQ 협의 가능 여부는 제품과 공급사에 따라 달라집니다.\n원하는 수량을 문의에 남겨주시면 공급사에 협의 가능 여부를 확인하고 필요한 소통을 지원합니다.",
   "en": "It depends on the product and the supplier.\nLeave your target quantity in an inquiry and we will check with the supplier and support the discussion.",
   "_br": 1
  },
  "q7": {
   "vi": "Chưa có kinh nghiệm nhập khẩu có bắt đầu được không?",
   "ko": "수입 경험이 없어도 시작할 수 있나요?",
   "en": "Can I start without import experience?"
  },
  "a7": {
   "vi": "Được. Bạn có thể bắt đầu từ việc tìm sản phẩm quan tâm và để lại yêu cầu.\nNếu việc giao tiếp hay họp với nhà cung cấp còn khó khăn, MAKENOV sẽ hỗ trợ, nên chưa có kinh nghiệm nhập khẩu vẫn có thể tìm hiểu cơ hội phân phối một cách thoải mái.",
   "ko": "네. 관심 있는 제품을 찾고 문의를 남기는 것부터 시작할 수 있습니다.\n공급사와의 소통이나 미팅 진행이 어려운 경우 메이크노브가 필요한 과정을 지원하므로 수입 경험이 없어도 부담 없이 유통 가능성을 살펴볼 수 있습니다.",
   "en": "Yes. Start by finding a product you like and leaving an inquiry.\nIf communicating with suppliers or running meetings is difficult, MAKENOV supports those steps, so you can explore distribution opportunities without prior import experience.",
   "_br": 1
  },
  "q8": {
   "vi": "Đàm phán quyền phân phối độc quyền diễn ra thế nào?",
   "ko": "독점 유통권 협의는 어떻게 진행되나요?",
   "en": "How does exclusive distribution negotiation work?"
  },
  "a8": {
   "vi": "Hãy kiểm tra khả năng đàm phán độc quyền hoặc phân phối chính thức trên trang sản phẩm rồi để lại yêu cầu.\nChúng tôi hỗ trợ trọn quá trình cần cho đàm phán, từ kết nối nhà cung cấp, xác nhận điều kiện đến giao tiếp và điều phối cuộc họp.\nĐiều kiện phân phối cuối cùng được quyết định qua thỏa thuận với nhà cung cấp.",
   "ko": "제품 페이지에서 독점 또는 공식 유통 협의 가능 여부를 확인한 뒤 문의를 남겨주세요.\n공급사와의 연결부터 조건 확인, 소통과 미팅 조율까지 협의에 필요한 과정을 지원합니다.\n최종 유통 조건은 공급사와의 협의를 통해 결정됩니다.",
   "en": "Check on the product page whether exclusive or official distribution is negotiable, then leave an inquiry.\nWe support the whole negotiation process — connection, term checks, communication and meeting coordination.\nFinal distribution terms are decided through negotiation with the supplier.",
   "_br": 1
  },
  "q9": {
   "vi": "Tôi có thể hỏi bằng ngôn ngữ nào?",
   "ko": "어떤 언어로 문의할 수 있나요?",
   "en": "Which languages can I use?"
  },
  "a9": {
   "vi": "Bạn có thể hỏi bằng tiếng Hàn, tiếng Việt hoặc tiếng Anh.\nKhi cần phiên dịch trong quá trình làm việc với nhà cung cấp, chúng tôi hỗ trợ để đàm phán diễn ra suôn sẻ.",
   "ko": "한국어, 베트남어 또는 영어로 문의할 수 있습니다.\n공급사와의 소통 과정에서 통역이 필요한 경우 원활하게 협의할 수 있도록 지원합니다.",
   "en": "You can inquire in Korean, Vietnamese or English.\nIf interpretation is needed while talking with a supplier, we support the conversation.",
   "_br": 1
  }
 },
 "cta": {
  "h1": {
   "vi": "Cơ hội của một thị trường mới,",
   "ko": "새로운 시장의 가능성,",
   "en": "The potential of a new market —"
  },
  "h2": {
   "vi": "hãy là người phát hiện trước",
   "ko": "먼저 발견해 보세요",
   "en": "discover it first"
  },
  "p": {
   "vi": "Gặp gỡ những sản phẩm đổi mới toàn cầu đang tìm nhà phân phối chính thức tại Việt Nam.",
   "ko": "베트남 공식 유통 파트너를 찾고 있는 글로벌 혁신 제품을 만나보세요.",
   "en": "Meet global innovative products looking for their official distribution partner in Vietnam."
  },
  "btn": {
   "vi": "Xem sản phẩm",
   "ko": "제품 확인하기",
   "en": "See the products"
  }
 },
 "float": {
  "btn": {
   "vi": "Khám phá sản phẩm đổi mới",
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
