<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * notices — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateNotices extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'VARCHAR','constraint'=>64],
            'title' => ['type'=>'TEXT','null'=>true],
            'body' => ['type'=>'MEDIUMTEXT','null'=>true],
            'date' => ['type'=>'DATE','null'=>true],
            'cat' => ['type'=>'VARCHAR','constraint'=>16,'default'=>'notice'],
            'pinned' => ['type'=>'TINYINT','constraint'=>1,'default'=>0],
            'published' => ['type'=>'TINYINT','constraint'=>1,'default'=>1],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('notices', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('notices', true);
    }
}
