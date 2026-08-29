# -*- coding: utf-8 -*-
# Step 4 游戏侧章节索引生成：chapters.json → js/data/novel.js（紧凑格式，供游戏内 bigram 定位）
# 用法：py -3 step4_game_index.py
# 说明：digest 摘要未填充前，游戏接入以章节索引（章号/标题/关键词）为数据源；
#       anchors.json 就绪后可在 novel.js 引擎扩展剧情锚点展示。
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SC = r'D:\AI-app\longlife-mud\story-lib\scenarios\xiuxian'
OUT = r'D:\AI-app\longlife-mud\js\data\novel.js'

cj = json.load(open(os.path.join(SC, 'chapters.json'), encoding='utf-8'))
chapters = cj['chapters']

# 紧凑格式：每章 [章号, 标题, 空格连接的关键词串]（kw 串检索用 includes，省 JSON 数组开销）
rows = []
for c in chapters:
    rows.append([c['ch'], c['title'], ' '.join(c.get('kw', []))])

lines = []
lines.append('//==== data/novel.js：原著章节索引（由 story-pipeline/step4_game_index.py 从 chapters.json 生成，勿手改）====')
lines.append('const NOVEL={format:"novel-index-v1",title:"系统赋我长生，活着终会无敌",author:"紫灵风雪",total:%d,chapters:[' % cj['total'])
for r in rows:
    lines.append('[%d,"%s","%s"],' % (r[0], r[1], r[2]))
lines.append(']};')
lines.append('// anchors 就绪后追加：NOVEL.anchors=[{chapter,title,keywords,trigger,summary,refs}...]（anchor-v1 格式）')

src = '\n'.join(lines)
with io.open(OUT, 'w', encoding='utf-8') as f:
    f.write(src)
print('生成 %s：%d 章，%d 字符（%.1f KB）' % (OUT, len(rows), len(src), len(src) / 1024.0))
print('ALL DONE')
