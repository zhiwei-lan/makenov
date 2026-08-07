<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * columns_post — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateColumnsPost extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'VARCHAR','constraint'=>64],
            'cat' => ['type'=>'TEXT','null'=>true],
            'title' => ['type'=>'TEXT','null'=>true],
            'excerpt' => ['type'=>'TEXT','null'=>true],
            'body' => ['type'=>'MEDIUMTEXT','null'=>true],
            'img' => ['type'=>'TEXT','null'=>true],
            'date' => ['type'=>'DATE','null'=>true],
            'slug' => ['type'=>'VARCHAR','constraint'=>190,'null'=>true],
            'seo_title' => ['type'=>'TEXT','null'=>true],
            'seo_desc' => ['type'=>'TEXT','null'=>true],
            'published' => ['type'=>'TINYINT','constraint'=>1,'default'=>1],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->createTable('columns_post', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('columns_post', true);
    }
}
