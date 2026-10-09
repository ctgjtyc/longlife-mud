//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { artBonus } from "./arts.js";
import { gs, log, refreshUi } from "./core.js";

//==== buff.js：持久 BUFF/DEBUFF 系统（P3a，passYear 驱动 tick）====
// 状态模型：{id, name, years(剩余年数), attrMods:{属性:修正}, hpPerYear, cultPerYear}
// 设计：attrMods 为"存续期间生效"的修正（attrEff 派生，不落档）；hpPerYear/cultPerYear 为每年增量。

//添加/刷新状态（同 id 覆盖刷新年限）
export function addStatus(st){
 gs.statuses=gs.statuses.filter(s=>s.id!==st.id);
 gs.statuses.push(st);
 log(`✦获得状态【${st.name}】（持续${st.years}年）`,"blue");
 refreshUi();
}
export function hasStatus(id){return gs.statuses.some(s=>s.id===id);}
export function removeStatus(id){gs.statuses=gs.statuses.filter(s=>s.id!==id);}

//有效属性 = 基础属性 + 存续状态修正 + 被动功法加成（P3a/P3b 修炼/战斗统一走此派生）
export function attrEff(k){
 let v=gs.attrs[k]||0;
 for(let s of gs.statuses){if(s.attrMods&&s.attrMods[k])v+=s.attrMods[k];}
 v+=artBonus(k); // P3b：被动功法常驻加成
 return v;
}

//时间流逝 tick：每年增量生效 + 年限扣减 + 到期移除（挂入 passYear）
export function tickStatuses(n){
 if(!gs.statuses.length)return;
 let expired=[];
 for(let s of gs.statuses){
  if(s.hpPerYear){gs.hp=Math.min(gs.hpmax,gs.hp+s.hpPerYear*n);}
  if(s.cultPerYear){gs.cult+=s.cultPerYear*n;}
  s.years-=n;
  if(s.years<=0)expired.push(s);
 }
 for(let s of expired){
  removeStatus(s.id);
  log(`✦状态【${s.name}】已随岁月消散`,"blue");
 }
}
