# 《系统赋我长生》深度实施方案 v0.5

> 日期：2026-08-12 ｜ 基线：规划 v0.4（批次框架）｜ 性质：执行级深度规划（步骤 + 细节到文件/函数/断言）
> 本文档是 v0.4 的下钻：每一批「做什么、改哪个文件、写什么函数、配什么数据、跑什么断言」全部锁定，执行时照单施工即可。

---

## 〇、当前工程快照（规划依据，2026-08-12 实测）

- 工程副本：`D:\AI-Kimi\全流程游戏开发\longlife-mud\`（原工程 `D:\AI-app\longlife-mud\` 保持不动）
- 基线构建验证：`python build.py` 通过（7 脚本内联 / 29 关键函数 / 产物 18.8KB）
- 代码现状：core.js(188 行) / story.js(224) / fight.js(94) / dungeons.js(37) / events.js(43) / main.js(16) / data/balance.js(27)
- **已预埋的 P3a 草稿**（未接线，可采纳或重写）：`js/data/items.js`（7 消耗品+4 材料）、`js/buff.js`（attrEff/tickStatuses）、`js/inventory.js`（addItem/useItem/gainEquip/sceneInventory）。本方案 P3a 按"采纳草稿 + 接线 + 测试"编排。
- 测试环境：Node v24.15.0 可用（仅测试用，不进产物）；构建仍 `python build.py`（stdlib）。

## 一、全局设计决策（跨批次统一遵守）

| # | 决策 | 细节 |
|---|------|------|
| D1 | 分层纪律 | data/ 只放配置表（纯数据，无函数逻辑）；引擎函数放对应模块；剧情只在 story/dungeons/events/encounter |
| D2 | 存档演进 | 每批新增字段走 `migrateSave()` 补默认；version 单调递增：v3(P3a)→v4(P3b)→v5(P4)→v6(P5)；迁移链逐段幂等 |
| D3 | 派生值不落档 | 境界（已有）、mpmax、有效属性 attrEff 全部运行时派生，存档只存基础值 |
| D4 | 条件表达式唯一门控 | 一切"选项出现/事件触发/任务解锁"走 `checkCond`，禁止散落 if 特判（剧情推进副作用除外） |
| D5 | 验证门禁 | 每批交付 = `python build.py` 绿 + `node test/run.mjs` 全断言传绿 + dist 双击可玩；断言只增不减 |
| D6 | 旧体验回归 | 每批断言含原 5 线 3 副本冒烟（至少：开局→隐居→年+30→存档→读档年不变） |
| D7 | 数值 SSOT | 新数值一律进 data/ 配置表；公式只在引擎层出现一次 |

## 二、批次总览与依赖

```
T0 测试基座 ─┬─→ P3a 容器与状态（背包/装备/状态/存档v3）
             └─→ P3b 玩法系统（功法/命格/势力/炼丹/奇遇）依赖 P3a 的背包与声望字段
