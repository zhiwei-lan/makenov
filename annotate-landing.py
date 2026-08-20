# -*- coding: utf-8 -*-
"""랜딩 3파일(index / ko / en)의 주요 문구에 data-mkl="키"를 심고,
   세 언어 기본값을 assets/js/landing-copy.js 의 LND 로 추출한다.

   편집 단위 결정 규칙
     · 텍스트가 든 요소 안이 '텍스트 + <br>' 뿐이면 요소에 data-mkl 속성 (줄바꿈 유지, _br=1)
     · 그 외(형제 태그·색 스팬·<br> 뒤 꼬리 텍스트)는 텍스트 노드만 <span data-mkl> 로 감싼다
   전제: 세 파일의 텍스트 노드 순서 동일(같은 템플릿 생성물, 258개 일치 확인).
   재실행 안전(이미 주석된 요소는 건너뜀). 랜딩 문구를 파일에서 직접 고쳤으면 재실행해 LND 재생성."""
import re, json

FILES = {'vi': 'public/index.html', 'ko': 'public/ko/index.html', 'en': 'public/en/index.html'}

KEYS = [
 ('hero.kick',  '베트남 유통 파트너 플랫폼'),
 ('hero.h1a',   '누구나 글로벌 혁신 제품의'),
 ('hero.h1b',   '공식 유통사가 될 수 있습니다'),
 ('hero.sub',   '아직 베트남에 들어오지 않은 제품의 유통 조건을 확인하고'),
 ('hero.cta1',  '제품 둘러보기'),
 ('hero.cta2',  '이용 가이드 보기'),
 ('stats.b1',   '가입 무료'),
 ('stats.b2',   '사업자 인증 약 1분'),
 ('stats.b3',   '가입·인증·문의 전부 무료'),
 ('stats.l1',   '등록 브랜드'),
 ('stats.l2',   '유통 파트너 가입'),
 ('stats.l3',   '누적 상담 문의'),
 ('cat.h',      '내 판매 채널에 맞는 혁신 제품을,'),
 ('cat.sub',    '한국 공급사의 제품이 순차 등록되고 있습니다. 관심 카테고리를 먼저 살펴보세요.'),
 ('steps.kick', '막막했던 해외 브랜드 공식 유통, 이제 혼자 고민하지 마세요'),
 ('steps.h',    '메이크노브가 전 세계 브랜드와의 연결을 대신합니다'),
 ('steps.s1k',  '글로벌 제품 발굴'),
 ('steps.s1h',  '해외로 가지 않아도 세계의'),
 ('steps.s1p',  '전시회나 해외 현장을 직접 찾아다니지 않아도 다양한 글로벌 혁신 제품을 살펴보고 공식 유통 기회를 발견할 수 있습니다.'),
 ('steps.s2k',  '거래 조건 확인'),
 ('steps.s2h',  '유통에 필요한 조건을'),
 ('steps.s2p',  '제품별 공급가와 최소 주문 수량, 납기 등 유통을 결정하는 데 필요한 거래 조건을 쉽고 빠르게 확인할 수 있습니다.'),
 ('steps.s3k',  '연결 전 과정 지원'),
 ('steps.s3h',  '공급사와의 연결이 어려울 때'),
 ('steps.s3p',  '문의만 남겨주시면 공급사 연결과 통역부터 온·오프라인 미팅까지 필요한 소통과 일정을 함께 조율해 드립니다.'),
 ('cols.h',     '유통을 준비하는 분들을 위한 가이드'),
 ('pain.h1',    '유통의 경쟁력은'),
 ('pain.h2',    '무엇을 파느냐에서 시작됩니다'),
 ('pain.p',     '메이크노브는 아직 베트남에 공식 유통되지 않은 글로벌 혁신 제품을 발굴합니다.'),
 ('cost.kick',  '비용 안내'),
 ('cost.h1',    '제품을 찾고 연결되는 과정까지'),
 ('cost.h2',    '메이크노브는 무료입니다'),
 ('cost.p',     '글로벌 제품 탐색부터 거래 조건 확인, 공급사 견적 문의까지 별도의 이용료 없이 이용할 수 있습니다.'),
 ('faq.q1', '메이크노브는 어떤 서비스인가요?'), ('faq.a1', '메이크노브는 글로벌 혁신 제품과 베트남 유통 파트너를 연결하는 B2B 플랫폼입니다.'),
 ('faq.q2', '가입과 이용에 비용이 드나요?'), ('faq.a2', '아니요. 회원가입부터 제품 탐색, 거래 조건 확인, 공급사 견적 문의까지 별도의 이용료 없이 이용할 수 있습니다.'),
 ('faq.q3', '가격과 MOQ는 왜 잠겨 있나요?'), ('faq.a3', '공급가와 MOQ는 실제 거래를 위한 B2B 정보이기 때문에 인증된 사업자에게만 공개됩니다.'),
 ('faq.q4', '사업자 인증은 어떻게 하나요?'), ('faq.a4', '회원가입 후 사업자 등록 정보를 제출하면 인증을 진행할 수 있습니다.'),
 ('faq.q5', '공급사와 직접 거래하게 되나요?'), ('faq.a5', '네. 견적과 세부 거래 조건은 공급사와 직접 협의하게 됩니다.'),
 ('faq.q6', 'MOQ 협의가 가능한가요?'), ('faq.a6', 'MOQ 협의 가능 여부는 제품과 공급사에 따라 달라집니다.'),
 ('faq.q7', '수입 경험이 없어도 시작할 수 있나요?'), ('faq.a7', '네. 관심 있는 제품을 찾고 문의를 남기는 것부터 시작할 수 있습니다.'),
 ('faq.q8', '독점 유통권 협의는 어떻게 진행되나요?'), ('faq.a8', '제품 페이지에서 독점 또는 공식 유통 협의 가능 여부를 확인한 뒤 문의를 남겨주세요.'),
 ('faq.q9', '어떤 언어로 문의할 수 있나요?'), ('faq.a9', '한국어, 베트남어 또는 영어로 문의할 수 있습니다.'),
 ('cta.h1',  '새로운 시장의 가능성,'),
 ('cta.h2',  '먼저 발견해 보세요'),
 ('cta.p',   '베트남 공식 유통 파트너를 찾고 있는 글로벌 혁신 제품을 만나보세요.'),
 ('cta.btn', '제품 확인하기'),
 ('float.btn', '혁신 제품 둘러보기'),
]

