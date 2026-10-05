/* ============================================================
   MAKENOV — 유통 파트너 랜딩(about.html) 카피
   ------------------------------------------------------------
   ★ 한국어가 원본이다. vi/en 은 한국어가 확정된 뒤에 맞춘다.

   ★ 톤: 담백하게. 잘 쓰려 하지 말고 그냥 말한다.
     - 제목은 수수께끼가 아니라 라벨로 쓴다.
       (X) 달력이 남의 것입니다  (O) 볼 수 있는 날짜가 정해져 있습니다
     - 읽고 한 번 해석해야 뜻이 오는 문장은 버린다.
     - 대구법, 반전, 비유 금지. 사실을 순서대로 적는다.
   ============================================================ */
const AB = {

hero:{
  kick:{ko:'유통 파트너 전용', vi:'Dành cho nhà phân phối', en:'For distribution partners'},
  h1:{ko:'전 세계 혁신 제품을 한자리에서 보고,\n공급사에 바로 미팅을 요청합니다.',
      vi:'Xem sản phẩm đổi mới từ khắp thế giới ở một nơi,\nvà đặt lịch trao đổi thẳng với nhà sản xuất.',
      en:'See innovative products from around the world in one place,\nand request a meeting with the manufacturer directly.'},
  lead:{ko:'박람회를 기다릴 필요도, 비행기를 탈 필요도 없습니다. 사업자 인증만 하면 단가와 최소주문수량까지 그 자리에서 열립니다.',
        vi:'Không cần đợi hội chợ, không cần bay đi đâu. Chỉ cần xác thực doanh nghiệp là giá và số lượng tối thiểu mở ra ngay tại chỗ.',
        en:'No waiting for a trade fair, no flights. Verify your business and price and minimum order quantity open on the spot.'},
  facts:[
    {n:{ko:'365일',vi:'365 ngày',en:'365 days'},
     l:{ko:'박람회는 사흘, 여기는 1년 내내',vi:'Hội chợ ba ngày, ở đây cả năm',en:'Fairs run three days; this runs all year'}},
    {n:{ko:'0원',vi:'0đ',en:'Zero'},
     l:{ko:'가입과 사업자 인증',vi:'Đăng ký và xác thực',en:'Sign-up and verification'}},
    {n:{ko:'1분',vi:'1 phút',en:'1 minute'},
     l:{ko:'인증에 걸리는 시간',vi:'Thời gian xác thực',en:'Time to verify'}},
  ],
},

problem:{
  tag:{ko:'지금의 소싱',vi:'Cách sourcing hiện nay',en:'Sourcing as it stands'},
  h2:{ko:'박람회에 기대면 이렇게 됩니다',
      vi:'Dựa vào hội chợ thì sẽ như thế này',
      en:'What relying on trade fairs looks like'},
  lead:{ko:'새 제품을 찾는 통로가 박람회밖에 없으면 세 가지가 따라옵니다.',
        vi:'Nếu hội chợ là con đường duy nhất để tìm hàng mới, ba việc sau sẽ đi kèm.',
        en:'When fairs are the only route to new products, three things follow.'},
  items:[
    {t:{ko:'볼 수 있는 날짜가 정해져 있습니다',vi:'Ngày được xem hàng đã bị ấn định',en:'The date you get to look is fixed for you'},
     d:{ko:'박람회는 1년에 한두 번, 사흘간 열립니다. 그 사이에 새 제품이 필요해지면 다음 회차까지 기다리거나, 늘 거래하던 곳에서 가져와야 합니다.',
        vi:'Hội chợ diễn ra một hai lần mỗi năm, mỗi lần ba ngày. Giữa hai kỳ mà cần hàng mới thì phải đợi kỳ sau, hoặc lấy từ nhà cung cấp quen.',
        en:'Fairs happen once or twice a year for three days. If you need something new in between, you wait for the next one or reorder from your usual supplier.'}},
    {t:{ko:'가는 비용이 매번 듭니다',vi:'Mỗi lần đi là một lần tốn',en:'Every trip costs again'},
     d:{ko:'항공, 숙박, 통역, 그리고 자리를 비우는 며칠. 다음 박람회에도 같은 금액이 다시 듭니다.',
        vi:'Vé bay, khách sạn, phiên dịch, và mấy ngày rời khỏi công việc. Kỳ hội chợ sau lại tốn đúng khoản đó.',
        en:'Flights, hotels, an interpreter, and days away from work. The next fair costs the same again.'}},
    {t:{ko:'견적 하나 받는 데 몇 주가 걸립니다',vi:'Nhận một bản báo giá mất vài tuần',en:'One quote takes weeks'},
     d:{ko:'현장에서는 명함과 카탈로그만 오갑니다. 돌아와서 메일을 보내고 답을 기다리는 동안 필요한 시점이 지나갑니다.',
        vi:'Tại chỗ chỉ trao đổi danh thiếp và catalogue. Về nhà gửi email rồi chờ, và thời điểm cần hàng trôi qua.',
        en:'On site you trade cards and brochures. Back home you email and wait, and the moment you needed it passes.'}},
  ],
},

vs:{
  tag:{ko:'무엇이 달라지나',vi:'Khác ở đâu',en:'What changes'},
  h2:{ko:'박람회와 비교하면',
      vi:'So với đi hội chợ',
      en:'Compared with going to a fair'},
  head:{ko:['박람회','메이크노브'], vi:['Hội chợ','MAKENOV'], en:['Trade fair','MAKENOV']},
  rows:[
    {k:{ko:'볼 수 있는 시점',vi:'Thời điểm xem được',en:'When you can look'},
     a:{ko:'연 1~2회, 사흘간',vi:'1–2 lần mỗi năm, mỗi lần ba ngày',en:'Once or twice a year, three days'},
     b:{ko:'1년 내내',vi:'Quanh năm',en:'All year'}},
    {k:{ko:'비용',vi:'Chi phí',en:'Cost'},
     a:{ko:'항공 · 숙박 · 통역',vi:'Vé bay · khách sạn · phiên dịch',en:'Flights, hotels, interpreter'},
     b:{ko:'없음',vi:'Không có',en:'None'}},
    {k:{ko:'볼 수 있는 제품 수',vi:'Số sản phẩm xem được',en:'How many products'},
     a:{ko:'사흘 동안 돌 수 있는 부스만큼',vi:'Bằng số gian hàng đi được trong ba ngày',en:'As many booths as three days allow'},
     b:{ko:'등록된 제품 전체',vi:'Toàn bộ sản phẩm đã đăng',en:'Everything that is listed'}},
    {k:{ko:'단가 확인',vi:'Xem đơn giá',en:'Getting a price'},
     a:{ko:'현장에서는 어렵고, 메일로 문의',vi:'Tại chỗ khó hỏi, phải email sau',en:'Hard on site; you email afterwards'},
     b:{ko:'인증 후 제품 페이지에서 바로',vi:'Xác thực xong xem ngay trên trang sản phẩm',en:'Right on the product page once verified'}},
    {k:{ko:'제품 비교',vi:'So sánh sản phẩm',en:'Comparing products'},
     a:{ko:'받아온 카탈로그로',vi:'Bằng catalogue mang về',en:'Using the brochures you carried home'},
     b:{ko:'관심제품에 담아 조건 나란히',vi:'Lưu vào danh sách rồi đặt điều kiện cạnh nhau',en:'Saved to a list with terms side by side'}},
    {k:{ko:'문의 후 진행 상황',vi:'Tình trạng sau khi hỏi',en:'After you enquire'},
     a:{ko:'답장이 올 때까지 알 수 없음',vi:'Không biết gì cho tới khi có hồi âm',en:'Nothing until a reply arrives'},
     b:{ko:'접수 · 처리 중 · 답변 완료 표시',vi:'Hiển thị đã nhận, đang xử lý, đã trả lời',en:'Shown as received, in progress, answered'}},
    {k:{ko:'언어',vi:'Ngôn ngữ',en:'Language'},
     a:{ko:'통역을 직접 구해야 함',vi:'Phải tự tìm phiên dịch',en:'You arrange an interpreter'},
     b:{ko:'베트남어 · 영어 · 한국어',vi:'Tiếng Việt · Anh · Hàn',en:'Vietnamese, English, Korean'}},
  ],
},

lock:{
  tag:{ko:'가격 공개 방식',vi:'Cách hiển thị giá',en:'How pricing works'},
  /* 인증 후 화면에 보이는 예시 값 — 실제 단가가 아니라 보여주기용이다 */
  demo:{
    price:{ko:'US$ 4.20',vi:'US$ 4.20',en:'US$ 4.20'},
    moq:{ko:'500',vi:'500',en:'500'},
    lead:{ko:'30일',vi:'30 ngày',en:'30 days'},
    terms:{ko:'FOB · OEM',vi:'FOB · OEM',en:'FOB · OEM'},
  },
  h2:{ko:'가격은 인증한 유통 파트너에게만 보냅니다',
      vi:'Giá chỉ được gửi tới nhà phân phối đã xác thực',
      en:'Prices are sent only to verified distribution partners'},
  desc:{ko:'단가, 최소주문수량, 납기, 공급 조건은 사업자 인증을 통과한 계정에만 전송됩니다. 화면에서 가리는 방식이 아니라 인증 전에는 데이터를 아예 보내지 않습니다.',
        vi:'Đơn giá, số lượng tối thiểu, thời gian giao hàng và điều kiện cung ứng chỉ gửi tới tài khoản đã xác thực doanh nghiệp. Không phải che trên màn hình: chưa xác thực thì dữ liệu không được gửi đi.',
        en:'Unit price, minimum order quantity, lead time and supply terms are sent only to verified accounts. They are not masked on screen; before verification the data is not sent at all.'},
  before:{ko:'인증 전',vi:'Trước khi xác thực',en:'Before verification'},
  after:{ko:'인증 후',vi:'Sau khi xác thực',en:'After verification'},
  note:{ko:'그래서 공급사가 실제 수출 단가를 올립니다.',
        vi:'Nhờ vậy nhà sản xuất mới đăng giá xuất khẩu thật.',
        en:'That is why manufacturers list real export prices.'},
},

steps:{
  tag:{ko:'이용 방법',vi:'Cách dùng',en:'How to use it'},
  h2:{ko:'가입부터 미팅 요청까지 네 단계',
      vi:'Bốn bước, từ đăng ký đến đặt lịch trao đổi',
      en:'Four steps, from sign-up to a meeting request'},
  items:[
    {t:{ko:'가입',vi:'Đăng ký',en:'Sign up'},
     d:{ko:'국가를 고르고 회사와 담당자 정보를 입력합니다.',
        vi:'Chọn quốc gia, nhập thông tin công ty và người phụ trách.',
        en:'Choose your country and enter company and contact details.'}},
    {t:{ko:'사업자 인증',vi:'Xác thực doanh nghiệp',en:'Verify your business'},
     d:{ko:'베트남은 세금코드, 한국은 사업자등록번호, 그 외 국가는 회사 이메일 도메인으로 확인합니다.',
        vi:'Việt Nam dùng mã số thuế, Hàn Quốc dùng số đăng ký kinh doanh, các nước khác dùng email tên miền công ty.',
        en:'Tax code in Vietnam, business registration number in Korea, company email domain elsewhere.'}},
    {t:{ko:'단가 열람',vi:'Xem giá',en:'View pricing'},
     d:{ko:'인증이 끝나면 가격, 최소주문수량, 납기가 보입니다. 관심 있는 제품은 담아둘 수 있습니다.',
        vi:'Xác thực xong sẽ thấy giá, số lượng tối thiểu và thời gian giao hàng. Sản phẩm quan tâm có thể lưu lại.',
        en:'Once verified you can see price, minimum quantity and lead time, and save products you are interested in.'}},
    {t:{ko:'문의 또는 미팅 요청',vi:'Gửi yêu cầu hoặc đặt lịch',en:'Enquire or request a meeting'},
     d:{ko:'간단한 질문, 정식 견적 요청, 화상 미팅 요청 중에 고르면 됩니다.',
        vi:'Chọn giữa hỏi nhanh, yêu cầu báo giá chính thức, hoặc đặt lịch gặp qua video.',
        en:'Choose between a quick question, a full quote request, or a video meeting.'}},
  ],
},

faq:{
  tag:{ko:'자주 묻는 질문',vi:'Câu hỏi thường gặp',en:'Frequently asked'},
  h2:{ko:'가입 전에 확인하실 것들',
      vi:'Những điều nên biết trước khi đăng ký',
      en:'Before you sign up'},
  items:[
    {q:{ko:'비용이 드나요?',vi:'Có mất phí không?',en:'Does it cost anything?'},
     a:{ko:'가입, 인증, 제품 열람, 견적 요청 모두 무료입니다. 회원비와 수수료가 없습니다.',
        vi:'Đăng ký, xác thực, xem sản phẩm và hỏi báo giá đều miễn phí. Không phí thành viên, không hoa hồng.',
        en:'Signing up, verifying, browsing and requesting quotes are all free. No membership fee and no commission.'}},
    {q:{ko:'왜 인증해야 가격이 보이나요?',vi:'Vì sao phải xác thực mới thấy giá?',en:'Why does seeing prices require verification?'},
     a:{ko:'공급사가 실제 단가를 공개하는 조건이기 때문입니다. 누구나 볼 수 있으면 공급사가 가격을 올리지 않습니다.',
        vi:'Vì đó là điều kiện để nhà sản xuất công khai đơn giá thật. Ai cũng xem được thì họ sẽ không đăng giá.',
        en:'It is the condition on which manufacturers publish real prices. If anyone could see them, they would not post them.'}},
    {q:{ko:'소량으로 먼저 주문할 수 있나요?',vi:'Có thể đặt số lượng nhỏ trước không?',en:'Can I order a small quantity first?'},
     a:{ko:'제품에 따라 다릅니다. 협의 가능 표시가 있는 제품은 소량 주문을 논의할 수 있으니, 문의할 때 희망 수량을 적어주세요.',
        vi:'Tùy sản phẩm. Sản phẩm có nhãn có thể thương lượng thì bàn được đơn nhỏ, hãy ghi số lượng mong muốn khi hỏi.',
        en:'It depends on the product. Those tagged negotiable can discuss smaller orders, so state your target quantity when you enquire.'}},
    {q:{ko:'메이크노브를 통해 결제하나요?',vi:'Có thanh toán qua MAKENOV không?',en:'Do I pay through MAKENOV?'},
     a:{ko:'아닙니다. 문의는 공급사에 직접 전달되고 계약과 결제도 공급사와 하십니다. 중간 마진을 붙이지 않습니다.',
        vi:'Không. Yêu cầu được chuyển thẳng tới nhà sản xuất, hợp đồng và thanh toán cũng làm với họ. Chúng tôi không cộng chênh lệch.',
        en:'No. Requests go straight to the manufacturer, and you contract and pay with them. We add no margin.'}},
    {q:{ko:'수입 공고용 서류를 받을 수 있나요?',vi:'Có nhận được giấy tờ để công bố sản phẩm không?',en:'Can I get documents for import registration?'},
     a:{ko:'견적을 요청할 때 필요한 서류를 선택하시면 됩니다. 전성분표, 원산지증명서, 시험성적서, 카탈로그를 요청할 수 있습니다.',
        vi:'Khi hỏi báo giá, hãy chọn giấy tờ cần: bảng thành phần, C/O, phiếu kiểm nghiệm, catalogue.',
        en:'Select the documents you need on the quote form: ingredient list, certificate of origin, test report and catalogue.'}},
    {q:{ko:'어느 나라 제품이 등록되어 있나요?',vi:'Sản phẩm đến từ những nước nào?',en:'Which countries are the products from?'},
     a:{ko:'전 세계 공급사가 등록할 수 있습니다. 제품마다 원산지가 표시되어 있고, 등록 제품은 계속 늘어나고 있습니다.',
        vi:'Nhà sản xuất trên toàn thế giới đều có thể đăng. Mỗi sản phẩm đều ghi xuất xứ và danh mục đang tiếp tục mở rộng.',
        en:'Manufacturers worldwide can list. Origin is shown on each product, and the catalogue keeps growing.'}},
  ],
},

last:{
  h2:{ko:'지금 인증하고 단가를 확인하세요',
      vi:'Xác thực ngay để xem giá',
      en:'Verify now and see the pricing'},
  p:{ko:'인증은 무료이고 1분 정도 걸립니다. 제품부터 둘러보셔도 됩니다.',
     vi:'Xác thực miễn phí, mất khoảng một phút. Xem sản phẩm trước cũng được.',
     en:'Verification is free and takes about a minute. You are welcome to browse first.'},
  btn:{ko:'무료로 인증하기',vi:'Xác thực miễn phí',en:'Verify for free'},
},

};
