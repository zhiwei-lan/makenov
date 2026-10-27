<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * profiles.card_notified_at — 명함 등록 안내 메일을 보낸 시각.
 * 관리자가 "명함 안내 메일" 버튼을 여러 번 눌러도 같은 사람에게 두 번 가지 않게 한다.
 * 적용: Api\Cards 스키마 가드 v2.
 */
class AddCardNotifiedAtToProfiles extends Migration
{
    public function up()
    {
        if ($this->db->tableExists('profiles')
            && ! in_array('card_notified_at', $this->db->getFieldNames('profiles'), true)) {
            $this->forge->addColumn('profiles', [
                'card_notified_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->tableExists('profiles')
            && in_array('card_notified_at', $this->db->getFieldNames('profiles'), true)) {
            $this->forge->dropColumn('profiles', 'card_notified_at');
        }
    }
}
