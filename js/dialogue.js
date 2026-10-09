//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, addDisciple, addEnemy, checkCond, gs, hasEnemy, hidePortrait, isNpcDead, log, npcExpireYear, passYear, refreshUi, removeEnemy, setFlag, showPortrait } from "./core.js";
import { NPCS } from "./data/npcs.js";
import { addRep } from "./faction.js";
import { addItem, equipByName, gainEquip } from "./inventory.js";
import { mainStep0 } from "./story.js";

//==== dialogue.js：NPC 对话树引擎（P4 叙事引擎）====
// gs.relations = {npcId: 好感值}；多轮树遍历，选项 checkCond 门控，effect 改关系/声望/flags

//关系等级（由好感值派生）
export function relationLevel(npcId){
 let v=gs.relations[npcId]||0;
 if(v>=50)return "知己";
 if(v>=20)return "友好";
 if(v>0)return "相识";
 if(v>-20)return "陌生";
 return "交恶";
}
export function addRelation(npcId,n){
 gs.relations[npcId]=(gs.relations[npcId]||0)+n;
}

//开启对话（从 start 节点进入；NPC 已故则进入追忆）
export function startDialogue(npcId){
 if(!NPCS[npcId]){log("此人不在眼前");return;}
 npcExpireYear(npcId); // J34 后续：首次对话初始化寿命
 showPortrait(npcId,NPCS[npcId].name);
 if(isNpcDead(npcId)){memorialDialogue(npcId);return;}
 dialogueNode(npcId,"start");
}

//NPC 已故追忆（按关系等级渲染；仇敌的恩怨随风散）
export function memorialDialogue(npcId){
 let npc=NPCS[npcId];
 let rel=relationLevel(npcId);
 log(`\n🪦【${npc.name}】的墓前，荒草萋萋。`);
 if(rel==="知己"){
  log("你想起他生前最后的话，忽然觉得，长生也没那么长。");
 }else if(rel==="友好"||rel==="相识"){
  log("你与他交情不深，但此刻站在墓前，仍有些怅然。");
 }else{
  log("你与他不过萍水相逢。如今人已作古，恩怨也一并埋进了土里。");
 }
 if(hasEnemy(npcId)){
  log("他曾是你的仇敌。如今仇怨随风散，你在他墓前站了一会儿。");
  removeEnemy(npcId);
 }
 addBtn("默立片刻，转身离去",()=>{hidePortrait();mainStep0();});
}

//渲染对话节点：文本 + 条件门控的选项
export function dialogueNode(npcId,nodeId){
 let npc=NPCS[npcId];
 let node=npc.dialogue[nodeId];
 if(!node){hidePortrait();log("对话结束。");mainStep0();return;}
 log(`\n💬【${npc.name}】${node.text}`);
 let opts=node.options.filter(o=>!o.need||checkCond(o.need));
 if(!opts.length){hidePortrait();log("（无话可说，对话结束）");mainStep0();return;}
 for(let o of opts){
  addBtn(o.text,()=>{
   if(o.effect)applyDialogueEffect(npcId,o.effect);
   if(o.next&&o.next!=="end"){dialogueNode(npcId,o.next);}
   else{hidePortrait();log(`你与【${npc.name}】结束了对话。`);mainStep0();}
  });
 }
}

//对话效果结算（关系/声望/flags/物品/属性/时间/收徒/结仇）
export function applyDialogueEffect(npcId,eff){
 if(!eff)return;
 if(eff.relation)for(let k in eff.relation)addRelation(k,eff.relation[k]);
 if(eff.rep)for(let k in eff.rep)addRep(k,eff.rep[k]);
 if(eff.flags)for(let k in eff.flags)setFlag(k,eff.flags[k]);
 if(eff.items)for(let k in eff.items)addItem(k,eff.items[k]);
 if(eff.cult)gs.cult+=eff.cult;
 if(eff.stone)gs.stone+=eff.stone;
 if(eff.year)passYear(eff.year);
 if(eff.hp)gs.hp=Math.min(gs.hpmax,gs.hp+eff.hp);
 if(eff.equip){let eq=equipByName(eff.equip);if(eq)gainEquip(eq);}
 if(eff.disciple)addDisciple(eff.disciple.name,eff.disciple.talent); // J34 后续：收徒
 if(eff.enemy)addEnemy(eff.enemy.npcId,eff.enemy.reason);           // J34 后续：结仇
 refreshUi();
}

//==== 故人场景（拜访 NPC；need 门控：按路线/解锁条件显示；已故标注）====
export function sceneNpc(){
 log("\n💬【故人】你回想一路走来结识之人。");
 for(let id in NPCS){
  let npc=NPCS[id];
  if(npc.need&&!checkCond(npc.need))continue; // 未达条件不显示（如宗门/江湖/轮回镜解锁）
  let dead=isNpcDead(id);
  addBtn(`拜访【${npc.name}】${dead?"（已故）":""}（${npc.faction}，好感${relationLevel(id)}）`,()=>startDialogue(id));
 }
 addBtn("离开",()=>mainStep0());
}
