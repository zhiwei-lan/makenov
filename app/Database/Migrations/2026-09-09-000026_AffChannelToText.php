<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/** aff_marketers.channel — 채널 여러 개(JSON 배열)를 담도록 VARCHAR(255) → TEXT (2026-09-09). 스키마 가드 v4 */
class AffChannelToText extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('aff_marketers', ['channel' => ['name' => 'channel', 'type' => 'TEXT', 'null' => true]]);
    }

    public function down()
    {
        $this->forge->modifyColumn('aff_marketers', ['channel' => ['name' => 'channel', 'type' => 'VARCHAR', 'constraint' => 255, 'null' => true]]);
    }
}
