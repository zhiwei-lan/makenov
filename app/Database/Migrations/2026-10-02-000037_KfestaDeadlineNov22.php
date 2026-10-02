<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 수정(1회) — DAEGU MADE KFESTA(hcm-20261203) 신청 마감일 11월 19일 → 11월 22일(2026-10-02 사용자 지정).
 * 이미 11월 19일이 아니면(관리자가 고쳤으면) 아무것도 하지 않는다.
 * 적용: Api\Meet 스키마 가드 v7.
 */
class KfestaDeadlineNov22 extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('meet_trips')) {
            return;
        }
        $this->db->table('meet_trips')
            ->where('id', 'hcm-20261203')->where('deadline', '2026-11-19')
            ->update(['deadline' => '2026-11-22', 'updated_at' => date('Y-m-d H:i:s')]);
    }

    public function down()
    {
        // 데이터 수정은 되돌리지 않는다
    }
}
