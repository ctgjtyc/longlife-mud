//==== data/arts.js：功法/命格配置表（内容层 SSOT，P3b）====
// 功法 type: passive=被动加成（attrMods 并入 attrEff）/ active=主动技能（战斗耗灵力）/ tribulation=渡劫节点功法（提升渡劫成功率）
// 数值全部在此配置，引擎只解释（对齐"一切数值进 data/ 配置表"约束）

export const ARTS={
 // ---- 被动功法（attrMods 常驻生效）----
 "吐纳诀":{type:"passive",cultReq:0,desc:"基础吐纳法，悟性+2",attrMods:{comprehension:2}},
 "锻体诀":{type:"passive",cultReq:50,desc:"淬炼肉身，体魄+3",attrMods:{constitution:3}},
 "养神诀":{type:"passive",cultReq:120,desc:"温养神魂，神魂+3",attrMods:{soul:3}},
 "聚灵诀":{type:"passive",cultReq:300,desc:"汇聚灵力，灵力+3",attrMods:{spirit:3}},
 "大衍心经":{type:"passive",cultReq:800,desc:"衍算天机，悟性+5、神魂+4",attrMods:{comprehension:5,soul:4}},
 "九转金身":{type:"passive",cultReq:2000,desc:"金身不坏，体魄+8、道心+5",attrMods:{constitution:8,heart:5}},
 // ---- 主动技能（战斗释放，耗灵力）----
 "青锋剑气":{type:"active",cultReq:100,mpCost:8,dmg:35,desc:"青锋剑意，消耗8灵力造成35伤害"},
 "烈焰焚天":{type:"active",cultReq:600,mpCost:18,dmg:80,desc:"焚天烈焰，消耗18灵力造成80伤害"},
 "冰封千里":{type:"active",cultReq:1500,mpCost:30,dmg:150,desc:"冰封千里，消耗30灵力造成150伤害"},
 "灭世魔焰":{type:"active",cultReq:3000,mpCost:45,dmg:260,desc:"魔焰滔天，消耗45灵力造成260伤害"},
 // ---- 渡劫节点功法（提升渡劫成功率）----
 "九转渡劫诀":{type:"tribulation",cultReq:4000,tribBonus:0.2,desc:"渡劫期秘法，渡劫成功率+20%"},
 "天劫淬体术":{type:"tribulation",cultReq:6000,tribBonus:0.25,desc:"以身渡劫，渡劫成功率+25%"}
};

// 命格（开局随机三选一，互斥；effect 为全局加成）
export const TALENTS={
 "天选之子":{desc:"气运加身，奇遇概率+15%",effect:{encounter:0.15}},
 "武痴转世":{desc:"战斗天赋，攻击伤害+10%",effect:{atkMul:1.1}},
 "丹道天才":{desc:"丹道亲和，炼丹成功率+15%",effect:{alchemy:0.15}},
 "魔种觉醒":{desc:"魔道亲和，魔性成长加速，魔道声望获取+20%",effect:{demonRep:0.2}}
};
