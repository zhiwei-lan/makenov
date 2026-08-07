<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * profiles — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateProfiles extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'CHAR','constraint'=>36],
            'email' => ['type'=>'VARCHAR','constraint'=>255,'null'=>false],
            'country' => ['type'=>'VARCHAR','constraint'=>8,'default'=>'VN'],
            'company' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'address' => ['type'=>'TEXT','null'=>true],
            'reg_no' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'verified_by' => ['type'=>'VARCHAR','constraint'=>16,'null'=>true],
            'verify_note' => ['type'=>'TEXT','null'=>true],
            'status' => ['type'=>'VARCHAR','constraint'=>16,'default'=>'pending'],
            'tier' => ['type'=>'VARCHAR','constraint'=>16,'default'=>'verified'],
            'contact_name' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'position' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'messenger' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'phone' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('profiles', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('profiles', true);
    }
}
