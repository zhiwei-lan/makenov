<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 입력(1회) — DAEGU MADE KFESTA(hcm-20261203) 행사 시간 09:00–15:00 (2026-10-03 사용자 지정).
 * 시간이 이미 들어 있으면(관리자가 넣었으면) 아무것도 하지 않는다.
 * 적용: Api\Meet 스키마 가드 v8.
 */
class KfestaTime extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('meet_trips')) {
            return;
        }
        $this->db->table('meet_trips')
            ->where('id', 'hcm-20261203')
            ->groupStart()->where('time_start', null)->orWhere('time_start', '')->groupEnd()
            ->update(['time_start' => '09:00', 'time_end' => '15:00', 'updated_at' => date('Y-m-d H:i:s')]);
    }

    public function down()
    {
        // 데이터 입력은 되돌리지 않는다
    }
}
