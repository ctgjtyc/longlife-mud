# -*- coding: utf-8 -*-
# Step 0 预处理切分：槽位原文包 + manifest 自动对账（本地零模型成本）
import sys, io, os, re, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SC = r'D:\AI-app\longlife-mud\story-lib\scenarios\xiuxian'
SRC = os.path.join(SC, 'source')
PIPE = r'D:\AI-app\longlife-mud\story-pipeline'
CHUNKS = os.path.join(PIPE, 'chunks')
os.makedirs(CHUNKS, exist_ok=True)

# digest 拆分覆盖：末槽 2974-3010 因 Kimi 批次过大被拆成两份 digest 文件
# （批次 15/16，见 kimi-feed-batches.md），manifest 必须引用实际文件，否则 step2 静默跳过
DIGEST_OVERRIDES = {
    (2974, 3010): [
        os.path.join(SC, 'chapters', 'digest-2974-3000.md'),
        os.path.join(SC, 'chapters', 'digest-3001-3010.md'),
    ],
}

pat = re.compile(r'^第([0-9一二三四五六七八九十百千两]+)章[ \t　]*(.*)$', re.M)
CN = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100,'千':1000,'两':2}
def cn2int(s):
    if s.isdigit(): return int(s)
    n, out = 0, 0
    for c in reversed(s):
        if c in ('十','百','千'):
            out += (n or 1) * CN[c]; n = 0
        else:
            n = CN.get(c, 0)
    return out + n

chmap = {}
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.txt'): continue
    text = open(os.path.join(SRC, f), encoding='utf-8', errors='replace').read()
    ms = list(pat.finditer(text))
    for i, m in enumerate(ms):
        end = ms[i+1].start() if i+1 < len(ms) else len(text)
        cnum = cn2int(m.group(1))
        if cnum not in chmap:
            chmap[cnum] = {'title': m.group(2).strip()[:40], 'text': text[m.end():end].strip(), 'src': f}

nums = sorted(chmap)
print('[1] chapters parsed:', len(nums), 'range', nums[0], '-', nums[-1])

cj = json.load(open(os.path.join(SC, 'chapters.json'), encoding='utf-8'))
idx = {c['ch']: c for c in cj['chapters']}
mismatch = []
for n in nums:
    if n in idx:
        a, b = len(chmap[n]['text']), idx[n]['len']
        if b and abs(a - b) / b > 0.05:
            mismatch.append({'ch': n, 'reparse': a, 'index': b})
missing_in_reparse = [c for c in idx if c not in chmap]
print('[2] reconcile: len-mismatch=%d index-only=%d gaps=%s' % (len(mismatch), len(missing_in_reparse), cj.get('gaps_after')))

slots = []
manifest_slots = []
for b in list(range(1, 2701, 50)) + [2701]:
    e = b + 49 if b < 2701 else nums[-1]
    grp = [n for n in nums if b <= n <= e]
    if not grp: continue
    fname = 'ch%04d-%04d.txt' % (grp[0], grp[-1])
    lines = []
    for n in grp:
        lines.append('【第%d章 %s】\n%s\n' % (n, chmap[n]['title'], chmap[n]['text']))
    open(os.path.join(CHUNKS, fname), 'w', encoding='utf-8').write('\n'.join(lines))
    digest_ref = DIGEST_OVERRIDES.get((grp[0], grp[-1]),
                                      os.path.join(SC, 'chapters', 'digest-%04d-%04d.md' % (grp[0], grp[-1])))
    manifest_slots.append({'slot': fname, 'start': grp[0], 'end': grp[-1],
                           'chapter_count': len(grp), 'char_count': sum(len(chmap[n]['text']) for n in grp),
                           'digest': digest_ref})
    slots.append(fname)

mani = {'format': 'pipeline-manifest-v1', 'total_chapters': len(nums), 'range': [nums[0], nums[-1]],
        'missing_chapters': sorted(set(range(nums[0], nums[-1]+1)) - set(nums)),
        'len_mismatch': mismatch[:20], 'slots': manifest_slots}
json.dump(mani, open(os.path.join(PIPE, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not os.path.exists(os.path.join(PIPE, 'progress.json')):
    json.dump({'done': [], 'redo': []}, open(os.path.join(PIPE, 'progress.json'), 'w', encoding='utf-8'))
if not os.path.exists(os.path.join(PIPE, 'state.json')):
    json.dump({'realm': '凡人', 'active_chars': [], 'open_foreshadows': [], 'note': '首槽生成后由接力摘要更新'},
              open(os.path.join(PIPE, 'state.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('[3] slots written:', len(slots))
print('sample:', slots[0], os.path.getsize(os.path.join(CHUNKS, slots[0]))//1024, 'KB')
print('ALL DONE')
