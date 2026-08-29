//==== data/memories.js：记忆配置表（内容层 SSOT，J34 方向3 记忆与阅历系统）====
// 记忆 = 玩家经历的关键事件，条件驱动解锁（need 走 checkCond 唯一门控）
// gs.memories = {id: 解锁年份}；syncMemories() 扫描本表，条件达成即记起
// 阅历等级由 memoryCount() 派生（见 js/memory.js）
const MEMORIES={
 "mem_first_fight":{name:"初战",desc:"第一次与妖兽搏杀，血染衣襟。",need:{type:"flag",key:"kill_monster",val:true}},
 "mem_join_sect":{name:"拜入山门",desc:"踏入青云宗，从此有了师门。",need:{type:"flag",key:"zongmen",val:true}},
 "mem_fall_demon":{name:"坠入魔道",desc:"一念之差，踏入魔渊。",need:{type:"flag",key:"modao",val:true}},
 "mem_yaoshan":{name:"妖山历险",desc:"妖山古林，瘴气与妖狼之间搏命。",need:{type:"flag",key:"dungeon_yaoshan",val:true}},
 "mem_magiccave":{name:"魔窟之行",desc:"魔窟深处，与魔修一战。",need:{type:"flag",key:"dungeon_magiccave",val:true}},
 "mem_starrelic":{name:"星陨遗迹",desc:"上古星陨遗迹，寻得机缘。",need:{type:"flag",key:"dungeon_starrelic",val:true}},
 "mem_lunhui":{name:"轮回镜界",desc:"照见前世今生，轮回不可逆。",need:{type:"flag",key:"lunhui_unlocked",val:true}},
 "mem_hunted":{name:"江湖追杀",desc:"结怨江湖，被迫隐匿行踪。",need:{type:"flag",key:"jianghu_hunted",val:true}},
 "mem_disciple":{name:"收徒传法",desc:"膝下弟子，传承长生之法。",need:{type:"disciple",op:">=",val:1}},
 "mem_enemy":{name:"结下仇怨",desc:"恩怨情仇，长生路上不寂寞。",need:{type:"enemy",op:">=",val:1}},
 "mem_century":{name:"百年光阴",desc:"活过百年，看尽人间聚散。",need:{type:"year",op:">=",val:100}},
 "mem_millennium":{name:"千年岁月",desc:"千年一瞬，故人皆已成灰。",need:{type:"year",op:">=",val:1000}},
 "mem_changsheng":{name:"长生之秘",desc:"伏笔渐明，长生的真相若隐若现。",need:{type:"flag",key:"foreshadow_changsheng",val:true}},
 "mem_war":{name:"宗门大战",desc:"亲历宗门大战，见证天下格局。",need:{type:"flag",key:"dyn_zongmen_war",val:true}}
};
