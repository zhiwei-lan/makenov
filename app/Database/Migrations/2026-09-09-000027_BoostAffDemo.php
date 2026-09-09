<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데모 랭킹 상위권 부풀리기 — 1위 약 2,000만 ₫ 로 시작(2026-09-09 지시 "초반엔 1등 2000만동").
 * memo='DEMO' 마케터에게 p11(상한 없음, 250,000 ₫) 승인 리드를 이달 날짜로 추가한다.
 * 데모 삭제(관리자 제휴 탭 > 설정)로 함께 지워진다. 스키마 가드 v5.
 */
class BoostAffDemo extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('aff_leads')) return;
        $plan = ['DEMO02' => 76, 'DEMO04' => 44, 'DEMO01' => 28, 'DEMO03' => 18, 'DEMO06' => 12, 'DEMO08' => 8, 'DEMO05' => 5, 'DEMO07' => 3];
        $rows = [];
        $now = date('Y-m-d H:i:s');
        $uuid = static function (): string {
            $b = random_bytes(16);
            $b[6] = chr((ord($b[6]) & 0x0F) | 0x40);
            $b[8] = chr((ord($b[8]) & 0x3F) | 0x80);
            return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
        };
        $dayOfMonth = max(1, (int) date('j') - 1);
        foreach ($plan as $code => $n) {
            $m = $db->table('aff_marketers')->select('id')->where('code', $code)->where('memo', 'DEMO')->get()->getRowArray();
            if (! $m) continue;
            if ($db->table('aff_leads')->where('marketer_id', $m['id'])->like('inquiry_id', 'demo-boost-', 'after')->countAllResults()) continue;
            for ($k = 0; $k < $n; $k++) {
                $d = $k % $dayOfMonth;   // 이달 1일~어제 사이에 고루
                $created = date('Y-m-d', strtotime("-{$d} days")) . ' 1' . ($k % 8) . ':00:00';
                $rows[] = [
                    'id' => $uuid(), 'inquiry_id' => 'demo-boost-' . substr(md5($code . $k), 0, 18), 'marketer_id' => $m['id'],
                    'product_id' => 'p11', 'buyer_id' => null, 'ch' => ['fb', 'zalo', 'tiktok'][$k % 3], 'status' => 'approved', 'amount_vnd' => 250000,
                    'reject_reason' => null, 'decided_at' => date('Y-m-d H:i:s', strtotime($created . ' +1 day')), 'created_at' => $created, 'updated_at' => $now,
                ];
            }
        }
        foreach (array_chunk($rows, 100) as $chunk) $db->table('aff_leads')->insertBatch($chunk);
    }

    public function down()
    {
        $this->db->table('aff_leads')->like('inquiry_id', 'demo-boost-', 'after')->delete();
    }
}
