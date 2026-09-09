<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 제휴(CTV) 데모 데이터 — 사이트를 채워 보기 위한 가짜 마케터·리드·클릭·출금 + 실제 제품 3개의 캠페인.
 * (2026-09-09 지시: "데모 데이터가 기본 상태, 나중에 삭제")
 * 데모 행 표식: aff_marketers.memo = 'DEMO' (이메일 demo*@makenov.com). 삭제는 관리자 제휴 탭 > 설정 >
 * "데모 데이터 삭제" (Aff::adminDeleteDemo) 또는 이 마이그레이션의 down().
 * 캠페인(aff_campaigns)은 실제 제품에 붙는 설정이라 삭제 대상이 아니다 — 관리자에서 고쳐 쓰면 된다.
 */
class SeedAffDemo extends Migration
{
    private const DEMO_MARKETERS = [
        ['DEMO01', 'demo@makenov.com',  'Nguyễn Văn A', '0901 234 567', 'Vietcombank', '0123456789', 'NGUYEN VAN A'],
        ['DEMO02', 'demo2@makenov.com', 'Trần Thị B',   '0902 111 222', 'Techcombank', '19031234567', 'TRAN THI B'],
        ['DEMO03', 'demo3@makenov.com', 'Lê Văn C',     '0903 333 444', 'MB Bank',     '0011223344', 'LE VAN C'],
        ['DEMO04', 'demo4@makenov.com', 'Phạm Thị D',   '0904 555 666', 'ACB',         '223344556', 'PHAM THI D'],
        ['DEMO05', 'demo5@makenov.com', 'Hoàng Văn E',  '0905 777 888', 'VPBank',      '3344556677', 'HOANG VAN E'],
        ['DEMO06', 'demo6@makenov.com', 'Võ Thị F',     '0906 999 000', 'BIDV',        '4455667788', 'VO THI F'],
        ['DEMO07', 'demo7@makenov.com', 'Đặng Văn G',   '0907 121 212', 'Vietinbank',  '5566778899', 'DANG VAN G'],
        ['DEMO08', 'demo8@makenov.com', 'Bùi Thị H',    '0908 232 323', 'Sacombank',   '6677889900', 'BUI THI H'],
    ];
    /* 제품별 캠페인 — 실제 제품 id (p9 발크림 · p11 스킨부스터 · p0 소화덮개) */
    private const CAMPAIGNS = [
        ['p9', 150000, 100, 'Kem dưỡng gót chân bán chạy tại Hàn Quốc',
         ['kem dưỡng gót chân', 'nứt gót chân', 'mỹ phẩm Hàn Quốc', 'nguồn hàng Hàn Quốc', 'sỉ mỹ phẩm', 'nhà phân phối mỹ phẩm'],
         'Kem dưỡng chân 3WB Gounbal (Hàn Quốc) — làm mềm da chai sần, nứt gót chân. Hàng chính hãng từ nhà sản xuất, tìm nhà phân phối tại Việt Nam. Xem giá & MOQ sau khi xác thực doanh nghiệp (miễn phí).',
         "- Không cam kết công dụng ngoài mô tả của nhà sản xuất\n- Không dùng hình ảnh bác sĩ, bệnh viện\n- Link phải giữ nguyên mã CTV (?ref=)", 1],
        ['p11', 250000, null, 'Skinbooster PDRN thực vật 100.000 ppm cho spa & clinic',
         ['skinbooster', 'PDRN', 'mỹ phẩm spa', 'clinic thẩm mỹ', 'nguồn hàng spa Hàn Quốc', 'sỉ skinbooster'],
         'MIRALET Phyto Intensive Skinbooster — PDRN nguồn gốc thực vật 100.000 ppm, 4 ống × 2,0 ml. Nhà sản xuất Hàn Quốc tìm nhà phân phối cho spa, clinic tại Việt Nam.',
         "- Chỉ giới thiệu tới spa, clinic, nhà phân phối mỹ phẩm\n- Không quảng cáo là thuốc hoặc tiêm\n- Link phải giữ nguyên mã CTV (?ref=)", 2],
        ['p0', 200000, 50, 'Chăn chữa cháy xe điện cho bãi đỗ, trạm sạc, kho',
         ['chăn chữa cháy', 'cháy xe điện', 'PCCC', 'trạm sạc xe điện', 'bãi đỗ xe ngầm', 'thiết bị PCCC Hàn Quốc'],
         'FIRESSAK FS-EV54S — chăn chữa cháy cách ly oxy cho xe điện. Phù hợp bãi đỗ ngầm, trạm sạc, kho logistics. Nhà sản xuất Hàn Quốc (IATF 16949) tìm nhà phân phối tại Việt Nam.',
         "- Đối tượng: công ty PCCC, bãi đỗ, trạm sạc, đội xe doanh nghiệp\n- Không cam kết dập tắt hoàn toàn\n- Link phải giữ nguyên mã CTV (?ref=)", 3],
    ];
    private const REJECT_REASONS = ['Trùng với khách hàng đã có trong hệ thống', 'Thông tin liên hệ không đúng', 'Người gửi không phải cửa hàng, đại lý'];

