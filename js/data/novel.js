//==== data/novel.js：可替换多主题多文本剧情库（novel-lib-v2）====
// 结构：THEMES = [ {id,name,desc,css:{...皮肤变量...},novels:[{id,game,title,author,type,desc,chapters,anchors}]} ]
// 约定：
//   · 每个主题（THEMES 一项）可包含多篇文章（novels 多项）；主题与文章都不固定，可随时增删。
//   · 想加主题：在 THEMES 末尾加一项，写清 css 皮肤变量 + novels 数组。
//   · 想加文章：在某主题的 novels 数组加一项（章节+锚点），游戏内即可切换。
//   · 游戏名（每篇文章的 game）与皮肤（主题的 css）随切换动态更新。
//   · 原《系统赋我长生》2704 章索引已归档：story-pipeline/archive/novel_changsheng_2704.js
const THEMES=[
{
 id:"xianxia",
 name:"仙侠·长生",
 desc:"水墨山水 · 宣纸 · 朱砂印章 · 青绿",
 css:{ // 主题皮肤：切换主题时注入 :root 变量
  bg:"#f6f1e5", bgFace:"#faf6ec", ink:"#2f2a24", inkSoft:"#3a332a",
  border:"#c9bfa8", borderSoft:"#ddd2bc", panel:"#efe8d8", panelLight:"#fbf8f0",
  gold:"#8a6d3b", seal:"#a63d2f", green:"#5b7a5d", blue:"#4a6b6a",
  btnBorder:"#a89b7f", hpEmpty:"#d8d0bc", subText:"#6b6255",
  glow1:"rgba(90,122,93,0.10)", glow2:"rgba(74,107,106,0.10)",
  shadow:"rgba(60,50,30,0.12)",
  mtn1:"#5b7a5d", mtn2:"#4a6b6a", mtn3:"#a63d2f"
 },
 ui:{ // 面板配置：资源栏 + 侧栏功能按钮（可替换/可增删）
  resources:["life","realm","cult","hp","mp","stone","year","status"],
  attrs:["constitution","soul","spirit","comprehension","heart","demon"],
  panels:["inventory","arts","alchemy","faction","quest","npc","memory","novel","bio","hint","diff","gen","director","share","mod"]
 },
 novels:[
 {
  id:"changsheng",
  game:"系统赋我长生",
  title:"系统赋我长生，活着终会无敌",
  author:"紫灵风雪",
  type:"仙侠·长生苟道流",
  desc:"平凡少年陈浔觉醒长生系统，与大黑牛携手苟道长生：从山村到磐宁城，入五蕴宗种田炼丹，横渡天断闯大离，界域血战破界入大世。（本篇收录原著前 400 章·首批锚点化）",
  chapters:NOVEL_CHANGSHENG_400.chapters,
  anchors:NOVEL_CHANGSHENG_400.anchors
 },
 {
  id:"bumei",
  game:"长生梦录",
  title:"不寐之梦",
  author:"郭北安",
  type:"仙侠·复仇成长",
  desc:"一朝踏入修仙路，未曾听闻谁人回。凡人明武坠谷得石老授法，习天地人三道，从山村直至仙界轮回，一场大梦。",
  chapters:[
  [1,"乡下人教训跋扈崽 引火烧石老突现身","明武 蔡梓 石老 圣水 武道 聚气 结丹 飞仙门"],
  [2,"飞仙门谋得胖师父 试身手草堂初扬名","飞仙门 苟二清 胖师父 梦法森林 黑斑虎 金线豹"],
  [3,"仇人见战火再引燃 比武场众人现身手","大比 明恩 化神 鬼见愁 陶夭 陶卓 蔡袅"],
  [4,"剑修斗二清遇惨败 为报仇明武虐众人","二清 莫问剑 剑修 傀儡术 明武"],
  [5,"显神威明武得报仇 被围攻师徒形神灭","林肯 万剑归宗 师父自爆 十万大山 凰 大乘 劫雷池"],
  [6,"再出山众人雪前齿 入仙界明武陷危难","夺回飞仙门 陶夭 成亲 飞升 金甲人 卷轴 凰"],
  [7,"挥手间圣人解危难 谪仙池地道现真身","凰 其昂上人 幻变术 谪仙池 地道 载万物 真仙"],
  [8,"桑梓城又闻陶夭事 人世间贪乐毁修为","桑梓城 圈养场 陶夭遇难 陶潜 仙主 修为尽失"],
  [9,"恶仙王为己灭人道 梦一场结局终团圆","仙王 献祭 斩仙台 成为神灵 宇宙重启 梦醒"]
  ],
  anchors:[
  {chapter:1,title:"坠谷得法",trigger:"被城主护卫追杀坠入深谷",summary:"明武侠不妨踹了跋扈恶少蔡梓，被追坠谷，遇封印的神仙石老，饮圣水习《武道》，半年结丹出山。",refs:["石老","圣水","武道"]},
  {chapter:2,title:"拜师飞仙门",trigger:"结丹后外出寻门派依仗",summary:"入飞仙门拜掌门师弟为师，途中收二狗子（苟二清）为徒，梦法森林战黑斑虎等诸兽。",refs:["飞仙门","胖师父","苟二清"]},
  {chapter:3,title:"大比扬名",trigger:"三派大比斗",summary:"比武场上临战突破化神，战体修鬼见愁，遇陶夭表姐陶卓，与仇家蔡氏再会。",refs:["化神","陶夭","陶卓"]},
  {chapter:4,title:"二清惨败",trigger:"大比下午场剑修对决",summary:"二清对剑修莫问剑惨败。陶卓看出明武不同凡响。",refs:["莫问剑","二清"]},
  {chapter:5,title:"复仇与失去",trigger:"挣得头名后遭两派围攻",summary:"夺头名九命灵芝，归途遭雾都山、华尔剑派围攻，师父抱二清自爆送明武入十万大山，遇神兽凰，渡劫入大乘。",refs:["师父","二清","凰","十万大山"]},
  {chapter:6,title:"夺门·飞升",trigger:"大乘期出山复仇",summary:"夺回飞仙门传下武道，娶陶夭，飞升仙界即遭金甲人围捕，危时滴血开认主卷轴。",refs:["飞仙门","陶夭","卷轴"]},
  {chapter:7,title:"谪仙池悟地道",trigger:"仙主追杀，寻遗迹避祸",summary:"入谪仙池，悟「水不争」顺仙气之道，修成地道，跨入真仙，寻天地人三道。",refs:["凰","谪仙池","地道"]},
  {chapter:8,title:"桑梓城之变",trigger:"幻身潜入圈养凡人的桑梓城",summary:"闻陶夭等因自己飞升被搜魂判斩仙台，遇陶夭祖上、仙主级高人陶潜授计自救，却因贪恋人间修为尽失。",refs:["桑梓城","陶潜","陶夭"]},
  {chapter:9,title:"斩仙·归真",trigger:"仙王献祭凡人，斩仙台处刑",summary:"悟天地人三道合一，身碎复合成神，打散仙王释放被献祭灵魂，重启宇宙后梦醒，回到现实。",refs:["仙王","斩仙台","三道","梦醒"]}
  ]
 }
 ]
},
{
 id:"zhuansheng",
 name:"转生·异界",
 desc:"暗夜星辉 · 紫金 · 异世重生",
 css:{ // 转生风格皮肤（示例：暗底 + 紫金 + 星辉）
  bg:"#14121f", bgFace:"#1d1a2e", ink:"#e8e4f0", inkSoft:"#c9c2dd",
  border:"#3a3550", borderSoft:"#2e2a44", panel:"#221e38", panelLight:"#262240",
  gold:"#e0b45a", seal:"#8a5cf6", green:"#7fd0a0", blue:"#6fb3e8",
  btnBorder:"#4a4466", hpEmpty:"#3a3550", subText:"#a49dc4",
  glow1:"rgba(138,92,246,0.14)", glow2:"rgba(111,179,232,0.12)",
  shadow:"rgba(0,0,0,0.45)",
  mtn1:"#8a5cf6", mtn2:"#6fb3e8", mtn3:"#e0b45a"
 },
 ui:{ // 转生专属面板：异界冒险向（技能树/伙伴/图鉴 + 通用功能）
  resources:["life","realm","hp","mp","stone","year","status"], // 寿命/等级/生命/魔力/金币/年份/状态（去掉仙侠的修为/灵石）
  attrs:["constitution","soul","spirit"], // 转生三维：力量/智力/敏捷
  attrLabels:{constitution:"力量",soul:"智力",spirit:"敏捷"}, // 属性栏标签映射
  resLabels:{realm:"等级",mp:"魔力",stone:"金币"}, // 资源栏标签映射
  panels:["inventory","skilltree","party","bestiary","quest","npc","novel","bio","hint","diff","share"]
 },
 novels:[
   // 该主题暂无已导入文本。想游玩转生题材，在此数组加一篇（章节+锚点），示例结构见上方 xianxia 主题。
 ]
}
];
// 兼容别名：当前主题/当前篇（sceneNovel 沿用 _NOVEL 单篇接口；默认取第一个主题的第一篇）
function _firstNovel(){ if(!THEMES||!THEMES.length)return null; for(let t of THEMES){ if(t.novels&&t.novels.length)return t.novels[0]; } return null; }
const NOVEL = _firstNovel();