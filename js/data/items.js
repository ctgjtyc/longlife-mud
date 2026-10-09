//==== data/items.js：物品配置表（内容层 SSOT，P3a）====
// type: consumable=消耗品 / material=材料（P3b 炼丹炼器使用）
// use: 消耗品使用效果（数值全部在此配置，引擎只解释）

export const ITEMS={
 // ---- 消耗品 ----
 "回血散":{type:"consumable",desc:"凡俗伤药，恢复50点生命",use:{hp:50}},
 "聚灵丹":{type:"consumable",desc:"汇聚灵气，修为+60",use:{cult:60}},
 "养魂丹":{type:"consumable",desc:"温养神魂，神魂+2",use:{attrs:{soul:2}}},
 "淬体丹":{type:"consumable",desc:"淬炼体魄，体魄+2",use:{attrs:{constitution:2}}},
 "悟道茶":{type:"consumable",desc:"一盏悟道茶，悟性+1",use:{attrs:{comprehension:1}}},
 "龟息符":{type:"consumable",desc:"激发后十年内修炼如龟息吐纳（悟性+5，持续10年）",
   use:{status:{id:"guixi",name:"龟息术",years:10,attrMods:{comprehension:5}}}},
 "燃血禁丹":{type:"consumable",desc:"燃烧精血换取战力（体魄+8，持续5年），代价是生命上限-20",
   use:{hpmax:-20,status:{id:"ranxue",name:"燃血",years:5,attrMods:{constitution:8}}}},
 // ---- 材料（P3b 炼丹炼器消耗） ----
 "妖丹":{type:"material",desc:"妖兽内丹，炼丹主料"},
 "灵草":{type:"material",desc:"常见灵草，炼丹辅料"},
 "星陨铁":{type:"material",desc:"天外陨铁，炼器主料"},
 "魔骨":{type:"material",desc:"魔物骸骨，炼器辅料"}
};

//==== 炼丹炼器配方表（P3b）====
// mats: 材料消耗 {材料名:数量}；out: 产出（消耗品名 或 装备名，装备引用 core.js allEquip）；baseRate: 基础成功率（引擎叠加命格加成）
export const RECIPES={
 // ---- 炼丹 ----
 "聚灵丹":{mats:{灵草:2},out:"聚灵丹",baseRate:0.9},
 "养魂丹":{mats:{灵草:1,妖丹:1},out:"养魂丹",baseRate:0.8},
 "淬体丹":{mats:{灵草:1,妖丹:1},out:"淬体丹",baseRate:0.8},
 "悟道茶":{mats:{灵草:2,妖丹:1},out:"悟道茶",baseRate:0.7},
 "燃血禁丹":{mats:{灵草:2,妖丹:2,魔骨:1},out:"燃血禁丹",baseRate:0.6},
 // ---- 炼器 ----
 "青锋剑":{mats:{星陨铁:2},out:"青锋短剑",baseRate:0.8},
 "玄木护符":{mats:{星陨铁:1,魔骨:1},out:"玄木护符",baseRate:0.8},
 "岁月古玉":{mats:{星陨铁:3,妖丹:2},out:"岁月古玉",baseRate:0.5},
 "魔骨血甲":{mats:{魔骨:3,妖丹:2},out:"魔骨血甲",baseRate:0.5},
 "噬魂魔刃":{mats:{魔骨:4,星陨铁:2,妖丹:3},out:"噬魂魔刃",baseRate:0.4}
};
