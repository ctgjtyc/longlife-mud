//==== data/world.js：大世界地图配置（内容层 SSOT，P5 开放世界）====
// regions: 区域（x/y 坐标 / adjacent 相邻区域 / basePrice 地区物价 / stronghold 据点）
// strongholds: 据点（maxLevel 上限 / upgrades 升级效果，level 存 gs.world.strongholds 持久）
// dynEvents: 时间动态世界事件（year 触发年份 / choices 选项，flag 记录已抉择）

const WORLD={
 regions:{
  "jianghu":{name:"红尘江湖",desc:"凡俗王朝与散修汇聚之地，鱼龙混杂",x:1,y:2,adjacent:["qingyun","huangye","modao","sanxiu"],basePrice:{灵草:6,妖丹:40,星陨铁:25,魔骨:30},stronghold:null,ambushRate:0,monsters:["山林妖狼"]},
  "qingyun":{name:"青云山脉",desc:"仙门林立，灵气充沛，正道圣地",x:2,y:1,adjacent:["jianghu","yaoshan"],basePrice:{灵草:4,妖丹:50,星陨铁:30,魔骨:45},stronghold:"qingyun_zhai",ambushRate:0,monsters:["山林妖狼"]},
  "yaoshan":{name:"妖山古林",desc:"妖兽盘踞的古老山林，凶险与机缘并存",x:4,y:1,adjacent:["qingyun","huangye"],basePrice:{灵草:8,妖丹:30,星陨铁:20,魔骨:35},stronghold:null,ambushRate:0.35,monsters:["山林妖狼","瘴气巨蟒"]},
  "huangye":{name:"荒原",desc:"妖兽出没的荒凉之地，散落上古遗迹",x:3,y:3,adjacent:["jianghu","yaoshan","modao"],basePrice:{灵草:7,妖丹:35,星陨铁:18,魔骨:28},stronghold:null,ambushRate:0.3,monsters:["白骨魔将","瘴气巨蟒"]},
  "modao":{name:"魔渊",desc:"魔气弥漫，正道禁地，魔道修士的乐土",x:2,y:4,adjacent:["jianghu","huangye"],basePrice:{灵草:10,妖丹:45,星陨铁:35,魔骨:20},stronghold:"modao_cheng",ambushRate:0.3,monsters:["白骨魔将","魔渊鬼卒"]},
  "sanxiu":{name:"散修坊市",desc:"中立散修的交易集市，物价公道",x:0,y:2,adjacent:["jianghu"],basePrice:{灵草:5,妖丹:38,星陨铁:22,魔骨:26},stronghold:"sanxiu_hui",ambushRate:0,monsters:["山林妖狼"]}
 },
 strongholds:{
  "qingyun_zhai":{name:"青云寨",region:"qingyun",maxLevel:3,upgrades:[{level:2,cost:500,effect:"cultPerYear+1"},{level:3,cost:1500,effect:"cultPerYear+2"}]},
  "modao_cheng":{name:"魔渊城",region:"modao",maxLevel:3,upgrades:[{level:2,cost:500,effect:"cultPerYear+1"},{level:3,cost:1500,effect:"cultPerYear+2"}]},
  "sanxiu_hui":{name:"散修盟会",region:"sanxiu",maxLevel:3,upgrades:[{level:2,cost:400,effect:"cultPerYear+1"},{level:3,cost:1200,effect:"cultPerYear+2"}]}
 },
 dynEvents:[
  {id:"zongmen_war",year:200,title:"宗门大战",desc:"青云宗与魔渊积怨爆发，正道魔道全面开战",choices:[
   {text:"助青云宗守山",effect:{rep:{青云宗:60},stone:-100},flag:"war_qingyun"},
   {text:"助魔渊攻山",effect:{rep:{魔渊:60},stone:-100},flag:"war_modao"},
   {text:"置身事外",effect:{stone:50},flag:"war_neutral"}
  ]},
  {id:"yaomo_calamity",year:400,title:"妖魔灾变",desc:"妖山古林妖兽暴动，冲出山林肆虐人间",choices:[
   {text:"斩妖卫道",effect:{rep:{青云宗:40},cult:200},flag:"calamity_fight"},
   {text:"趁乱猎取妖丹",effect:{items:{妖丹:3},stone:200},flag:"calamity_hunt"},
   {text:"避祸不出",effect:{},flag:"calamity_hide"}
  ]},
  {id:"dynasty_change",year:600,title:"王朝更迭",desc:"凡俗王朝气数已尽，群雄并起争夺天下",choices:[
   {text:"扶持明君",effect:{rep:{散修盟:40},stone:300},flag:"dynasty_ming"},
   {text:"趁乱敛财",effect:{stone:500},flag:"dynasty_loot"},
   {text:"不问凡俗",effect:{},flag:"dynasty_ignore"}
  ]}
 ]
};
