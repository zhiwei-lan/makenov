<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_marketers — 마케터(CTV) 계정. 바이어 계정(auth_users)과 완전 분리.
 * 제휴(affiliate, CTV) 프로그램 — 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * MySQL 5.6: jsonb 대신 TEXT 에 JSON 문자열, 외래키는 논리 외래키만.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class CreateAffMarketers extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'CHAR','constraint'=>36],
            'code' => ['type'=>'VARCHAR','constraint'=>8],
            'email' => ['type'=>'VARCHAR','constraint'=>255],
            'password_hash' => ['type'=>'VARCHAR','constraint'=>255],
            'name' => ['type'=>'VARCHAR','constraint'=>120,'null'=>true],
            'phone' => ['type'=>'VARCHAR','constraint'=>40,'null'=>true],
            'zalo' => ['type'=>'VARCHAR','constraint'=>40,'null'=>true],
            'bank_name' => ['type'=>'VARCHAR','constraint'=>120,'null'=>true],
            'bank_account' => ['type'=>'VARCHAR','constraint'=>60,'null'=>true],
            'bank_holder' => ['type'=>'VARCHAR','constraint'=>120,'null'=>true],
            'status' => ['type'=>'VARCHAR','constraint'=>12,'default'=>'active'],
            'memo' => ['type'=>'TEXT','null'=>true],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey('code');
        $this->forge->addUniqueKey('email');
        $this->forge->createTable('aff_marketers', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('aff_marketers', true);
    }
}
