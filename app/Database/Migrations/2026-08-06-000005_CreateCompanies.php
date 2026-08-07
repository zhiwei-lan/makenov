<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * companies — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateCompanies extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'VARCHAR','constraint'=>64],
            'brand' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'cat' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'name' => ['type'=>'TEXT','null'=>true],
            'tagline' => ['type'=>'TEXT','null'=>true],
            'intro' => ['type'=>'TEXT','null'=>true],
            'location' => ['type'=>'TEXT','null'=>true],
            'since' => ['type'=>'VARCHAR','constraint'=>32,'null'=>true],
            'staff' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'export' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'brn' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'ceo' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'tel' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'site' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'certs' => ['type'=>'TEXT','null'=>true],
            'moq_policy' => ['type'=>'TEXT','null'=>true],
            'logo' => ['type'=>'TEXT','null'=>true],
            'cover' => ['type'=>'TEXT','null'=>true],
            'sort' => ['type'=>'INT','default'=>0],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('companies', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('companies', true);
    }
}
