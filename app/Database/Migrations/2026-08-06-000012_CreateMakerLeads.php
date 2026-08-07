<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * maker_leads — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateMakerLeads extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'CHAR','constraint'=>36],
            'company' => ['type'=>'VARCHAR','constraint'=>255,'null'=>false],
            'name' => ['type'=>'VARCHAR','constraint'=>255,'null'=>false],
            'tel' => ['type'=>'VARCHAR','constraint'=>64,'null'=>false],
            'email' => ['type'=>'VARCHAR','constraint'=>255,'null'=>false],
            'site' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'cat' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'message' => ['type'=>'TEXT','null'=>true],
            'status' => ['type'=>'VARCHAR','constraint'=>16,'default'=>'new'],
            'memo' => ['type'=>'TEXT','null'=>true],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('maker_leads', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('maker_leads', true);
    }
}
