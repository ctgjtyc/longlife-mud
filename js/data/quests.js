//==== data/quests.js：任务配置表（内容层 SSOT，P4 任务系统）====
// kind: main=主线（进入对应路线自动接取）/ side=支线 / loop=循环（完成后重置为 active）
//       chain=连锁（onDone.unlockQuest 解锁下一环）/ hidden=隐藏（条件达成才可见）
// steps: [{desc, cond(可空), reward(可空)}]；onDone: {flags, items, rep, cult, stone, attrs, unlockQuest}
// 引擎只解释（quest.js），条件一律走 checkCond（D4 唯一门控）
export const QUESTS={
 // ---- 主线 ×5（对应五条路线）----
 "q_main_hide":{
  name:"隐世问道",kind:"main",need:null,
  steps:[
   {desc:"寻一处幽谷隐居，静待岁月流转",cond:{type:"year",op:">=",val:30}},
   {desc:"隐居满百年，看遍四季轮回",cond:{type:"year",op:">=",val:100},reward:{cult:200}},
   {desc:"修为突破筑基期，迈入修仙正途",cond:{type:"attr",key:"cult",op:">=",val:200},reward:{stone:200}}
  ],
  onDone:{flags:{q_main_hide_done:true},rep:{散修盟:20}}
 },
 "q_main_jianghu":{
  name:"江湖历练",kind:"main",need:null,
  steps:[
   {desc:"闯荡江湖，历经红尘恩怨",cond:{type:"attr",key:"cult",op:">=",val:100}},
   {desc:"在江湖争斗中夺得一件法器",cond:{type:"item",key:"青锋短剑",op:">=",val:1},reward:{cult:150}}
  ],
  onDone:{flags:{q_main_jianghu_done:true}}
 },
 "q_main_zongmen":{
  name:"仙门求道",kind:"main",need:null,
  steps:[
   {desc:"拜入青云宗，成为宗门弟子",cond:{type:"flag",key:"zongmen",val:true}},
   {desc:"在宗门修行，修为突破金丹期",cond:{type:"attr",key:"cult",op:">=",val:500},reward:{rep:{青云宗:50}}}
  ],
  onDone:{flags:{q_main_zongmen_done:true}}
 },
 "q_main_modao":{
  name:"魔道沉沦",kind:"main",need:null,
  steps:[
   {desc:"踏入魔渊，走上魔道之路",cond:{type:"flag",key:"modao",val:true}},
   {desc:"修魔功至化神期，威震魔道",cond:{type:"attr",key:"cult",op:">=",val:2000},reward:{rep:{魔渊:50}}}
  ],
  onDone:{flags:{q_main_modao_done:true}}
 },
 "q_main_dungeon":{
  name:"秘境探险",kind:"main",need:null,
  steps:[
   {desc:"通关妖山古林副本",cond:{type:"flag",key:"dungeon_yaoshan",val:true}},
   {desc:"通关魔渊秘穴副本",cond:{type:"flag",key:"dungeon_magiccave",val:true},reward:{cult:200}},
   {desc:"通关上古星陨遗迹副本",cond:{type:"flag",key:"dungeon_starrelic",val:true},reward:{stone:300}}
  ],
  onDone:{flags:{q_main_dungeon_done:true}}
 },
 // ---- 支线 ×2 ----
 "q_side_yao":{
  name:"斩妖除魔",kind:"side",need:{type:"attr",key:"cult",op:">=",val:100},
  steps:[
   {desc:"击杀一头妖兽（妖山古林）",cond:{type:"flag",key:"kill_monster",val:true},reward:{items:{妖丹:1}}}
  ],
  onDone:{flags:{q_side_yao_done:true},rep:{青云宗:30}}
 },
 "q_side_lian":{
  name:"炼丹初窥",kind:"side",need:{type:"item",key:"灵草",op:">=",val:2},
  steps:[
   {desc:"成功炼制一枚聚灵丹",cond:{type:"item",key:"聚灵丹",op:">=",val:1},reward:{items:{灵草:1}}}
  ],
  onDone:{flags:{q_side_lian_done:true}}
 },
 // ---- 循环 ×1（宗门日常）----
 "q_loop_zongmen":{
  name:"宗门日常",kind:"loop",need:{type:"rep",key:"青云宗",op:">=",val:10},
  steps:[
   {desc:"为宗门采集灵草，充实库房",cond:{type:"item",key:"灵草",op:">=",val:3},reward:{rep:{青云宗:10},stone:50}}
  ],
  onDone:{flags:{q_loop_zongmen_done:true}}
 },
 // ---- 连锁 ×2（江湖仇杀 → 隐匿避祸）----
 "q_chain_hunt":{
  name:"江湖仇杀",kind:"chain",need:null,
  steps:[
   {desc:"卷入江湖仇杀，被仇家记下",cond:{type:"flag",key:"jianghu_hunted",val:true}},
   {desc:"成功隐匿行踪，摆脱仇家",cond:{type:"flag",key:"jianghu_hunted",val:false},reward:{cult:100}}
  ],
  onDone:{flags:{q_chain_hunt_done:true},unlockQuest:"q_chain_hide"}
 },
 "q_chain_hide":{
  name:"隐匿避祸",kind:"chain",need:{type:"flag",key:"q_chain_hunt_done",val:true},
  steps:[
   {desc:"深居简出，避过风头",cond:{type:"year",op:">=",val:20},reward:{stone:100}}
  ],
  onDone:{flags:{q_chain_hide_done:true}}
 },
 // ---- 隐藏 ×2（伏笔埋收：先埋后收，杜绝空降；埋设见 docs/story-craft/foreshadows.md）----
 "q_hidden_changsheng":{
  name:"长生者之秘",kind:"hidden",
  need:[
   {type:"year",op:">=",val:500},
   {type:"rep",key:"青云宗",op:">=",val:50},
   {type:"rep",key:"散修盟",op:">=",val:50},
   {type:"rep",key:"魔渊",op:">=",val:50},
   {type:"flag",key:"foreshadow_yupai",val:true},     // F1 埋：老修士的褪色玉牌
   {type:"flag",key:"foreshadow_baowu",val:true},     // F2 埋：灵商错过的宝物
   {type:"flag",key:"foreshadow_changsheng",val:true} // F6 埋：主角的长生体质真相
  ],
  steps:[
   {desc:"三系声望皆达友好，岁月过半千载，你隐约触及长生的真相",cond:{type:"year",op:">=",val:500},reward:{cult:500}},
   {desc:"参悟长生之秘，洞悉轮回真谛",cond:{type:"attr",key:"cult",op:">=",val:4000},reward:{attrs:{heart:10}}}
  ],
  onDone:{flags:{q_hidden_changsheng_done:true}}
 },
 "q_hidden_lunhui":{
  name:"轮回镜",kind:"hidden",
  need:[
   {type:"attr",key:"demon",op:">=",val:60},
   {type:"attr",key:"heart",op:">=",val:40},
   {type:"flag",key:"foreshadow_lunhui",val:true} // F4 埋：轮回镜的传说
  ],
  steps:[
   {desc:"正魔兼修，道心与魔性交织处窥见轮回古镜",cond:{type:"attr",key:"demon",op:">=",val:60},reward:{attrs:{heart:5}}},
   {desc:"直面镜中心魔，勘破前世今生",cond:{type:"attr",key:"cult",op:">=",val:3000},reward:{stone:500}}
  ],
  onDone:{flags:{q_hidden_lunhui_done:true}}
 }
};
