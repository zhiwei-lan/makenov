<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 이동(1회) — DAEGU MADE KFESTA(hcm-20261203, 12월 3일)에 묶여 있던 공급사 중
 * 쿡인페이퍼(p1)·미라렛(p11)·고운발(p9)은 12월 3일에 오는 게 아니라 방문일 미정이다(2026-10-01 사용자 확인).
 * → '일정 미정' 일정(tbd-2026, visit_date NULL)을 만들어 그 3곳과 그 신청(임시 신청 포함)을 옮긴다.
 * KFESTA 에는 파이어싹(p0)·세광(p2)만 남는다.
 * 여러 번 돌아도 안전하다: 옮길 공급사가 KFESTA 에 더 없으면 아무것도 하지 않는다.
 * 적용: Api\Meet 스키마 가드 v4.
 */
class SplitKfestaUndated extends Migration
{
    private const FROM = 'hcm-20261203';
    private const TO   = 'tbd-2026';
    private const MOVE = ['p1', 'p11', 'p9'];

    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('meet_trips') || ! $db->tableExists('meet_requests')) {
            return;
        }
        $from = $db->table('meet_trips')->where('id', self::FROM)->get()->getRowArray();
        if (! $from) {
            return;
        }
        $items = json_decode((string) ($from['items'] ?? '[]'), true) ?: [];
        $keep  = [];
        $moved = [];
        foreach ($items as $it) {
            if (in_array((string) ($it['product_id'] ?? ''), self::MOVE, true)) {
                $moved[] = $it;
            } else {
                $keep[] = $it;
            }
        }
        if (! $moved) {
            return;   // 이미 옮겼다
        }
        $now = date('Y-m-d H:i:s');
        $to  = $db->table('meet_trips')->where('id', self::TO)->get()->getRowArray();
        if ($to) {
            $have = json_decode((string) ($to['items'] ?? '[]'), true) ?: [];
            $ids  = array_column($have, 'product_id');
            foreach ($moved as $it) {
                if (! in_array($it['product_id'], $ids, true)) {
                    $have[] = $it;
                }
            }
            $db->table('meet_trips')->where('id', self::TO)->update([
                'items' => json_encode($have, JSON_UNESCAPED_UNICODE), 'updated_at' => $now,
            ]);
        } else {
            $db->table('meet_trips')->insert([
                'id'         => self::TO,
                'title'      => json_encode([
                    'ko' => '한국 공급사 미팅 · 일정 미정',
                    'vi' => 'Gặp nhà cung cấp Hàn Quốc · Chưa định ngày',
                    'en' => 'Korean supplier meetings · Date TBD',
                ], JSON_UNESCAPED_UNICODE),
                'city'       => '{}',
                'venue'      => '{}',
                'summary'    => '{}',
                'visit_date' => null,
                'visit_end'  => null,
                'deadline'   => null,
                'items'      => json_encode($moved, JSON_UNESCAPED_UNICODE),
                'status'     => 'open',
                'published'  => 1,
                'sort'       => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        $db->table('meet_trips')->where('id', self::FROM)->update([
            'items' => json_encode($keep, JSON_UNESCAPED_UNICODE), 'updated_at' => $now,
        ]);
        $db->table('meet_requests')->where('trip_id', self::FROM)->whereIn('product_id', self::MOVE)
            ->update(['trip_id' => self::TO, 'updated_at' => $now]);
    }

    public function down()
    {
        // 데이터 이동은 되돌리지 않는다
    }
}
