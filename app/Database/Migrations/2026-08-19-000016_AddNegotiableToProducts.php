<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * products.negotiable — '협의 가능' 배지.
 * 관리자 제품 폼에 체크박스가 있고 화면도 negotiable 배지를 그리지만,
 * 이관 때 컬럼이 빠져 저장이 조용히 버려지고 있었다(2026-08-19 관리자 점검).
 * 적용: php spark migrate
 */
class AddNegotiableToProducts extends Migration
{
    public function up()
    {
        $fields = $this->db->getFieldNames('products');
        if (! in_array('negotiable', $fields, true)) {
            $this->forge->addColumn('products', [
                'negotiable' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'after' => 'is_new'],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'negotiable');
    }
}
