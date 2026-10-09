//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, checkCond, gs, log } from "./core.js";
import { monsterByName } from "./data/monsters.js";
import { startFight } from "./fight.js";
import { GEN_SETTINGS, generate } from "./gen.js";
import { mainStep0 } from "./story.js";
import { applyEffect } from "./world.js";

//==== eventgen.js：动态事件生成器（P5 模板+玩家状态，可选 AI 增强）====
// 模板池：{cond, weight, slots(变量池), title/desc(模板), choices(选项)}
// 生成：按玩家状态过滤 + 加权随机 → 填充变量 → 可选 gen.js AI 润色（默认关，主线锁定）

export const EVENT_TEMPLATES=[
 {cond:null,weight:3,slots:{kw:["妖兽","魔修","灵兽"]},title:"{kw}拦路",desc:"你在路上遭遇{kw}拦路，来者不善",choices:[
  {text:"迎战",fight:"山林妖狼"},
  {text:"绕道而行",effect:{stone:20}}
 ]},
 {cond:{type:"attr",key:"cult",op:">=",val:200},weight:2,slots:{kw:["上古遗迹","秘境入口"]},title:"发现{kw}",desc:"你发现一处{kw}，灵气氤氲",choices:[
  {text:"探索",effect:{cult:80,stone:100}},
  {text:"谨慎离开",effect:{}}
 ]},
 {cond:{type:"flag",key:"modao",val:true},weight:2,slots:{kw:["魔道秘宝","血煞之气"]},title:"魔道机缘",desc:"魔气深处传来{kw}的波动",choices:[
  {text:"夺取机缘",effect:{attrs:{demon:5},stone:150}},
  {text:"克制贪念",effect:{attrs:{heart:5}}}
 ]},
 {cond:{type:"rep",key:"青云宗",op:">=",val:30},weight:1,slots:{kw:["宗门任务","巡山除妖"]},title:"宗门征召",desc:"青云宗征召弟子执行{kw}",choices:[
  {text:"应召前往",effect:{rep:{青云宗:20},stone:80}},
  {text:"婉言推辞",effect:{}}
 ]}
];

//生成动态事件（模板 + 玩家状态过滤 + 加权随机 + 变量填充）
export function genDynamicEvent(){
 let pool=EVENT_TEMPLATES.filter(e=>!e.cond||checkCond(e.cond));
 if(!pool.length)return null;
 let total=pool.reduce((s,e)=>s+(e.weight||1),0);
 let r=Math.random()*total;
 let tpl=pool[0];
 for(let e of pool){r-=(e.weight||1);if(r<=0){tpl=e;break;}}
 let vars={};
 for(let k in tpl.slots){
  let arr=tpl.slots[k];
  vars[k]=arr[Math.floor(Math.random()*arr.length)];
 }
 let title=tpl.title,desc=tpl.desc;
 for(let k in vars){
  title=title.split("{"+k+"}").join(vars[k]);
  desc=desc.split("{"+k+"}").join(vars[k]);
 }
 return {tpl:tpl,vars:vars,title:title,desc:desc};
}

//AI 增强（可选）：用 gen.js generate 润色事件描述（默认关；仅润色呈现，不改变选项/走向）
export async function aiEnhanceEvent(ev){
 if(!(typeof generate==="function")||!GEN_SETTINGS||!GEN_SETTINGS.enabled)return ev.desc;
 try{
  let g=await generate("encounter",ev.vars,"润色这段动态事件描述，保持修仙口吻：");
  if(g&&g.text)return g.text;
 }catch(e){}
 return ev.desc;
}

//动态事件场景（gs.aiEnabled 时走 AI 润色；主线/结局锁定不受影响）
export async function sceneDynamicEvent(){
 let ev=genDynamicEvent();
 if(!ev){log("\n你四处游历，天地平静，并无异动。");addBtn("继续前行",()=>mainStep0());return;}
 let text=ev.desc;
 if(gs.aiEnabled){text=await aiEnhanceEvent(ev);}
 log(`\n🌍【动态事件：${ev.title}】${text}`,"blue");
 for(let c of ev.tpl.choices){
  addBtn(c.text,()=>{
   if(c.fight){startFight(monsterByName(c.fight));return;}
   applyEffect(c.effect);
   log("你做出了抉择。","blue");
   mainStep0();
  });
 }
}
