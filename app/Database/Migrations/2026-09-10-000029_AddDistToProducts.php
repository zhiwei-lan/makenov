<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * products.dist — 제품별 '유통 파트너 모집' 섹션 (2026-09-10 지시 "공통이 아니라 제품별로").
 * JSON: null=공통 문구(settings.site.pdDist) 그대로 / {"mode":"off"} 숨김 / {"mode":"custom","title":{ko,vi,en},"items":[{ko,vi,en}]}.
 * 스키마 가드 v7 (Aff::ensureSchema 가 첫 요청 때 돌린다).
 */
class AddDistToProducts extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('products')) return;
        $fields = $this->db->getFieldNames('products');
        if (! in_array('dist', $fields, true)) {
            $this->forge->addColumn('products', [
                'dist' => ['type' => 'MEDIUMTEXT', 'null' => true, 'after' => 'detail'],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'dist');
    }
}
