<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 행사 부가 정보를 관리자에서 넣을 수 있게(2026-10-05 사용자 지시).
 *   - meet_trips.extra (TEXT, JSON): 부제 · 한 줄 소개 · 공식 행사명 · 세부 장소 · 주관/운영 · 주최 로고 · 사진 ·
 *     지도 검색어/주소 · 통역·부스/공급사 추가 중/정해진 행사 표시 · 행사별 FAQ · 지원 내용.
 *     지금까지는 app.js 의 MT_EVENT_X 에 일정 ID 로 적어 두었다 → 그 값을 hcm-20261203 일정에 옮긴다(비어 있을 때만).
 *   - meet_config (k, v): 새 신청 알림 메일 주소 같은 관리자 설정. REST 로 공개되지 않는 테이블이다.
 * 적용: Api\Meet 스키마 가드 v16.
 */
class MeetTripExtraAndConfig extends Migration
{
    public function up()
    {
        $db = $this->db;
        if ($db->tableExists('meet_trips') && ! in_array('extra', $db->getFieldNames('meet_trips'), true)) {
            $this->forge->addColumn('meet_trips', ['extra' => ['type' => 'TEXT', 'null' => true]]);
        }
        if (! $db->tableExists('meet_config')) {
            $this->forge->addField([
                'k'          => ['type' => 'VARCHAR', 'constraint' => 64],
                'v'          => ['type' => 'TEXT', 'null' => true],
                'updated_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('k');
            /* 문자셋 지정은 MySQL 에서만(로컬 테스트용 SQLite 는 이 구문을 모른다) */
            $this->forge->createTable('meet_config', true, $db->DBDriver === 'MySQLi' ? ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci'] : []);
        }
        if (method_exists($db, 'resetDataCache')) {
            $db->resetDataCache();
        }
        if ($db->tableExists('meet_trips') && in_array('extra', $db->getFieldNames('meet_trips'), true)) {
            $row = $db->table('meet_trips')->select('id, extra')->where('id', 'hcm-20261203')->get()->getRowArray();
            if ($row && trim((string) ($row['extra'] ?? '')) === '') {
                $x = json_decode(<<<'JSON'
{
 "sub": {
  "ko": "한국–베트남 비즈니스 상담회",
  "vi": "Hội nghị kết nối giao thương Hàn – Việt",
  "en": "Korea–Vietnam Business Matching"
 },
 "lead": {
  "ko": "한국 대구의 혁신기업을 호치민에서 직접 만나보세요",
  "vi": "Gặp trực tiếp tại TP.HCM các doanh nghiệp đổi mới đến từ Daegu, Hàn Quốc",
  "en": "Meet innovative companies from Daegu, Korea in person in Ho Chi Minh City"
 },
 "name": {
  "ko": "2026 대구메이드 K-Festa 베트남 수출상담회",
  "vi": "2026 DAEGU MADE K-FESTA – Hội nghị kết nối giao thương Hàn – Việt",
  "en": "2026 Daegu Made K-Festa – Korea–Vietnam Business Matching"
 },
 "venue_detail": {
  "ko": "베트남 호치민시 1군, 호텔 니코 사이공 4층 컨퍼런스룸",
  "vi": "Phòng hội nghị tầng 4, Khách sạn Nikko Saigon, Quận 1, TP. Hồ Chí Minh",
  "en": "Conference room, 4F, Hotel Nikko Saigon, District 1, Ho Chi Minh City"
 },
 "host": {
  "ko": "대구광역시 호치민사무소",
  "vi": "Văn phòng đại diện TP. Daegu tại TP. Hồ Chí Minh",
  "en": "Daegu Metropolitan City Ho Chi Minh Office"
 },
 "org": {
  "ko": "주식회사 퍼스트마케팅컴퍼니 (KFESTA 베트남 사무국)",
  "vi": "First Marketing Company (Ban thư ký KFESTA Việt Nam)",
  "en": "First Marketing Company (KFESTA Vietnam Secretariat)"
 },
 "logos": [
  "https://kfesta.vn/assets/img/daegu-ci.webp"
 ],
 "photo": "https://images.unsplash.com/photo-1663670889635-0aabebf112ba?auto=format&fit=crop&w=1600&q=80",
 "map_q": "Hotel Nikko Saigon, 235 Nguyen Van Cu, District 1, Ho Chi Minh City",
 "map_addr": {
  "ko": "235 Nguyễn Văn Cừ, 1군, 호치민 (Hotel Nikko Saigon)",
  "vi": "235 Nguyễn Văn Cừ, Phường Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh",
  "en": "235 Nguyen Van Cu, District 1, Ho Chi Minh City"
 },
 "booth": true,
 "growing": true,
 "fixed": true
}
JSON, true);
                if (is_array($x)) {
                    $db->table('meet_trips')->where('id', 'hcm-20261203')
                        ->update(['extra' => json_encode($x, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
                }
            }
        }
    }

    public function down()
    {
        if ($this->db->tableExists('meet_config')) {
            $this->forge->dropTable('meet_config', true);
        }
        if ($this->db->tableExists('meet_trips') && in_array('extra', $this->db->getFieldNames('meet_trips'), true)) {
            $this->forge->dropColumn('meet_trips', 'extra');
        }
    }
}
