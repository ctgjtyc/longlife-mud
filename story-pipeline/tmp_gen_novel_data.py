# -*- coding: utf-8 -*-
# 生成 js/data/novel_changsheng_400.js（J35 M3 批次1：前400章篇目数据）
# 数据源：chapters.json（前400章 ch/title/kw）+ anchors.json（62 五线锚点）
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = r'D:\AI-app\longlife-mud'
SC = ROOT + r'\story-lib\scenarios\xiuxian'
chapters = json.load(open(SC + r'\chapters.json', encoding='utf-8'))['chapters']
ch400 = [c for c in chapters if c['ch'] <= 400]
anchors = json.load(open(SC + r'\anchors.json', encoding='utf-8'))['anchors']

lines = []
lines.append('//==== data/novel_changsheng_400.js：《系统赋我长生》前 400 章篇目（J35 M3 批次1，2026-08-23）====')
lines.append('// 结构对齐 novel-lib-v2：chapters=[[章号,标题,关键词串],...]；anchors 增加 line 字段（五线+world 归属）')
lines.append('// 数据源：story-lib chapters.json + anchors.json（digest 8 份提炼），本文件为生成产物，勿手改')
lines.append('const NOVEL_CHANGSHENG_400={')
lines.append(' id:"changsheng",')
lines.append(' game:"系统赋我长生",')
lines.append(' title:"系统赋我长生，活着终会无敌",')
lines.append(' author:"紫灵风雪",')
lines.append(' type:"仙侠·长生苟道流",')
lines.append(' desc:"平凡少年陈浔觉醒长生系统，与大黑牛携手苟道长生：从山村到磐宁城，入五蕴宗种田炼丹，横渡天断闯大离，界域血战破界入大世。（本篇收录原著前 400 章·首批锚点化）",')
lines.append(' chapters:[')
for c in ch400:
    kw = ' '.join(c['kw'])
    t = c['title'].replace('"', '”')
    lines.append('  [%d,"%s","%s"],' % (c['ch'], t, kw))
lines.append(' ],')
lines.append(' anchors:[')
for a in anchors:
    refs = ','.join(a['refs'])
    def esc(s): return s.replace('"', '”')
    lines.append('  {chapter:%d,id:"%s",title:"%s",trigger:"%s",summary:"%s",refs:"%s",line:"%s"},' % (
        a['chapter'], a['id'], esc(a['title']), esc(a['trigger']), esc(a['summary']), esc(refs), a['line']))
lines.append(' ]')
lines.append('};')

out = '\n'.join(lines) + '\n'
open(ROOT + r'\js\data\novel_changsheng_400.js', 'w', encoding='utf-8', newline='\n').write(out)
print('[OK] novel_changsheng_400.js written:', len(ch400), 'chapters,', len(anchors), 'anchors,', len(out), 'chars')
