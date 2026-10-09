//==== data/monsters.js：怪物配置表（内容层 SSOT，P4 战斗深度）====
// ai: normal=普通 / enrage=狂暴（低血加攻）/ heal=治疗（低血回血）
//     summon=召唤（低血召小怪）/ phase=阶段BOSS（低血切阶段加攻）
// aiParam: {hpPct:触发血量比例, atkMul:加攻倍率, healPct:回血比例, minion:召唤小怪名, count:数量}
// affixDrop: 词缀池（击杀后按 loot.js 掉落词缀装备）
export const MONSTERS={
 "山林妖狼":{name:"山林妖狼",hp:80,atk:12,reward:{cult:30,stone:80},ai:"normal"},
 "白骨魔将":{name:"白骨魔将",hp:160,atk:22,reward:{cult:90,stone:220},ai:"normal"},
 "瘴气巨蟒":{name:"瘴气巨蟒",hp:220,atk:28,reward:{cult:130,stone:300},ai:"enrage",aiParam:{hpPct:0.5,atkMul:1.5}},
 "上古残魂":{name:"上古残魂",hp:350,atk:40,reward:{cult:280,stone:600},ai:"heal",aiParam:{hpPct:0.4,healPct:0.25}},
 "妖王·赤炎":{name:"妖王·赤炎",hp:500,atk:45,reward:{cult:400,stone:900},ai:"phase",aiParam:{hpPct:0.5,atkMul:1.3},affixDrop:["烈焰","妖气"]},
 "魔渊长老":{name:"魔渊长老",hp:420,atk:38,reward:{cult:350,stone:800},ai:"summon",aiParam:{hpPct:0.5,minion:"魔渊鬼卒",count:1},affixDrop:["噬魂","魔骨"]},
 "魔渊鬼卒":{name:"魔渊鬼卒",hp:60,atk:10,reward:{cult:10,stone:20},ai:"normal"}
};
// 兼容旧索引访问（monsterList[0..3] 与旧版顺序一致）
export const monsterList=Object.keys(MONSTERS).map(k=>MONSTERS[k]);
export function monsterByName(name){return MONSTERS[name]||monsterList.find(m=>m.name===name);}