VOID = {'br', 'img', 'input', 'hr', 'meta', 'link'}

def blanked(s):
    def blank(m): return m.group(1) + ' ' * len(m.group(2)) + m.group(3)
    s2 = re.sub(r'(<script[^>]*>)([\s\S]*?)(</script>)', blank, s)
    s2 = re.sub(r'(<style[^>]*>)([\s\S]*?)(</style>)', blank, s2)
    return s2

def textseq(s):
    b = blanked(s)
    return [(m.start(1), m.group(1)) for m in re.finditer(r'>([^<>]+)<', b) if m.group(1).strip()]

srcs = {l: open(f, encoding='utf-8').read() for l, f in FILES.items()}
seqs = {l: textseq(s) for l, s in srcs.items()}
assert len({len(q) for q in seqs.values()}) == 1, {l: len(q) for l, q in seqs.items()}

ko_b = blanked(srcs['ko'])
def in_static(pos):
    a = ko_b.rfind('mk-static-mk-', 0, pos)
    if a < 0: return False
    return ko_b.find('</nav>', a) > pos

used = set(); key_idx = {}
for key, kotext in KEYS:
    found = None
    for i, (pos, t) in enumerate(seqs['ko']):
        tt = re.sub(r'[ \t]*\n[ \t]*', '\n', t.strip())
        if i in used or in_static(pos): continue
        if tt != kotext and not tt.startswith(kotext + '\n'): continue
        found = i; break
    assert found is not None, key + ' | ' + kotext[:30]
    used.add(found); key_idx[key] = found

def annotate(lang):
    s = srcs[lang]; q = seqs[lang]
    edits = []
    for key, idx in key_idx.items():
        pos = q[idx][0]
        lt = s.rfind('<', 0, pos)
        gt = s.find('>', lt)
        opening = s[lt:gt]
        if 'data-mkl=' in opening: continue
        m = re.match(r'</?([a-zA-Z0-9]+)', opening)
        tag = m.group(1).lower() if m else ''
        ok_attr = False
        if not opening.startswith('</') and tag not in VOID:
            end = s.find('</' + tag, gt)
            inner = s[gt + 1:end]
            if not re.search(r'<(?!br\b)[a-zA-Z/]', inner):
                ok_attr = True
        if ok_attr:
            # 같은 요소 안에 다른 키의 텍스트도 있으면(한 h2 에 두 줄 각각 키) 요소 속성 대신 텍스트만 감싼다
            elem_end = s.find('</' + tag, gt)
            others = [q[j][0] for k2, j in key_idx.items() if k2 != key]
            if any(gt < p2 < elem_end for p2 in others):
                ok_attr = False
        if ok_attr:
            edits.append(('attr', gt, gt, key))
        else:
            end = s.find('<', pos)
            edits.append(('wrap', pos, end, key))
    for kind, a, b, key in sorted(edits, key=lambda e: -e[1]):
        if kind == 'attr':
            s = s[:a] + f' data-mkl="landing.{key}"' + s[a:]
        else:
            s = s[:b] + '</span>' + s[b:]
            s = s[:a] + f'<span data-mkl="landing.{key}">' + s[a:]
    open(FILES[lang], 'w', encoding='utf-8').write(s)
    return len(edits)

