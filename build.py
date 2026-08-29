# -*- coding: utf-8 -*-
"""build.py - 将多文件工程合并为单 HTML（stdlib only，无第三方依赖）

用法: python build.py            # 构建 dist/longlife_mud.html
      python build.py --check    # 仅自检不输出（供验证路由）

行为: 读取 index.html，将 <script src="js/x.js"></script> 内联为 <script>...</script>
      输出 dist/longlife_mud.html，保留双击即玩的单文件特性。
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "index.html")
DIST = os.path.join(ROOT, "dist", "longlife_mud.html")

# 构建后必须存在的关键函数（P1 行为零变化门禁 + P2 新增 + P3 玩法系统）
KEY_FUNCS = [
    "startGame", "mainStep0", "enterHide", "enterJianghu", "enterZongmen",
    "enterModao", "sceneHide", "sceneJianghu", "sceneZongmen", "sceneModao",
    "stepCopyYaoShan", "stepCopyMagicCave", "stepCopyStarRelic",
    "triggerRandomEvent", "startFight", "saveGame", "loadGame",
    "routeByStep", "resetGame", "endingHide", "endingDemon",
    "endingInvincible", "endingDead", "checkPlayerDead",
    "checkCond", "condValue", "setFlag", "realmOf", "migrateSave",
    # P3a 容器与状态
    "addItem", "removeItem", "countItem", "useItem", "gainEquip",
    "switchEquip", "sceneInventory", "addStatus", "hasStatus",
    "removeStatus", "attrEff", "tickStatuses", "mpMax", "costMp",
    # P3b 玩法系统
    "learnArt", "castSkill", "artBonus", "tribulationChance",
    "addRep", "repLevel", "isOpposed", "factionGate",
    "triggerEncounter", "chooseTalent",
    # P4 叙事引擎
    "acceptQuest", "advanceQuest", "questAvailable", "questPanel", "completeQuest",
    "startDialogue", "dialogueNode", "applyDialogueEffect", "relationLevel", "sceneNpc",
    "rollLoot", "fightItem", "monsterByName", "hiddenLunhui", "stepCopyLunhui",
    # P5 开放世界与扩展
    "curRegion", "moveTo", "sceneRegion", "strongholdLevel", "setStrongholdLevel",
    "strongholdBonus", "sceneStronghold", "pendingWorldEvent", "sceneWorldEvent",
    "applyEffect", "regionPrice", "sceneTrade", "sceneDynasty", "sceneDynastyEvent",
    "genDynamicEvent", "aiEnhanceEvent", "sceneDynamicEvent",
    "startNgPlus", "sceneEnding", "resetState",
    "modValidate", "modConflictCheck", "modLoad", "modExport", "sceneModPanel",
    "sceneModImport", "sceneModEditor",
    # P6 元游戏与多人雏形
    "setDifficulty", "diffMult", "diffEnemyMult", "diffInitStone", "sceneDifficulty",
    "bioLog", "biography", "sceneBiography", "sceneHint", "searchLog",
    "exportSave", "importSave", "exportGift", "importGift", "sceneShare",
    # J34 后续：NPC 深度扩展（寿命/收徒/结仇）
    "npcExpireYear", "isNpcDead", "npcRemaining", "tickNpcLifespan",
    "addDisciple", "discipleCount", "discipleCultBonus", "tickDisciples", "sceneDisciples",
    "addEnemy", "hasEnemy", "removeEnemy", "enemyMonster", "enemyRevenge", "sceneEnemies",
    "memorialDialogue",
    # J34 方向2：战斗深度扩展（团体战斗/伏击遭遇）
    "startFightGroup", "damageEnemy", "ambushCheck",
    # J34 方向3：记忆与阅历（关键事件解锁剧情）
    "syncMemories", "hasMemory", "memoryCount", "memoryLevel", "sceneMemory",
    # J34 方向4：小说内容接入（原著剧情库：章节索引+关键词检索+anchors 预留）
    "novelChapter", "novelSearch", "novelRandom", "novelAnchor",
    "sceneNovel", "sceneNovelSearch", "sceneNovelChapter",
    # J35 M3 批次1：五线锚点对照（hide/jianghu/zongmen/modao/fuben + world）
    "novelAnchorsByLine", "sceneNovelLine",
    # J35 M4 触发点1 + M3/M4 合流（锚点上下文喂料）
    "novelAnchorContext", "genNarrateEncounter",
    # J35 M4-3 L1 实接（设置持久化+面板）+ M4-4 传记对接拾光 + M3 Director
    "genSettingsLoad", "genSettingsSave", "sceneGenSettings",
    "bioToShiguang", "bioDownloadFallback",
    "directorEventRate", "directorAssertLock", "sceneDirector",
    # J35 体验轮：奇遇随机化 + 信息浮窗（用户 2026-08-23 三条定向）
    "showInfo",
    # J35 体验轮·多槽位存档浮窗（用户定向：存/读弹出窗口+档位）
    "saveToSlot", "loadFromSlot", "deleteSlot", "slotInfo", "loadLatest", "showSaveWindow",
    # J35 M4：三级生成管线接线（L0 模板/L1 Ollama/L2 云端默认关）
    "genL0", "genL1", "genL2", "generate",
]

# 支持 js/ 与 js/data/ 下的脚本（普通 script 按序加载，非 ES module）
SCRIPT_RE = re.compile(r'<script src="((?:js|data)/[^"]+\.js)"></script>', re.IGNORECASE)


def load_sources():
    """返回 {js相对路径: 源码}，缺失文件抛错。"""
    with io.open(SRC, "r", encoding="utf-8") as f:
        html = f.read()
    js = {}
    for m in SCRIPT_RE.finditer(html):
        rel = m.group(1)
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            raise FileNotFoundError("缺失脚本文件: %s" % path)
        with io.open(path, "r", encoding="utf-8") as f:
            js[rel] = f.read()
    return html, js


def build():
    html, js = load_sources()

    def inline(m):
        rel = m.group(1)
        return "<script>\n" + js[rel] + "</script>"

    out_html = SCRIPT_RE.sub(inline, html)

    # 自检 1：所有 script src 都被替换（无残留引用）
    leftover = SCRIPT_RE.findall(out_html)
    if leftover:
        raise RuntimeError("存在未内联的 script 引用: %s" % leftover)

    # 自检 2：关键函数齐全
    missing = [k for k in KEY_FUNCS if ("function " + k + "(") not in out_html]
    if missing:
        raise RuntimeError("构建产物缺少关键函数: %s" % missing)

    if "--check" in sys.argv:
        print("check OK: %d 个脚本内联, %d 个关键函数齐全" % (len(js), len(KEY_FUNCS)))
        return

    os.makedirs(os.path.dirname(DIST), exist_ok=True)
    with io.open(DIST, "w", encoding="utf-8") as f:
        f.write(out_html)

    total_src = sum(len(v) for v in js.values())
    print("构建完成: %s" % DIST)
    print("源码 JS 合计 %d 字符, 产物 %d 字符, 产物大小 %.1f KB"
          % (total_src, len(out_html), len(out_html) / 1024.0))


if __name__ == "__main__":
    build()
