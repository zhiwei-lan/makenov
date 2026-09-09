<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_campaigns — 제품 1개 = 캠페인 1개. 단가(VND)·상한·소재·문구·규정.
 * 제휴(affiliate, CTV) 프로그램 — 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * MySQL 5.6: jsonb 대신 TEXT 에 JSON 문자열, 외래키는 논리 외래키만.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class CreateAffCampaigns extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'product_id' => ['type'=>'VARCHAR','constraint'=>64],
            'cpa_vnd' => ['type'=>'INT','default'=>0],
            'cap' => ['type'=>'INT','null'=>true],
            'headline' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'materials' => ['type'=>'TEXT','null'=>true],
            'copy_text' => ['type'=>'TEXT','null'=>true],
            'keywords' => ['type'=>'TEXT','null'=>true],
            'rules' => ['type'=>'TEXT','null'=>true],
            'featured' => ['type'=>'TINYINT','constraint'=>1,'default'=>0],
            'sort' => ['type'=>'INT','default'=>99],
            'active' => ['type'=>'TINYINT','constraint'=>1,'default'=>0],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('product_id');
        $this->forge->createTable('aff_campaigns', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('aff_campaigns', true);
    }
}
