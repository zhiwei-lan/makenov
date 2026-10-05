<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 교정(1회) — 훈성산업 로고 파일을 워드마크만 남긴 새 파일로 교체(2026-10-05).
 * 처음 올린 파일은 위에 작은 한글 문구가 같이 있어 작은 상자에서 잘려 보였다. 파일명을 바꿔 브라우저 캐시도 피한다.
 * 000044 가 넣은 주소 그대로일 때만 바꾼다. 적용: Api\Meet 스키마 가드 v15.
 */
class HoonsungLogoFile extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('companies')) {
            return;
        }
        $db->table('companies')
            ->where('id', 'hoonsung')
            ->where('logo', 'https://makenov.com/assets/img/companies/hoonsung.png')
            ->update(['logo' => 'https://makenov.com/assets/img/companies/hoonsung-wordmark.png']);
    }

    public function down()
    {
        // 데이터 교정이라 되돌리지 않는다.
    }
}
