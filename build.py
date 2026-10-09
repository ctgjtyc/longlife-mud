# -*- coding: utf-8 -*-
"""build.py - 将多文件 ESM 工程打包为单 HTML（stdlib only，无第三方依赖）

用法: python build.py            # 构建 dist/longlife_mud.html
      python build.py --check    # 仅自检不输出（供验证路由）

行为（批次1 ES module 化后）:
  1. 读取 index.html，定位唯一 <script type="module" src="js/main.js"> 入口；
  2. 从入口解析 import 依赖图（显式依赖图，加载顺序机器保障）；
  3. 深度优先后序拓扑排序（依赖先于依赖者），剥离 import/export 语法后顺序内联；
  4. 自检：import 名必须为目标模块 exports（拼错/漏导即报错）；跨模块顶层重名即报错；
     无残留外链；关键函数齐全。
  产出 dist/longlife_mud.html 单文件双击即玩（内联为普通 <script>，兼容 file:// 与测试 harness）。
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "index.html")
DIST = os.path.join(ROOT, "dist", "longlife_mud.html")

# 构建后必须存在的关键函数（P1 行为零变化门禁 + P2 新增 + P3 玩法系统）——同批次1前
KEY_FUNCS = [
    "startGame", "mainStep0", "enterHide", "enterJianghu", "enterZongmen",
    "enterModao", "sceneHide", "sceneJianghu", "sceneZongmen", "sceneModao",
    "stepCopyYaoShan", "stepCopyMagicCave", "stepCopyStarRelic",
    "triggerRandomEvent", "startFight", "saveGame", "loadGame",
    "routeByStep", "resetGame", "endingHide", "endingDemon",
    "endingInvincible", "endingDead", "checkPlayerDead",
    "checkCond", "condValue", "setFlag", "realmOf", "migrateSave",
    "addItem", "removeItem", "countItem", "useItem", "gainEquip",
    "switchEquip", "sceneInventory", "addStatus", "hasStatus",
    "removeStatus", "attrEff", "tickStatuses", "mpMax", "costMp",
    "learnArt", "castSkill", "artBonus", "tribulationChance",
    "addRep", "repLevel", "isOpposed", "factionGate",
    "triggerEncounter", "chooseTalent",
    "acceptQuest", "advanceQuest", "questAvailable", "questPanel", "completeQuest",
    "startDialogue", "dialogueNode", "applyDialogueEffect", "relationLevel", "sceneNpc",
    "rollLoot", "fightItem", "monsterByName", "hiddenLunhui", "stepCopyLunhui",
    "curRegion", "moveTo", "sceneRegion", "strongholdLevel", "setStrongholdLevel",
    "strongholdBonus", "sceneStronghold", "pendingWorldEvent", "sceneWorldEvent",
    "applyEffect", "regionPrice", "sceneTrade", "sceneDynasty", "sceneDynastyEvent",
    "genDynamicEvent", "aiEnhanceEvent", "sceneDynamicEvent",
    "startNgPlus", "sceneEnding", "resetState",
    "modValidate", "modConflictCheck", "modLoad", "modExport", "sceneModPanel",
    "sceneModImport", "sceneModEditor",
    "setDifficulty", "diffMult", "diffEnemyMult", "diffInitStone", "sceneDifficulty",
    "bioLog", "biography", "sceneBiography", "sceneHint", "searchLog",
    "exportSave", "importSave", "exportGift", "importGift", "sceneShare",
    "npcExpireYear", "isNpcDead", "npcRemaining", "tickNpcLifespan",
    "addDisciple", "discipleCount", "discipleCultBonus", "tickDisciples", "sceneDisciples",
    "addEnemy", "hasEnemy", "removeEnemy", "enemyMonster", "enemyRevenge", "sceneEnemies",
    "memorialDialogue",
    "startFightGroup", "damageEnemy", "ambushCheck",
    "syncMemories", "hasMemory", "memoryCount", "memoryLevel", "sceneMemory",
    "novelChapter", "novelSearch", "novelRandom", "novelAnchor",
    "sceneNovel", "sceneNovelSearch", "sceneNovelChapter",
    "novelAnchorsByLine", "sceneNovelLine",
    "novelAnchorContext", "genNarrateEncounter",
    "genSettingsLoad", "genSettingsSave", "sceneGenSettings",
    "bioToShiguang", "bioDownloadFallback",
    "directorEventRate", "directorAssertLock", "sceneDirector",
    "showInfo",
    "saveToSlot", "loadFromSlot", "deleteSlot", "slotInfo", "loadLatest", "showSaveWindow",
    "genL0", "genL1", "genL2", "generate",
]

# index.html 中的 ESM 入口
ENTRY_RE = re.compile(r'<script\s+type="module"\s+src="([^"]+)"\s*>\s*</script>', re.IGNORECASE)
# 单行命名导入：import { a, b } from "./x.js";
IMPORT_NAMED_RE = re.compile(r'^import\s+\{([^}]*)\}\s+from\s+"([^"]+)";\s*$', re.MULTILINE)
# 单行副作用导入：import "./x.js";
IMPORT_BARE_RE = re.compile(r'^import\s+"([^"]+)";\s*$', re.MULTILINE)
# 顶层声明名（含 async function；用于导出表 / 重名检测）
DECL_RE = re.compile(r'^export\s+(?:(?:async\s+)?function|const|let|var)\s+([A-Za-z_$][\w$]*)', re.MULTILINE)
EXPORT_PREFIX_RE = re.compile(r'^export\s+', re.MULTILINE)


def _norm(rel_dir, spec):
    """把 import 说明符解析为仓库根相对路径（正斜杠）。"""
    p = os.path.normpath(os.path.join(ROOT, rel_dir, spec))
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def _read(rel):
    with io.open(os.path.join(ROOT, rel), "r", encoding="utf-8", newline="") as f:
        return f.read()


def _exports(text):
    return set(DECL_RE.findall(text))


def _deps(text, rel):
    """返回 [(目标相对路径, [导入名...] 或 None(副作用))]，去重保序。"""
    rel_dir = os.path.dirname(rel)
    out, seen = [], set()
    for m in IMPORT_NAMED_RE.finditer(text):
        names = [n.strip() for n in m.group(1).split(",") if n.strip()]
        target = _norm(rel_dir, m.group(2))
        out.append((target, names))
        seen.add(target)
    for m in IMPORT_BARE_RE.finditer(text):
        target = _norm(rel_dir, m.group(1))
        if target not in seen:
            out.append((target, None))
    return out


def load_graph(entry):
    """解析入口可达的模块依赖图，返回 {rel: {"text":..., "exports":..., "deps":[...]}}。"""
    graph = {}
    stack = [entry]
    while stack:
        rel = stack.pop()
        if rel in graph:
            continue
        text = _read(rel)
        exports = _exports(text)
        deps = _deps(text, rel)
        graph[rel] = {"text": text, "exports": exports, "deps": deps}
        for target, _names in deps:
            if target not in graph:
                stack.append(target)
    return graph


def validate(graph):
    """校验 import 名存在 + 跨模块顶层重名（加载顺序机器保障 + 重名加载期暴露）。"""
    for rel, info in graph.items():
        for target, names in info["deps"]:
            if target not in graph:
                raise RuntimeError("模块缺失: %s 依赖 %s" % (rel, target))
            if names is None:
                continue
            missing = [n for n in names if n not in graph[target]["exports"]]
            if missing:
                raise RuntimeError("%s 从未导出: %s（%s → %s）" % (missing, "", rel, target))
    owner = {}
    for rel, info in graph.items():
        for n in info["exports"]:
            if n in owner and owner[n] != rel:
                raise RuntimeError("跨模块顶层重名: %s（%s 与 %s）" % (n, owner[n], rel))
            owner[n] = rel


def topo_order(graph, entry):
    """DFS 后序：依赖先于依赖者（加载顺序语义不变）。"""
    order, done = [], set()

    def visit(rel):
        if rel in done:
            return
        done.add(rel)
        for target, _names in graph[rel]["deps"]:
            visit(target)
        order.append(rel)

    visit(entry)
    return order


def bundle(graph, entry):
    parts = []
    for rel in topo_order(graph, entry):
        text = graph[rel]["text"]
        text = IMPORT_NAMED_RE.sub("", text)
        text = IMPORT_BARE_RE.sub("", text)
        text = EXPORT_PREFIX_RE.sub("", text)
        parts.append("//===== %s =====\n%s" % (rel, text))
    return "\n".join(parts)


def build():
    with io.open(SRC, "r", encoding="utf-8") as f:
        html = f.read()
    m = ENTRY_RE.search(html)
    if not m:
        raise RuntimeError('index.html 未找到 ESM 入口 <script type="module" src="...">')
    entry = m.group(1)

    graph = load_graph(entry)
    validate(graph)
    blob = bundle(graph, entry)
    out_html = ENTRY_RE.sub(lambda _m: "<script>\n" + blob + "\n</script>", html, count=1)

    # 自检 1：无残留外链 / module 标签
    if re.search(r'<script[^>]*\ssrc=', out_html, re.IGNORECASE):
        raise RuntimeError("存在未内联的 script 引用")
    if re.search(r'type="module"', out_html, re.IGNORECASE):
        raise RuntimeError("残留 type=module 标签")

    # 自检 2：关键函数齐全
    missing = [k for k in KEY_FUNCS if ("function " + k + "(") not in out_html]
    if missing:
        raise RuntimeError("构建产物缺少关键函数: %s" % missing)

    if "--check" in sys.argv:
        print("check OK: %d 个模块内联, %d 个关键函数齐全" % (len(graph), len(KEY_FUNCS)))
        return

    os.makedirs(os.path.dirname(DIST), exist_ok=True)
    with io.open(DIST, "w", encoding="utf-8") as f:
        f.write(out_html)

    total_src = sum(len(v["text"]) for v in graph.values())
    print("构建完成: %s" % DIST)
    print("源码模块 %d 个, 合计 %d 字符, 产物 %d 字符, 产物大小 %.1f KB"
          % (len(graph), total_src, len(out_html), len(out_html) / 1024.0))


if __name__ == "__main__":
    build()