<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * auth_tokens — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateAuthTokens extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'INT','unsigned'=>true,'auto_increment'=>true],
            'user_id' => ['type'=>'CHAR','constraint'=>36,'null'=>false],
            'access_token' => ['type'=>'CHAR','constraint'=>64,'null'=>false],
            'refresh_token' => ['type'=>'CHAR','constraint'=>64,'null'=>false],
            'expires_at' => ['type'=>'DATETIME','null'=>false],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey('access_token');
        $this->forge->addUniqueKey('refresh_token');
        $this->forge->addKey('user_id');
        $this->forge->createTable('auth_tokens', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('auth_tokens', true);
    }
}
