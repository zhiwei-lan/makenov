<?php

namespace AppDatabaseMigrations;

use CodeIgniterDatabaseMigration;

/**
 * 데이터 등록(1회) — 공급사 '세광하이테크(SEKWANG HI-TECH)' 등록(2026-10-05 사용자 지시, 회사소개서-영문(2025)·사업자등록증 기준).
 *   - companies 에 id='sekwang' 이 없을 때만 넣는다(관리자가 이미 만들었으면 건드리지 않는다).
 *   - 제품 p2(S-fitting 곡관 엘보)에 연결된 공급사가 없으면 이 회사로 연결한다.
 * 수출국 '9+' 는 자료상 1999년 9개국 수출 시작 기준. OEM 고객사 이름은 사용 허락 미확인이라 소개에서 뺐다.
 * 적용: ApiMeet 스키마 가드 v19.
 */
class RegisterSekwang extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('companies')) {
            return;
        }
        $c = json_decode(<<<'JSON'
{
 "id": "sekwang",
 "brand": "SEKWANG HI-TECH",
 "cat": "tech",
 "sort": 12,
 "name": {
  "vi": "SEKWANG HI-TECH",
  "ko": "세광하이테크",
  "en": "SEKWANG HI-TECH"
 },
 "tagline": {
  "vi": "Nhà sản xuất phụ kiện thủy lực tại Daegu từ năm 1977, phát triển co uốn S-FITTING",
  "ko": "1977년부터 유압 피팅을 만들어 온 대구의 제조사, 곡관 엘보 S-FITTING 개발",
  "en": "Daegu hydraulic fitting manufacturer since 1977, developer of the S-FITTING bending elbow"
 },
 "intro": {
  "vi": "SEKWANG HI-TECH là nhà sản xuất phụ kiện thủy lực Hàn Quốc, khởi đầu từ Sekwang Metal thành lập năm 1977 tại Daegu và chuyển đổi thành công ty cổ phần năm 2001. Công ty tự thực hiện toàn bộ quy trình từ rèn, gia công CNC, mạ, uốn đến lắp ráp và kiểm tra tại nhà máy riêng, với 65 nhân sự, 75 máy CNC và viện nghiên cứu nội bộ. Sản phẩm gồm đầu nối tiêu chuẩn 30° và 37°, đầu nối ORFS, bite type, DIN, khớp nối nhanh, van và manifold. Sản phẩm chủ lực S-FITTING là co uốn được tạo hình từ phôi lục giác rỗng, giúp dòng chất lỏng chuyển hướng êm hơn và giảm tổn thất áp suất so với co rèn thông thường. Công ty sở hữu 14 bằng sáng chế và 25 kiểu dáng công nghiệp, xuất khẩu từ năm 1999 và đạt Tháp xuất khẩu 5 triệu USD năm 2009. Công ty đạt chứng nhận ISO 9001, ISO 14001 và ISO 45001.",
  "ko": "세광하이테크는 1977년 대구에서 세광금속으로 출발해 2001년 법인으로 전환한 유압 피팅 제조 기업입니다. 단조, CNC 가공, 도금, 벤딩, 조립과 검사까지 전 공정을 자체 공장에서 수행하며, 임직원 65명과 CNC 설비 75대, 기업부설연구소를 갖추고 있습니다. 30°·37° 표준 피팅, ORFS, 바이트 타입, DIN 타입 피팅과 커플러, 밸브, 매니폴드를 생산합니다. 주력 제품 S-FITTING은 속이 빈 육각 소재를 구부려 만든 곡관 엘보로, 일반 단조 엘보보다 유체가 부드럽게 방향을 바꿔 압력 손실을 줄여 줍니다. 특허 14건과 디자인 25건을 보유하고 있으며, 1999년부터 해외로 수출해 2009년 500만 달러 수출의 탑을 받았습니다. ISO 9001, ISO 14001, ISO 45001 인증을 갖추고 있습니다.",
  "en": "SEKWANG HI-TECH is a Korean hydraulic fitting manufacturer that began as Sekwang Metal in Daegu in 1977 and became a corporation in 2001. It runs the whole process in its own factories, from forging, CNC machining, plating and bending to assembly and inspection, with 65 employees, 75 CNC machines and an in-house research institute. Its range includes 30° and 37° standard fittings, ORFS, bite type and DIN fittings, couplers, valves and manifolds. Its flagship S-FITTING is a bending elbow formed from hollow hexagonal stock, which lets fluid change direction more smoothly and reduces pressure loss compared with a conventional forged elbow. The company holds 14 patents and 25 design registrations, has exported since 1999 and received the 5 Million Dollar Export Tower in 2009. It is certified to ISO 9001, ISO 14001 and ISO 45001."
 },
 "location": {
  "vi": "Daegu, Hàn Quốc",
  "ko": "대구 북구 산격동",
  "en": "Daegu, Korea"
 },
 "since": "1977",
 "staff": "65",
 "export": "9+",
 "brn": "504-81-39137",
 "ceo": "Lee Jeong Sang, Lee Do Yoon",
 "tel": "+82-53-383-2132",
 "site": "www.skh-hydraulics.com",
 "certs": [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "MAIN-BIZ"
 ],
 "moq_policy": "Liên hệ",
 "logo": "https://makenov.com/assets/img/companies/sekwang-logo.png",
 "cover": "https://makenov.com/assets/img/companies/sekwang-cover.jpg"
}
JSON, true);
        if (! is_array($c) || empty($c['id'])) {
            return;
        }
        $now = date('Y-m-d H:i:s');
        if (! $db->table('companies')->where('id', $c['id'])->countAllResults()) {
            $row = $c;
            foreach (['name', 'tagline', 'intro', 'location', 'certs'] as $k) {
                $row[$k] = json_encode($c[$k], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
            $cols = $db->getFieldNames('companies');
            $db->table('companies')->insert(array_intersect_key($row, array_flip($cols)));
        }
        if ($db->tableExists('products') && in_array('company_id', $db->getFieldNames('products'), true)) {
            $p = $db->table('products')->select('id, company_id')->where('id', 'p2')->get()->getRowArray();
            if ($p && (string) ($p['company_id'] ?? '') === '') {
                $db->table('products')->where('id', 'p2')->update(['company_id' => $c['id']]);
            }
        }
    }

    public function down()
    {
        // 데이터 등록이라 되돌리지 않는다.
    }
}
