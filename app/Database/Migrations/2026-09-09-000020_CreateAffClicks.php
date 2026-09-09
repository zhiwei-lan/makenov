<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_clicks — 링크 방문. (code, product_id, day, ua_hash) 유일 = 같은 기기 하루 1건. ch = 채널(fb/zalo/tiktok/copy/..).
 * 제휴(affiliate, CTV) 프로그램 — 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * MySQL 5.6: jsonb 대신 TEXT 에 JSON 문자열, 외래키는 논리 외래키만.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class CreateAffClicks extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'INT','constraint'=>11,'unsigned'=>true,'auto_increment'=>true],
            'code' => ['type'=>'VARCHAR','constraint'=>8],
            'product_id' => ['type'=>'VARCHAR','constraint'=>64,'default'=>''],
            'ch' => ['type'=>'VARCHAR','constraint'=>16,'default'=>''],
            'day' => ['type'=>'DATE'],
            'ua_hash' => ['type'=>'CHAR','constraint'=>32],
            'created_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey(['code','day']);
        $this->forge->addUniqueKey(['code','product_id','day','ua_hash']);
        $this->forge->createTable('aff_clicks', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('aff_clicks', true);
    }
}
