<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 교정(1회) — 공급사 회사명이 자동 번역돼 저장된 것을 원래 이름으로 되돌린다(2026-10-05 사용자 지시:
 * "회사명은 번역하지 말아야지"). 한국어 칸에 'LARGE' → '크기가 큰', 'COOK IN PAPER' → '종이로 요리하기' 가 들어가 있었다.
 * 번역된 값 그대로일 때만 바꾼다 — 관리자가 그사이 고친 값은 건드리지 않는다.
 * 관리자 공급사 폼도 회사명은 더 이상 자동 번역하지 않는다(admin.js saveCompany).
 * 적용: Api\Meet 스키마 가드 v11.
 */
class CompanyNamesUntranslated extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('companies')) {
            return;
        }
        $bad = ['크기가 큰', '종이로 요리하기'];
        foreach ($db->table('companies')->select('id, name')->get()->getResultArray() as $row) {
            $name = json_decode((string) ($row['name'] ?? ''), true);
            if (! is_array($name) || ! in_array((string) ($name['ko'] ?? ''), $bad, true)) {
                continue;
            }
            $orig = (string) (($name['vi'] ?? '') ?: ($name['en'] ?? ''));
            if ($orig === '') {
                continue;
            }
            $name['ko'] = $orig;
            $db->table('companies')->where('id', $row['id'])
                ->update(['name' => json_encode($name, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        }
    }

    public function down()
    {
        // 데이터 교정이라 되돌리지 않는다.
    }
}
