<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_tokens — 마케터 세션(access/refresh 회전). auth_tokens 와 같은 방식, 테이블만 분리.
 * 제휴(affiliate, CTV) 프로그램 — 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * MySQL 5.6: jsonb 대신 TEXT 에 JSON 문자열, 외래키는 논리 외래키만.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class CreateAffTokens extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'INT','constraint'=>11,'unsigned'=>true,'auto_increment'=>true],
            'marketer_id' => ['type'=>'CHAR','constraint'=>36],
            'access_token' => ['type'=>'VARCHAR','constraint'=>64],
            'refresh_token' => ['type'=>'VARCHAR','constraint'=>64],
            'expires_at' => ['type'=>'DATETIME'],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('marketer_id');
        $this->forge->addKey('access_token');
        $this->forge->addKey('refresh_token');
        $this->forge->createTable('aff_tokens', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('aff_tokens', true);
    }
}
