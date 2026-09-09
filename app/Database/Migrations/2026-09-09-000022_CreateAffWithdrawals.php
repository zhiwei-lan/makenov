<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_withdrawals — 출금 신청. bank_snapshot 은 신청 시점 계좌(JSON).
 * 제휴(affiliate, CTV) 프로그램 — 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * MySQL 5.6: jsonb 대신 TEXT 에 JSON 문자열, 외래키는 논리 외래키만.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class CreateAffWithdrawals extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'CHAR','constraint'=>36],
            'marketer_id' => ['type'=>'CHAR','constraint'=>36],
            'amount_vnd' => ['type'=>'INT','default'=>0],
            'bank_snapshot' => ['type'=>'TEXT','null'=>true],
            'status' => ['type'=>'VARCHAR','constraint'=>12,'default'=>'requested'],
            'memo' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'paid_at' => ['type'=>'DATETIME','null'=>true],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('marketer_id');
        $this->forge->addKey('status');
        $this->forge->createTable('aff_withdrawals', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('aff_withdrawals', true);
    }
}
