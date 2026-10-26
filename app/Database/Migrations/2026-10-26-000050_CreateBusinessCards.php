<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * business_cards — 명함 원본과 인식 결과. 바이어(profiles)·공급사(companies) 양쪽에 붙는다.
 * ------------------------------------------------------------
 * 비전: makenov = 한-베 B2B 리멤버. 명함은 "이 담당자가 실제로 있다"는 소프트 신뢰다.
 * 회사가 실재한다는 하드 신뢰는 기존 사업자 인증(profiles.status)이 담당한다.
 *
 * ⚠ 원본 이미지는 public/uploads 가 아니라 웹 루트 밖(CardStorage)에 둔다.
 *   명함에는 실명·전화·이메일이 있어 공개 URL 로 서빙하면 그대로 유출된다.
 *   조회는 만료되는 서명 링크로만 한다 (Api\Cards::image).
 *
 * source 가 신뢰의 근거다 — self(본인 등록) 와 staff(운영팀 수집) 를 섞지 않는다.
 * 공급사는 계정이 없으므로 공급사 명함은 언제나 staff 다 (2026-10-26 결정).
 *
 * owner_id 가 VARCHAR 인 이유: makenov 의 PK 는 UUID(profiles)·텍스트(companies) 다.
 * JSON 컬럼은 TEXT 에 JSON 문자열 (MySQL 5.6 호환, Rest.php 규약과 동일).
 *
 * 적용: Api\Cards 스키마 가드 (deploy.yml 이 migrate 를 돌리지 않는다).
 */
class CreateBusinessCards extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('business_cards')) {
            $this->forge->addField([
                'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
                'owner_type'      => ['type' => 'VARCHAR', 'constraint' => 16],        // profile | company
                'owner_id'        => ['type' => 'VARCHAR', 'constraint' => 64],
                'image_key'       => ['type' => 'VARCHAR', 'constraint' => 180, 'null' => true],
                'image_mime'      => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
                'image_bytes'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
                'ocr_status'      => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'pending'],
                'ocr_provider'    => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
                'ocr_raw'         => ['type' => 'TEXT', 'null' => true],
                'ocr_error'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
                'fields'          => ['type' => 'TEXT', 'null' => true],
                'source'          => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'self'],   // self | staff
                'uploaded_by'     => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
                'verified_by'     => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
                'verified_at'     => ['type' => 'DATETIME', 'null' => true],
                'idempotency_key' => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
                'created_at'      => ['type' => 'DATETIME', 'null' => true],
                'updated_at'      => ['type' => 'DATETIME', 'null' => true],
                'deleted_at'      => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->addKey(['owner_type', 'owner_id']);
            $this->forge->addKey('ocr_status');
            $this->forge->addUniqueKey('idempotency_key');
            $this->forge->createTable('business_cards', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
        }

        /* profiles — 명함 확인 배지 + 매칭 데이터(취급 품목·채널·수입 경험·구매 규모).
           명함에는 매칭에 쓸 정보가 없다. 명함은 입구일 뿐이고 매칭은 이 컬럼들로 한다. */
        if ($this->db->tableExists('profiles')) {
            $have = $this->db->getFieldNames('profiles');
            $add  = [];
            if (! in_array('card_verified_at', $have, true))  $add['card_verified_at']  = ['type' => 'DATETIME', 'null' => true];
            if (! in_array('categories', $have, true))        $add['categories']        = ['type' => 'TEXT', 'null' => true];
            if (! in_array('channels', $have, true))          $add['channels']          = ['type' => 'TEXT', 'null' => true];
            if (! in_array('import_experience', $have, true)) $add['import_experience'] = ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true];
            if (! in_array('purchase_scale', $have, true))    $add['purchase_scale']    = ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true];
            if ($add !== []) {
                $this->forge->addColumn('profiles', $add);
            }
        }

        /* companies — 공급사도 담당자 명함 확인 배지를 가진다 (운영팀이 대신 올린다) */
        if ($this->db->tableExists('companies')
            && ! in_array('card_verified_at', $this->db->getFieldNames('companies'), true)) {
            $this->forge->addColumn('companies', [
                'card_verified_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropTable('business_cards', true);
        foreach (['card_verified_at', 'categories', 'channels', 'import_experience', 'purchase_scale'] as $c) {
            if ($this->db->tableExists('profiles') && in_array($c, $this->db->getFieldNames('profiles'), true)) {
                $this->forge->dropColumn('profiles', $c);
            }
        }
        if ($this->db->tableExists('companies') && in_array('card_verified_at', $this->db->getFieldNames('companies'), true)) {
            $this->forge->dropColumn('companies', 'card_verified_at');
        }
    }
}