    public function up()
    {
        $db  = $this->db;
        if (! $db->tableExists('aff_marketers') || $db->table('aff_marketers')->where('code', 'DEMO01')->countAllResults()) {
            return;   // 테이블 없거나 이미 심어져 있음
        }
        $now = date('Y-m-d H:i:s');
        $ago = static fn (int $d, int $h = 10) => date('Y-m-d H:i:s', strtotime("-{$d} days {$h}:00"));
        $uuid = static function (): string {
            $b = random_bytes(16);
            $b[6] = chr((ord($b[6]) & 0x0F) | 0x40);
            $b[8] = chr((ord($b[8]) & 0x3F) | 0x80);
            return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
        };

        /* 캠페인 — 없는 제품만 */
        foreach (self::CAMPAIGNS as [$pid, $cpa, $cap, $head, $kw, $copy, $rules, $sort]) {
            if ($db->table('aff_campaigns')->where('product_id', $pid)->countAllResults()) {
                continue;
            }
            $db->table('aff_campaigns')->insert([
                'product_id' => $pid, 'cpa_vnd' => $cpa, 'cap' => $cap, 'headline' => $head,
                'materials' => '[]', 'copy_text' => $copy, 'keywords' => json_encode($kw, JSON_UNESCAPED_UNICODE), 'rules' => $rules,
                'featured' => 1, 'sort' => $sort, 'active' => 1, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        /* 마케터 8명 */
        $ids = [];
        foreach (self::DEMO_MARKETERS as $i => [$code, $email, $name, $phone, $bank, $acc, $holder]) {
            $id = $uuid(); $ids[$code] = $id;
            $db->table('aff_marketers')->insert([
                'id' => $id, 'code' => $code, 'email' => $email, 'password_hash' => password_hash('demo1234', PASSWORD_DEFAULT),
                'name' => $name, 'phone' => $phone, 'zalo' => $phone, 'bank_name' => $bank, 'bank_account' => $acc, 'bank_holder' => $holder,
                'status' => 'active', 'memo' => 'DEMO', 'created_at' => $ago(40 - $i * 3), 'updated_at' => $now,
            ]);
        }

        /* 리드 — 마케터별 승인/대기/반려 개수 (승인률이 서로 다르게) */
        $plan = [ // code => [approved, pending, rejected]
            'DEMO01' => [12, 3, 2], 'DEMO02' => [19, 2, 3], 'DEMO03' => [9, 1, 1], 'DEMO04' => [15, 4, 4],
            'DEMO05' => [6, 2, 3],  'DEMO06' => [11, 0, 1], 'DEMO07' => [4, 3, 2], 'DEMO08' => [8, 1, 0],
        ];
        $pids = array_column(self::CAMPAIGNS, 0);
        $cpa  = array_combine($pids, array_column(self::CAMPAIGNS, 1));
        $chs  = ['fb', 'zalo', 'tiktok', 'copy', 'fb', 'zalo'];
        $n = 0;
        foreach ($plan as $code => [$ok, $pend, $rej]) {
            $rows = [];
            $mk = function (string $status, int $k) use (&$n, $code, $ids, $pids, $cpa, $chs, $ago, $uuid, $now): array {
                $pid = $pids[$n % 3]; $d = ($n * 5) % 27 + 1; $n++;
                return [
                    'id' => $uuid(), 'inquiry_id' => 'demo-' . substr(md5($code . $status . $k), 0, 24), 'marketer_id' => $ids[$code],
                    'product_id' => $pid, 'buyer_id' => null, 'ch' => $chs[$n % 6], 'status' => $status, 'amount_vnd' => $cpa[$pid],
                    'reject_reason' => $status === 'rejected' ? self::REJECT_REASONS[$k % 3] : null,
                    'decided_at' => $status === 'pending' ? null : $ago(max(0, $d - 1), 9),
                    'created_at' => $ago($d, 14), 'updated_at' => $now,
                ];
            };
            for ($k = 0; $k < $ok; $k++)   $rows[] = $mk('approved', $k);
            for ($k = 0; $k < $pend; $k++) $rows[] = $mk('pending', $k);
            for ($k = 0; $k < $rej; $k++)  $rows[] = $mk('rejected', $k);
            $db->table('aff_leads')->insertBatch($rows);
        }

        /* 클릭 — 30일치, 채널 섞어서 (같은 날 같은 기기 유일키라 ua_hash 를 바꿔 넣는다) */
        $clicks = [];
        foreach ($plan as $code => $p) {
            $base = ($p[0] + $p[1] + $p[2]);
            for ($d = 29; $d >= 0; $d--) {
                $cnt = (int) round($base * (0.15 + 0.12 * abs(sin($d * 1.7 + strlen($code)))));
                for ($k = 0; $k < $cnt; $k++) {
                    $clicks[] = [
                        'code' => $code, 'product_id' => $pids[($d + $k) % 3], 'ch' => $chs[($d * 3 + $k) % 6],
                        'day' => date('Y-m-d', strtotime("-{$d} days")), 'ua_hash' => md5($code . $d . $k), 'created_at' => $ago($d, 8 + $k % 12),
                    ];
                }
            }
        }
        foreach (array_chunk($clicks, 200) as $chunk) {
            $db->table('aff_clicks')->insertBatch($chunk);
        }

        /* 출금 — DEMO01 지급완료 1건 + DEMO02 신청중 1건 */
        $db->table('aff_withdrawals')->insertBatch([
            ['id' => $uuid(), 'marketer_id' => $ids['DEMO01'], 'amount_vnd' => 500000, 'bank_snapshot' => json_encode(['bank_name' => 'Vietcombank', 'bank_account' => '0123456789', 'bank_holder' => 'NGUYEN VAN A']),
             'status' => 'paid', 'memo' => '', 'paid_at' => $ago(5, 11), 'created_at' => $ago(6, 16), 'updated_at' => $now],
            ['id' => $uuid(), 'marketer_id' => $ids['DEMO02'], 'amount_vnd' => 1000000, 'bank_snapshot' => json_encode(['bank_name' => 'Techcombank', 'bank_account' => '19031234567', 'bank_holder' => 'TRAN THI B']),
             'status' => 'requested', 'memo' => '', 'paid_at' => null, 'created_at' => $ago(1, 9), 'updated_at' => $now],
        ]);
    }

    public function down()
    {
        $db = $this->db;
        $ids = array_column($db->table('aff_marketers')->select('id')->where('memo', 'DEMO')->get()->getResultArray(), 'id');
        $codes = array_column($db->table('aff_marketers')->select('code')->where('memo', 'DEMO')->get()->getResultArray(), 'code');
        if ($ids) {
            $db->table('aff_leads')->whereIn('marketer_id', $ids)->delete();
            $db->table('aff_withdrawals')->whereIn('marketer_id', $ids)->delete();
            $db->table('aff_tokens')->whereIn('marketer_id', $ids)->delete();
            $db->table('aff_clicks')->whereIn('code', $codes)->delete();
            $db->table('aff_marketers')->whereIn('id', $ids)->delete();
        }
    }
}
