# -*- coding: utf-8 -*-
# Step 3 锚点合成：56 槽 digest + chapters.json.kw → anchors.json（anchor-v1 格式）
# 用法：py -3 step3_merge.py（建议在 Step 2 全 PASS 后运行）
import sys, io, os, re, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SC = r'D:\AI-app\longlife-mud\story-lib\scenarios\xiuxian'
PIPE = r'D:\AI-app\longlife-mud\story-pipeline'
mani = json.load(open(os.path.join(PIPE, 'manifest.json'), encoding='utf-8'))
cj = json.load(open(os.path.join(SC, 'chapters.json'), encoding='utf-8'))
idx = {c['ch']: c for c in cj['chapters']}

anchors, foreshadows = [], []
for sl in mani['slots']:
    dpath = sl['digest']
    if not os.path.isfile(dpath): continue
    t = open(dpath, encoding='utf-8').read()
    evs = {}
    in_ev = False
    for ln in t.splitlines():
        if ln.startswith('## 事件链'): in_ev = True; continue
        if ln.startswith('## ') : in_ev = False
        if in_ev:
            m = re.match(r'^(\d+)\s*\|\s*([^|]+)\|?\s*(.*)$', ln.strip())
            if m: evs[int(m.group(1))] = (m.group(2).strip(), m.group(3).strip())
    for ln in t.splitlines():
        m = re.match(r'^(\[埋\]|\[收\])\s*(\d+)\s*\|\s*(.+)$', ln.strip())
        if m: foreshadows.append({'type': m.group(1)[1], 'ch': int(m.group(2)), 'content': m.group(3).strip()})
    for ch in sorted(evs):
        meta = idx.get(ch, {})
        summary, trigger = evs[ch]
        anchors.append({'chapter': ch, 'id': 'ch%04d-ev01' % ch,
                        'title': meta.get('title', ''),
                        'keywords': meta.get('kw', []),
                        'trigger': trigger or '', 'summary': summary,
                        'pos': {'slot': sl['slot']}, 'refs': []})

out = {'format': 'anchor-v1', 'generated_by': 'step3_merge', 'total': len(anchors),
       'anchors': anchors, 'foreshadows': foreshadows}
json.dump(out, open(os.path.join(SC, 'anchors.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('anchors: %d, foreshadows: %d (埋 %d / 收 %d)' % (
    len(anchors), len(foreshadows),
    sum(1 for f in foreshadows if f['type'] == '埋'), sum(1 for f in foreshadows if f['type'] == '收')))
print('ALL DONE')
