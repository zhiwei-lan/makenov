<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * aff_marketers.channel — 마케터가 홍보하는 채널 링크(TikTok·Facebook·YouTube 프로필 등).
 * 가입 폼에서 받아 관리자가 리드 심사 때 누구인지 본다 (2026-09-09 지시).
 * 적용: Api\Aff 스키마 가드(SCHEMA_VER 3) 또는 php spark migrate
 */
class AddChannelToAffMarketers extends Migration
{
    public function up()
    {
        if (! in_array('channel', $this->db->getFieldNames('aff_marketers'), true)) {
            $this->forge->addColumn('aff_marketers', ['channel' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'after' => 'zalo']]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('aff_marketers', 'channel');
    }
}
