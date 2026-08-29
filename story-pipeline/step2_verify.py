# -*- coding: utf-8 -*-
# Step 2 机器校验：五节齐备/章号覆盖/伏笔引用/词级忠实抽查；不合格进 redo-queue
# 用法：py -3 step2_verify.py [槽位如 0001-0050；缺省=全部已填槽]
import sys, io, os, re, json, random
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SC = r'D:\AI-app\longlife-mud\story-lib\scenarios\xiuxian'
PIPE = r'D:\AI-app\longlife-mud\story-pipeline'
CHUNKS = os.path.join(PIPE, 'chunks')
mani = json.load(open(os.path.join(PIPE, 'manifest.json'), encoding='utf-8'))
prog = json.load(open(os.path.join(PIPE, 'progress.json'), encoding='utf-8'))
STOP = set('的了是在和就都与有他不我你她这那们啊吧呢吗么也就都要还会到说去看想过来出对个上下中为被把让从很又再只多很少')

def parse_digest(path):
    t = open(path, encoding='utf-8').read()
    secs = {'事件链': [], '境界': [], '人物': [], '伏笔': [], '接力': ''}
    cur = None
    for ln in t.splitlines():
        if ln.startswith('## 事件链'): cur = '事件链'; continue
        if ln.startswith('## 境界'): cur = '境界'; continue
        if ln.startswith('## 人物'): cur = '人物'; continue
        if ln.startswith('## 伏笔'): cur = '伏笔'; continue
        if ln.startswith('## 接力'): cur = '接力'; continue
        if cur == '接力': secs['接力'] += ln.strip()
        elif cur and ln.strip() and not ln.strip().startswith(('（', '- ch', '#')):
            secs[cur].append(ln.strip())
    return secs, t

def bigrams(s):
    clean = re.sub(r'[^\u4e00-\u9fff]', '', s)
    return set(clean[i:i+2] for i in range(len(clean)-1)
               if clean[i] not in STOP and clean[i+1] not in STOP)

redo, ok_slots, report, buried = [], [], [], set()
only = sys.argv[1] if len(sys.argv) > 1 else None
for sl in mani['slots']:
    key = sl['slot'][2:-4]
    if only and key != only: continue
    # digest 支持单文件或列表（末槽 2974-3010 被拆成 digest-2974-3000 + digest-3001-3010 两份）
    dpaths = sl['digest'] if isinstance(sl['digest'], list) else [sl['digest']]
    dpaths = [d for d in dpaths if os.path.isfile(d)]
    if not dpaths: continue
    secs, raw = parse_digest(dpaths[0])
    for d in dpaths[1:]:
        s2, r2 = parse_digest(d)
        for k in ('事件链', '境界', '人物', '伏笔'):
            secs[k].extend(s2[k])
        secs['接力'] += s2['接力']
        raw += r2
    if '待填充' in raw and not secs['事件链']: continue
    issues = []
    for k in ('事件链', '伏笔', '接力'):
        if not secs[k]: issues.append('缺节:' + k)
    ev_chs = set()
    for ln in secs['事件链']:
        m = re.match(r'^(\d+)\s*\|', ln)
        if m: ev_chs.add(int(m.group(1)))
    expect = set(range(sl['start'], sl['end']+1)) - set(mani['missing_chapters'])
    miss = sorted(expect - ev_chs); extra = sorted(ev_chs - set(range(sl['start'], sl['end']+1)))
    if miss: issues.append('漏章:%s' % miss[:10])
    if extra: issues.append('越界章:%s' % extra[:10])
    for ln in secs['伏笔']:
        m = re.match(r'^\[埋\]\s*(\d+)', ln)
        if m: buried.add(int(m.group(1)))
        m2 = re.match(r'^\[收\][^|]*\|[^|]*\|\s*(\d+)', ln)
        if m2 and int(m2.group(1)) not in buried and '待考' not in ln:
            issues.append('收无埋:ch%s' % m2.group(1))
    chunk_file = os.path.join(CHUNKS, sl['slot'])
    if os.path.isfile(chunk_file) and ev_chs:
        ctext = open(chunk_file, encoding='utf-8').read()
        chap_texts = {}
        for m in re.finditer(r'【第(\d+)章[^\】]*】\n(.*?)(?=【第\d+章|\Z)', ctext, re.S):
            chap_texts[int(m.group(1))] = m.group(2)
        for ch in random.sample(sorted(ev_chs & set(chap_texts)), min(3, len(ev_chs))):
            ev_line = next((l for l in secs['事件链'] if re.match(r'^%d\s*\|' % ch, l)), '')
            ev_bg, src_bg = bigrams(ev_line), bigrams(chap_texts[ch])
            if ev_bg and len(ev_bg & src_bg) == 0:
                issues.append('忠实抽查零命中:ch%d' % ch)
    if issues:
        redo.append({'slot': key, 'issues': issues}); report.append('FAIL %s: %s' % (key, '; '.join(issues)))
    else:
        ok_slots.append(key); report.append('PASS %s (事件行 %d)' % (key, len(secs['事件链'])))

prog['done'] = sorted(set(prog.get('done', [])) | set(ok_slots))
prog['redo'] = redo
json.dump(prog, open(os.path.join(PIPE, 'progress.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(redo, open(os.path.join(PIPE, 'redo-queue.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(report))
print('== done:%d redo:%d ==' % (len(ok_slots), len(redo)))
