<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 수정(1회) — DAEGU MADE KFESTA(hcm-20261203) 행사일이 12월 4일에서 12월 11일(금)로 바뀌었다(2026-10-09 사용자 지시).
 * visit_date 와 소개 문구(summary) 안의 날짜를 바꾼다. 일정 ID 는 링크(#trip-…)에 쓰이므로 그대로 둔다.
 * 신청 마감(deadline)은 지시가 없어 그대로 둔다.
 * 이미 12월 4일이 아니면(관리자가 고쳤으면) 아무것도 하지 않는다.
 * 적용: Api\Meet 스키마 가드 v19.
 */
class KfestaDateDec11 extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('meet_trips')) {
            return;
        }
        $row = $db->table('meet_trips')->where('id', 'hcm-20261203')->get()->getRowArray();
        if (! $row || (string) ($row['visit_date'] ?? '') !== '2026-12-04') {
            return;
        }
        $sum = json_decode((string) ($row['summary'] ?? '{}'), true) ?: [];
        $fix = ['ko' => ['12월 4일', '12월 11일'], 'vi' => ['4/12', '11/12'], 'en' => ['December 4', 'December 11']];
        foreach ($fix as $lang => [$from, $to]) {
            if (isset($sum[$lang]) && is_string($sum[$lang])) {
                $sum[$lang] = str_replace($from, $to, $sum[$lang]);
            }
        }
        $db->table('meet_trips')->where('id', 'hcm-20261203')->update([
            'visit_date' => '2026-12-11',
            'summary'    => json_encode((object) $sum, JSON_UNESCAPED_UNICODE),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function down()
    {
        // 데이터 수정은 되돌리지 않는다
    }
}
