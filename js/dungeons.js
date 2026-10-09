//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, checkCond, gs, log, setFlag } from "./core.js";
import { monsterByName, monsterList } from "./data/monsters.js";
import { startFight } from "./fight.js";
import { sceneNovelLine } from "./novel.js";
import { mainStep0 } from "./story.js";

//==== dungeons.js：副本系统：妖山古林、魔渊秘穴、上古星陨遗迹 ====

//副本1妖山古林
export function stepCopyYaoShan(){
 gs.step=6;
 log("\n✨【副本：妖山古林】妖兽盘踞的古老山林，传闻藏有妖丹宝物。");
 addBtn("深入山林，搜寻妖兽",()=>{
  let m=monsterList[Math.floor(Math.random()*3)];
  startFight(m);
 });
 addBtn("浅尝辄止，离开副本",()=>{
  log("你选择离开妖山古林");
  addBtn("返回主路线",()=>mainStep0());
 });
 addBtn("📖原著秘境锚点",()=>sceneNovelLine("fuben")); // J35 M3 五线锚点对照
}
//副本2魔渊秘穴
export function stepCopyMagicCave(){
 gs.step=7;
 log("\n🌑【副本：魔渊秘穴】深处魔气滚滚，风险极高，但魔道至宝藏于此地。","danger");
 addBtn("闯入秘穴直面守卫【白骨魔将】",()=>{
  startFight(monsterList[1]);
 });
 addBtn("畏惧凶险，退出秘穴",()=>{
  addBtn("返回主线",()=>mainStep0());
 });
 addBtn("📖原著秘境锚点",()=>sceneNovelLine("fuben")); // J35 M3 五线锚点对照
}
//副本3上古星陨遗迹
export function stepCopyStarRelic(){
 gs.step=8;
 log("\n⭐【副本：上古星陨遗迹】天外坠落的上古修士洞府，强大残魂守护宝藏。");
 addBtn("踏入遗迹，迎战上古残魂",()=>{
  startFight(monsterList[3]);
 });
 addBtn("实力不足，暂且退走",()=>{
  addBtn("返回主线",()=>mainStep0());
 });
 addBtn("📖原著秘境锚点",()=>sceneNovelLine("fuben")); // J35 M3 五线锚点对照
}
//==== 隐藏副本：轮回镜（P4 隐藏剧情，正魔兼修 demon≥60 且 heart≥40 解锁）====
export function hiddenLunhui(){
 if(checkCond({type:"attr",key:"demon",op:">=",val:60})&&checkCond({type:"attr",key:"heart",op:">=",val:40})){
  setFlag("lunhui_unlocked",true);
  return true;
 }
 return false;
}
export function stepCopyLunhui(){
 gs.step=9;
 log("\n🪞【隐藏副本：轮回镜】正魔兼修的你，在道心与魔性交织处窥见一面古镜，镜中映出前世今生。","gold");
 addBtn("触碰轮回镜，直面魔渊长老",()=>{
  startFight(monsterByName("魔渊长老"));
 });
 addBtn("心生忌惮，退出镜界",()=>{
  addBtn("返回主线",()=>mainStep0());
 });
}
