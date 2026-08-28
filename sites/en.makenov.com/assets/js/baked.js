/* bake.js 가 생성 — 직접 수정하지 마세요.
   구워진 정적 문서 목록. app.js 의 mkDocUrl() 이 이 목록에 있는 것만
   정식 주소(products/…html)로 링크하고, 없으면 ?id= 뷰어로 보낸다. */
window.MK_BAKED = {
  "products": [
      "p10",
      "p11",
      "p12",
      "p9",
      "p0"
  ],
  "companies": [
    "lgind",
    "incore",
    "wellbeing"
  ],
  "columns": {
      "c2": "c2",
      "c4": "c4",
      "c1": "c1",
      "c3": "c3",
      "c-margin": "why-innovative-products",
      "c-verify": "supplier-verification",
      "c-exclusive": "exclusive-rights-checklist",
      "c-moq": "moq-negotiation",
      "c-mkt": "marketing-support",
      "c-quote": "quote-request-checklist",
      "c-sample": "sample-request-checklist"
  }
};

/* 구울 때의 카피 수정분. app.js 가 첫 렌더 전에 이걸 덮는다.
   없으면 브라우저가 DB 응답을 기다리는 1초 동안 옛 문구가 보였다가 바뀐다. */
window.MK_COPY_BAKED = {
  "ui.mk_f3": {
    "vi": "Chỉ hiển thị giá và điều kiện giao dịch cho người mua đã xác minh",
    "ko": "가격·거래조건은 인증 바이어에게만 공개",
    "en": "Prices and transaction terms are disclosed only to certified buyers."
  },
  "hero.0.sub": {
    "vi": "Khám phá các sản phẩm đổi mới toàn cầu 365 ngày ngay tại văn phòng.",
    "ko": "사무실에서 전 세계 혁신제품을 365일 탐색하세요.",
    "en": "Explore innovative products from around the world 365 days a year from your office."
  },
  "hero.1.sub": {
    "vi": "So sánh thông tin sản phẩm và nhà cung cấp, nhanh chóng tìm kiếm đối tác phù hợp.",
    "ko": "제품과 제조사 정보를 비교하고 필요한 파트너를 빠르게 찾으세요.",
    "en": "Compare product and manufacturer information and quickly find the partner you need."
  },
  "hero.2.sub": {
    "vi": "Sau khi xác minh doanh nghiệp, xem toàn bộ thông tin giao dịch quan trọng trên một màn hình.",
    "ko": "사업자 인증 후 거래에 필요한 핵심 조건을 한 화면에서 확인하세요.",
    "en": "After verifying your business, check the key conditions required for the transaction on one screen."
  },
  "hero.3.sub": {
    "vi": "Chọn nhiều sản phẩm và yêu cầu báo giá sẽ được gửi trực tiếp đến từng nhà cung cấp.",
    "ko": "여러 제품을 선택하면 견적 요청이 각 제조사에 직접 전달됩니다.",
    "en": "If you select multiple products, your quote request will be sent directly to each manufacturer."
  },
  "ui.ab_s1_l": {
    "en": "Supports Korean, Vietnamese, and English",
    "ko": "한국어·베트남어·영어 지원",
    "vi": "Hỗ trợ tiếng Hàn, tiếng Việt và tiếng Anh"
  },
  "ui.ab_s1_n": {
    "en": "3 languages",
    "ko": "3개 언어",
    "vi": "3 ngôn ngữ"
  },
  "ui.ft_desc": {
    "vi": "Nền tảng toàn cầu kết nối sản phẩm và đối tác mua hàng trên toàn thế giới",
    "ko": "세계의 제품과 바이어를 하나로 잇는 글로벌 혁신 플랫폼",
    "en": "A global innovation platform that connects the world’s products and buyers"
  },
  "ui.gd_b1_t": {
    "en": "join the membership",
    "ko": "회원가입",
    "vi": "tham gia thành viên"
  },
  "about.vs.h2": {
    "en": "How is it different from trade show sourcing?",
    "ko": "박람회 소싱과 무엇이 다를까요?",
    "vi": "Nó khác với việc tìm nguồn cung ứng tại triển lãm thương mại như thế nào?"
  },
  "ui.col_desc": {
    "en": "Market Insights for Global Sourcing and Exporting",
    "ko": "글로벌 소싱과 수출을 위한 시장 인사이트",
    "vi": "Thông tin chuyên sâu về thị trường để tìm nguồn cung ứng và xuất khẩu toàn cầu"
  },
  "ui.dir_desc": {
    "vi": "Khám phá các sản phẩm sáng tạo toàn cầu.",
    "ko": "글로벌 혁신 제품들을 만나보세요",
    "en": "Meet global innovative products"
  },
  "ui.promo_f2": {
    "en": "Request a quote directly from the supplier",
    "ko": "공급사에 직접 견적 요청",
    "vi": "Yêu cầu báo giá trực tiếp từ nhà cung cấp"
  },
  "about.vs.tag": {
    "en": "Differences in Sourcing Methods",
    "ko": "소싱 방식의 차이",
    "vi": "Sự khác biệt trong phương pháp tìm nguồn cung ứng"
  },
  "hero.0.title": {
    "vi": "Tìm nguồn cung ứng quốc tế, không còn phụ thuộc vào các kỳ triển lãm.",
    "ko": "해외 소싱,\n전시회 일정에 맞추지 마세요",
    "en": "international sourcing,\nDon't stick to the exhibition schedule"
  },
  "hero.1.title": {
    "vi": "Kết nối với nhiều nhà cung cấp chỉ trong một nền tảng.",
    "ko": "여러 제조사를 찾는 일,\n한곳에서 끝내세요",
    "en": "Finding multiple manufacturers;\nGet it done in one place"
  },
  "hero.2.title": {
    "vi": "Kiểm tra giá, MOQ và thời gian giao hàng trước khi yêu cầu tư vấn.",
    "ko": "가격·MOQ·납기,\n문의하기 전에 확인하세요",
    "en": "Price, MOQ, delivery date,\nCheck before contacting us"
  },
  "hero.3.title": {
    "vi": "Lưu các sản phẩm quan tâm và gửi yêu cầu báo giá chỉ với một lần.",
    "ko": "관심상품을 모아\n견적 요청은 한 번에",
    "en": "Collect products of interest\nRequest a quote at once"
  },
  "about.hero.h1": {
    "en": "global sourcing,\nStart now in one place.",
    "ko": "글로벌 소싱,\n이제 한자리에서 시작하세요.",
    "vi": "tìm nguồn cung ứng toàn cầu,\nBắt đầu ngay bây giờ ở một nơi."
  },
  "about.lock.h2": {
    "en": "Prices and terms of trade are disclosed only to verified buyers.",
    "ko": "가격과 거래조건은 인증된 바이어에게만 공개됩니다",
    "vi": "Giá cả và điều khoản giao dịch chỉ được tiết lộ cho người mua đã được xác minh."
  },
  "ui.kr_cta_btn": {
    "vi": "Đăng ký nhà cung cấp",
    "ko": "공급사 입점 문의",
    "en": "Supplier store opening inquiry"
  },
  "ui.promo_desc": {
    "vi": "Người mua đã được xác minh có thể xem giá, MOQ và thời gian giao hàng, đồng thời gửi yêu cầu báo giá trực tiếp đến nhà cung cấp cho sản phẩm mong muốn.",
    "ko": "인증된 바이어는 가격·MOQ·납기를 확인하고, 원하는 제품의 견적을 공급사에 직접 요청할 수 있습니다.",
    "en": "Certified buyers can check the price, MOQ, and delivery date, and request a quote for the desired product directly from the supplier."
  },
  "about.lock.tag": {
    "en": "Transaction conditions disclosure method",
    "ko": "거래조건 공개 방식",
    "vi": "Phương thức công bố điều kiện giao dịch"
  },
  "about.steps.h2": {
    "en": "From membership registration to supplier inquiry, 4 steps",
    "ko": "회원가입부터 공급사 문의까지, 4단계",
    "vi": "Từ đăng ký thành viên đến tìm hiểu nhà cung cấp, 4 bước"
  },
  "ui.kr_cta_desc": {
    "vi": "Khi bạn đăng ký một sản phẩm trên MAKENOV, sản phẩm đó sẽ được giới thiệu với những người mua được xác minh và yêu cầu báo giá sẽ được gửi trực tiếp đến nhà cung cấp.",
    "ko": "MAKENOV에 제품을 등록하면 인증된 바이어에게 소개되고, 견적 문의가 공급사에 직접 전달됩니다.",
    "en": "When you register a product on MAKENOV, it will be introduced to certified buyers, and quotation inquiries will be sent directly to the supplier."
  },
  "ui.promo_title": {
    "vi": "Xác minh doanh nghiệp một lần – Dễ dàng xem giá và yêu cầu báo giá",
    "ko": "사업자 인증 한 번으로\n가격 확인부터 견적 요청까지",
    "en": "With one business verification\nFrom price confirmation to quote request"
  },
  "about.hero.kick": {
    "en": "What if you are a buyer?",
    "ko": "바이어라면?",
    "vi": "Nếu bạn là người mua thì sao?"
  },
  "about.hero.lead": {
    "en": "Explore products and suppliers around the world,\nAfter verifying your business, check the price, MOQ, and delivery date and request a quote.",
    "ko": "전 세계 제품과 공급사를 탐색하고,\n사업자 인증 후 가격·MOQ·납기를 확인해 견적을 요청하세요.",
    "vi": "Khám phá các sản phẩm và nhà cung cấp trên khắp thế giới,\nSau khi xác minh doanh nghiệp của bạn, hãy kiểm tra giá, MOQ, ngày giao hàng và yêu cầu báo giá."
  },
  "about.lock.desc": {
    "en": "Price, minimum order quantity (MOQ), delivery date, and supply conditions can only be checked on accounts that have completed business verification. We protect the supplier's transaction information while providing the necessary information to buyers for actual purchase purposes.",
    "ko": "가격·최소주문수량(MOQ)·납기·공급조건은 사업자 인증을 완료한 계정에서만 확인할 수 있습니다. 공급사의 거래정보를 보호하면서 실제 구매 목적의 바이어에게 필요한 정보를 제공합니다.",
    "vi": "Giá, số lượng đặt hàng tối thiểu (MOQ), ngày giao hàng và điều kiện cung cấp chỉ có thể được kiểm tra trên các tài khoản đã hoàn tất xác minh doanh nghiệp. Chúng tôi bảo vệ thông tin giao dịch của nhà cung cấp đồng thời cung cấp thông tin cần thiết cho người mua vì mục đích mua hàng thực tế."
  },
  "about.lock.note": {
    "en": "Check the transaction terms registered by the supplier immediately after verification.",
    "ko": "공급사가 등록한 거래조건을 인증 후 바로 확인하세요.",
    "vi": "Kiểm tra các điều khoản giao dịch được nhà cung cấp đăng ký ngay sau khi xác minh."
  },
  "ui.kr_cta_title": {
    "vi": "Bạn đang tìm kiếm người mua hàng ở nước ngoài?",
    "ko": "해외 바이어를 찾고 계신가요?",
    "en": "Are you looking for overseas buyers?"
  },
  "about.problem.h2": {
    "en": "It's easy to miss out on new products at trade shows alone.",
    "ko": "박람회만으로는 새로운 제품을 놓치기 쉽습니다",
    "vi": "Thật dễ dàng để bỏ lỡ các sản phẩm mới tại các triển lãm thương mại."
  },
  "ui.hero_cta_join": {
    "en": "Verify your business",
    "ko": "사업자 인증하기",
    "vi": "Xác minh doanh nghiệp của bạn"
  },
  "about.problem.tag": {
    "en": "Limitations of existing sourcing",
    "ko": "기존 소싱의 한계",
    "vi": "Hạn chế của nguồn cung ứng hiện tại"
  },
  "about.vs.rows.0.a": {
    "en": "fixed event period",
    "ko": "정해진 행사 기간",
    "vi": "khoảng thời gian sự kiện cố định"
  },
  "about.vs.rows.0.b": {
    "en": "Anytime, 365 days a year",
    "ko": "365일 언제든지",
    "vi": "Bất cứ lúc nào, 365 ngày một năm"
  },
  "about.vs.rows.0.k": {
    "en": "When to use",
    "ko": "이용 시기",
    "vi": "Khi nào nên sử dụng"
  },
  "about.vs.rows.1.a": {
    "en": "Flights, lodging, interpretation, etc.",
    "ko": "항공·숙박·통역 등 발생",
    "vi": "Chuyến bay, chỗ ở, phiên dịch, v.v."
  },
  "about.vs.rows.1.b": {
    "en": "Free product discovery and business verification",
    "ko": "제품 탐색과 사업자 인증 무료",
    "vi": "Khám phá sản phẩm miễn phí và xác minh doanh nghiệp"
  },
  "about.vs.rows.2.a": {
    "en": "Focus on products participating in the field",
    "ko": "현장에 참가한 제품 중심",
    "vi": "Tập trung vào các sản phẩm tham gia lĩnh vực"
  },
  "about.vs.rows.2.b": {
    "en": "All products registered on the platform",
    "ko": "플랫폼에 등록된 제품 전체",
    "vi": "Tất cả các sản phẩm được đăng ký trên nền tảng"
  },
  "about.vs.rows.2.k": {
    "en": "Product navigation",
    "ko": "제품 탐색",
    "vi": "Điều hướng sản phẩm"
  },
  "about.vs.rows.3.a": {
    "en": "On-site consultation or separate inquiry",
    "ko": "현장 상담 또는 별도 문의",
    "vi": "Tư vấn tại chỗ hoặc yêu cầu riêng"
  },
  "about.vs.rows.3.b": {
    "en": "Confirm price, MOQ, and delivery date after certification",
    "ko": "인증 후 가격·MOQ·납기 확인",
    "vi": "Xác nhận giá, MOQ và ngày giao hàng sau khi chứng nhận"
  },
  "about.vs.rows.3.k": {
    "en": "Check transaction conditions",
    "ko": "거래조건 확인",
    "vi": "Kiểm tra điều kiện giao dịch"
  },
  "about.vs.rows.4.a": {
    "en": "Organize catalogs and materials individually",
    "ko": "카탈로그와 자료를 개별 정리",
    "vi": "Sắp xếp danh mục và tài liệu riêng lẻ"
  },
  "about.vs.rows.4.b": {
    "en": "Compare products of interest in one place",
    "ko": "관심제품에 담아 한곳에서 비교",
    "vi": "So sánh các sản phẩm quan tâm ở một nơi"
  },
  "about.vs.rows.5.a": {
    "en": "Individual contact with each supplier",
    "ko": "공급사별로 개별 연락",
    "vi": "Liên hệ cá nhân với từng nhà cung cấp"
  },
  "about.vs.rows.5.b": {
    "en": "Request quotations for multiple products at once",
    "ko": "여러 제품의 견적을 한 번에 요청",
    "vi": "Yêu cầu báo giá cho nhiều sản phẩm cùng một lúc"
  },
  "about.vs.rows.5.k": {
    "en": "Quote inquiry",
    "ko": "견적 문의",
    "vi": "Yêu cầu báo giá"
  },
  "about.vs.rows.6.a": {
    "en": "Separate interpretation may be required",
    "ko": "별도 통역이 필요할 수 있음",
    "vi": "Có thể cần phải giải thích riêng"
  },
  "about.vs.rows.6.b": {
    "en": "Supports Korean, Vietnamese, and English",
    "ko": "한국어·베트남어·영어 지원",
    "vi": "Hỗ trợ tiếng Hàn, tiếng Việt và tiếng Anh"
  },
  "about.vs.rows.6.k": {
    "en": "language support",
    "ko": "언어 지원",
    "vi": "hỗ trợ ngôn ngữ"
  },
  "about.problem.lead": {
    "en": "Fixed timelines, high costs, and complex follow-up communications slow down global sourcing.",
    "ko": "정해진 일정과 높은 비용, 복잡한 후속 연락이 글로벌 소싱의 속도를 늦춥니다.",
    "vi": "Các mốc thời gian cố định, chi phí cao và thông tin liên lạc tiếp theo phức tạp làm chậm quá trình tìm nguồn cung ứng toàn cầu."
  },
  "about.hero.facts.0.l": {
    "en": "Always-on exploration of global products",
    "ko": "글로벌 제품 상시 탐색",
    "vi": "Luôn khám phá các sản phẩm toàn cầu"
  },
  "about.hero.facts.1.l": {
    "en": "Free registration and business verification",
    "ko": "가입과 사업자 인증 무료",
    "vi": "Đăng ký và xác minh doanh nghiệp miễn phí"
  },
  "about.steps.items.0.d": {
    "en": "Select your country and enter your company and contact information.",
    "ko": "국가를 선택하고 회사 정보와 담당자 정보를 입력합니다.",
    "vi": "Chọn quốc gia của bạn và nhập công ty và thông tin liên lạc của bạn."
  },
  "about.steps.items.1.d": {
    "en": "In Vietnam, authentication is done by tax code, in Korea, by business registration number, and in other countries, by company domain email.",
    "ko": "베트남은 세금코드, 한국은 사업자등록번호, 그 외 국가는 회사 도메인 이메일로 인증합니다.",
    "vi": "Ở Việt Nam, việc xác thực được thực hiện bằng mã số thuế, ở Hàn Quốc là bằng số đăng ký kinh doanh, ở các nước khác là bằng email tên miền công ty."
  },
  "about.steps.items.2.d": {
    "en": "Once authentication is complete, you can check the price, minimum order quantity (MOQ), delivery date, and supply conditions and save it as a product of interest.",
    "ko": "인증이 완료되면 가격·최소주문수량(MOQ)·납기·공급조건을 확인하고 관심제품에 저장할 수 있습니다.",
    "vi": "Sau khi xác thực hoàn tất, bạn có thể kiểm tra giá, số lượng đặt hàng tối thiểu (MOQ), ngày giao hàng, điều kiện cung cấp và lưu nó dưới dạng sản phẩm quan tâm."
  },
  "about.steps.items.2.t": {
    "en": "Check transaction conditions",
    "ko": "거래조건 확인",
    "vi": "Kiểm tra điều kiện giao dịch"
  },
  "about.steps.items.3.d": {
    "en": "Select product inquiry, quotation request, or video consultation to request a direct request from the supplier.",
    "ko": "제품 문의, 견적 요청 또는 화상상담을 선택해 공급사에 직접 요청합니다.",
    "vi": "Lựa chọn yêu cầu sản phẩm, yêu cầu báo giá, hoặc tư vấn video để yêu cầu yêu cầu trực tiếp từ nhà cung cấp."
  },
  "about.problem.items.0.d": {
    "en": "Products and suppliers are only available during the few days of the fair. If the schedule doesn't work out, you'll have to wait for the next opportunity.",
    "ko": "박람회가 열리는 며칠 동안만 제품과 공급사를 확인할 수 있습니다. 일정이 맞지 않으면 다음 기회를 기다려야 합니다.",
    "vi": "Sản phẩm và nhà cung cấp chỉ có trong vài ngày diễn ra hội chợ. Nếu lịch trình không phù hợp, bạn sẽ phải chờ cơ hội tiếp theo."
  },
  "about.problem.items.0.t": {
    "en": "Can only be found during a limited period of time",
    "ko": "정해진 기간에만 찾을 수 있습니다",
    "vi": "Chỉ có thể được tìm thấy trong một khoảng thời gian giới hạn"
  },
  "about.problem.items.1.d": {
    "en": "There are recurring costs such as flights, accommodations, and interpretation. Comparing multiple products takes more time and costs more.",
    "ko": "항공·숙박·통역 등 반복적인 비용이 듭니다. 여러 제품을 비교하려면 시간과 비용 부담은 더 커집니다.",
    "vi": "Có các chi phí định kỳ như chuyến bay, chỗ ở và phiên dịch. So sánh nhiều sản phẩm mất nhiều thời gian hơn và chi phí nhiều hơn."
  },
  "about.problem.items.1.t": {
    "en": "Every time you source you incur a cost",
    "ko": "소싱할 때마다 비용이 발생합니다",
    "vi": "Mỗi lần bạn tìm nguồn, bạn phải chịu một chi phí"
  },
  "about.problem.items.2.d": {
    "en": "You will need to reorganize the business cards and materials you received on site and contact them. It also takes time to check quotes and transaction terms.",
    "ko": "현장에서 받은 명함과 자료를 다시 정리하고 연락해야 합니다. 견적과 거래조건을 확인하는 데도 시간이 걸립니다.",
    "vi": "Bạn sẽ cần sắp xếp lại danh thiếp và tài liệu bạn nhận được tại chỗ và liên hệ với họ. Cũng cần có thời gian để kiểm tra báo giá và điều khoản giao dịch."
  },
  "about.problem.items.2.t": {
    "en": "Connection after consultation is difficult",
    "ko": "상담 이후의 연결이 어렵습니다",
    "vi": "Kết nối sau khi tư vấn khó khăn"
  },
  "ui.inquiries_count": {
    "vi": " yêu cầu",
    "ko": "건 문의",
    "en": "inquiries"
  },
  "ui.co_dir_title": {
    "vi": "Danh sách nhà cung cấp",
    "ko": "공급사 디렉토리",
    "en": "Supplier Directory"
  },
  "ui.nav_companies": {
    "vi": "Nhà cung cấp",
    "ko": "공급사",
    "en": "Makers"
  },
  "ui.nav_about_buyer": {
    "vi": "Bạn là người mua hàng?",
    "ko": "바이어라면?",
    "en": "Are you a buyer?"
  },
  "ui.nav_about_maker": {
    "vi": "Bạn là nhà cung cấp?",
    "ko": "공급사라면?",
    "en": "Are you a manufacturer?"
  },
  "ui.nav_support": {
    "vi": "Chăm sóc khách hàng",
    "ko": "고객센터",
    "en": "Support"
  },
  "ui.nav_sp_ask": {
    "vi": "Tư vấn 1:1",
    "ko": "1:1 문의하기",
    "en": "Send an enquiry"
  },
  "ui.nav_columns": {
    "vi": "Blog",
    "ko": "칼럼",
    "en": "Insights"
  },
  "ui.co_dir_desc": {
    "vi": "Kiểm tra năng lực sản xuất, chứng nhận và kinh nghiệm xuất khẩu, kết nối trực tiếp với đối tác phù hợp.",
    "ko": "생산 능력·인증·수출 실적을 확인하고 바로 문의하세요.",
    "en": "Check production capacity, certifications and export record before you inquire."
  },
  "ui.promo_f1": {
    "vi": "Xem giá · MOQ · Thời gian giao hàng",
    "ko": "가격 · MOQ · 납기 열람",
    "en": "Unlock price · MOQ · lead time"
  },
  "ui.mk_f1": {
    "vi": "Không mất phí đăng ký",
    "ko": "등록비 없음",
    "en": "No listing fee"
  },
  "ui.mk_f2": {
    "vi": "Đăng bằng 3 ngôn ngữ",
    "ko": "3개 국어 등록",
    "en": "Listed in three languages"
  },
  "landing.hero.h1b": {
    "vi": "của sản phẩm tiên phong toàn cầu",
    "ko": "공식 유통사가 될 수 있습니다",
    "en": "of a global innovative product"
  },
  "landing.steps.kick": {
    "vi": "Đừng mãi trăn trở một mình về bài toán phân phối chính hãng thương hiệu quốc tế",
    "ko": "막막했던 해외 브랜드 공식 유통, 이제 혼자 고민하지 마세요",
    "en": "Official distribution of overseas brands, without figuring it out alone"
  },
  "landing.steps.s1h": {
    "vi": "Không cần ra nước ngoài, vẫn có thể tiếp cận các sản phẩm tiên phong trên thế giới",
    "ko": "해외로 가지 않아도 세계의\n혁신 제품을 만날 수 있어요",
    "en": "Meet the world's innovative products\nwithout leaving your desk"
  },
  "landing.steps.s1p": {
    "vi": "Không cần trực tiếp đến các triển lãm hay thị trường nước ngoài, bạn vẫn có thể khám phá đa dạng sản phẩm tiên phong toàn cầu và tìm kiếm cơ hội phân phối chính thức.",
    "ko": "전시회나 해외 현장을 직접 찾아다니지 않아도 다양한 글로벌 혁신 제품을 살펴보고 공식 유통 기회를 발견할 수 있습니다.",
    "en": "Browse innovative products from around the world and find official distribution opportunities — no trade shows or overseas trips required."
  },
  "landing.steps.s3k": {
    "vi": "Hỗ trợ toàn bộ quá trình kết nối",
    "ko": "연결 전 과정 지원",
    "en": "Support at every step"
  },
  "landing.steps.s3h": {
    "vi": "Khi gặp khó khăn trong việc kết nối với nhà cung cấp, MAKENOV sẽ đồng hành cùng bạn",
    "ko": "공급사와의 연결이 어려울 때\n메이크노브가 함께할게요",
    "en": "When reaching a supplier is hard,\nMAKENOV works alongside you"
  },
  "landing.steps.s3p": {
    "vi": "Chỉ cần để lại yêu cầu, chúng tôi sẽ hỗ trợ kết nối với nhà cung cấp, phiên dịch, đồng thời phối hợp các nội dung trao đổi và lịch trình cần thiết, từ các cuộc gặp trực tuyến đến trực tiếp.",
    "ko": "문의만 남겨주시면 공급사 연결과 통역부터 온·오프라인 미팅까지 필요한 소통과 일정을 함께 조율해 드립니다.",
    "en": "Leave an inquiry and we coordinate everything needed — supplier connection, interpretation, and online or in-person meetings."
  },
  "landing.pain.h1": {
    "vi": "Năng lực cạnh tranh trong phân phối",
    "ko": "유통의 경쟁력은",
    "en": "Competitive distribution starts with"
  },
  "landing.pain.h2": {
    "vi": " bắt đầu từ việc bạn bán sản phẩm nào",
    "ko": "무엇을 파느냐에서 시작됩니다",
    "en": "what you choose to sell"
  },
  "landing.pain.p": {
    "vi": "MAKENOV tìm kiếm những sản phẩm tiên phong toàn cầu chưa được phân phối chính thức tại Việt Nam. Hãy chủ động khám phá tiềm năng của sản phẩm và chuẩn bị cho những cơ hội thị trường mới.",
    "ko": "메이크노브는 아직 베트남에 공식 유통되지 않은 글로벌 혁신 제품을 발굴합니다.\n제품이 가진 가능성을 먼저 살펴보고 새로운 시장을 준비해 보세요.",
    "en": "MAKENOV discovers global innovative products not yet officially distributed in Vietnam.\nSee a product's potential first and get ready for a new market."
  },
  "landing.cost.kick": {
    "vi": "Chi phí dịch vụ",
    "ko": "비용 안내",
    "en": "Pricing"
  },
  "landing.cost.h1": {
    "vi": "Từ tìm kiếm sản phẩm đến kết nối với nhà cung cấp",
    "ko": "제품을 찾고 연결되는 과정까지",
    "en": "The process of finding and connecting to a product"
  },
  "landing.cost.h2": {
    "vi": "MAKENOV hỗ trợ hoàn toàn miễn phí",
    "ko": "메이크노브는 무료입니다",
    "en": "MAKENOV is free"
  },
  "landing.cost.p": {
    "vi": "Từ khám phá sản phẩm toàn cầu, xem điều kiện giao dịch đến gửi yêu cầu báo giá cho nhà cung cấp — tất cả đều không mất phí sử dụng.\nKhi cần, MAKENOV cũng hỗ trợ miễn phí việc kết nối, trao đổi với nhà cung cấp và sắp xếp lịch gặp.",
    "ko": "글로벌 제품 탐색부터 거래 조건 확인, 공급사 견적 문의까지 별도의 이용료 없이 이용할 수 있습니다.\n필요한 경우 공급사 연결과 소통, 미팅 조율까지 무료로 지원합니다.",
    "en": "Product discovery, trade-term checks and supplier quote requests come with no usage fee.\nWhen needed, supplier connection, communication and meeting coordination are also supported for free."
  },
  "landing.cta.p": {
    "vi": "Gặp gỡ những sản phẩm tiên phong toàn cầu đang tìm nhà phân phối chính thức tại Việt Nam.",
    "ko": "베트남 공식 유통 파트너를 찾고 있는 글로벌 혁신 제품을 만나보세요.",
    "en": "Meet global innovative products looking for their official distribution partner in Vietnam."
  },
  "landing.float.btn": {
    "vi": "Khám phá sản phẩm tiên phong",
    "ko": "혁신 제품 둘러보기",
    "en": "Browse innovative products"
  },
  "landing.steps.h": {
    "vi": "Đã có MAKENOV thay bạn kết nối với các thương hiệu toàn cầu",
    "ko": "메이크노브가 전 세계 브랜드와의 연결을 대신합니다",
    "en": "MAKENOV handles the connection with brands worldwide"
  }
};
