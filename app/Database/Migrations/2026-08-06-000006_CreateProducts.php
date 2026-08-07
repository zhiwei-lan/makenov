<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * products — Supabase 스키마(supabase/01_schema.sql 계열)를 MySQL 5.6 으로 옮긴 것.
 * jsonb 컬럼은 TEXT 에 JSON 문자열로 저장한다 (MySQL 5.6 은 JSON 타입이 없다).
 * 외래키는 가이드라인대로 논리 외래키만 쓴다 (DB 제약 없음).
 */
class CreateProducts extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type'=>'VARCHAR','constraint'=>64],
            'company_id' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'cat' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'brand' => ['type'=>'VARCHAR','constraint'=>255,'null'=>true],
            'origin' => ['type'=>'VARCHAR','constraint'=>64,'null'=>true],
            'name' => ['type'=>'TEXT','null'=>true],
            'tagline' => ['type'=>'TEXT','null'=>true],
            'brand_story' => ['type'=>'TEXT','null'=>true],
            'img' => ['type'=>'TEXT','null'=>true],
            'gallery' => ['type'=>'TEXT','null'=>true],
            'video' => ['type'=>'TEXT','null'=>true],
            'detail' => ['type'=>'MEDIUMTEXT','null'=>true],
            'inquiries' => ['type'=>'INT','default'=>0],
            'views' => ['type'=>'INT','default'=>0],
            'wish_count' => ['type'=>'INT','default'=>0],
            'featured' => ['type'=>'TINYINT','constraint'=>1,'default'=>0],
            'is_new' => ['type'=>'TINYINT','constraint'=>1,'default'=>0],
            'published' => ['type'=>'TINYINT','constraint'=>1,'default'=>1],
            'created_at' => ['type'=>'DATETIME','null'=>true],
            'updated_at' => ['type'=>'DATETIME','null'=>true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('cat');
        $this->forge->addKey('company_id');
        $this->forge->createTable('products', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('products', true);
    }
}
