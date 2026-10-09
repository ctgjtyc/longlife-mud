//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, checkCond, gs, hidePortrait, log, refreshUi, showScene } from "./core.js";
import { TALENTS } from "./data/arts.js";
import { BALANCE } from "./data/balance.js";
import { monsterList } from "./data/monsters.js";
import { addRep } from "./faction.js";
import { startFight } from "./fight.js";
import { genNarrateEncounter } from "./gen.js";
import { addItem, equipByName, gainEquip } from "./inventory.js";
import { mainStep0 } from "./story.js";

//==== encounter.js：奇遇事件系统（P3b：条件触发，内容+引擎）====
// 奇遇池：{cond:条件(可空), weight:权重, run:执行函数}
// 触发概率 = 基础概率 + 命格加成（天选之子）；条件过滤后加权随机

export const ENCOUNTERS=[
 {cond:null,weight:3,run:function(){
   showScene("spiritual_spring","灵泉"); // 场景插图（seedream 内嵌）
   log("\n✨【奇遇：灵泉洗髓】你拨开藤蔓，看见一眼泉。水面上浮着薄雾，凑近了能闻到一股清冽的草木香。");
   addBtn("沐浴灵泉，洗髓伐脉",()=>{
    gs.attrs.constitution+=3;gs.attrs.spirit+=2;
    log("泉水浸过皮肤，像有无数细针在骨缝里走了一遍。体魄+3，灵力+2！","green");
    refreshUi();
    addBtn("继续前行",()=>{hidePortrait();mainStep0();});
   });
   addBtn("谨慎离开",()=>addBtn("继续前行",()=>{hidePortrait();mainStep0();}));
 }},
 {cond:null,weight:2,run:function(){
   log("\n✨【奇遇：前辈洞府】石壁上刻着一行字，被青苔啃得只剩半边：「后来者……若见……勿……」后面的字看不清了。");
   addBtn("搜寻洞府",()=>{
    if(Math.random()>0.5){addItem("聚灵丹",2);log("你在蒲团底下摸出两枚聚灵丹，丹香还留着。","green");}
    else{addItem("星陨铁",1);log("你在墙角捡到一块星陨铁，入手冰凉，像握着一小块夜空。","green");}
    addBtn("继续前行",()=>mainStep0());
   });
   addBtn("不贪机缘，离开",()=>addBtn("继续前行",()=>mainStep0()));
 }},
 {cond:null,weight:2,run:function(){
   log("\n🏪【奇遇：游走灵商】一个商人从雾里走出来，腰间算盘拨得脆响：「道友，来得巧，我这正有件好东西。」");
   addBtn("花 200 灵石购买【流云道袍】",()=>{
    if(gs.stone>=200){gs.stone-=200;gainEquip(equipByName("流云道袍"));log("你购得流云道袍。他眯眼笑了笑：「道友爽快。」","green");}
    else log("灵石不足！","red");
    addBtn("继续前行",()=>mainStep0());
   });
   addBtn("不交易，就此告别",()=>addBtn("继续前行",()=>mainStep0()));
 }},
 {cond:null,weight:2,run:function(){
   log("\n🐺【奇遇：妖兽袭击】一头妖兽从林子里蹿出来，喉咙里滚着低吼，涎水顺着獠牙滴下来。","danger");
   addBtn("迎战妖兽",()=>startFight(monsterList[0]));
   addBtn("绕道避开",()=>addBtn("继续前行",()=>mainStep0()));
 }},
 {cond:{type:"attr",key:"cult",op:">=",val:500},weight:1,run:function(){
   log("\n🏛【奇遇：宗门招揽】青云宗长老拦住你，上下打量半晌：「道友修为不俗，可愿入我青云宗？」");
   addBtn("接受招揽，结好青云宗",()=>{
    addRep("青云宗",80);
    log("你与青云宗结下善缘。","green");
    addBtn("继续前行",()=>mainStep0());
   });
   addBtn("婉言谢绝",()=>addBtn("继续前行",()=>mainStep0()));
 }},
 {cond:{type:"flag",key:"modao",val:true},weight:1,run:function(){
   log("\n🌑【奇遇：魔道拉拢】魔渊使者寻到你，兜帽下露出一双眼睛：「魔渊，缺你这样的人。」");
   addBtn("应允，加深魔渊声望",()=>{
    addRep("魔渊",100);
    log("魔渊视你为同道。","green");
    addBtn("继续前行",()=>mainStep0());
   });
   addBtn("不为所动，拒绝",()=>addBtn("继续前行",()=>mainStep0()));
 }}
];

//触发奇遇（概率 = 基础 + 命格加成；条件过滤后加权随机；auto=由主菜单随机门唤入时跳过内层概率门）
export function triggerEncounter(auto){
 let base=BALANCE.encounterBase;
 let t=TALENTS[gs.talent];
 if(t&&t.effect&&t.effect.encounter)base+=t.effect.encounter;
 if(!auto && Math.random()>base){
  log("\n你四处游历，却一无所获。");
  addBtn("继续前行",()=>mainStep0());
  return;
 }
 let pool=ENCOUNTERS.filter(e=>!e.cond||checkCond(e.cond));
 if(!pool.length){log("\n你四处游历，却一无所获。");addBtn("继续前行",()=>mainStep0());return;}
 let total=pool.reduce((s,e)=>s+(e.weight||1),0);
 let r=Math.random()*total;
 for(let e of pool){
  r-=(e.weight||1);
  if(r<=0){genNarrateEncounter(e);e.run();return;} // J35 M4 触发点1：奇遇氛围文案（锚点喂料，L0 直出）
 }
 genNarrateEncounter(pool[0]);
 pool[0].run();
}
