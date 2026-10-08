"""Generate pinyin for every Chinese string in the course → src/data/pinyin.js

Words are segmented with the COURSE VOCABULARY (hand-checked pinyin in each lesson's
word list), so pinyin matches what learners were taught and is spaced by word.
Unknown characters fall back to pypinyin. Rules applied afterwards:
  · 一 / 不 tone change   · 个 after numbers/demonstratives = ge
  · numbers joined (èrshíwǔ)   · capital letter at sentence start
"""
import json, os, re, sys
from pypinyin import lazy_pinyin, Style

HERE = os.path.dirname(__file__)
data = json.load(open(os.path.join(HERE, 'strings.json'), encoding='utf-8'))
DICT = data['dict']
DICT.update({'哪里': 'nǎlǐ', '大学': 'dàxué', '进去': 'jìnqu', '带来': 'dàilai', '拿来': 'nálai', '吃完': 'chīwán', '做完': 'zuòwán', '听懂': 'tīngdǒng', '看懂': 'kàndǒng', '写错': 'xiěcuò', '关上': 'guānshang', '带上': 'dàishang', '修好': 'xiūhǎo'})
MAXL = max(len(w) for w in DICT)
HAN = re.compile(r'[㐀-鿿]')
NUMS = set('零一二三四五六七八九十百千万两几')
PUNCT = {'，': ',', '。': '.', '？': '?', '！': '!', '、': ',', '：': ':', '；': ';', '“': '"', '”': '"', '（': '(', '）': ')', '—': '—', '…': '…', '《': '«', '》': '»'}
TONES = {'āēīōūǖ': 1, 'áéíóúǘ': 2, 'ǎěǐǒǔǚ': 3, 'àèìòùǜ': 4}
OVERRIDE = {}   # full-string corrections if ever needed

def tone(syl):
    if syl == 'ge': return 4
    for chars, t in TONES.items():
        if any(c in syl for c in chars): return t
    return 5

def segment(s):
    n = len(s); cost = [1e9] * (n + 1); prev = [None] * (n + 1); cost[0] = 0
    for i in range(n):
        if cost[i] >= 1e9: continue
        if not HAN.match(s[i]):
            j = i + 1
            while j < n and not HAN.match(s[j]) and s[j] not in PUNCT and s[i] not in PUNCT: j += 1
            if cost[i] < cost[j]: cost[j] = cost[i]; prev[j] = (i, 'x')
            continue
        for L in range(min(MAXL, n - i), 0, -1):
            w = s[i:i + L]
            if w in DICT and cost[i] + 1 < cost[i + L]: cost[i + L] = cost[i] + 1; prev[i + L] = (i, 'w')
        if cost[i] + 100 < cost[i + 1]: cost[i + 1] = cost[i] + 100; prev[i + 1] = (i, 'u')
    out = []; j = n
    while j > 0:
        i, k = prev[j]; out.insert(0, (s[i:j], k)); j = i
    return out

def py_of(tok, kind):
    if kind == 'w': return DICT[tok]
    return ' '.join(lazy_pinyin(tok, style=Style.TONE))

def convert(s):
    if s in OVERRIDE: return OVERRIDE[s]
    toks = segment(s)
    items = []
    for t, k in toks:
        if k == 'x':
            items.append({'p': True, 't': ''.join(PUNCT.get(c, c) for c in t), 'w': t}); continue
        items.append({'p': False, 'w': t, 'py': py_of(t, k)})
    # context rules
    for i, it in enumerate(items):
        if it['p']: continue
        w = it['w']; prev = items[i - 1] if i > 0 and not items[i - 1]['p'] else None
        nxt = items[i + 1] if i + 1 < len(items) and not items[i + 1]['p'] else None
        if w == '个' and prev:
            it['py'] = 'ge'
        if w == '一' and nxt:
            keep = nxt['w'][0] in NUMS or (prev and (prev['w'][-1] in NUMS or prev['w'].endswith(('第', '星期', '期')))) or nxt['w'][0] in '月号'
            if nxt['w'] == '点' : keep = True
            if not keep:
                it['py'] = 'yí' if tone(nxt['py'].split()[0].replace('ge', 'ge')) == 4 or nxt['w'] == '个' else 'yì'
        if w == '不' and nxt and tone(nxt['py'].split()[0]) == 4: it['py'] = 'bú'
        if w == '不' and nxt and prev and prev['w'][-1] in '听看做吃找买说写学拿搬走跑站想关打修洗回答' and nxt['w'] in ('懂','完','见','到','清楚','好','开','动','起来','出来','进来','上去','下去','过来','过去','回来','回去','上'):
            it['py'] = 'bu'
    # assemble
    res = ''
    for i, it in enumerate(items):
        if it['p']:
            t = it['t']
            if t.startswith('___') or t.startswith('_'): res += (' ' if res and not res.endswith(' ') else '') + t + ' '; continue
            if t in ('"',): res += t; continue
            res = res.rstrip() + t + ('' if t in '(«—' else ' ')
            continue
        prev = items[i - 1] if i > 0 else None
        pp = items[i - 2] if i > 1 else None
        after_week = pp is not None and not pp['p'] and pp['w'].endswith('星期')
        join = prev and not prev['p'] and prev['w'][-1] in NUMS and it['w'][0] in NUMS and it['w'] not in ('两',) and prev['w'] not in ('几',) and not after_week
        if prev and not prev['p'] and prev['w'].endswith('星期') and it['w'] in ('一', '二', '三', '四', '五', '六', '几'): join = True
        if prev and not prev['p'] and prev['w'] in ('这', '那', '哪') and it['w'] == '个': join = True
        if join and it['py'][:1] in 'aeoāáǎàēéěèōóǒò': it = dict(it, py="'" + it['py'])
        if res and not res.endswith(' ') and not join and not res.endswith(('"', '(', '«', '—')): res += ' '
        res += it['py']
    res = res.replace('——', ' — ')
    res = re.sub(r'\s+', ' ', res).strip()
    res = re.sub(r'\s+([,.?!:;)»])', r'\1', res)
    if re.search(r'[。？！]', s):
        res = re.sub(r'(^|[.?!]\s+|["—]\s*)([a-zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ])', lambda m: m.group(1) + m.group(2).upper(), res)
    return res

if __name__ == '__main__':
    out = {s: convert(s) for s in data['strings'] if not re.search(r'[A-Za-z]{3,}', s)}
    js = '/* generated by tools/pinyin.py from the course vocabulary — do not edit by hand */\nObject.assign(HSK.PY, ' + json.dumps(out, ensure_ascii=False, indent=0) + ');\n'
    open(os.path.join(HERE, '..', 'src', 'data', 'pinyin.js'), 'w', encoding='utf-8').write(js)
    unk = sorted({t for s in data['strings'] for t, k in segment(s) if k == 'u'})
    if '--show' in sys.argv:
        for s, p in out.items(): print(s, '\n   ', p)
    print(len(out), 'strings; fallback characters:', ''.join(unk))
