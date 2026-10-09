//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addStatus } from "./buff.js";
import { addBtn, allEquip, gs, log, refreshUi, setEquip } from "./core.js";
import { TALENTS } from "./data/arts.js";
import { BALANCE } from "./data/balance.js";
import { ITEMS, RECIPES } from "./data/items.js";
import { mainStep0, routeByStep } from "./story.js";

//==== inventory.js：背包系统（P3a：消耗品/材料 + 多装备持有换装）====

//物品增删查
export function addItem(name,n=1){
 gs.inventory[name]=(gs.inventory[name]||0)+n;
 log(`获得物品【${name}】×${n}`,"green");
}
export function removeItem(name,n=1){
 if((gs.inventory[name]||0)<n)return false;
 gs.inventory[name]-=n;
 if(gs.inventory[name]<=0)delete gs.inventory[name];
 return true;
}
export function countItem(name){return gs.inventory[name]||0;}

//使用消耗品（效果由 data/items.js 配置驱动）
export function useItem(name){
 let it=ITEMS[name];
 if(!it||it.type!=="consumable"){log("该物品无法使用");return false;}
 if(!removeItem(name,1)){log("背包中没有此物品");return false;}
 let u=it.use||{};
 if(u.hp){gs.hp=Math.min(gs.hpmax,gs.hp+u.hp);log(`恢复生命 ${u.hp} 点`,"green");}
 if(u.hpmax){gs.hpmax=Math.max(1,gs.hpmax+u.hpmax);gs.hp=Math.min(gs.hp,gs.hpmax);log(`生命上限${u.hpmax>0?"+":""}${u.hpmax}`,"green");}
 if(u.cult){gs.cult+=u.cult;log(`修为+${u.cult}`,"green");}
 if(u.stone){gs.stone+=u.stone;log(`灵石+${u.stone}`,"green");}
 if(u.attrs){for(let k in u.attrs){gs.attrs[k]=(gs.attrs[k]||0)+u.attrs[k];log(`${BALANCE.attrsName[k]||k}+${u.attrs[k]}`,"green");}}
 if(u.status){addStatus(u.status);}
 log(`你使用了【${name}】`,"green");
 refreshUi();
 return true;
}

//==== 多装备：持有列表 + 换装（gs.equip/equipBonus 仍为当前装备，兼容旧逻辑）====
export function gainEquip(eq){
 if(!gs.ownedEquips.includes(eq.name))gs.ownedEquips.push(eq.name);
 setEquip(eq);
}
export function equipByName(name){return allEquip.find(e=>e.name===name)||(gs.customEquips||[]).find(e=>e.name===name);}
export function switchEquip(name){
 if(!gs.ownedEquips.includes(name)){log("你并未持有该装备");return false;}
 let eq=equipByName(name);
 if(!eq){log(`【${name}】装备数据缺失（旧档残留），已从持有列表移除`,"red");gs.ownedEquips=gs.ownedEquips.filter(n=>n!==name);return false;}
 setEquip(eq);
 log(`你换上了【${name}】`,"green");
 refreshUi();
 return true;
}

//==== 行囊界面（使用物品 / 换装）====
export function sceneInventory(){
 log("\n🎒【行囊】你清点随身之物。");
 let keys=Object.keys(gs.inventory);
 if(keys.length===0)log("（背包空空如也）");
 for(let name of keys){
  let it=ITEMS[name];
  let cnt=gs.inventory[name];
  if(it&&it.type==="consumable"){
   addBtn(`使用【${name}】×${cnt}——${it.desc}`,()=>{useItem(name);sceneInventory();});
  }else{
   log(`· ${name}×${cnt}（${it?it.desc:"杂物"}）`);
  }
 }
 log(`\n当前装备：${gs.equip}（加成+${gs.equipBonus}）｜持有：${gs.ownedEquips.join("、")}`);
 forlet: { // 换装按钮
  for(let name of gs.ownedEquips){
   if(name===gs.equip)continue;
   let eq=equipByName(name);
   addBtn(`换装【${name}】（加成+${eq.bonus}）——${eq.desc}`,()=>{switchEquip(name);sceneInventory();});
  }
 }
 addBtn("合上背囊，返回",()=>routeByStep());
}

//==== 炼丹炼器（P3b：配方配置化 + 成功率，材料消耗）====
export function alchemyChance(recipe){
 let ch=recipe.baseRate||BALANCE.alchemyBase;
 let t=TALENTS[gs.talent];
 if(t&&t.effect&&t.effect.alchemy)ch+=t.effect.alchemy;
 return Math.min(0.95,ch);
}
export function canCraft(recipe){
 for(let m in recipe.mats){if((gs.inventory[m]||0)<recipe.mats[m])return false;}
 return true;
}
export function craft(name){
 let r=RECIPES[name];
 if(!r){log("没有此配方");return false;}
 if(!canCraft(r)){log("材料不足！","red");return false;}
 for(let m in r.mats){removeItem(m,r.mats[m]);}
 if(Math.random()<alchemyChance(r)){
  let out=r.out;
  let eq=equipByName(out);
  if(eq){gainEquip(eq);log(`炼制成功！你获得【${out}】！`,"gold");}
  else{addItem(out,1);log(`炼制成功！你获得【${out}】！`,"gold");}
 }else{
  log("炼制失败，材料化为飞灰……","red");
 }
 refreshUi();
 return true;
}
export function sceneAlchemy(){
 log("\n⚗【炼丹炼器】你架起丹炉，清点材料。");
 let mats=Object.keys(gs.inventory).filter(n=>(ITEMS[n]&&ITEMS[n].type==="material"));
 if(mats.length){log(`材料：${mats.map(m=>`${m}×${gs.inventory[m]}`).join("、")}`);}
 else{log("（没有材料）");}
 for(let name in RECIPES){
  let r=RECIPES[name];
  let need=Object.keys(r.mats).map(m=>`${m}×${r.mats[m]}`).join("+");
  let ok=canCraft(r)?"":"（材料不足）";
  addBtn(`炼制【${name}】——需 ${need}，成功率${Math.floor(alchemyChance(r)*100)}%${ok}`,()=>{craft(name);sceneAlchemy();});
 }
 addBtn("收起丹炉，离开",()=>mainStep0());
}