for l in FILES: print(l, 'annotated', annotate(l))

import html as H
def defaults(lang):
    s = open(FILES[lang], encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<([a-zA-Z0-9]+)((?:[^<>"]|"[^"]*")*?)\sdata-mkl="landing\.([a-z0-9.]+)"((?:[^<>"]|"[^"]*")*)>', s):
        tag, key = m.group(1), m.group(3)
        start = m.end()
        end = s.find('</' + tag, start)
        inner = s[start:end]
        if re.search(r'<(?!br\b)[a-zA-Z/]', inner):
            print('  ⚠', lang, key, 'inner has tags:', inner[:60].replace('\n', ' ')); continue
        has_br = bool(re.search(r'<br\s*/?>', inner))
        txt = H.unescape(re.sub(r'<br\s*/?>', '\n', inner)).strip()
        txt = re.sub(r'[ \t]*\n[ \t]*', '\n', txt)
        out[key] = (txt, has_br)
    return out

vals = {l: defaults(l) for l in FILES}
tree = {}
for key, _ in KEYS:
    sec, name = key.split('.', 1)
    entry = {l: (vals[l].get(key) or ('', False))[0] for l in ['vi', 'ko', 'en']}
    if (vals['ko'].get(key) or ('', False))[1]: entry['_br'] = 1
    tree.setdefault(sec, {})[name] = entry
    for l in FILES:
        if not (vals[l].get(key) or ('', False))[0]: print('  ⚠ missing', l, key)

js_body = json.dumps(tree, ensure_ascii=False, indent=1)
js = ('/* ============================================================\n'
 '   MAKENOV — 개편 홈(랜딩) 카피 (annotate-landing.py 가 생성)\n'
 '   ------------------------------------------------------------\n'
 '   랜딩 본문은 정적 HTML 이라 i18n 을 타지 않는다. 관리자 카피 탭에서\n'
 '   고칠 수 있도록 주요 문구를 LND 로 들고, data-mkl 로 DOM 과 잇는다.\n'
 '   기본값 = 세 랜딩 파일의 현재 문구. 랜딩을 파일에서 직접 고쳤으면\n'
 '   python annotate-landing.py 를 다시 돌려 이 파일을 재생성할 것.\n'
 '   _br=1 인 키만 개행을 <br> 로 그린다(원문에 <br> 이 있던 요소).\n'
 '   ============================================================ */\n'
 'const LND = ' + js_body + ';\n'
 '\n'
 'function mkApplyLanding(){\n'
 "  if(typeof document === 'undefined' || typeof LND === 'undefined') return;\n"
 "  var esc = function(x){ return String(x).replace(/[&<>\"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'})[m]; }); };\n"
 "  var lang = (typeof MK_LANG !== 'undefined') ? MK_LANG : 'vi';\n"
 "  document.querySelectorAll('[data-mkl]').forEach(function(el){\n"
 "    var path = el.getAttribute('data-mkl').split('.');\n"
 '    var node = LND;\n'
 '    for(var i = 1; i < path.length && node; i++) node = node[path[i]];\n'
 '    if(!node) return;\n'
 '    var v = node[lang] || node.vi || node.ko || node.en;\n'
 "    if(v == null || v === '') return;\n"
 "    if(node._br) el.innerHTML = esc(v).replace(/\\n/g, '<br>');\n"
 '    else el.textContent = v;\n'
 '  });\n'
 '}\n'
 'window.mkApplyLanding = mkApplyLanding;\n'
 '\n'
 '/* 부트 타이밍: DB 카피가 이 파일보다 먼저 적용됐을 수 있어(app.js 의 MK_COPY_BAKED)\n'
 '   저장된 landing.* 오버라이드를 다시 반영하고 나서 그린다 */\n'
 "document.addEventListener('DOMContentLoaded', function(){\n"
 '  try{\n'
 '    var ov = window.MK_COPY_OVERRIDE || {};\n'
 '    var mine = {};\n'
 "    Object.keys(ov).forEach(function(k){ if(k.indexOf('landing.') === 0) mine[k] = ov[k]; });\n"
 "    if(Object.keys(mine).length && typeof mkApplyCopy === 'function') mkApplyCopy(mine);\n"
 '    else mkApplyLanding();\n'
 '  }catch(e){ mkApplyLanding(); }\n'
 '});\n'
 "document.addEventListener('mk:lang', mkApplyLanding);\n")
open('public/assets/js/landing-copy.js', 'w', encoding='utf-8').write(js)
print('landing-copy.js keys:', sum(len([k for k in v if k != '_br']) for v in tree.values()))
