<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * products.hook — 제품 상세 페이지 상단의 '후킹 제목 · 서브 카피'.
 *   {"title":{"vi":..,"ko":..,"en":..},"sub":{"vi":..,"ko":..,"en":..}}   (JSON 문자열, MySQL 5.6 이라 TEXT)
 * 제품명(name)·한 줄 소개(tagline)는 카드·목록·SEO 에 그대로 쓰고, 상세 페이지 h1 자리에만 hook 을 보여 준다.
 * 관리자 › 제품 폼에서 편집한다.
 *
 * 초기값(1회): 2026-10-02 사용자 시트 '정리' 탭의 제품 후킹 문구(한국어·베트남어). 영어는 번역해 넣었다.
 * 이미 hook 이 들어 있는 제품은 건드리지 않는다.
 * 적용: Api\Meet 스키마 가드 v5 (deploy.yml 이 migrate 를 돌리지 않는다).
 */
class AddHookToProducts extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('products')) {
            return;
        }
        if (! in_array('hook', $this->db->getFieldNames('products'), true)) {
            $this->forge->addColumn('products', [
                'hook' => ['type' => 'TEXT', 'null' => true, 'after' => 'tagline'],
            ]);
        }

        $seed = [
            'p11' => [
                'title' => [
                    'ko' => '한국 400개 이상 피부과·성형외과에 공급하는 제약 기술 기업의 미라렛 스킨부스터',
                    'vi' => 'MIRALET Skin Booster từ doanh nghiệp công nghệ dược phẩm cung cấp sản phẩm cho hơn 400 phòng khám da liễu và phẫu thuật thẩm mỹ tại Hàn Quốc',
                    'en' => 'MIRALET skin booster — from a pharma-tech company supplying 400+ dermatology and plastic surgery clinics in Korea',
                ],
                'sub' => [
                    'ko' => '식물성 PDRN·3종 식물성 엑소좀·3중 히알루론산을 적용한 친환경 안티에이징 스킨부스터',
                    'vi' => 'Skin booster chống lão hóa thân thiện với môi trường, ứng dụng PDRN có nguồn gốc thực vật, 3 loại exosome thực vật và phức hợp axit hyaluronic 3 tầng',
                    'en' => 'An eco-friendly anti-aging skin booster with plant-based PDRN, three plant exosomes and triple hyaluronic acid.',
                ],
            ],
            'p9' => [
                'title' => [
                    'ko' => '한국 올리브영에 입점한 3WB 풋크림',
                    'vi' => 'Kem dưỡng chân 3WB hiện có mặt tại Olive Young Hàn Quốc',
                    'en' => '3WB foot cream, stocked at Olive Young in Korea',
                ],
                'sub' => [
                    'ko' => '우레아·로열젤리·프로폴리스 성분으로 거칠고 건조한 발뒤꿈치를 부드럽고 촉촉하게 케어합니다.',
                    'vi' => 'Với urê, sữa ong chúa và keo ong, sản phẩm giúp làm mềm và dưỡng ẩm cho vùng gót chân thô ráp, khô ráp.',
                    'en' => 'With urea, royal jelly and propolis, it softens and moisturizes rough, dry heels.',
                ],
            ],
            'p2' => [
                'title' => [
                    'ko' => '압력 전달 효율 80.0%, 세광하이테크 유압 피팅',
                    'vi' => 'Co góc thủy lực S-fitting Sekwang Hi-Tech với hiệu suất truyền áp suất 80,0%',
                    'en' => '80.0% pressure transfer efficiency — SEKWANG HI-TECH hydraulic fittings',
                ],
                'sub' => [
                    'ko' => '일반 단조 엘보 대비 압력 손실을 줄이고, 진동과 소음을 낮출 수 있도록 연속 곡선형 유로를 적용한 S-FITTING입니다.',
                    'vi' => 'S-FITTING ứng dụng thiết kế đường dẫn dòng chảy cong liên tục, giúp giảm tổn thất áp suất, đồng thời hạn chế rung động và tiếng ồn so với các loại co nối rèn thông thường.',
                    'en' => 'S-FITTING uses a continuous curved flow path to cut pressure loss versus standard forged elbows, while reducing vibration and noise.',
                ],
            ],
            'p1' => [
                'title' => [
                    'ko' => '8개 언어·16개 메뉴, 하루 200~300그릇을 운영하는 스마트 라면 조리기 코라프로',
                    'vi' => 'KORA Pro – máy nấu mì ramen thông minh hỗ trợ 8 ngôn ngữ, 16 menu và phục vụ 200–300 tô mỗi ngày',
                    'en' => 'KORA Pro — the smart ramen cooker with 8 languages, 16 menus and 200–300 bowls a day',
                ],
                'sub' => [
                    'ko' => '자동 급수와 이미지·음성 조리 안내를 지원하고, 베트남어를 포함한 8개 언어 화면과 최대 16개 메뉴 설정으로 누구나 쉽게 운영할 수 있습니다.',
                    'vi' => 'Thiết bị hỗ trợ cấp nước tự động cùng hướng dẫn nấu bằng hình ảnh và âm thanh. Giao diện 8 ngôn ngữ, bao gồm tiếng Việt, và khả năng cài đặt tối đa 16 menu giúp việc vận hành trở nên đơn giản, dễ dàng với mọi người.',
                    'en' => 'Automatic water supply with image and voice cooking guidance. An 8-language screen, including Vietnamese, and up to 16 menu presets make it easy for anyone to run.',
                ],
            ],
            'p0' => [
                'title' => [
                    'ko' => '물로 끄기 어려운 전기차 배터리 화재, 산소부터 차단하는 FIRESSAK MOTO',
                    'vi' => 'FIRESSAK MOTO – giải pháp chặn nguồn oxy cho các vụ cháy pin xe điện khó dập tắt bằng nước',
                    'en' => 'FIRESSAK MOTO — cuts off the oxygen first in EV battery fires that water can\'t put out',
                ],
                'sub' => [
                    'ko' => '차량 전체를 덮어 산소 유입을 차단하고, 재발화 위험이 높은 배터리 화재가 주변 차량과 건물로 확산되는 것을 억제하도록 설계된 한국의 화재 진압 솔루션입니다.',
                    'vi' => 'Giải pháp chữa cháy của Hàn Quốc được thiết kế để bao phủ toàn bộ phương tiện, hạn chế oxy xâm nhập và kiểm soát nguy cơ đám cháy pin tái bùng phát, đồng thời ngăn cháy lan sang các phương tiện và công trình xung quanh.',
                    'en' => 'A Korean fire-suppression solution that covers the whole vehicle to block oxygen, and keeps battery fires — prone to re-ignition — from spreading to nearby vehicles and buildings.',
                ],
            ],
        ];

        if (method_exists($this->db, 'resetDataCache')) {
            $this->db->resetDataCache();
        }
        foreach ($seed as $id => $hook) {
            $row = $this->db->table('products')->select('id, hook')->where('id', $id)->get()->getRowArray();
            if (! $row || trim((string) ($row['hook'] ?? '')) !== '') {
                continue;   // 없는 제품이거나 이미 관리자가 넣은 값이 있다
            }
            $this->db->table('products')->where('id', $id)->update([
                'hook' => json_encode($hook, JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'hook');
    }
}
