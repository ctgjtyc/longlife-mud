//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addAch, addBtn, checkCond, gs, log, refreshUi, setFlag } from "./core.js";
import { QUESTS } from "./data/quests.js";
import { addRep } from "./faction.js";
import { addItem } from "./inventory.js";
import { syncMemories } from "./memory.js";
import { mainStep0 } from "./story.js";

//==== quest.js：任务引擎（P4 叙事引擎）====
// gs.quests = {id: 当前步索引(number) | "done" | "failed"}
// 接取/推进/完成全走 checkCond 门控（D4 唯一门控）；循环任务完成后重置为 active

//任务是否可接（need 条件达成 + 未接取/未完成/未失败）
export function questAvailable(id){
 let q=QUESTS[id];
 if(!q)return false;
 if(gs.quests[id]==="done"||gs.quests[id]==="failed")return false;
 if(typeof gs.quests[id]==="number")return false; // 已接取进行中
 if(q.need&&!checkCond(q.need))return false;
 return true;
}

//接取任务
export function acceptQuest(id){
 let q=QUESTS[id];
 if(!q){log("没有此任务");return false;}
 if(!questAvailable(id)){log(`【${q.name}】当前无法接取`,"red");return false;}
 gs.quests[id]=0;
 log(`📜你接取了任务【${q.name}】`,"gold");
 refreshUi();
 return true;
}

//推进任务：当前步条件达成 → 结算奖励 → 步进；最后一步 → 完成
export function advanceQuest(id){
 let q=QUESTS[id];
 if(!q||typeof gs.quests[id]!=="number"){log("任务未在进行中","red");return false;}
 let idx=gs.quests[id];
 let st=q.steps[idx];
 if(!checkCond(st.cond)){log(`【${q.name}】尚未达成：${st.desc}`,"red");return false;}
 if(st.reward)applyReward(st.reward);
 log(`✅【${q.name}】进度推进：${st.desc}`,"green");
 if(idx===q.steps.length-1){completeQuest(id);}
 else{gs.quests[id]=idx+1;}
 refreshUi();
 return true;
}

//完成任务：应用 onDone；循环任务重置为 active
export function completeQuest(id){
 let q=QUESTS[id];
 if(q.kind==="loop"){
  gs.quests[id]=0;
  log(`🔄【${q.name}】完成！可再次接取。`,"gold");
 }else{
  gs.quests[id]="done";
  log(`🏆【${q.name}】完成！`,"gold");
 }
 if(q.onDone)applyReward(q.onDone);
 if(q.onDone&&q.onDone.unlockQuest)log(`🔓【${QUESTS[q.onDone.unlockQuest].name}】解锁了新线索！`,"blue");
 syncMemories(); // J34 方向3：任务完成记起往事
}

//统一奖励结算（任务步奖励 / onDone 共用）
export function applyReward(r){
 if(!r)return;
 if(r.flags)for(let k in r.flags)setFlag(k,r.flags[k]);
 if(r.items)for(let k in r.items)addItem(k,r.items[k]);
 if(r.rep)for(let k in r.rep)addRep(k,r.rep[k]);
 if(r.cult)gs.cult+=r.cult;
 if(r.stone)gs.stone+=r.stone;
 if(r.attrs)for(let k in r.attrs)gs.attrs[k]+=r.attrs[k];
 if(r.achs)for(let a of r.achs)addAch(a); // 任务奖励解成就（onDone.achs 模组成就链路）
}

//==== 任务面板场景 ====
export function questPanel(){
 log("\n📜【任务】你盘点心中所系之事。");
 let avail=Object.keys(QUESTS).filter(id=>questAvailable(id));
 if(avail.length){
  log("（可接取）");
  for(let id of avail){
   let q=QUESTS[id];
   addBtn(`接取【${q.name}】（${q.kind}）`,()=>{acceptQuest(id);questPanel();});
  }
 }
 let active=Object.keys(gs.quests).filter(id=>typeof gs.quests[id]==="number");
 if(active.length){
  log("（进行中）");
  for(let id of active){
   let q=QUESTS[id];
   if(!q)continue; // 旧档残留已删任务 id 防御
   let st=q.steps[gs.quests[id]];
   if(!st)continue;
   addBtn(`推进【${q.name}】：${st.desc}`,()=>{advanceQuest(id);questPanel();});
  }
 }
 addBtn("离开任务面板",()=>mainStep0());
}