P3a+P3b ─→ P4 叙事引擎（任务/对话树/战斗深度）依赖功法技能位与声望门控
P4 ─→ P5 开放世界（地图/动态世界/模组）依赖任务系统与事件表数据化
P5 ─→ P6 远期池（分享/元游戏）按需启动
```

---

## 三、T0 测试基座（随 P3a 第一步落地）

### 3.1 目标
把"浏览器实玩断言"替换为 Node 无头断言，批批可回归。

### 3.2 文件与步骤

**步骤 T0-1：新建 `test/run.mjs`**（唯一新文件，~120 行）

- DOM stub：
  - `makeEl()`：返回 `{innerText,innerHTML(setter 清空 children),style:{},children:[],className,onclick,appendChild(c),scrollTop,scrollHeight}`
  - `document.getElementById(id)`：Map 缓存懒创建；`document.createElement(tag)`：返回 makeEl()
  - `localStorage`：内存对象 `{getItem,setItem,removeItem}`
  - `window={}`，`console`
- 加载：读 `dist/longlife_mud.html`，正则提取全部 `<script>...</script>` 内联块，拼接后 `vm.runInContext`
- 启动：执行 `window.onload()`（= startGame）
- 交互工具：
  - `clickBtn(文本前缀)`：在 `optbox.children` 中找 `innerText.startsWith(前缀)` 的按钮并调 `onclick()`
  - `logText()`：拼接 logbox children 的 innerText，用于断言文本出现
- 断言库：`eq(actual,expected,msg)` / `ok(cond,msg)` / `includes(haystack,needle,msg)`，计数输出 `n/n passed`，非零退出码

**步骤 T0-2：build.py 自检清单扩充**

`KEY_FUNCS` 追加（按批次）：P3a 加 `addItem,removeItem,countItem,useItem,gainEquip,switchEquip,sceneInventory,addStatus,hasStatus,removeStatus,attrEff,tickStatuses`；P3b/P4 追加见对应章节。

**步骤 T0-3：基线断言（10 条，复刻 P2 浏览器验收）**

| # | 断言 | 操作路径 |
|---|------|----------|
| T1 | 开局 gs 存在、step=0、成就 a1 解锁 | onload 后直接查 |
| T2 | 隐居推进：年 0→30，修为 0→60 | clickBtn("① 寻一处山谷隐居") |
| T3 | 读档时间不推进：保存→过年→读档→年回退到保存点 | saveGame/passYear/loadGame |
| T4 | 境界 7 档边界 | realmOf(0/199/200/500/1000/2000/4000/8000) |
| T5 | checkCond：attr/flag/year 三类 true/false 各一 | 直接调函数 |
| T6 | v1 旧档迁移零漂移：构造无 version/attrs/flags 存档→loadGame→补默认且 cult 不变 | localStorage 注入 |
| T7 | 悟性=10 修炼公式原版一致：passYear(50)→cult+100 | 直接调 |
| T8 | 入魔联动：enterModao→demon=20、flags.modao=true | 直接调 |
| T9 | flags 因果：jianghu_hunted=true 时 sceneHide 出现「隐匿行踪」按钮 | 设 flag 后调 sceneHide 查 optbox |
| T10 | 战斗攻击公式含体魄：cult=0/equip=0/con=10 → dmg=20 | startFight+playerAttack |

---

## 四、P3a 容器与状态（背包 / 多装备 / BUFF / 存档 v3）

> 前置：T0 全绿。预估：改 4 文件 + 新建 3 文件（草稿已在）+ 测试 12 条。

### 4.1 数据模型（存档 v3 新增字段）

```js
gs.version      // 2 → 3
gs.inventory    // {}  物品名→数量
gs.ownedEquips  // ["破旧布衣"]  持有装备名
gs.statuses     // []  {id,name,years,attrMods:{},hpPerYear,cultPerYear}
gs.reputation   // {}  势力→数值（P3a 先建字段与条件接通，P3b 填内容）
```

### 4.2 文件级施工清单

| 步骤 | 文件 | 动作 | 细节 |
|------|------|------|------|
| A1 | `js/data/items.js` | 采纳草稿 | 7 消耗品 + 4 材料已定稿（见草稿），不再改动 |
| A2 | `js/buff.js` | 采纳草稿 | `addStatus/hasStatus/removeStatus/attrEff/tickStatuses`；attrEff=基础+存续修正；tick 在 passYear 内按 n 年结算并移除到期 |
| A3 | `js/inventory.js` | 采纳草稿+1 处修正 | 草稿 `sceneInventory` 中误写 `forlet:` 标签，执行时清除；换装遍历改普通 for |
| A4 | `js/core.js` | 改 5 处 | ① gs 初始化加 v3 四字段、version:3 ② `migrateSave()` 末尾补 v3 字段默认（`if(!gs.inventory)gs.inventory={}` 等四条）③ `passYear` 内 refreshUi 前插 `tickStatuses(n)`，修炼公式中 `gs.attrs.comprehension` 改 `attrEff("comprehension")` ④ `setEquip` 内同步 `ownedEquips` 去重收录 ⑤ `resetGame` 同步新字段 |
| A5 | `js/fight.js` | 改 1 处 | `playerAttack` 公式 `gs.attrs.constitution` → `attrEff("constitution")` |
| A6 | `js/story.js` | 改 1 处 | `mainStep0` 追加按钮 `🎒打开行囊` → `sceneInventory()` |
| A7 | `index.html` | 改 1 处 | script 按序追加：`js/data/items.js`(balance 之后)、`js/buff.js`、`js/inventory.js`（core 之后，fight 之前） |
| A8 | `build.py` | 改 1 处 | KEY_FUNCS 追加 T0-2 列出的 12 个函数 |
| A9 | `test/run.mjs` | 加断言 | 见 4.3 |

### 4.3 P3a 断言清单（12 条）

| # | 断言 |
|---|------|
| A-1 | addItem("回血散",2)→countItem=2；removeItem→1 |
| A-2 | useItem("回血散")：hp 40→90；hp 90 时用→封顶 hpmax=100 |
| A-3 | useItem("养魂丹")：soul 10→12 |
| A-4 | 材料不可使用：useItem("妖丹") 返回 false 且不扣数量 |
| A-5 | 龟息符：用后 hasStatus("guixi")=true；passYear(10) 修为 +25（悟性 15 生效）；再 passYear(1) 状态消失 |
| A-6 | 燃血禁丹：hpmax 100→80，con 临时 +8（attrEff=18），5 年后 attrEff 回落 10 |
| A-7 | gainEquip(青锋短剑)：ownedEquips 含两件、equipBonus=12 |
| A-8 | switchEquip("破旧布衣")：equipBonus 回 0；switchEquip 未持有装备返回 false |
| A-9 | item 条件门控：checkCond({type:"item",key:"妖丹"}) false→addItem 后 true |
| A-10 | rep 条件门控：reputation 空 false→`gs.reputation["青云宗"]=50` 后 `>=50` true |
| A-11 | v2→v3 迁移：构造 v2 存档（无四字段）→loadGame→四字段补默认、cult/year 不变 |
| A-12 | 行囊界面：mainStep0 有「行囊」按钮，点击后出现使用/换装按钮，「返回」回到 scene |

### 4.4 验收
`python build.py` 绿 + T0 10 条 + P3a 12 条全绿 + dist 双击可玩。风险：草稿 `forlet:` 语法错误（A3 已列修正）。

---

## 五、P3b 玩法系统（功法 / 命格 / 势力 / 炼丹炼器 / 奇遇）

> 前置：P3a 全绿。预估：新建 5 文件 + 改 6 文件 + 测试 15 条。

### 5.1 数据模型（存档 v4 新增字段）

```js
gs.arts     // {} 功法 id→层数(1..maxLevel)
gs.talent   // null → 命格 id（开局三选一，选定后锁定）
gs.mp       // 当前灵力；mpmax 派生 = 20 + attrEff("spirit")*2 + attrEff("soul")*1
gs.pills    // 炼丹/炼器产物直接入 inventory，不另设字段
```

### 5.2 配置表设计（data/ 三个新文件）

**`js/data/arts.js` — 功法与命格**（12 功法 + 3 命格，示例格式）：

```js
const ARTS={
 // passive: 习得即生效（经 attrEff 扩展或修炼增益钩子）
 "qingxin":{name:"清心诀",type:"passive",maxLevel:3,
   perLevel:{attrs:{heart:3}}, desc:"每层道心+3"},
 "tuntian":{name:"吞天魔功",type:"passive",maxLevel:5,need:{flag:"modao"},
   perLevel:{attrs:{demon:4},cultGainPct:10}, desc:"每层魔性+4，修炼速度+10%"},
 // active: 战斗中释放，耗 mp
 "lieyang":{name:"烈阳剑诀",type:"active",maxLevel:3,mp:15,
   dmg:{base:30,cultPct:8}, desc:"消耗15灵力，造成 30+修为×8% 伤害"},
 "xixue":{name:"吸血魔爪",type:"active",maxLevel:3,mp:12,need:{attr:"demon",op:">=",val:20},
   dmg:{base:18},leech:0.5, desc:"造成伤害的50%转化为生命"},
 // tribulation: 渡劫节点功法（境界≥渡劫期才可习，习得影响结局分支）
 "dujie":{name:"九转渡劫经",type:"tribulation",maxLevel:1,
   need:{attr:"cult",op:">=",val:4000}, desc:"渡劫期方可见的保命真经"}
};
const TALENTS={
 "tiandao":{name:"天道酬勤",desc:"修炼速度+15%",cultGainPct:15},
 "warborn":{name:"战血天生",desc:"体魄+5，战斗伤害+10%",attrs:{constitution:5},dmgPct:10},
 "linggen":{name:"天灵根",desc:"灵力上限+30，灵力恢复翻倍",mpmaxAdd:30}
};
```

**`js/data/factions.js` — 势力**（4 势力，两两对立）：

```js
const FACTIONS={
 "青云宗":{side:"正",oppose:"魔渊",desc:"名门正派"},
 "魔渊":  {side:"魔",oppose:"青云宗",desc:"魔道祖庭"},
 "散修盟":{side:"中立",desc:"江湖散修互助会"},
 "万宝楼":{side:"中立",desc:"修仙界第一商会"}
};
// 规则（引擎实现）：加某势力声望时，其对立势力自动 -50% 数额
```

**`js/data/recipes.js` — 炼丹炼器配方**（示例）：

```js
const RECIPES=[
 {id:"juling",name:"聚灵丹",kind:"炼丹",mat:{"灵草":2},stone:50,
  baseRate:70,ratePerSoul:1, out:{item:"聚灵丹",n:1}},
 {id:"huixue",name:"回血散",kind:"炼丹",mat:{"灵草":1},stone:20,baseRate:90,out:{item:"回血散",n:2}},
 {id:"qingfeng",name:"青锋剑·精炼",kind:"炼器",mat:{"星陨铁":1},stone:100,
  baseRate:60,ratePerSoul:1, out:{equip:"青锋短剑"}},
 // 成功率 = baseRate + 神魂×ratePerSoul（封顶 95）；失败材料减半返还
];
```

### 5.3 引擎模块（新建 3 文件）

| 文件 | 函数 | 职责 |
|------|------|------|
| `js/arts.js` | `learnArt(id)`（checkCond 校验 need+境界门控，层数+1）/ `artLevel(id)` / `castArt(id)`（战斗内：扣 mp→结算 dmg/leech→enemyTurn）/ `cultGainPctTotal()`（功法+命格百分比汇总，passYear 接入）/ `mpmax()` / `regenMp(n)`（passYear 每年回 10%） | 功法引擎 |
| `js/faction.js` | `addRep(name,n)`（对立势力自动 -n/2）/ `repSide()` / `sceneFactions()`（声望面板） | 声望引擎 |
| `js/encounter.js` | `triggerEncounter()`：奇遇表驱动（条件+权重），首批 6 个奇遇（见 5.5） | 奇遇引擎 |

### 5.4 现有文件改动

| 文件 | 改动 |
|------|------|
| `core.js` | gs/resetGame/migrateSave 加 v4 字段；passYear 修炼公式 × `(1+cultGainPctTotal()/100)` 并 `regenMp(n)`；refreshUi 加 mp 显示 |
| `fight.js` | fightTurn 增加「功法技能」子菜单（遍历已习 active 功法，mp 不足置灰文案）；playerAttack 伤害 ×(1+talent dmgPct) |
| `main.js` | startGame 开局插入命格三选一（选定进 gs.talent，锁定不再出现）；读档跳过 |
| `story.js` | mainStep0 加「修为面板（功法/命格）」「势力声望」「奇遇」三个入口按钮；魔道线 sceneModao 加魔道功法习得点 |
| `index.html` | info-bar 加 mp 显示位；script 追加 3 个 data 文件 + 3 个引擎文件 |
| `build.py` | KEY_FUNCS 追加 `learnArt,castArt,addRep,triggerEncounter,cultGainPctTotal,mpmax` |

### 5.5 首批奇遇（6 个，条件驱动）

| 奇遇 | 触发条件 | 效果 |
|------|----------|------|
| 古洞遗刻 | cult≥300 | 习得随机 passive 功法一层 |
| 灵草园 | 无 | 灵草×3 |
| 坠星之地 | year≥100 | 星陨铁×1，cult+50 |
| 魔修截杀 | flags.modao | 战斗（白骨魔将），胜则魔渊声望+10 |
| 宗门招贤 | 青云宗声望≥30 | 入宗门捷径，heart+5 |
| 心魔幻境 | demon≥30 | 神魂判定：soul≥15 过（heart+5），否则 hpmax-10 |

### 5.6 P3b 断言清单（15 条）

| # | 断言 |
|---|------|
| B-1 | 命格三选一：开局出现 3 个命格按钮，选「战血天生」后 constitution=15 且不再出现 |
| B-2 | learnArt("qingxin")×2→heart=6；超过 maxLevel 拒绝 |
| B-3 | need 门控：未入魔 learnArt("tuntian") 拒绝；入魔后成功 |
| B-4 | 渡劫功法门控：cult<4000 拒绝；≥4000 成功 |
| B-5 | castArt("lieyang")：mp-15，敌人掉血 30+cult×8%；mp 不足拒绝 |
| B-6 | xixue 吸血：造成的 50% 回血（封顶 hpmax） |
| B-7 | 功法修炼增益：习「吞天魔功」1 层后 passYear(100) 增益与公式一致 |
| B-8 | addRep("青云宗",20)→魔渊=-10 |
| B-9 | 炼丹成功分支（Math.random 打桩 0.1）：灵草-2、灵石-50、聚灵丹+1 |
| B-10 | 炼丹失败分支（打桩 0.99）：灵草-1（减半返还）、无产出 |
| B-11 | 炼器产出装备入 ownedEquips |
| B-12 | 心魔幻境两分支：soul=15 过 / soul=10 扣 hpmax |
| B-13 | 奇遇条件门控：cult<300 时古洞遗刻不可触发（权重表过滤） |
| B-14 | v3→v4 迁移零漂移 |
| B-15 | 全量回归：T0+P3a 22 条仍全绿 |

---

## 六、P4 叙事引擎（任务 / 对话树 / 关系网 / 战斗深度 / 隐藏剧情）

> 前置：P3b 全绿。预估：新建 4 文件 + 测试 18 条。以下为模块级设计（执行前再下钻到断言级，同 P3 深度）。

### 6.1 任务系统（存档 v5：`gs.quests={id:"active|done|failed"}`）

- 配置表 `data/quests.js`：`{id,name,kind:"main|side|loop|chain",need:条件,steps:[{desc,cond,reward}],onDone:{flags,items,rep,unlockQuest}}`
- 引擎 `quest.js`：`acceptQuest/advanceQuest/questAvailable`（checkCond 门控）；循环任务完成后重置为 active；连锁=onDone.unlockQuest
- 首批内容：主线任务化（5 线各 1 条）、支线 ×4、循环（宗门日常）×1、连锁 ×2（A 结果改变 B：江湖仇杀链→隐居隐匿链已有 flags 基础，升级为任务化）

### 6.2 NPC 对话树与关系网（存档 v5：`gs.relations={npcId:好感}`）

- `data/npcs.js`：`{id,name,faction,lifespan,affinity,dialogue:{nodeId:{text,options:[{text,need,effect,next}]}}}`
- 引擎 `dialogue.js`：多轮树遍历，选项 checkCond 门控，effect 可改关系/声望/flags
- 首批 4 个 NPC（落魄老修士/凡间女子/灵商/魔渊引路人，从 events.js 升级为对话树）

### 6.3 战斗深度

- 技能位：战斗菜单二级化（攻击/技能/防御/物品/逃跑），物品=战斗内用消耗品
- 敌人 AI：`data/monsters.js` 升级怪物配置 `{ai:"normal|enrage|summon|heal|phase",aiParam}`；阶段 BOSS：hp<50% 切阶段（攻+30%、换技能池）
- 词缀掉落：`loot.js` 按副本掉落表生成 `{equip,affix:{名,attrs}}`，词缀装备入 ownedEquips（名=本体+词缀）
- 新 BOSS ×2（妖王·阶段、魔渊长老·召唤）

### 6.4 隐藏剧情 ×2

- 「长生者之秘」：year≥500 且 三系声望均≥50 → 解锁真结局前置
- 「轮回镜」：demon≥60 且 heart≥40（正魔兼修）→ 隐藏副本
- 走 flags+条件表达式，不进主线锁定文件，符合「主线结局锁定」约束

### 6.5 P4 验收（断言方向）
连锁任务解锁、对话树条件分支可走完、关系值变化、BOSS 阶段切换、词缀装备属性叠加、隐藏剧情 flag 解锁、v4→v5 迁移。

---

## 七、P5 开放世界 + 扩展

> 前置：P4 全绿。预估：新建 6 文件 + 测试 20 条。

### 7.1 大世界（存档 v6：`gs.map={loc:"qinggu",visited:[]}`）
- `data/map.js`：格子图（节点+边+移动耗时年数）；`world.js`：移动=passYear(耗时)+随机路遇
- 时间动态世界：`worldline.js` 世界时间线事件表（year 区间+条件→世界级 flags，如「宗门大战」year 200-260 期间全图事件池变化），到点自行演变，无需玩家触发

### 7.2 据点建设（`gs.base={level,buildings:{}}`）
- 建筑配置表（灵田=每年灵草、丹房=炼丹成功率+10、藏经阁=悟性）；据点专属事件

### 7.3 交易与物价
- `trade.js`：地区物价系数表（万宝楼基准价×区域系数），买/卖接口，倒卖成就

### 7.4 动态事件生成器
- `gen.js`：模板×玩家状态（境界/声望/flags）生成小事件文本，静态模板库保底

### 7.5 多周目（存档 v6：`gs.legacy={runs,inheritBonus}`）
- 结局后「开启新轮回」：保留成就+继承加成（按结局类型给 cultGainPct），year/cult 归零

### 7.6 模组规范 v1
- `mod/` 规范文档 + `modloader.js`：JSON 包 `{meta:{id,version,deps},items,arts,quests,events}`；加载走统一 `validateMod()`（schema 校验+命名空间 `mod:id`+版本冲突检测）；AI 填充（Ollama）为可选开关 `gs.settings.ai=false` 默认关，不阻塞验收

### 7.7 P5 验收（断言方向）
移动耗时正确、世界时间线事件按 year 自动置 flag、据点半成品产出、物价系数、模组 JSON 合法加载/非法拒绝、多周目继承字段。

---

## 八、P6 远期池（启动前再下钻）

| 项 | 概要 |
|----|------|
| 存档分享 | 导出 Base64 串 / 导入校验（复用 migrateSave 管线） |
| 人物传记 | 从 log/flags/quests 汇总「生平年表」导出 Markdown |
| 难度系统 | simple/normal/hardcore → balance.js 三套系数（hardcore：重伤恢复×2、战斗伤害×1.3） |
| 提示系统 | 日志关键词检索 + 「可去地点/可接任务」面板（全量 checkCond 扫描） |

---

## 九、风险登记（v0.5 更新）

| 风险 | 等级 | 对策 |
|------|------|------|
| P3a 草稿 `forlet:` 语法错误 | 低 | A3 步骤已列修正，构建自检兜底 |
| passYear 接入点增多（tick/regen/功法增益）顺序敏感 | 中 | D7：passYear 内固定顺序 tick→cult→regen→refreshUi，断言 B-7 锁公式 |
| 测试 DOM stub 与真实浏览器差异 | 中 | 每批仍保留 dist 双击人工冒烟一次；stub 只覆盖用到的 API |
| 内容膨胀导致 story.js 再次臃肿 | 中 | P4 起新内容一律 data/ 配置表驱动，story.js 只留主线骨架 |
| 批次间存档字段漏迁移 | 中 | D2 + 每批「迁移零漂移」断言为固定项 |
| P5 体量最大易失控 | 高 | 7.x 已按子系统切块，允许 P5a(世界)/P5b(扩展) 二次拆分，验收各自独立 |

## 十、执行入口（每批开工四拍）

1. **分析**：diff 当前工程与本方案对应章节，确认前置断言全绿
2. **规划**：把本方案对应章节复制为当批任务卡，逐条勾选
3. **执行**：按文件级施工清单施工，数值只进 data/
4. **验证**：`python build.py` → `node test/run.mjs` → dist 双击冒烟 → 更新 README 进度表
