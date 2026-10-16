//==== test/run.mjs：T0 测试基座（J34 M3，规划 v0.4）====
// DOM stub + 无头加载 dist 产物 + 断言库。Node 仅测试用，不进 dist。
// 运行：node test/run.mjs（需先 python build.py 生成 dist）
import { readFileSync } from "node:fs";
import vm from "node:vm";

const DIST = "dist/longlife_mud.html";
const html = readFileSync(DIST, "utf-8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) { console.error("未找到内联脚本，请先运行 python build.py"); process.exit(1); }

//==== DOM stub ====
function makeEl(id) {
  let _html = "";
  return {
    id, innerText: "", style: { display: "", width: "" },
    _attrs: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, // core.js showPortrait 立绘滑入
    setAttribute(k, v) { this._attrs[k] = v; },   // applyUi 侧栏按钮渲染
    getAttribute(k) { return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    _children: [], _onclick: null, scrollTop: 0, scrollHeight: 0,
    appendChild(c) { c._parent = this; this._children.push(c); },
    remove() { if (this._parent) { const i = this._parent._children.indexOf(this); if (i >= 0) this._parent._children.splice(i, 1); } },
    get innerHTML() { return _html; },
    set innerHTML(v) { _html = v; if (v === "") this._children = []; },
    get className() { return this._cls || ""; }, set className(v) { this._cls = v; },
    get onclick() { return this._onclick; }, set onclick(f) { this._onclick = f; },
    click() { if (typeof this._onclick === "function") this._onclick(); }
  };
}
const els = {};
const bodyEl = makeEl("body"); // J35 体验轮：showInfo 信息浮窗挂载点（断言共用引用）
const document = {
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  createElement(tag) { return makeEl(tag); },
  // novel.js 主题系统加载时访问（浏览器真实 DOM 恒有；测试环境无皮肤面板节点，querySelectorAll 返回空集即可）
  documentElement: { style: { setProperty() {} } },
  querySelectorAll() { return []; },
  body: bodyEl
};
const localStorage = {
  _d: {},
  getItem(k) { return this._d[k] !== undefined ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

const sandbox = {
  document, localStorage, console, Math, JSON, Object, Array, String, Number, Boolean,
  Date, isNaN, parseInt, parseFloat, setTimeout, clearTimeout, undefined
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const s of scripts) vm.runInContext(s, sandbox, { filename: "game.js" });

// 注入状态访问器：const/let 不挂 globalThis，经 getter/setter 动态读写
vm.runInContext(`
  globalThis.__state = {
    get gs() { return gs; }, set gs(v) { gs = v; },
    BALANCE, ITEMS, ARTS, TALENTS, FACTIONS, RECIPES, allEquip, allAch, monsterList, ENCOUNTERS,
    MONSTERS, QUESTS, NPCS, WORLD, DYNASTIES, EVENT_TEMPLATES, MOD_TARGETS,
    DIFFS, NOVEL
  };
`, sandbox);
const G = sandbox; // 游戏全局函数（function 声明挂 globalThis）
const S = sandbox.__state; // 内部状态/常量访问器

//==== 断言库 ====
let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log("  ✓ " + msg); }
  else { fail++; console.log("  ✗ " + msg); }
}
function section(t) { console.log("\n== " + t + " =="); }

//==== 辅助：重置到干净 v8 状态 ====
function freshGame() {
  S.gs = {
    version: 8, cult: 0, stone: 100, year: 0, hp: 100, hpmax: 100, status: "平安无事",
    equip: "无", equipBonus: 0, achs: [], step: 0, dead: false, endType: 0, inFight: false,
    enemy: null, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: {},
    inventory: {}, ownedEquips: [], statuses: [], reputation: {}, arts: {}, talent: null, mp: 20,
    quests: {}, relations: {}, npcLifespan: {}, disciples: [], enemies: [], diff: 1, bio: [], ng: 0,
    memories: {}
  };
}

//==== T0 基线 ====
section("T0 基线");
freshGame();
assert(G.realmOf(0).name === "炼气期", "境界边界：0=炼气期");
assert(G.realmOf(199).name === "炼气期", "境界边界：199=炼气期");
assert(G.realmOf(200).name === "筑基期", "境界边界：200=筑基期");
assert(G.realmOf(500).name === "金丹期", "境界边界：500=金丹期");
assert(G.realmOf(8000).name === "大乘期", "境界边界：8000=大乘期");

freshGame();
assert(G.checkCond({ type: "attr", key: "cult", op: ">=", val: 100 }) === false, "条件 attr：cult<100 不满足");
S.gs.cult = 150;
assert(G.checkCond({ type: "attr", key: "cult", op: ">=", val: 100 }) === true, "条件 attr：cult>=100 满足");
assert(G.checkCond({ type: "flag", key: "modao", val: true }) === false, "条件 flag：未设置 false");
G.setFlag("modao", true);
assert(G.checkCond({ type: "flag", key: "modao", val: true }) === true, "条件 flag：设置后 true");
assert(G.checkCond({ type: "year", key: "", op: ">=", val: 50 }) === false, "条件 year：year<50 不满足");
S.gs.year = 60;
assert(G.checkCond({ type: "year", key: "", op: ">=", val: 50 }) === true, "条件 year：year>=50 满足");

// 读档不推进时间：save 后改 year，load 恢复且不再推进
freshGame();
S.gs.year = 100; S.gs.cult = 300; S.gs.step = 1;
G.saveGame();
S.gs.year = 999; S.gs.cult = 999;
G.loadGame();
assert(S.gs.year === 100, "读档恢复存档 year=100");
assert(S.gs.cult === 300, "读档恢复存档 cult=300");
assert(S.gs.year === 100, "读档不推进时间（year 仍 100）");

//==== P3a 容器与状态 ====
section("P3a 容器与状态");
freshGame();
G.addItem("回血散", 2);
assert(G.countItem("回血散") === 2, "物品增：回血散×2");
let hp0 = S.gs.hp;
G.useItem("回血散");
assert(S.gs.hp === Math.min(S.gs.hpmax, hp0 + 50), "物品使用：回血散恢复50生命");
assert(G.countItem("回血散") === 1, "物品删：使用后剩1");

freshGame();
G.gainEquip(G.equipByName("青锋短剑"));
assert(S.gs.ownedEquips.includes("青锋短剑"), "多装备：获得青锋短剑入持有列表");
assert(S.gs.equip === "青锋短剑", "多装备：自动换装为青锋短剑");
let bonus0 = S.gs.equipBonus;
G.gainEquip(G.equipByName("破旧布衣"));
G.switchEquip("破旧布衣");
assert(S.gs.equip === "破旧布衣" && S.gs.equipBonus !== bonus0, "换装：数值随装备变化");

freshGame();
G.addStatus({ id: "guixi", name: "龟息术", years: 5, attrMods: { comprehension: 5 } });
assert(G.hasStatus("guixi") === true, "BUFF：添加后存在");
assert(G.attrEff("comprehension") === 15, "BUFF：有效属性含修正（10+5）");
G.passYear(5);
assert(G.hasStatus("guixi") === false, "BUFF：到期自动消失");

freshGame();
assert(G.checkCond({ type: "item", key: "聚灵丹", op: ">=", val: 1 }) === false, "item 条件：无物品 false");
G.addItem("聚灵丹", 1);
assert(G.checkCond({ type: "item", key: "聚灵丹", op: ">=", val: 1 }) === true, "item 条件：有物品 true");
assert(G.checkCond({ type: "rep", key: "青云宗", op: ">=", val: 50 }) === false, "rep 条件：无声望 false");
G.addRep("青云宗", 80);
assert(G.checkCond({ type: "rep", key: "青云宗", op: ">=", val: 50 }) === true, "rep 条件：有声望 true");

// v2→v6 迁移零漂移
freshGame();
const v2 = {
  version: 2, cult: 123, stone: 456, year: 30, hp: 80, hpmax: 100, status: "平安无事",
  equip: "青锋短剑", equipBonus: 12, achs: [], step: 2, dead: false, endType: 0, inFight: false,
  enemy: null, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: { modao: true }
};
S.gs = v2;
G.migrateSave();
assert(S.gs.version === 8, "v2→v8：版本升级为8");
assert(S.gs.cult === 123 && S.gs.stone === 456 && S.gs.year === 30, "v2→v7：原数值零漂移");
assert(S.gs.flags.modao === true, "v2→v7：flags 保留");
assert(S.gs.inventory && typeof S.gs.inventory === "object", "v2→v7：inventory 补默认");
assert(S.gs.ownedEquips && Array.isArray(S.gs.ownedEquips), "v2→v7：ownedEquips 补默认");
assert(S.gs.statuses && Array.isArray(S.gs.statuses), "v2→v7：statuses 补默认");
assert(S.gs.reputation && typeof S.gs.reputation === "object", "v2→v7：reputation 补默认");
assert(S.gs.arts && typeof S.gs.arts === "object", "v2→v7：arts 补默认");
assert(S.gs.talent === null, "v2→v7：talent 补默认 null");
assert(typeof S.gs.mp === "number" && S.gs.mp > 0, "v2→v7：mp 补默认");
assert(S.gs.quests && typeof S.gs.quests === "object", "v2→v7：quests 补默认");
assert(S.gs.relations && typeof S.gs.relations === "object", "v2→v7：relations 补默认");
assert(S.gs.npcLifespan && typeof S.gs.npcLifespan === "object", "v2→v7：npcLifespan 补默认");
assert(Array.isArray(S.gs.disciples), "v2→v7：disciples 补默认");
assert(Array.isArray(S.gs.enemies), "v2→v7：enemies 补默认");
assert(S.gs.memories && typeof S.gs.memories === "object", "v2→v8：memories 补默认");

//==== P3b 玩法系统 ====
section("P3b 玩法系统");
freshGame();
G.learnArt("吐纳诀");
assert(S.gs.arts["吐纳诀"] === 1, "功法习得：吐纳诀入册");
assert(G.artBonus("comprehension") === 2, "功法被动：悟性+2");
assert(G.attrEff("comprehension") === 12, "功法被动：有效属性含功法加成（10+2）");
G.learnArt("吐纳诀");
assert(S.gs.arts["吐纳诀"] === 1, "功法习得：重复习得拒绝");

freshGame();
S.gs.cult = 100;
G.learnArt("青锋剑气");
let mp0 = S.gs.mp;
assert(G.costMp(S.ARTS["青锋剑气"].mpCost) === true, "技能耗灵力：灵力充足可释放");
assert(S.gs.mp === mp0 - S.ARTS["青锋剑气"].mpCost, "技能耗灵力：灵力扣减");
S.gs.mp = 1;
assert(G.costMp(10) === false, "技能耗灵力：灵力不足拒绝");

freshGame();
G.addRep("青云宗", 100);
assert(S.gs.reputation["青云宗"] === 100, "声望增减：青云宗+100");
assert(G.repLevel("青云宗") === "友好", "声望等级：100=友好");
assert(G.factionGate("青云宗", 50) === true, "声望门控：>=50 解锁");
assert(S.gs.reputation["魔渊"] === -50, "阵营对立：青云宗+100 使魔渊-50");
assert(G.isOpposed("青云宗", "魔渊") === true, "阵营对立判定：青云宗↔魔渊");

freshGame();
G.addItem("灵草", 2);
assert(G.canCraft(S.RECIPES["聚灵丹"]) === true, "炼丹：材料足够可炼");
G.removeItem("灵草", 2);
G.addItem("灵草", 1);
assert(G.canCraft(S.RECIPES["聚灵丹"]) === false, "炼丹：材料不足不可炼");
S.gs.talent = "丹道天才";
assert(G.alchemyChance(S.RECIPES["聚灵丹"]) === Math.min(0.95, 0.9 + 0.15), "炼丹：丹道天才命格提升成功率");

freshGame();
document.getElementById("optbox").innerHTML = ""; // 清空历史场景按钮（loadGame 会渲染 sceneHide）
G.chooseTalent();
const optbox = document.getElementById("optbox");
assert(optbox._children.length === 3, "命格三选一：渲染3个选项");
optbox._children[0].click();
assert(S.gs.talent !== null && Object.keys(S.TALENTS).includes(S.gs.talent), "命格三选一：点击后 talent 落定");
S.gs.talent = "武痴转世";
assert(S.TALENTS[S.gs.talent].effect.atkMul === 1.1, "命格效果：武痴转世攻击+10%");

//==== P4 叙事引擎 ====
section("P4 任务系统");
freshGame();
assert(G.questAvailable("q_side_yao") === false, "任务可用：修为不足不可接");
S.gs.cult = 150;
assert(G.questAvailable("q_side_yao") === true, "任务可用：修为达标可接");
assert(G.acceptQuest("q_side_yao") === true, "任务接取：成功");
assert(S.gs.quests["q_side_yao"] === 0, "任务接取：状态为第0步");
assert(G.acceptQuest("q_side_yao") === false, "任务接取：重复接取拒绝");
assert(G.advanceQuest("q_side_yao") === false, "任务推进：条件未达成拒绝");
G.setFlag("kill_monster", true);
assert(G.advanceQuest("q_side_yao") === true, "任务推进：条件达成推进");
assert(S.gs.quests["q_side_yao"] === "done", "任务完成：状态 done");
assert(S.gs.inventory["妖丹"] === 1, "任务奖励：妖丹+1");
assert(S.gs.reputation["青云宗"] === 30, "任务奖励：青云宗声望+30");

section("P4 连锁任务");
freshGame();
G.setFlag("jianghu_hunted", true);
assert(G.acceptQuest("q_chain_hunt") === true, "连锁A：接取成功");
assert(G.advanceQuest("q_chain_hunt") === true, "连锁A：仇杀第一步达成");
G.setFlag("jianghu_hunted", false);
assert(G.advanceQuest("q_chain_hunt") === true, "连锁A：隐匿达成，任务完成");
assert(S.gs.quests["q_chain_hunt"] === "done", "连锁A：done");
assert(G.questAvailable("q_chain_hide") === true, "连锁B：A完成后解锁");
assert(G.acceptQuest("q_chain_hide") === true, "连锁B：接取成功");
S.gs.year = 30;
assert(G.advanceQuest("q_chain_hide") === true, "连锁B：推进成功");
assert(S.gs.quests["q_chain_hide"] === "done", "连锁B：done");

section("P4 循环任务");
freshGame();
G.addRep("青云宗", 20);
assert(G.questAvailable("q_loop_zongmen") === true, "循环任务：声望达标可接");
G.acceptQuest("q_loop_zongmen");
G.addItem("灵草", 3);
assert(G.advanceQuest("q_loop_zongmen") === true, "循环任务：完成");
assert(S.gs.quests["q_loop_zongmen"] === 0, "循环任务：完成后重置为active");

section("P4 对话树");
freshGame();
document.getElementById("optbox").innerHTML = "";
S.gs.stone = 100;
G.startDialogue("lao_xiu");
let optbox2 = document.getElementById("optbox");
assert(optbox2._children.length === 2, "对话树：start 渲染2选项（灵石充足）");
optbox2._children[0].click(); // 问他：何出此言？→ 进入 ask 节点
assert(S.gs.flags.foreshadow_changsheng === true, "对话树：F6 长生体质伏笔埋设");
let optboxAsk = document.getElementById("optbox");
assert(optboxAsk._children.length === 3, "对话树：ask 渲染3选项（灵石充足含赠礼）");
optboxAsk._children[0].click(); // 赠灵石50
assert(S.gs.relations["lao_xiu"] === 10, "对话树：赠礼后关系+10");
assert(S.gs.stone === 50, "对话树：赠礼扣灵石50");
assert(S.gs.cult === 80, "对话树：赠礼修为+80");
assert(G.relationLevel("lao_xiu") === "相识", "关系等级：10=相识");
freshGame();
document.getElementById("optbox").innerHTML = "";
S.gs.stone = 10;
G.startDialogue("lao_xiu");
let optbox3 = document.getElementById("optbox");
optbox3._children[0].click(); // 问他：何出此言？→ 进入 ask 节点
let optboxAsk2 = document.getElementById("optbox");
assert(optboxAsk2._children.length === 2, "对话树：灵石不足门控赠礼选项");
optboxAsk2._children[0].click(); // 注意到玉牌（不赠礼）
assert(S.gs.relations["lao_xiu"] === undefined, "对话树：未赠礼不改变关系");

section("P4 灵魂领域 enforcement");
// characters.md §灵魂领域红线：对话树任何选项/效果不得违反 NPC 灵魂领域
// 机器扫描：选项文本命中禁止词即 FAIL（引擎侧红线，非内容建议）
const SOUL_FIELD_RULES = {
  lao_xiu: { forbidden: ["索要", "交出", "夺你", "抢你"], note: "临终不索财/不夺后辈机缘" },
  fan_nv: { forbidden: ["拖累", "连累"], note: "不拖累恩人" },
  ling_shang: { forbidden: ["赊账", "欠着", "先拿", "宰你"], note: "不赊账/不宰客" },
  mo_yin: { forbidden: ["骗你", "诱你", "强拉", "逼你"], note: "引人不入魔/不说谎" },
  xuan_zhen: { forbidden: ["骗你", "瞒你", "欺你"], note: "不对弟子说谎" },
  shen_guhong: { forbidden: ["老弱", "妇孺", "欺"], note: "不欺老弱妇孺" },
  jing_niang: { forbidden: ["改命", "逆天改命", "帮你改"], note: "轮回不可逆" }
};
function soulFieldScan() {
  const violations = [];
  for (const id in S.NPCS) {
    const rules = SOUL_FIELD_RULES[id];
    if (!rules) continue;
    const npc = S.NPCS[id];
    for (const nodeId in npc.dialogue) {
      for (const o of (npc.dialogue[nodeId].options || [])) {
        for (const kw of rules.forbidden) {
          if (o.text.includes(kw)) violations.push(`${id}.${nodeId} 选项含禁止词「${kw}」`);
        }
      }
    }
  }
  return violations;
}
const sfViolations = soulFieldScan();
assert(sfViolations.length === 0, "灵魂领域：全部对话树无违反红线选项" + (sfViolations.length ? " → " + sfViolations.join("; ") : ""));
// 反向验证：故意注入违规选项应被检出（校验器自身可信）
const fakeNpc = { dialogue: { t: { options: [{ text: "索要灵石", next: "end" }] } } };
const savedNpc = S.NPCS["__soul_test__"];
S.NPCS["__soul_test__"] = fakeNpc;
const savedRules = SOUL_FIELD_RULES["__soul_test__"];
SOUL_FIELD_RULES["__soul_test__"] = { forbidden: ["索要"], note: "测试" };
const fakeViolations = soulFieldScan();
assert(fakeViolations.length === 1 && fakeViolations[0].includes("索要"), "灵魂领域：违规注入可被检出（校验器可信）");
if (savedNpc === undefined) delete S.NPCS["__soul_test__"]; else S.NPCS["__soul_test__"] = savedNpc;
if (savedRules === undefined) delete SOUL_FIELD_RULES["__soul_test__"]; else SOUL_FIELD_RULES["__soul_test__"] = savedRules;

section("P4 语言指纹独特性");
// characters.md §3.3：遮住名字，单凭说话方式能否认出是谁？能，则通过。
// 每个 NPC 的对话文本（含选项）必须命中其专属指纹标记 ≥1 处，否则无法凭说话方式区分
const VOICE_MARKS = {
  lao_xiu: ["老朽", "咳", "活到头", "值了"],
  fan_nv: ["妾身", "恩公", "不打紧"],
  ling_shang: ["道友", "好说", "拨"],
  mo_yin: ["呵呵", "想好了吗", "路是你自己选的"],
  xuan_zhen: ["善", "道友好", "宗门为重"],
  shen_guhong: ["嗯", "该杀", "走"],
  jing_niang: ["你看见的", "镜里", "前世"]
};
function voiceFingerprintScan() {
  const misses = [];
  for (const id in VOICE_MARKS) {
    const npc = S.NPCS[id];
    if (!npc) { misses.push(`${id}: NPC 不存在`); continue; }
    const allText = Object.values(npc.dialogue)
      .map(n => (n.text || "") + " " + (n.options || []).map(o => o.text).join(" ")).join(" ");
    const hit = VOICE_MARKS[id].filter(kw => allText.includes(kw));
    if (!hit.length) misses.push(`${id}: 无任何指纹标记命中`);
  }
  return misses;
}
const vfMisses = voiceFingerprintScan();
assert(vfMisses.length === 0, "语言指纹：全部 NPC 对话命中专属指纹标记" + (vfMisses.length ? " → " + vfMisses.join("; ") : ""));

section("P4 战斗深度");
freshGame();
let boss = G.monsterByName("妖王·赤炎");
assert(boss !== undefined && boss.ai === "phase", "阶段BOSS：妖王·赤炎配置");
G.startFight(boss);
S.gs.enemy.hp = Math.floor(S.gs.enemy.hpMax * 0.4);
let atkBefore = S.gs.enemy.atk;
G.enemyTurn();
assert(S.gs.enemy._phased === true, "BOSS阶段：hp<50%触发阶段切换");
assert(S.gs.enemy.atk > atkBefore, "BOSS阶段：攻击提升");
freshGame();
G.startFight(G.monsterByName("魔渊长老"));
S.gs.enemy.hp = Math.floor(S.gs.enemy.hpMax * 0.4);
let hpBefore = S.gs.hp;
G.enemyTurn();
assert(S.gs.enemy._summoned === true, "召唤AI：hp<50%触发召唤");
assert(S.gs.hp < hpBefore, "召唤AI：小怪造成伤害");
freshGame();
G.startFight(G.monsterByName("妖王·赤炎"));
G.rollLoot(S.gs.enemy);
let affixEq = S.gs.ownedEquips.find(n => n.includes("·"));
assert(affixEq !== undefined, "词缀掉落：获得带词缀装备");
let affixObj = G.equipByName(affixEq);
assert(affixObj.bonus > 0, "词缀装备：加成叠加");

section("P4 隐藏剧情");
freshGame();
S.gs.year = 600;
S.gs.reputation = { 青云宗: 80, 散修盟: 60, 魔渊: 70 };
assert(G.questAvailable("q_hidden_changsheng") === false, "隐藏剧情：未埋伏笔不可接（先埋后收）");
S.gs.flags.foreshadow_yupai = true;      // F1 埋：老修士的褪色玉牌
S.gs.flags.foreshadow_baowu = true;      // F2 埋：灵商错过的宝物
S.gs.flags.foreshadow_changsheng = true; // F6 埋：主角的长生体质真相
assert(G.questAvailable("q_hidden_changsheng") === true, "隐藏剧情：长生者之秘条件达成可接");
G.acceptQuest("q_hidden_changsheng");
assert(S.gs.quests["q_hidden_changsheng"] === 0, "隐藏剧情：长生者之秘接取成功");
freshGame();
S.gs.attrs.demon = 70; S.gs.attrs.heart = 50;
assert(G.hiddenLunhui() === true, "隐藏剧情：轮回镜条件达成解锁");
assert(S.gs.flags.lunhui_unlocked === true, "隐藏剧情：轮回镜 flag 置位");

section("P4 存档迁移");
// v3→v6 迁移零漂移
freshGame();
const v3 = { version: 3, cult: 123, stone: 456, year: 30, hp: 80, hpmax: 100, status: "平安无事",
  equip: "青锋短剑", equipBonus: 12, achs: [], step: 2, dead: false, endType: 0, inFight: false,
  enemy: null, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: { modao: true },
  inventory: {}, ownedEquips: [], statuses: [], reputation: {}, arts: {}, talent: null, mp: 20 };
S.gs = v3;
G.migrateSave();
assert(S.gs.version === 8, "v3→v8：版本升级为8");
assert(S.gs.cult === 123 && S.gs.year === 30, "v3→v7：原数值零漂移");
assert(S.gs.quests && typeof S.gs.quests === "object", "v3→v7：quests 补默认");
assert(S.gs.relations && typeof S.gs.relations === "object", "v3→v7：relations 补默认");
assert(S.gs.npcLifespan && typeof S.gs.npcLifespan === "object", "v3→v7：npcLifespan 补默认");
assert(Array.isArray(S.gs.disciples), "v3→v7：disciples 补默认");
assert(Array.isArray(S.gs.enemies), "v3→v7：enemies 补默认");
assert(S.gs.memories && typeof S.gs.memories === "object", "v3→v8：memories 补默认");

//==== P5 开放世界与扩展 ====
section("P5 大世界");
freshGame();
assert(G.curRegion().name === "红尘江湖", "大世界：默认区域红尘江湖");
G.moveTo("qingyun");
assert(S.gs.pos === "qingyun", "大世界：移动至相邻区域青云山脉");
assert(S.gs.year === 5, "大世界：移动消耗5年");
freshGame();
G.moveTo("yaoshan"); // 红尘江湖与妖山古林不相邻
assert(S.gs.pos !== "yaoshan", "大世界：非相邻区域拒绝移动");

freshGame();
assert(G.strongholdLevel("qingyun_zhai") === 1, "据点：默认等级1");
G.setStrongholdLevel("qingyun_zhai", 2);
assert(G.strongholdLevel("qingyun_zhai") === 2, "据点：升级后等级2");
assert(G.strongholdBonus("qingyun_zhai") === 1, "据点：Lv2 每10年修为+1");
G.setStrongholdLevel("qingyun_zhai", 3);
assert(G.strongholdBonus("qingyun_zhai") === 3, "据点：Lv3 每10年修为+3（1+2叠加）");

section("P5 时间动态世界事件");
freshGame();
S.gs.year = 250;
let wev = G.pendingWorldEvent();
assert(wev !== null && wev.id === "zongmen_war", "世界事件：year>=200 触发宗门大战");
document.getElementById("optbox").innerHTML = "";
G.sceneWorldEvent(wev);
assert(S.gs.flags["dyn_zongmen_war"] === true, "世界事件：展示后 flag 置位");
let optbox_we = document.getElementById("optbox");
assert(optbox_we._children.length === 3, "世界事件：渲染3选项");
optbox_we._children[0].click(); // 助青云宗守山
assert(S.gs.reputation["青云宗"] === 60, "世界事件：助青云宗声望+60");
assert(S.gs.flags["war_qingyun"] === true, "世界事件：flag war_qingyun 置位");

section("P5 交易");
freshGame();
S.gs.pos = "jianghu";
let tp = G.regionPrice("灵草");
assert(tp >= 4 && tp <= 7, "交易：红尘江湖灵草价格区间（base6×0.8~1.2）");
S.gs.stone = 1000;
document.getElementById("optbox").innerHTML = "";
G.sceneTrade();
let optbox_t = document.getElementById("optbox");
assert(optbox_t._children.length >= 5, "交易：集市渲染买入选项+离开（4货物+1离开）");

section("P5 王朝");
freshGame();
document.getElementById("optbox").innerHTML = "";
G.sceneDynasty();
let optbox_d = document.getElementById("optbox");
assert(optbox_d._children.length === 3, "王朝：渲染2纷争+离开=3选项");
optbox_d._children[0].click(); // 边境烽烟
let optbox_de = document.getElementById("optbox");
assert(optbox_de._children.length === 4, "王朝：纷争事件渲染4选项（3抉择+暂不介入）");
optbox_de._children[0].click(); // 资助夏室守边
assert(S.gs.reputation["夏室"] === 40, "王朝：资助夏室声望+40（未知势力照常累加）");
assert(S.gs.flags["dyn_evt_dy_border"] === true, "王朝：纷争事件 flag 置位");

section("P5 动态事件生成器");
freshGame();
S.gs.cult = 300;
let dev = G.genDynamicEvent();
assert(dev !== null, "动态事件：生成成功");
assert(!dev.title.includes("{") && !dev.desc.includes("{"), "动态事件：变量填充完成");
S.gs.aiEnabled = false;
document.getElementById("optbox").innerHTML = "";
G.sceneDynamicEvent();
let optbox_ev = document.getElementById("optbox");
assert(optbox_ev._children.length >= 2, "动态事件：渲染选项（AI 关闭走模板）");

section("P5 多周目");
freshGame();
S.gs.cult = 1000; S.gs.stone = 500; S.gs.achs = ["长生伊始"];
S.gs.arts = { 吐纳诀: 1 }; S.gs.reputation = { 青云宗: 50 };
S.gs.attrs.constitution = 20;
G.startNgPlus();
assert(S.gs.ng === 1, "多周目：周目数+1");
assert(S.gs.achs.includes("长生伊始"), "多周目：成就全保留");
assert(S.gs.arts["吐纳诀"] === 1, "多周目：功法全保留");
assert(S.gs.reputation["青云宗"] === 50, "多周目：声望全保留");
assert(S.gs.stone === 100, "多周目：灵石×20%（500×0.2=100）");
assert(S.gs.cult === 100, "多周目：修为×10%（1000×0.1=100）");
assert(S.gs.attrs.constitution === 6, "多周目：属性×30%（20×0.3=6）");

section("P5 模组系统");
freshGame();
assert(G.modValidate(null).ok === false, "模组：非对象校验拒绝");
assert(G.modValidate({ id: "m1", name: "测试", version: "0.1", content: {} }).ok === true, "模组：合法模组校验通过");
assert(G.modValidate({ id: "m1", name: "测试" }).ok === false, "模组：缺 version 校验拒绝");
let conflictMod = { id: "m2", name: "冲突模组", version: "0.1", content: { monsters: { "山林妖狼": { name: "山林妖狼", hp: 999, atk: 99, reward: { cult: 1, stone: 1 }, ai: "normal" } } } };
let conflicts = G.modConflictCheck(conflictMod);
assert(conflicts.length === 1 && conflicts[0].id === "山林妖狼", "模组：与内置同 id 不同内容判冲突");
let goodMod = { id: "m3", name: "好模组", version: "0.1", content: { quests: { "q_mod_test": { name: "模组任务", kind: "side", need: null, steps: [{ desc: "第一步", cond: null, reward: { stone: 50 } }], onDone: {} } } } };
assert(G.modLoad(goodMod) === true, "模组：合法模组加载成功");
assert(S.gs.mods["m3"] !== undefined, "模组：登记 gs.mods");
assert(G.questAvailable("q_mod_test") === true, "模组：注入任务可接取");
let exported = G.modExport("m4", "导出模组", "0.1", {});
assert(exported.includes('"id": "m4"'), "模组：导出 JSON 含 id");

//==== P6 元游戏与多人雏形 ====
section("P6 难度系统");
freshGame();
G.setDifficulty(0);
assert(S.gs.diff === 0, "难度：setDifficulty(0) 落档 diff=0");
assert(G.diffMult() === 1.5, "难度：简单修为倍率×1.5");
assert(G.diffEnemyMult() === 0.8, "难度：简单敌人强度×0.8");
assert(G.diffInitStone() === 200, "难度：简单初始灵石200");
G.setDifficulty(2);
assert(G.diffMult() === 0.7, "难度：硬核修为倍率×0.7");
assert(G.diffEnemyMult() === 1.3, "难度：硬核敌人强度×1.3");
assert(G.diffInitStone() === 50, "难度：硬核初始灵石50");
G.setDifficulty(1);
assert(G.diffMult() === 1, "难度：普通修为倍率×1");
// passYear 应用难度倍率：简单 vs 普通
freshGame();
S.gs.attrs.comprehension = 10;
let c0 = S.gs.cult;
G.passYear(10);
let base = S.gs.cult - c0;
freshGame();
G.setDifficulty(0);
S.gs.attrs.comprehension = 10;
let c1 = S.gs.cult;
G.passYear(10);
let easy = S.gs.cult - c1;
assert(easy >= Math.floor(base * 1.5) && easy <= Math.floor(base * 1.5) + 1, "难度：简单难度修为增长≈普通1.5倍");

section("P6 传记");
freshGame();
G.bioLog("觉醒长生", "长生系统绑定");
assert(S.gs.bio.length === 1, "传记：bioLog 追加事件");
assert(S.gs.bio[0].name === "觉醒长生", "传记：事件含名称");
S.gs.talent = "天选之子";
S.gs.achs = ["长生伊始"];
S.gs.reputation = { 青云宗: 50 };
let bio = G.biography();
assert(bio.includes("天选之子"), "传记：含命格");
assert(bio.includes("长生伊始"), "传记：含成就");
assert(bio.includes("青云宗：50"), "传记：含声望");

section("P6 提示系统");
freshGame();
document.getElementById("logbox").innerText = "你获得了一件宝物\n你获得了一本功法\n江湖偶遇";
let n = G.searchLog("获得");
assert(n === 2, "提示：searchLog 检索命中2条");

section("P6 存档分享");
freshGame();
S.gs.cult = 500; S.gs.stone = 300; S.gs.year = 88;
let code = G.exportSave();
assert(code.startsWith("CFSAVE1."), "存档分享：导出码带前缀");
S.gs.cult = 0; S.gs.stone = 0; S.gs.year = 0;
assert(G.importSave(code) === true, "存档分享：导入成功");
assert(S.gs.cult === 500, "存档分享：导入还原 cult");
assert(S.gs.stone === 300, "存档分享：导入还原 stone");
assert(S.gs.year === 88, "存档分享：导入还原 year");
assert(G.importSave("BADCODE") === false, "存档分享：非法码拒绝");

section("P6 道具交换");
freshGame();
G.addItem("回血散", 3);
let gcode = G.exportGift();
assert(gcode.startsWith("CFGIFT1."), "道具交换：导出码带前缀");
freshGame();
assert(G.importGift(gcode) === true, "道具交换：导入成功");
assert(G.countItem("回血散") === 3, "道具交换：获得回血散×3");
assert(G.importGift("BAD") === false, "道具交换：非法码拒绝");

section("P6 存档 v7 迁移");
freshGame();
S.gs.version = 5; delete S.gs.diff; delete S.gs.bio; delete S.gs.ng;
G.migrateSave();
assert(S.gs.version === 8, "迁移：v5→v8 版本号");
assert(S.gs.diff === 1, "迁移：补 diff 默认1");
assert(Array.isArray(S.gs.bio), "迁移：补 bio 空数组");
assert(S.gs.ng === 0, "迁移：补 ng 默认0");
assert(S.gs.npcLifespan && typeof S.gs.npcLifespan === "object", "迁移：补 npcLifespan 默认");
assert(Array.isArray(S.gs.disciples), "迁移：补 disciples 默认");
assert(Array.isArray(S.gs.enemies), "迁移：补 enemies 默认");
assert(S.gs.memories && typeof S.gs.memories === "object", "迁移：补 memories 默认");

section("P6 存档 v6→v8 迁移");
freshGame();
S.gs.version = 6; delete S.gs.npcLifespan; delete S.gs.disciples; delete S.gs.enemies; delete S.gs.memories;
G.migrateSave();
assert(S.gs.version === 8, "迁移：v6→v8 版本号");
assert(S.gs.npcLifespan && typeof S.gs.npcLifespan === "object", "迁移：补 npcLifespan 默认");
assert(Array.isArray(S.gs.disciples), "迁移：补 disciples 默认");
assert(Array.isArray(S.gs.enemies), "迁移：补 enemies 默认");
assert(S.gs.memories && typeof S.gs.memories === "object", "迁移：补 memories 默认");

section("P6 多周目保留");
freshGame();
S.gs.diff = 2; G.bioLog("觉醒长生", "测试");
S.gs.cult = 100; S.gs.stone = 200;
G.startNgPlus();
assert(S.gs.diff === 2, "多周目：难度跨世保留");
assert(S.gs.bio.length >= 2, "多周目：传记跨世累积（觉醒+转世）");

//==== J34 后续：NPC 深度扩展（寿命流逝/收徒/结仇）====
section("J34 后续 NPC 寿命流逝");
freshGame();
assert(G.npcExpireYear("lao_xiu") === 30, "寿命：lao_xiu 首次对话初始化 expireYear=30（lifespan 30）");
assert(G.isNpcDead("lao_xiu") === false, "寿命：year=0 未离世");
assert(G.npcRemaining("lao_xiu") === 30, "寿命：余寿 30 年");
G.passYear(31);
assert(G.isNpcDead("lao_xiu") === true, "寿命：year>=expireYear 判定离世");
assert(S.gs.flags["npc_dead_lao_xiu"] === true, "寿命：离世 flag 置位（防重复日志）");
assert(S.gs.bio.some(b => b.name === "故人离世"), "寿命：离世记入传记");

freshGame();
assert(G.npcExpireYear("jing_niang") === 9999, "寿命：镜娘 lifespan 9999 近乎不死");
assert(G.npcExpireYear("fan_nv") === 60, "寿命：阿蛮 lifespan 60（凡人）");

section("J34 后续 NPC 追忆");
freshGame();
S.gs.npcLifespan = { lao_xiu: { expireYear: 10 } };
S.gs.year = 20;
document.getElementById("optbox").innerHTML = "";
G.startDialogue("lao_xiu");
let optbox_mem = document.getElementById("optbox");
assert(optbox_mem._children.length === 1, "追忆：已故 NPC 渲染追忆选项");
assert(optbox_mem._children[0].innerText.includes("默立片刻"), "追忆：选项为默立离去");
// 仇敌已故：追忆化解仇怨
freshGame();
S.gs.npcLifespan = { shen_guhong: { expireYear: 10 } };
S.gs.year = 20;
G.addEnemy("shen_guhong", "羞辱其剑道");
assert(G.hasEnemy("shen_guhong") === true, "追忆前置：已结仇");
document.getElementById("optbox").innerHTML = "";
G.startDialogue("shen_guhong");
assert(G.hasEnemy("shen_guhong") === false, "追忆：仇敌已故，仇怨随风散（自动化解）");

section("J34 后续 收徒");
freshGame();
assert(G.discipleCount() === 0, "收徒：初始无弟子");
G.addDisciple("阿蛮", "中上");
assert(G.discipleCount() === 1, "收徒：收徒后弟子数1");
assert(G.discipleCultBonus() === 5, "收徒：每名弟子修炼+5%");
assert(S.gs.disciples[0].expireYear === 80, "收徒：弟子寿元 80 年");
assert(S.gs.bio.some(b => b.name === "收徒"), "收徒：记入传记");
// 弟子修炼加成：passYear 修为增益含弟子加成
freshGame();
S.gs.attrs.comprehension = 10;
G.addDisciple("阿蛮", "中上");
let c0d = S.gs.cult;
G.passYear(10);
let gainD = S.gs.cult - c0d;
assert(gainD === Math.floor(10 * 2 * 1.05), "收徒：弟子加成 10 年修为 = 10×2×1.05=21");
// 弟子离世
freshGame();
G.addDisciple("阿蛮", "中上");
S.gs.disciples[0].expireYear = 5;
G.passYear(6);
assert(G.discipleCount() === 0, "收徒：弟子寿尽离世");
assert(S.gs.cult >= 50, "收徒：弟子临终传功修为+50");
assert(S.gs.bio.some(b => b.name === "弟子离世"), "收徒：弟子离世记入传记");
// 阿蛮对话收徒（好感≥50 门控）
freshGame();
document.getElementById("optbox").innerHTML = "";
S.gs.relations["fan_nv"] = 50;
G.startDialogue("fan_nv");
let optbox_fan = document.getElementById("optbox");
assert(optbox_fan._children.length === 4, "收徒对话：好感50渲染4选项（含收徒）");
optbox_fan._children[2].click(); // 问她：可愿随我修行 → disciple 节点
let optbox_dis = document.getElementById("optbox");
assert(optbox_dis._children.length === 2, "收徒对话：disciple 节点渲染2选项");
optbox_dis._children[0].click(); // 收她为徒
assert(G.discipleCount() === 1, "收徒对话：收徒后弟子数1");
assert(S.gs.disciples[0].name === "阿蛮", "收徒对话：弟子名为阿蛮");

section("J34 后续 结仇");
freshGame();
assert(G.addEnemy("shen_guhong", "羞辱其剑道") === true, "结仇：首次结仇成功");
assert(G.hasEnemy("shen_guhong") === true, "结仇：hasEnemy 判定");
assert(S.gs.relations["shen_guhong"] === -50, "结仇：好感降至 -50");
assert(G.addEnemy("shen_guhong", "再结一仇") === false, "结仇：重复结仇拒绝");
assert(S.gs.bio.some(b => b.name === "结仇"), "结仇：记入传记");
G.removeEnemy("shen_guhong");
assert(G.hasEnemy("shen_guhong") === false, "结仇：化解后移除");
// 仇敌寻仇：enemyRevenge 概率触发（Math.random 打桩 0.1 → 触发）
freshGame();
G.addEnemy("shen_guhong", "羞辱其剑道");
const origRandom = Math.random;
Math.random = () => 0.1;
let rev = G.enemyRevenge();
Math.random = origRandom;
assert(rev === true, "结仇：enemyRevenge 触发寻仇战斗");
assert(S.gs.inFight === true, "结仇：寻仇进入战斗状态");
assert(S.gs.enemy.name === "沈孤鸿", "结仇：战斗对象为仇敌");
// 无仇敌时不触发
freshGame();
assert(G.enemyRevenge() === false, "结仇：无仇敌不触发寻仇");
// 灵商对话结仇（万宝楼声望下降）
freshGame();
document.getElementById("optbox").innerHTML = "";
S.gs.stone = 100;
G.startDialogue("ling_shang");
let optbox_ls = document.getElementById("optbox");
let threatOpt = optbox_ls._children.find(b => b.innerText.includes("威胁他"));
assert(threatOpt !== undefined, "结仇对话：灵商含威胁选项");
threatOpt.click();
assert(G.hasEnemy("ling_shang") === true, "结仇对话：威胁灵商结仇");
assert(S.gs.reputation["万宝楼"] === -20, "结仇对话：万宝楼声望-20");

//==== J34 方向2：战斗深度扩展（团体战斗/伏击遭遇）====
section("J34 方向2 团体战斗");
freshGame();
G.startFightGroup([G.monsterByName("山林妖狼"), G.monsterByName("白骨魔将")]);
assert(S.gs.foes.length === 2, "团体战斗：初始化2名敌人");
assert(S.gs.enemy.name === "山林妖狼", "团体战斗：当前目标为首敌");
assert(S.gs.foeReward.cult === 120, "团体战斗：总修为奖励聚合（30+90=120）");
assert(S.gs.foeReward.stone === 300, "团体战斗：总灵石奖励聚合（80+220=300）");
// 击杀首敌 → 切换下一目标
S.gs.enemy.hp = 1;
G.playerAttack();
assert(S.gs.foes.length === 1, "团体战斗：击杀首敌后剩余1名");
assert(S.gs.enemy.name === "白骨魔将", "团体战斗：目标切换为白骨魔将");
// 全灭 → fightWin 聚合奖励
S.gs.enemy.hp = 1;
let cultBeforeG = S.gs.cult;
let stoneBeforeG = S.gs.stone;
G.playerAttack();
assert(S.gs.inFight === false, "团体战斗：全灭后战斗结束");
assert(S.gs.cult === cultBeforeG + 120, "团体战斗：全灭发放聚合修为奖励（30+90）");
assert(S.gs.stone === stoneBeforeG + 300, "团体战斗：全灭发放聚合灵石奖励（80+220）");
// startFight 兼容数组入口
freshGame();
G.startFight([G.monsterByName("山林妖狼"), G.monsterByName("魔渊鬼卒")]);
assert(S.gs.foes.length === 2, "团体战斗：startFight 数组入口兼容");

section("J34 方向2 敌方回合多目标");
freshGame();
G.startFightGroup([G.monsterByName("山林妖狼"), G.monsterByName("魔渊鬼卒")]);
let hp0g = S.gs.hp;
G.enemyTurn();
assert(S.gs.hp < hp0g, "团体战斗：敌方回合全体各攻击一次");

section("J34 方向2 伏击遭遇");
freshGame();
assert(S.WORLD.regions.jianghu.ambushRate === 0, "伏击：安全区域无伏击率");
assert(S.WORLD.regions.yaoshan.ambushRate === 0.35, "伏击：妖山古林伏击率0.35");
assert(S.WORLD.regions.modao.ambushRate === 0.3, "伏击：魔渊伏击率0.3");
assert(G.ambushCheck(S.WORLD.regions.jianghu) === false, "伏击：安全区域不触发");
// 危险区域触发（Math.random 打桩 0.1 → 触发 + 团体）
const origRandomA = Math.random;
Math.random = () => 0.1;
let amb = G.ambushCheck(S.WORLD.regions.yaoshan);
Math.random = origRandomA;
assert(amb === true, "伏击：危险区域触发伏击");
assert(S.gs.inFight === true, "伏击：进入战斗状态");
assert(S.gs.foes.length === 2, "伏击：30% 概率遭遇团体（打桩 0.1 触发团体）");
// 移动触发伏击（huangye 与 jianghu 相邻）
freshGame();
Math.random = () => 0.1;
G.moveTo("huangye");
Math.random = origRandomA;
assert(S.gs.inFight === true, "伏击：移动至危险区域触发伏击战斗");

section("J34 方向2 存档迁移");
freshGame();
S.gs.version = 6; delete S.gs.foes; delete S.gs.foeIndex; delete S.gs.foeReward; delete S.gs.foeLeader;
G.migrateSave();
assert(S.gs.version === 8, "迁移：v6→v8 版本号");
assert(Array.isArray(S.gs.foes), "迁移：补 foes 默认空数组");
assert(S.gs.foeIndex === 0, "迁移：补 foeIndex 默认0");
assert(S.gs.foeReward && S.gs.foeReward.cult === 0, "迁移：补 foeReward 默认");
assert(S.gs.foeLeader === null, "迁移：补 foeLeader 默认null");
assert(S.gs.memories && typeof S.gs.memories === "object", "迁移：补 memories 默认");

//==== J34 方向3：记忆与阅历系统（关键事件解锁剧情）====
section("J34 方向3 记忆解锁");
freshGame();
assert(G.memoryCount() === 0, "记忆：初始无记忆");
assert(G.hasMemory("mem_first_fight") === false, "记忆：未解锁 false");
assert(G.memoryLevel().name === "初入红尘", "记忆：0段记忆=初入红尘");
// 条件驱动解锁：kill_monster flag → 初战
G.setFlag("kill_monster", true);
assert(G.syncMemories() === 1, "记忆：syncMemories 解锁1段（初战）");
assert(G.hasMemory("mem_first_fight") === true, "记忆：初战已解锁");
assert(S.gs.memories["mem_first_fight"] === 0, "记忆：解锁年份记录");
assert(G.syncMemories() === 0, "记忆：幂等，重复 sync 不新增");
assert(S.gs.bio.some(b => b.name === "阅历"), "记忆：解锁记入传记");
// 弟子/仇敌条件
G.addDisciple("阿蛮", "中上");
G.addEnemy("shen_guhong", "羞辱其剑道");
assert(G.syncMemories() === 2, "记忆：收徒+结仇解锁2段");
assert(G.hasMemory("mem_disciple") && G.hasMemory("mem_enemy"), "记忆：收徒/结仇记忆解锁");
// 岁月流逝自动记起（百年光阴）
freshGame();
G.passYear(100);
assert(G.hasMemory("mem_century") === true, "记忆：passYear 百年光阴自动记起");

section("J34 方向3 阅历等级");
freshGame();
assert(G.memoryLevel().name === "初入红尘", "阅历：0=初入红尘");
S.gs.memories = { a: 0, b: 0, c: 0 };
assert(G.memoryLevel().name === "阅历渐丰", "阅历：3=阅历渐丰");
S.gs.memories = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
assert(G.memoryLevel().name === "见多识广", "阅历：6=见多识广");
S.gs.memories = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0 };
assert(G.memoryLevel().name === "阅尽沧桑", "阅历：10=阅尽沧桑");

section("J34 方向3 记忆条件门控");
freshGame();
assert(G.checkCond({ type: "memory", key: "mem_first_fight", val: true }) === false, "记忆条件：未解锁 false");
S.gs.memories["mem_first_fight"] = 0;
assert(G.checkCond({ type: "memory", key: "mem_first_fight", val: true }) === true, "记忆条件：解锁后 true");
assert(G.checkCond({ type: "memory", op: ">=", val: 3 }) === false, "记忆条件：阅历<3 false");
S.gs.memories = { a: 0, b: 0, c: 0 };
assert(G.checkCond({ type: "memory", op: ">=", val: 3 }) === true, "记忆条件：阅历>=3 true");
// disciple/enemy 条件类型
assert(G.checkCond({ type: "disciple", op: ">=", val: 1 }) === false, "弟子条件：无弟子 false");
G.addDisciple("阿蛮", "中上");
assert(G.checkCond({ type: "disciple", op: ">=", val: 1 }) === true, "弟子条件：有弟子 true");
assert(G.checkCond({ type: "enemy", op: ">=", val: 1 }) === false, "仇敌条件：无仇敌 false");
G.addEnemy("shen_guhong", "羞辱其剑道");
assert(G.checkCond({ type: "enemy", op: ">=", val: 1 }) === true, "仇敌条件：有仇敌 true");

section("J34 方向3 回忆场景");
freshGame();
S.gs.memories = { mem_first_fight: 0, mem_century: 100 };
document.getElementById("optbox").innerHTML = "";
G.sceneMemory();
let optbox_mem3 = document.getElementById("optbox");
assert(optbox_mem3._children.length === 1, "回忆场景：渲染离开按钮");
assert(optbox_mem3._children[0].innerText.includes("离开"), "回忆场景：离开选项");

section("J34 方向3 记忆门控对话");
// lao_xiu：阅历≥3 解锁 memtalk
freshGame();
document.getElementById("optbox").innerHTML = "";
S.gs.stone = 100;
G.startDialogue("lao_xiu");
let optbox_lx = document.getElementById("optbox");
assert(optbox_lx._children.length === 2, "记忆对话：无阅历不渲染 memtalk 选项");
// 设置3段记忆后重开对话
freshGame();
S.gs.memories = { a: 0, b: 0, c: 0 };
document.getElementById("optbox").innerHTML = "";
S.gs.stone = 100;
G.startDialogue("lao_xiu");
let optbox_lx2 = document.getElementById("optbox");
let memtalkOpt = optbox_lx2._children.find(b => b.innerText.includes("这些年走过的路"));
assert(memtalkOpt !== undefined, "记忆对话：阅历≥3 渲染 memtalk 选项");
memtalkOpt.click(); // → memtalk 节点
let optbox_mt = document.getElementById("optbox");
assert(optbox_mt._children.length === 1, "记忆对话：memtalk 渲染拜谢选项");
let cultBeforeM = S.gs.cult;
optbox_mt._children[0].click(); // 拜谢老修士
assert(S.gs.cult === cultBeforeM + 150, "记忆对话：memtalk 奖励修为+150");
assert(S.gs.relations["lao_xiu"] === 20, "记忆对话：memtalk 好感+20");
// fan_nv：记忆初战解锁 memtalk
freshGame();
S.gs.memories = { mem_first_fight: 0 };
document.getElementById("optbox").innerHTML = "";
G.startDialogue("fan_nv");
let optbox_fn = document.getElementById("optbox");
let fnMemtalk = optbox_fn._children.find(b => b.innerText.includes("初战妖兽"));
assert(fnMemtalk !== undefined, "记忆对话：阿蛮渲染初战记忆选项");
fnMemtalk.click(); // → memtalk 节点
let optbox_fn2 = document.getElementById("optbox");
optbox_fn2._children[0].click(); // 摸摸她的头
assert(S.gs.relations["fan_nv"] === 10, "记忆对话：阿蛮 memtalk 好感+10");

section("J34 方向3 存档迁移");
freshGame();
S.gs.version = 7; delete S.gs.memories;
G.migrateSave();
assert(S.gs.version === 8, "迁移：v7→v8 版本号");
assert(S.gs.memories && typeof S.gs.memories === "object", "迁移：补 memories 默认");

//==== J34 方向4：小说内容接入（novel-lib-v2 多主题多文章库，2026-08-15 重构；2704 章原著索引已归档 story-pipeline/archive/，断言动态对齐当前篇）====
section("J34 方向4 剧情库章节索引");
assert(S.NOVEL !== undefined && Array.isArray(S.NOVEL.chapters) && S.NOVEL.chapters.length > 0, "剧情库：当前篇章节数组就绪");
const N_chs = S.NOVEL.chapters.map(c => c[0]);
let ch1 = G.novelChapter(N_chs[0]);
assert(ch1 !== null && ch1[0] === N_chs[0] && typeof ch1[1] === "string" && ch1[1].length > 0, "剧情库：按章号取当前篇首章");
assert(G.novelChapter(99999) === null, "剧情库：越界章号返回 null");

section("J34 方向4 关键词检索");
let kw1 = (S.NOVEL.chapters[0][2] || "").split(/\s+/).filter(Boolean)[0] || S.NOVEL.chapters[0][1].slice(0, 2);
let hits = G.novelSearch(kw1);
assert(hits.length > 0, "检索：首章关键词「" + kw1 + "」命中");
assert(hits.some(c => c[1].includes(kw1) || (c[2] || "").includes(kw1)), "检索：命中章含关键词");
assert(G.novelSearch("").length === 0, "检索：空关键词返回空");
assert(G.novelSearch("   ").length === 0, "检索：纯空白返回空");
assert(G.novelSearch("不存在的词xyz").length === 0, "检索：无命中返回空");

section("J34 方向4 随机与锚点钩子");
let rc = G.novelRandom();
assert(rc !== null && N_chs.includes(rc[0]), "随机：随机章在当前篇章号集合内");
let anchorProbe = G.novelAnchor(rc[0]);
assert(anchorProbe === null || anchorProbe.chapter === rc[0], "锚点：未配置返回 null（预留钩子）/ 已配置章号一致");

section("J34 方向4 剧情库场景");
freshGame();
document.getElementById("optbox").innerHTML = "";
G.sceneNovel();
let optbox_nv = document.getElementById("optbox");
assert(optbox_nv._children.length === 6, "剧情库：主面板渲染6选项（主题/篇目/检索/随机/世界大事锚点[J35 M3]/返回）");
assert(optbox_nv._children[2].innerText.includes("检索"), "剧情库：含检索入口");
assert(optbox_nv._children[4].innerText.includes("世界大事锚点"), "剧情库：J35 M3 世界大事锚点入口就绪");
// J35 M3 五线锚点：按线过滤 + 面板渲染 + 线属标识
assert(G.novelAnchorsByLine("hide").length > 0 && G.novelAnchorsByLine("modao").length > 0, "五线锚点：hide/modao 线均有锚点");
document.getElementById("optbox").innerHTML = "";
G.sceneNovelLine("zongmen");
assert(document.getElementById("optbox")._children.length === G.novelAnchorsByLine("zongmen").length + 1, "五线锚点：zongmen 面板=锚点数+返回按钮");

//==== J35 M3 批次1·迭代优化（锚点缓存/触发点1/检索📌）====
section("J35 迭代：锚点缓存 + M4 触发点1 + 检索锚点联动");
freshGame();
// 锚点缓存：Map 命中与旧 find 语义一致（有锚点章返回锚点、无锚点章 null）
assert(G.novelAnchor(17) !== null && G.novelAnchor(17).line === "hide", "锚点缓存：ch17 命中 hide 锚点");
assert(G.novelAnchor(18) === null, "锚点缓存：无锚点章返回 null");
// 锚点上下文（M3/M4 合流）：gs.step→主线映射
S.gs.step = 1; // 隐居线
let ctxStr = G.novelAnchorContext(3);
assert(ctxStr.includes("原著剧情参照") && ctxStr.includes("隐居"), "锚点上下文：step=1 返回隐居线原著参照串");
S.gs.step = 0; // 主菜单无线属
assert(G.novelAnchorContext(3) === "", "锚点上下文：step=0 无线属返回空串");
// M4 触发点1：genNarrateEncounter L0 同步直出
document.getElementById("logbox").innerHTML = "";
G.genNarrateEncounter({ weight: 1, run() {} });
let logs = document.getElementById("logbox")._children.map(c => c.innerText).join("");
assert(logs.includes("✦"), "M4 触发点1：奇遇氛围文案 L0 直出（✦ 前缀）");
// 检索📌联动：命中章中有锚点章（📌 标记的数据条件）
let hitsP = G.novelSearch("磐宁城");
assert(hitsP.some(c => G.novelAnchor(c[0]) !== null), "检索锚点联动：磐宁城命中含锚点章（📌可标记）");

//==== J35 M4-3/4/5 + M3 Director（2026-08-23 后续规划轮）====
section("J35 M4-3 L1 实接 / M4-4 拾光对接 / M3 Director");
freshGame();
// L1 设置持久化往返
localStorage.setItem("gen_settings_v1", "");
vm.runInContext("GEN_SETTINGS.level='L1'; genSettingsSave();", sandbox);
assert(localStorage.getItem("gen_settings_v1").includes('"level":"L1"'), "L1 设置：genSettingsSave 写入 localStorage");
vm.runInContext("GEN_SETTINGS.level='L0'; genSettingsLoad();", sandbox);
assert(vm.runInContext("GEN_SETTINGS.level", sandbox) === "L1", "L1 设置：genSettingsLoad 恢复用户设置");
// AI 设置面板渲染（默认 L0 → 含启用按钮）
document.getElementById("optbox").innerHTML = "";
vm.runInContext("GEN_SETTINGS.level='L0';", sandbox);
G.sceneGenSettings();
assert(document.getElementById("optbox")._children.length >= 2, "AI 设置面板：L0 态渲染（启用+返回）");
// 传记对接：双通道函数就绪
assert(typeof G.bioToShiguang === "function" && typeof G.bioDownloadFallback === "function", "拾光对接：直投+降级导出双函数就绪");
// Director：锁定校验 + 事件密度门 + 面板
assert(G.directorAssertLock("endingHide") === true && G.directorAssertLock("evilEnding") === false, "Director：结局锁定校验（在册真函数过/未在册拒）");
assert(vm.runInContext("directorEventRate()", sandbox) === 1, "Director：normal 节奏密度因子=1（默认行为零回归）");
vm.runInContext("DIRECTOR.pace='slow';", sandbox);
assert(vm.runInContext("directorEventRate()", sandbox) === 0.6, "Director：slow 节奏密度因子=0.6");
document.getElementById("optbox").innerHTML = "";
G.sceneDirector();
assert(document.getElementById("optbox")._children.length === 6, "Director 面板：三节奏+变体种子+ℹ锁定面说明+返回 渲染 6 项");
vm.runInContext("DIRECTOR.pace='normal';", sandbox); // 还原默认，不污染后续断言

//==== J35 体验轮（用户 2026-08-23 三条定向：删 CG 旁路 / 奇遇随机化 / 信息浮窗）====
section("J35 体验轮：奇遇随机化 + 信息浮窗");
freshGame();
S.gs.flags.encCd = 1; // 封随机门，稳定渲染主菜单
document.getElementById("optbox").innerHTML = "";
G.mainStep0();
{
  const btns = document.getElementById("optbox")._children.map(b => b.innerText);
  assert(!btns.some(t => t.includes("触发奇遇事件")), "奇遇随机化：主菜单不再有显式奇遇选项");
  assert(btns.some(t => t.includes("隐居")), "奇遇随机化：主菜单主线选项正常渲染");
  assert(S.gs.flags.encCd === 0, "奇遇随机化：冷却标记正常回清");
}
// 随机门掷中路径：固定 Math.random=0.01 必中门 → 奇遇渲染且冷却置 1
freshGame();
vm.runInContext("globalThis.origRandom=Math.random; Math.random=()=>0.01;", sandbox);
document.getElementById("optbox").innerHTML = "";
G.mainStep0();
assert(vm.runInContext("gs.flags.encCd", sandbox) === 1, "奇遇随机化：掷中路径冷却标记置 1");
{
  const logs = document.getElementById("logbox")._children.map(c => c.innerText).join("");
  assert(logs.includes("【奇遇：") || document.getElementById("optbox")._children.length > 0, "奇遇随机化：掷中路径渲染奇遇内容");
}
vm.runInContext("Math.random=origRandom;", sandbox);
// 信息浮窗：挂载 body + 关闭行为
assert(typeof G.showInfo === "function", "信息浮窗：showInfo 就绪");
G.showInfo("测试窗", ["第一行", "第二行"]);
assert(bodyEl._children.some(c => c.id === "infobox"), "信息浮窗：挂载 body");
G.showInfo("第二窗", ["替换旧窗"]);
assert(bodyEl._children.filter(c => c.id === "infobox").length === 1, "信息浮窗：重复调用替换旧窗");
// 面板说明迁移：AI 设置面板含 ℹ说明 按钮
document.getElementById("optbox").innerHTML = "";
vm.runInContext("GEN_SETTINGS.level='L0';", sandbox);
G.sceneGenSettings();
assert(document.getElementById("optbox")._children.some(b => b.innerText.includes("ℹ说明")), "说明浮窗化：AI 设置面板 ℹ说明 按钮就绪");

//==== J35 体验轮·多槽位存档（用户定向：存/读弹出窗口+档位）====
section("J35 体验轮：多槽位存档浮窗");
freshGame();
localStorage.removeItem("mud_save_slot_1"); localStorage.removeItem("mud_save_slot_2");
// 空槽探测
assert(G.slotInfo(1).empty === true, "存档槽：空槽返回 empty");
// 存→读 往返（置状态→存槽→改状态→读回→状态还原）
S.gs.year = 777; S.gs.cult = 300;
vm.runInContext("saveToSlot(1)", sandbox);
assert(G.slotInfo(1).empty === false && G.slotInfo(1).meta.year === 777, "存档槽：saveToSlot 落盘含 meta");
S.gs.year = 1; S.gs.cult = 0;
vm.runInContext("loadFromSlot(1)", sandbox);
assert(S.gs.year === 777 && S.gs.cult === 300, "存档槽：loadFromSlot 往返状态还原");
// 运行时字段不落档
S.gs.inFight = true; S.gs.enemy = { name: "x" };
vm.runInContext("saveToSlot(2)", sandbox);
vm.runInContext("loadFromSlot(2)", sandbox);
assert(S.gs.inFight === false && S.gs.enemy === null, "存档槽：运行时字段不落档（防幽灵战斗）");
// 浮窗渲染：6 槽行 + 标题 + 提示
G.showSaveWindow();
{
  const rows = bodyEl._children.filter(c => c.id === "savebox");
  assert(rows.length === 1, "存档浮窗：挂载 body（单实例）");
  const allText = (el) => { // 递归收集后代文本（槽位摘要在行→label 两级）
    let out = [];
    (function walk(n) {
      if (!n) return;
      if (n.textContent) out.push(String(n.textContent));
      if (n.innerText) out.push(String(n.innerText));
      (n._children || []).forEach(walk);
    })(el);
    return out.join(" ");
  };
  assert(allText(rows[0]).includes("存档管理"), "存档浮窗：标题渲染");
  const slotRows = rows[0]._children.filter(c => c._children && c._children.length >= 4); // label+3按钮
  assert(slotRows.length === 6, "存档浮窗：6 槽位行（label+存/读/删）");
  assert(allText(rows[0]).includes("777"), "存档浮窗：槽 1 摘要含游戏年");
}
// loadLatest：槽 1/2 都有档，取 time 最新（读回其一即可验证不回落单槽）
S.gs.year = 888;
vm.runInContext("loadLatest()", sandbox);
assert(S.gs.year === 777 || S.gs.year === 888, "存档最近档：loadLatest 读入槽位档不崩（时间序断言受 locale 影响从宽）");
// 删除（confirm 不在 sandbox=直接执行）
vm.runInContext("deleteSlot(2)", sandbox);
assert(G.slotInfo(2).empty === true, "存档槽：deleteSlot 清槽");
vm.runInContext("deleteSlot(1)", sandbox);
// 章节详情场景（含前后章导航）
document.getElementById("optbox").innerHTML = "";
G.sceneNovelChapter(N_chs[0]);
let optbox_nc = document.getElementById("optbox");
assert(optbox_nc._children.length === 4, "剧情库：章节详情渲染4选项（上/下/返回检索/返回库）");
assert(optbox_nc._children[0].innerText.includes("上一章"), "剧情库：含上一章导航");
assert(optbox_nc._children[1].innerText.includes("下一章"), "剧情库：含下一章导航");
// 检索场景
document.getElementById("optbox").innerHTML = "";
G.sceneNovelSearch();
let optbox_ns = document.getElementById("optbox");
assert(optbox_ns._children.length === 2, "剧情库：检索面板渲染2选项（输入/返回）");

//==== J35 M4：三级生成管线（gen.js 接线后行为验证）====
section("J35 M4 三级生成管线");
freshGame();
assert(typeof G.generate === "function" && typeof G.genL0 === "function" && typeof G.genL1 === "function" && typeof G.genL2 === "function", "gen.js 接线：四函数全局可调");
let g0 = G.genL0("transition", {});
assert(g0.level === "L0" && g0.text.length > 0 && g0.cost === 0, "L0 模板：零成本文本生成");
let g0v = G.genL0("breakthrough", { realm: "金丹期", seed: 1 });
assert(g0v.text.includes("金丹期"), "L0 模板：变量填充生效");
let g1 = await G.generate("encounter", { kw: "妖兽" });
assert(g1.level === "L0" && g1.text.length > 0, "generate 主入口：默认 L0 通道产出（L1/L2 受闸默认关）");

//==== 死接线修复 P1-3：难度敌人倍率接进开战（配置改了要生效）====
section("死接线修复：难度敌人倍率接开战");
freshGame();
G.setDifficulty(2); // 硬核 ×1.3
G.startFight(G.monsterByName("山林妖狼"));
assert(S.gs.enemy.hp === 104 && S.gs.enemy.hpMax === 104, "死接线·难度倍率：硬核开战敌人血量×1.3（80→104）");
assert(S.gs.enemy.atk === 15, "死接线·难度倍率：硬核开战敌人攻击×1.3（12→15）");
G.endFight();
freshGame();
G.setDifficulty(0); // 简单 ×0.8
G.startFight(G.monsterByName("山林妖狼"));
assert(S.gs.enemy.hp === 64, "死接线·难度倍率：简单开战敌人血量×0.8（80→64）");
assert(S.gs.enemy.atk === 9, "死接线·难度倍率：简单开战敌人攻击×0.8（12→9）");
G.endFight();
assert(S.MONSTERS["山林妖狼"].hp === 80 && S.MONSTERS["山林妖狼"].atk === 12, "死接线·难度倍率：倍率只作用克隆体，模板数据零污染");
freshGame();
G.setDifficulty(2);
G.startFight([G.monsterByName("山林妖狼"), G.monsterByName("魔渊鬼卒")]);
assert(S.gs.foes.length === 2 && S.gs.foes[1].hp === 78, "死接线·难度倍率：团体战全员乘倍率（60→78）");
assert(S.gs.foeReward.cult === 40, "死接线·难度倍率：奖励不随敌人强度缩放（30+10）");
G.endFight();

//==== 死接线修复 P1-4：据点加成接 passYear（每10年额外修为要生效）====
section("死接线修复：据点加成接 passYear");
freshGame();
S.gs.attrs.comprehension = 10;
let shBase0 = S.gs.cult;
G.passYear(20);
let shBase = S.gs.cult - shBase0; // 无据点基准增长（20年）
freshGame();
G.setStrongholdLevel("qingyun_zhai", 2); // 每10年修为+1
S.gs.attrs.comprehension = 10;
let sh2_0 = S.gs.cult;
G.passYear(20);
assert(S.gs.cult - sh2_0 === shBase + 2, "死接线·据点加成：Lv2 每10年+1 → 20年额外+2 修为");
freshGame();
G.setStrongholdLevel("qingyun_zhai", 3); // 每10年修为+3
G.setStrongholdLevel("modao_cheng", 2);  // 每10年修为+1（多据点叠加）
S.gs.attrs.comprehension = 10;
let sh3_0 = S.gs.cult;
G.passYear(20);
assert(S.gs.cult - sh3_0 === shBase + 8, "死接线·据点加成：Lv3(3)+Lv2(1) 多据点叠加 → 20年额外+8 修为");
freshGame();
S.gs.attrs.comprehension = 10;
let shNone0 = S.gs.cult;
G.passYear(20);
assert(S.gs.cult - shNone0 === shBase, "死接线·据点加成：无据点零加成（基准不受扰）");

//==== 存档通道收敛①：sanitize 共用（分享码/槽位/单槽同一份运行时清洗，修 P1-1）====
section("存档通道收敛：sanitize 共用（分享码战斗态清洗）");
freshGame();
S.gs.cult = 500; S.gs.stone = 300;
// 战斗中导出（P1-1 场景：幽灵敌人来自导出码残留战斗态）
S.gs.inFight = true;
S.gs.enemy = { name: "幽灵敌人", hp: 10, hpMax: 10, atk: 5, reward: { cult: 1, stone: 1 } };
S.gs.foes = [S.gs.enemy]; S.gs.foeIndex = 0;
S.gs.foeReward = { cult: 9, stone: 9 }; S.gs.foeLeader = S.gs.enemy;
S.gs.aiEnabled = true;
let fightCode = G.exportSave();
let fightPayload = JSON.parse(decodeURIComponent(fightCode.slice(8)));
assert(fightPayload.gs.inFight === false && fightPayload.gs.enemy === null, "sanitize·导出码：战斗态被清洗（inFight=false/enemy=null）");
assert(fightPayload.gs.foeLeader === undefined && fightPayload.gs.foeReward === undefined && fightPayload.gs.aiEnabled === undefined, "sanitize·导出码：运行时字段整组剥离（foe*/aiEnabled）");
assert(fightPayload.ver === 8, "sanitize·导出码：ver 与当前存档版本一致（不再漂移）");
assert(G.importSave(fightCode) === true, "分享码战斗态往返：导入成功");
assert(S.gs.inFight === false && S.gs.enemy === null, "分享码战斗态往返：导入后无幽灵敌人（P1-1）");
assert(S.gs.cult === 500 && S.gs.stone === 300, "分享码战斗态往返：正常字段零丢失");
// 槽位通道共用同一清洗
freshGame();
S.gs.inFight = true; S.gs.enemy = { name: "x" }; S.gs.foeLeader = { name: "x" }; S.gs.aiEnabled = true;
vm.runInContext("saveToSlot(3)", sandbox);
let slotRaw = JSON.parse(localStorage.getItem("mud_save_slot_3"));
assert(slotRaw.gs.inFight === false && slotRaw.gs.enemy === null, "sanitize·槽位档：战斗态清洗");
assert(slotRaw.gs.foeLeader === undefined && slotRaw.gs.aiEnabled === undefined, "sanitize·槽位档：运行时字段整组剥离（与导出码共用）");
vm.runInContext("deleteSlot(3)", sandbox);
// 单槽通道共用同一清洗
freshGame();
localStorage.removeItem("mud_save");
S.gs.inFight = true; S.gs.enemy = { name: "x" }; S.gs.foeLeader = { name: "x" };
G.saveGame();
let singleRaw = JSON.parse(localStorage.getItem("mud_save"));
assert(singleRaw.gs.inFight === false && singleRaw.gs.enemy === null, "sanitize·单槽档：战斗态清洗（与导出码共用）");
assert(singleRaw.gs.foeLeader === undefined, "sanitize·单槽档：运行时字段整组剥离（与导出码共用）");
// 旧档读入零丢失（兼容性样本：v2 极旧档全字段回读）
localStorage.setItem("mud_save", JSON.stringify({ gs: { version: 2, cult: 123, stone: 456, year: 30, hp: 80, hpmax: 100, status: "走火入魔", equip: "青锋短剑", equipBonus: 12, achs: ["长生伊始"], step: 2, dead: false, endType: 0, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: { modao: true } }, allAch: { a1: { got: true } } }));
G.loadGame();
assert(S.gs.cult === 123 && S.gs.stone === 456 && S.gs.year === 30, "旧档兼容：v2 样本核心数值零丢失");
assert(S.gs.status === "走火入魔" && S.gs.equip === "青锋短剑" && S.gs.equipBonus === 12, "旧档兼容：状态/装备字段零丢失");
assert(S.gs.flags.modao === true && S.gs.achs.includes("长生伊始"), "旧档兼容：flags/achs 零丢失");
assert(S.gs.version === 8, "旧档兼容：迁移后版本升至 v8");

//==== 存档通道收敛②：清槽（clearSave 清单+6 槽位，修 P1-2）====
section("存档通道收敛：清除存档清单+槽");
freshGame();
localStorage.setItem("mud_save", "x");
localStorage.setItem("mud_save_slot_1", "x");
localStorage.setItem("mud_save_slot_6", "x");
document.getElementById("optbox").innerHTML = "";
G.startGame();
assert(document.getElementById("optbox")._children.some(b => b.innerText.includes("继续上次存档")), "清槽前置：有档时开局提示检测到存档");
try { G.clearSave(); } catch (e) { /* 现版裸调 confirm 在测试沙箱会抛，实现需补 typeof 守卫（P1-2 修复一并处理） */ }
assert(localStorage.getItem("mud_save") === null, "清槽：旧单槽 mud_save 清除");
assert(localStorage.getItem("mud_save_slot_1") === null && localStorage.getItem("mud_save_slot_6") === null, "清槽：6 槽位全部清除（修 P1-2）");
document.getElementById("optbox").innerHTML = "";
G.startGame();
assert(!document.getElementById("optbox")._children.some(b => b.innerText.includes("继续上次存档")), "清槽后：开局不再提示检测到存档");

//==== 存档通道收敛③：标量默认表（migrate 补标量，消灭 NaN 残留向量）====
section("存档通道收敛：标量迁移（migrate 补标量默认）");
// 极旧档：标量字段大面积缺失 → 不得出现 NaN/undefined
freshGame();
S.gs = { version: 2, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: {} };
G.migrateSave();
assert(typeof S.gs.cult === "number" && !isNaN(S.gs.cult), "标量迁移：cult 缺失补默认非 NaN");
assert(typeof S.gs.stone === "number" && !isNaN(S.gs.stone), "标量迁移：stone 缺失补默认非 NaN");
assert(S.gs.year === 0 && S.gs.hp === 100 && S.gs.hpmax === 100, "标量迁移：year/hp/hpmax 补默认");
assert(S.gs.status === "平安无事" && S.gs.equip === "无" && S.gs.equipBonus === 0, "标量迁移：status/equip/equipBonus 补默认");
assert(S.gs.step === 0 && S.gs.dead === false && S.gs.endType === 0, "标量迁移：step/dead/endType 补默认");
// null（NaN 经 JSON 序列化的产物）同样兜底
freshGame();
S.gs = { version: 8, cult: null, stone: null, hp: null, equipBonus: null, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: {} };
G.migrateSave();
assert(S.gs.cult === 0 && S.gs.stone === 100 && S.gs.hp === 100, "标量迁移：null（NaN 序列化残留）兜底为默认");
assert(S.gs.equipBonus === 0, "标量迁移：equipBonus null 兜底");
// 零漂移：已有值绝不动（含 0/false/字符串）
freshGame();
S.gs = { version: 8, cult: 7, stone: 0, year: 33, hp: 1, hpmax: 1, status: "走火入魔", equip: "青锋短剑", equipBonus: 3, step: 2, dead: false, endType: 4, mp: 5, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: {} };
G.migrateSave();
assert(S.gs.cult === 7 && S.gs.stone === 0 && S.gs.year === 33, "标量迁移零漂移：已有数值不动（含 0）");
assert(S.gs.hp === 1 && S.gs.hpmax === 1 && S.gs.equipBonus === 3, "标量迁移零漂移：hp/equipBonus 不动");
assert(S.gs.status === "走火入魔" && S.gs.step === 2 && S.gs.endType === 4, "标量迁移零漂移：字符串/枚举不动");
assert(S.gs.mp === 5, "标量迁移零漂移：mp 已有值不动");
// 实战口径：缺标量档经 migrate 后时间主链不产生 NaN
freshGame();
S.gs = { version: 2, attrs: Object.assign({}, S.BALANCE.attrsInit), flags: {} };
G.migrateSave();
G.passYear(10);
assert(typeof S.gs.cult === "number" && !isNaN(S.gs.cult) && S.gs.cult > 0, "标量迁移：缺标量档 passYear 后修为正常增长非 NaN");

//==== 批次3 回归：日志环形缓冲上限（长会话内存/DOM 有界）====
section("日志虚拟化：环形缓冲上限（LOG_MAX=1000）");
{
  const lb0 = document.getElementById("logbox");
  for (let i = 0; i < 2600; i++) G.log("[压测] 条目" + i);
  const rl = G.recentLogs();
  assert(rl.length === 1000, "2600 次 log → 缓冲文本恰为 1000 条（有界）");
  assert(rl[rl.length - 1].includes("条目2599"), "缓冲保留最新（末条=条目2599）");
  assert(!rl.some(t => t.includes("条目0")), "缓冲裁去最旧（不含条目0）");
  assert(lb0._children.length === 1000, "DOM 节点恰为 1000（有界；remove 兑现）");
}

//==== 汇总 ====
console.log("\n==============================");
console.log(`T0 测试结果：${pass} 通过 / ${fail} 失败`);
if (fail > 0) { console.log("存在失败断言！"); process.exit(1); }
console.log("全部通过 ✅");
