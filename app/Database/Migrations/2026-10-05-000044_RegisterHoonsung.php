<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 등록(1회) — 공급사 '훈성산업(HOON SUNG OPTICAL)' 등록(2026-10-05 사용자 지시, 회사 소개·카탈로그 자료 기준).
 *   - companies 에 id='hoonsung' 이 없을 때만 넣는다(관리자가 이미 만들었으면 건드리지 않는다).
 *   - 제품 p3(CHIMERIC 선글라스 · po·le optic 티타늄 프레임)에 연결된 공급사가 없으면 이 회사로 연결한다.
 * 대표자·사업자등록번호는 자료에 없어 비워 둔다(관리자 › 공급사에서 채울 수 있다).
 * 적용: Api\Meet 스키마 가드 v14.
 */
class RegisterHoonsung extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('companies')) {
            return;
        }
        $c = json_decode(<<<'JSON'
{
 "id": "hoonsung",
 "brand": "HOONSUNG",
 "cat": "living",
 "sort": 11,
 "name": {
  "vi": "HOON SUNG OPTICAL",
  "ko": "훈성산업",
  "en": "HOON SUNG OPTICAL"
 },
 "tagline": {
  "vi": "Nhà sản xuất kính mắt tại Daegu với hơn 30 năm kinh nghiệm, xuất khẩu tới hơn 50 quốc gia",
  "ko": "30년 넘게 안경을 만들어 50여 개국에 수출하는 대구의 안경 제조사",
  "en": "Daegu eyewear manufacturer with 30+ years of experience, exporting to more than 50 countries"
 },
 "intro": {
  "vi": "Hoon Sung Industrial (HOON SUNG OPTICAL) là doanh nghiệp sản xuất được thành lập năm 1993 tại Daegu, Hàn Quốc, chuyên phát triển và sản xuất kính mắt trong hơn 30 năm. Công ty sản xuất gọng kính từ nhiều chất liệu như Titanium, thép không gỉ, TR-90 và đã tích lũy bí quyết sản xuất từ khâu hoạch định sản phẩm, thiết kế, phát triển đến sản xuất và quản lý chất lượng. Công ty hỗ trợ phát triển OEM·ODM phù hợp với thị trường và chiến lược thương hiệu của khách hàng nước ngoài, có thể tùy chỉnh từ thiết kế, màu sắc, kích thước, chất liệu, logo đến bao bì. Công ty sở hữu các thương hiệu riêng CHIMERIC, po·le optic, FEEL SWISS và TEAM SPIRIT, xuất khẩu khoảng 80% sản phẩm tới hơn 50 quốc gia.",
  "ko": "훈성산업(HOON SUNG OPTICAL)은 1993년 대한민국 대구에서 설립되어 30년 넘게 안경을 개발·생산해 온 제조 기업입니다. 티타늄, 스테인리스 스틸, TR-90 등 다양한 소재의 안경테를 생산하며, 제품 기획과 디자인, 개발부터 생산과 품질 관리까지 제조 노하우를 쌓아 왔습니다. 해외 고객의 시장과 브랜드 전략에 맞춘 OEM·ODM 개발을 지원하고, 디자인·색상·크기·소재·로고·포장까지 맞춤 제작이 가능합니다. 자체 브랜드 CHIMERIC, po·le optic, FEEL SWISS, TEAM SPIRIT을 보유하고 있으며 제품의 약 80%를 50여 개국에 수출합니다.",
  "en": "Hoon Sung Industrial (HOON SUNG OPTICAL) is a manufacturer founded in 1993 in Daegu, Korea, and has developed and produced eyewear for more than 30 years. It makes frames in titanium, stainless steel, TR-90 and other materials, with know-how covering product planning, design and development through production and quality control. The company supports OEM/ODM development tailored to each overseas customer's market and brand strategy, with customization from design, color, size and material to logo and packaging. It owns the brands CHIMERIC, po·le optic, FEEL SWISS and TEAM SPIRIT, and exports about 80% of its products to more than 50 countries."
 },
 "location": {
  "vi": "Daegu, Hàn Quốc",
  "ko": "대구 달서구 송현동",
  "en": "Daegu, Korea"
 },
 "since": "1993",
 "staff": "—",
 "export": "50+",
 "brn": "",
 "ceo": "",
 "tel": "+82-53-628-2300",
 "site": "www.hoonsung.co.kr",
 "certs": [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "ISO 13485",
  "INNO-BIZ",
  "MAIN-BIZ",
  "EN 166F",
  "ANSI Z87",
  {
   "vi": "Doanh nghiệp thủ công trăm năm",
   "ko": "백년소공인",
   "en": "Centennial Small Manufacturer"
  }
 ],
 "moq_policy": "Liên hệ",
 "logo": "https://makenov.com/assets/img/companies/hoonsung.png",
 "cover": "https://makenov.com/storage/v1/object/public/product-images/2026/muuxp7ep6h0zi1.png"
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
            $p = $db->table('products')->select('id, company_id')->where('id', 'p3')->get()->getRowArray();
            if ($p && (string) ($p['company_id'] ?? '') === '') {
                $db->table('products')->where('id', 'p3')->update(['company_id' => $c['id']]);
            }
        }
    }

    public function down()
    {
        // 데이터 등록이라 되돌리지 않는다.
    }
}
