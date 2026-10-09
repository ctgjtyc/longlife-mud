//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addAch, addBtn, gs, log, passYear } from "./core.js";
import { DIRECTOR_EVENT_BASE, directorEventRate } from "./director.js";
import { equipByName, gainEquip } from "./inventory.js";
import { mainStep0 } from "./story.js";

//==== events.js：NPC 随机事件系统 ====

export function triggerRandomEvent(){
 // J35 M3 Director：事件密度门（pace 因子；director 未加载时兜底全发，行为零回归）
 let _rate=(typeof directorEventRate==="function")?DIRECTOR_EVENT_BASE*directorEventRate():1;
 if(_rate<1&&Math.random()>_rate){
  log("\n世间无事发生，岁月静静流淌。");
  addBtn("继续前行",()=>mainStep0());
  return;
 }
 let evts=[
  function evtNpcOldMan(){
   log("\n📜【NPC事件：落魄老修士】路边一个枯瘦的老修士拦住你，咳嗽像破风箱漏气：「咳……小友，你身上，有长生的气息。」");
   addBtn("倾听教诲，赠予灵石50换取感悟",()=>{
    if(gs.stone>=50){
     gs.stone-=50;
     gs.cult+=80;
     log("老修士说得很慢，一句是一句。你听完，丹田里那团气，好像活了一点。");
    }else log("你灵石不足，只能拱手告别");
    addBtn("继续前行",()=>mainStep0());
   });
   addBtn("婉言拒绝，径直离开",()=>{addBtn("继续前行",()=>mainStep0());});
  },
  function evtNpcGirl(){
   log("\n💞【NPC事件：凡间女子】你从妖兽爪下救下一名凡间女子。她攥着腕上一条褪色的红绳，半天没说出话。");
   addAch("a10");
   addBtn("相伴共度一段岁月（凡人寿命短暂）",()=>{
    log("你们相伴数十载。她老了，头发白了，笑起来眼睛还是弯成月牙。");
    log("她走的那天，攥着你的手，说这辈子值了。");
    log("你把她埋在山坡上，种了一棵桃树。");
    passYear(60);
    addBtn("目送故人逝去，继续踏上长生旅途",()=>mainStep0());
   });
   addBtn("长生无情，拒绝情缘，转身离去",()=>{
    log("她追出两步，又停住。红绳在风里晃了晃，她没再追。");
    addBtn("继续前行",()=>mainStep0());
   });
  },
  function evtMerchant(){
   log("\n🏪【NPC事件：游走灵商】一个商人拦住你，腰间算盘拨得脆响：「道友，可要看看我的宝贝？」他笑眯眯的，笑意却不达眼底。");
   addBtn("花费200灵石购买【流云道袍】",()=>{
    if(gs.stone>=200){
     gs.stone-=200;gainEquip(equipByName("流云道袍"));log("你购得流云道袍。灵商拨了两下算盘：「道友爽快。」");
    }else log("灵石不足！");
    addBtn("继续游历",()=>mainStep0());
   });
   addBtn("不交易，就此告别",()=>addBtn("继续前行",()=>mainStep0()));
  }
 ];
 let pick=evts[Math.floor(Math.random()*evts.length)];
 pick();
}
