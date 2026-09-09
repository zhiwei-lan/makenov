<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_leads — 리드 = 마케터 링크로 들어온 유통사 문의. amount_vnd 는 접수 시점 단가 스냅샷.
 * 제휴(affiliate, CTV) 프로그램 — 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * MySQL 5.6: jsonb 대신 TEXT 에 JSON 문자열, 외래키는 논리 외래키만.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class CreateAffLeads extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'CHAR','constraint'=>36],
            'inquiry_id' => ['type'=>'CHAR','constraint'=>36],
            'marketer_id' => ['type'=>'CHAR','constraint'=>36],
            'product_id' => ['type'=>'VARCHAR','constraint'=>64],
            'buyer_id' => ['type'=>'CHAR','constraint'=>36,'null'=>true],
            'ch' => ['type'=>'VARCHAR','constraint'=>16,'default'=>''],
            'status' => ['type'=>'VARCHAR','constraint'=>12,'default'=>'pending'],
            'amount_vnd' => ['type'=>'INT','default'=>0],
            'reject_reason' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'decided_at' => ['type'=>'DATETIME','null'=>true],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('marketer_id');
        $this->forge->addKey('product_id');
        $this->forge->addKey('status');
        $this->forge->addUniqueKey('inquiry_id');
        $this->forge->createTable('aff_leads', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('aff_leads', true);
    }
}
