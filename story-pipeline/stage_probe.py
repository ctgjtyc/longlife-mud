# -*- coding: utf-8 -*-
# stage_probe.py
import sys, io, os, re, json, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SCENE = r'D:\AI-app\longlife-mud\story-lib\scenarios\xiuxian'
CHUNKS = r'D:\AI-app\longlife-mud\story-pipeline\chunks'
STAGES = os.path.join(SCENE, 'stages.json')
GAPS = [(2664, 2669), (2674, 2973)]
def chunk_file_for(ch):
    if 1 <= ch <= 2650:
        start = 1 + 50 * ((ch - 1) // 50)
        return 'ch%04d-%04d.txt' % (start, start + 49)
    if 2651 <= ch <= 2673:
        return 'ch2651-2673.txt'
    if 2974 <= ch <= 3010:
        return 'ch2974-3010.txt'
    return None
def in_gap(ch):
    return any(a <= ch <= b for a, b in GAPS)
CH_RE = re.compile(r'^\s*【第(\d+)章 ')
def load_chunkext(fname):
    p = os.path.join(CHUNKS, fname)
    if not os.path.exists(p):
        return None
    with io.open(p, encoding='utf-8') as f:
        return f.read()
def parse_chapters(text):
    secs = {}
    cur = None
    for line in text.splitlines():
        m = CH_RE.match(line)
        if m:
            cur = int(m.group(1))
            secs[cur] = [line]
        elif cur is not None:
            secs[cur].append(line)
    return {k: chr(10).join(v) for k, v in secs.items()}
def get_chapter(ch):
    if in_gap(ch):
        return '[源文缺失] ch%d 属源文缺失区间（2664-2669 / 2674-2973）' % ch, None
    fname = chunk_file_for(ch)
    if fname is None:
        return '[章号越界] ch%d 超出 1-3010' % ch, None
    text = load_chunkext(fname)
    if text is None:
        return '[chunk缺失] %s 不存在' % fname, None
    secs = parse_chapters(text)
    if ch not in secs:
        return '[节定位失败] ch%d 未在 %s 中找到' % (ch, fname), None
    return secs[ch], fname
def load_stages():
    d = json.load(open(STAGES, encoding='utf-8'))
    return {s['id']: s for s in d['stages']}, d
def fence():
    return '=' * 64
def header():
    return '# 血缘 {agent=stage_probe.py, timestamp=%s, source=chunks/ + stages.json}' % datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
def cmd_list(meta):
    print('stage-map-v1 | %s | total_chapters=%d' % (meta.get('book_title',''), meta.get('total_chapters')))
    print('boundary_source: %s' % meta.get('boundary_source'))
    print(fence())
    for s in meta['stages']:
        rng = s['range']
        print('%-3s  ch%-5d-%-5d %-24s chunks=%d serves=%s' % (s['id'], rng[0], rng[1], s['name'], len(s['chunks']), ','.join(s['serves']) or '-'))
def cmd_stage(sid, stages_d):
    if sid not in stages_d:
        sys.exit('未知阶段: %s（用 --list 查看）' % sid)
    s = stages_d[sid]
    print(header())
    print(fence())
    print('阶段 %s %s | ch%d-%d' % (s['id'], s['name'], s['range'][0], s['range'][1]))
    print('主题: %s' % s['theme'])
    print('主线: %s' % s['arc'])
    print('chunks: %s' % ', '.join(s['chunks']))
    print('serves(为后续阶段提供伏笔): %s' % (', '.join(s['serves']) or '（终局，无后续）'))
    if s.get('note'):
        print('备注: %s' % s['note'])
def resolve_range(spec):
    if spec.isdigit():
        return int(spec), int(spec)
    m = re.fullmatch(r'(\d+)-(\d+)', spec)
    if not m:
        sys.exit('区间格式应为 章-章（如 5-12）或单章（如 5）')
    a, b = int(m.group(1)), int(m.group(2))
    if a > b:
        a, b = b, a
    return a, b
def cmd_probe(sid, lo, hi, stages_d, raw):
    if sid is not None:
        if sid not in stages_d:
            sys.exit('未知阶段: %s' % sid)
        s = stages_d[sid]
        s_lo, s_hi = s['range']
        if lo < s_lo: lo = s_lo
        if hi > s_hi: hi = s_hi
        if lo > hi:
            sys.exit('区间 %d-%d 超出阶段 %s 范围 ch%d-%d' % (lo, hi, sid, s_lo, s_hi))
        title = '阶段 %s %s | ch%d-%d' % (s['id'], s['name'], lo, hi)
    else:
        title = '章号区间 | ch%d-%d' % (lo, hi)
    if not raw:
        print(header())
        print(fence())
        print(title)
    for ch in range(lo, hi + 1):
        body, src = get_chapter(ch)
        if not raw:
            print(fence())
            print('【ch%d】' % ch, end='')
            if src: print('  <src=%s>' % src)
            else: print('  <gap>')
            print(body)
        else:
            print('【第%d章】' % ch)
            print(body)
    if not raw:
        print(fence())
        print('共 %d 章。' % (hi - lo + 1))
def main():
    stages_d, meta = load_stages()
    args = sys.argv[1:]
    raw = '--raw' in args
    if '--raw' in args: args.remove('--raw')
    if not args:
        sys.exit('用法: stage_probe.py --list | S1 [5-12] | --range 205-208 [--raw]')
    if args[0] == '--list':
        cmd_list(meta); return
    if args[0] == '--range':
        if len(args) < 2: sys.exit('--range 需要章号区间，如 --range 205-208')
        lo, hi = resolve_range(args[1])
        cmd_probe(None, lo, hi, stages_d, raw); return
    sid = args[0]
    if len(args) == 1:
        cmd_stage(sid, stages_d); return
    lo, hi = resolve_range(args[1])
    cmd_probe(sid, lo, hi, stages_d, raw)
if __name__ == '__main__':
    main()
