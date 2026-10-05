<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 데이터 교정(1회) — 제품 상세 '유통 파트너를 찾습니다' 항목의 한국어·영어(2026-10-05 전체 점검).
 * 관리자가 베트남어만 제품에 맞게 고쳐 써서, 한국어·영어에는 옛 기본 문구
 * ("사업자 인증 후 가격·MOQ 즉시 공개", "오른쪽 문의 버튼으로 견적 요청" 등)가 그대로 남아 있었다.
 *   - 제품 p0 · p1 · p11: 한국어가 옛 기본 문구인 줄만, 그 줄의 베트남어 뜻에 맞춰 한국어·영어를 넣는다.
 *   - 제품 p3 4번째 줄: '유리 매장'(안경원 오역) 교정.
 *   - 공통 설정 settings(site).pdDist: 같은 이유로 한국어·영어를 베트남어 뜻에 맞춘다(지금은 모든 제품이 제품별 항목을 써서 화면에는 안 나온다).
 * 적용: Api\Meet 스키마 가드 v17.
 */
class DistItemsKoEn extends Migration
{
    private const OLD_KO = [
        '한국 제조사 직공급, 중간 유통 없음',
        '유통 파트너에게 제품 이미지·콘텐츠·영업 자료 지원',
        '사업자 인증 후 가격·MOQ 즉시 공개 (무료)',
        '오른쪽 문의 버튼으로 견적 요청, 영업일 1~2일 내 회신',
    ];

    public function up()
    {
        $db  = $this->db;
        $fix = json_decode(<<<'JSON'
{
 "products": {
  "p0": [
   {
    "ko": "소방(PCCC) 솔루션 유통사·시공사",
    "en": "Fire-safety solution distributors and installers"
   },
   {
    "ko": "전기차 충전소 설치 업체·주차장 운영사",
    "en": "EV charging station installers and parking operators"
   },
   {
    "ko": "주유소 체인, 정비 센터, 건물 관리 업체",
    "en": "Fuel station chains, service centers and building managers"
   },
   {
    "ko": "FDI 공장, 리튬 배터리 창고, 물류·운송 업체",
    "en": "FDI factories, lithium battery warehouses, logistics and transport companies"
   }
  ],
  "p1": [
   {
    "ko": "업소용 주방 설비·인덕션·가열 기기 공급·유통사",
    "en": "Suppliers and distributors of commercial kitchen equipment, induction cookers and heating appliances"
   },
   {
    "ko": "라면·즉석식품·K-푸드 제조·유통 기업",
    "en": "Manufacturers and distributors of noodles, instant food and K-Food"
   },
   {
    "ko": "한국 식품 수입·유통사, 슈퍼마켓 체인, 한국 상품 매장",
    "en": "Korean food importers and distributors, supermarket chains and Korean goods stores"
   },
   {
    "ko": "이커머스 파트너, F&B 설비 판매사, 한국 설비 수입·구매 대행 업체",
    "en": "E-commerce partners, F&B equipment sellers and importers of Korean equipment"
   }
  ],
  "p11": [
   {
    "ko": "K-뷰티·집중 피부 관리 전문 페이셜 스파·메디컬 스파 (레이저·필링·MTS 시술 보유)",
    "en": "Facial and medical spas specializing in K-Beauty and intensive skincare, offering laser, peel or MTS treatments"
   },
   {
    "ko": "시술 후 진정·회복 관리 제품이 필요한 에스테틱·피부과 클리닉",
    "en": "Aesthetic centers and dermatology clinics needing post-treatment soothing and recovery products"
   },
   {
    "ko": "스파·에스테틱·더마코스메틱·K-뷰티 채널 전문 화장품 수입·유통사",
    "en": "Cosmetics importers and distributors focused on spa, aesthetic, dermacosmetic and K-Beauty channels"
   },
   {
    "ko": "쇼피·틱톡숍 셀러와 온라인 화장품 유통 역량을 갖춘 이커머스 파트너",
    "en": "Shopee and TikTok Shop sellers and e-commerce partners able to distribute cosmetics online"
   }
  ]
 },
 "site": [
  {
   "ko": "한국 화장품 수입·유통사",
   "en": "Importers and distributors of Korean cosmetics"
  },
  {
   "ko": "화장품·퍼스널케어·K-뷰티 매장 체인",
   "en": "Cosmetics, personal care and K-beauty store chains"
  },
  {
   "ko": "약국, 웰니스·헬스케어 체인",
   "en": "Pharmacies and wellness or healthcare chains"
  },
  {
   "ko": "이커머스·온라인 판매 파트너",
   "en": "E-commerce and online sales partners"
  }
 ],
 "p3_3": {
  "ko": "티타늄·스테인리스 등 고급 소재 제품을 전문으로 판매하는 안경원·부티크",
  "en": "Optical shops and boutiques specializing in premium materials such as titanium and stainless steel"
 }
}
JSON, true);
        if (! is_array($fix)) {
            return;
        }
        $enc = static fn ($v) => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($db->tableExists('products') && in_array('dist', $db->getFieldNames('products'), true)) {
            foreach ($fix['products'] as $pid => $rows) {
                $p = $db->table('products')->select('id, dist')->where('id', $pid)->get()->getRowArray();
                $d = $p ? json_decode((string) ($p['dist'] ?? ''), true) : null;
                if (! is_array($d) || empty($d['items']) || ! is_array($d['items'])) {
                    continue;
                }
                $changed = false;
                foreach ($d['items'] as $i => $it) {
                    if (isset($rows[$i]) && is_array($it) && in_array((string) ($it['ko'] ?? ''), self::OLD_KO, true)) {
                        $d['items'][$i]['ko'] = $rows[$i]['ko'];
                        $d['items'][$i]['en'] = $rows[$i]['en'];
                        $changed = true;
                    }
                }
                if ($changed) {
                    $db->table('products')->where('id', $pid)->update(['dist' => $enc($d)]);
                }
            }
            $p = $db->table('products')->select('id, dist')->where('id', 'p3')->get()->getRowArray();
            $d = $p ? json_decode((string) ($p['dist'] ?? ''), true) : null;
            if (is_array($d) && isset($d['items'][3]['ko']) && strpos((string) $d['items'][3]['ko'], '유리 매장') !== false) {
                $d['items'][3]['ko'] = $fix['p3_3']['ko'];
                $d['items'][3]['en'] = $fix['p3_3']['en'];
                $db->table('products')->where('id', 'p3')->update(['dist' => $enc($d)]);
            }
        }

        if ($db->tableExists('settings')) {
            $row = $db->table('settings')->where('key', 'site')->get()->getRowArray();
            $v   = $row ? json_decode((string) ($row['value'] ?? ''), true) : null;
            if (is_array($v) && ! empty($v['pdDist']['items']) && is_array($v['pdDist']['items'])) {
                $changed = false;
                foreach ($v['pdDist']['items'] as $i => $it) {
                    if (isset($fix['site'][$i]) && is_array($it) && in_array((string) ($it['ko'] ?? ''), self::OLD_KO, true)) {
                        $v['pdDist']['items'][$i]['ko'] = $fix['site'][$i]['ko'];
                        $v['pdDist']['items'][$i]['en'] = $fix['site'][$i]['en'];
                        $changed = true;
                    }
                }
                if ($changed) {
                    $db->table('settings')->where('key', 'site')->update(['value' => $enc($v)]);
                }
            }
        }
    }

    public function down()
    {
        // 데이터 교정이라 되돌리지 않는다.
    }
}
