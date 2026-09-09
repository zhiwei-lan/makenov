<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데모 캠페인 문구에서 '한국 제조사/한국 제품' 프레임 제거 (2026-09-10 지시 "언제부터 한국제품이었냐").
 * 글로벌 공급사 플랫폼이므로 제조사·브랜드·성분만 말한다. 관리자가 이미 고친 문구는 건드리지 않는다
 * (Hàn Quốc 가 들어 있는 시드 원문일 때만 교체). 스키마 가드 v6.
 */
class AffDemoCopyNoKorea extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('aff_campaigns')) return;
        $rows = [
            'p9' => [
                'headline'  => 'Kem dưỡng gót chân bán chạy, tìm nhà phân phối',
                'keywords'  => ['kem dưỡng gót chân', 'nứt gót chân', 'mỹ phẩm nhập khẩu', 'nguồn hàng mỹ phẩm', 'sỉ mỹ phẩm', 'nhà phân phối mỹ phẩm'],
                'copy_text' => 'Kem dưỡng chân 3WB Gounbal — làm mềm da chai sần, nứt gót chân. Hàng chính hãng từ nhà sản xuất, tìm nhà phân phối tại Việt Nam. Xem giá & MOQ sau khi xác thực doanh nghiệp (miễn phí).',
            ],
            'p11' => [
                'keywords'  => ['skinbooster', 'PDRN', 'mỹ phẩm spa', 'clinic thẩm mỹ', 'nguồn hàng spa', 'sỉ skinbooster'],
                'copy_text' => 'MIRALET Phyto Intensive Skinbooster — PDRN nguồn gốc thực vật 100.000 ppm, 4 ống × 2,0 ml. Nhà sản xuất tìm nhà phân phối cho spa, clinic tại Việt Nam.',
            ],
            'p0' => [
                'keywords'  => ['chăn chữa cháy', 'cháy xe điện', 'PCCC', 'trạm sạc xe điện', 'bãi đỗ xe ngầm', 'thiết bị PCCC'],
                'copy_text' => 'FIRESSAK FS-EV54S — chăn chữa cháy cách ly oxy cho xe điện. Phù hợp bãi đỗ ngầm, trạm sạc, kho logistics. Nhà sản xuất (IATF 16949) tìm nhà phân phối tại Việt Nam.',
            ],
        ];
        foreach ($rows as $pid => $r) {
            $cur = $db->table('aff_campaigns')->where('product_id', $pid)->get()->getRowArray();
            if (! $cur) continue;
            $blob = ($cur['copy_text'] ?? '') . ' ' . ($cur['headline'] ?? '') . ' ' . ($cur['keywords'] ?? '');
            if (mb_strpos($blob, 'Hàn Quốc') === false) continue; // 관리자가 이미 손본 문구는 유지
            $set = ['copy_text' => $r['copy_text'], 'keywords' => json_encode($r['keywords'], JSON_UNESCAPED_UNICODE), 'updated_at' => date('Y-m-d H:i:s')];
            if (isset($r['headline'])) $set['headline'] = $r['headline'];
            $db->table('aff_campaigns')->where('product_id', $pid)->update($set);
        }
    }

    public function down()
    {
        // 문구 되돌리기는 하지 않는다 (시드 000024 참고)
    }
}
