<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * products.catalog — 제품 카탈로그 PDF 주소 (관리자 제품 폼에서 업로드, 상세 'Tải catalogue (PDF)' 버튼이 연다).
 * 스키마 가드 v8.
 */
class AddCatalogToProducts extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('products')) return;
        if (! in_array('catalog', $this->db->getFieldNames('products'), true)) {
            $this->forge->addColumn('products', [
                'catalog' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true, 'after' => 'video'],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'catalog');
    }
}
