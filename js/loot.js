//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { gs, log } from "./core.js";
import { equipByName, gainEquip } from "./inventory.js";

//==== loot.js：词缀掉落（P4 战斗深度）====
// 击杀带 affixDrop 的怪物后，按词缀池 + 基础装备池生成词缀装备（名=词缀·本体，加成叠加）

//词缀配置（bonus 叠加到本体装备）
export const AFFIXES={
 "烈焰":{bonus:8,desc:"火焰之力附体，灼烧万物"},
 "妖气":{bonus:6,desc:"妖气缠绕，凶性毕露"},
 "噬魂":{bonus:10,desc:"噬魂之力，侵蚀心神"},
 "魔骨":{bonus:7,desc:"魔骨淬炼，坚不可摧"}
};
//词缀装备的基础本体池（副本掉落可生成的本体）
export const AFFIX_BASES=["青锋短剑","玄木护符","流云道袍"];

//掉落：返回生成的词缀装备（无 affixDrop 返回 null）
export function rollLoot(monster){
 if(!monster||!monster.affixDrop||!monster.affixDrop.length)return null;
 let affixName=monster.affixDrop[Math.floor(Math.random()*monster.affixDrop.length)];
 let affix=AFFIXES[affixName];
 let baseName=AFFIX_BASES[Math.floor(Math.random()*AFFIX_BASES.length)];
 let base=equipByName(baseName);
 if(!base)return null;
 let name=affixName+"·"+baseName;
 if(!equipByName(name)){
  // 词缀装备写入 gs.customEquips 随档持久化（修复：仅 push allEquip 运行时数组，读档后丢失致行囊报错）
  (gs.customEquips=gs.customEquips||[]).push({name:name,bonus:base.bonus+affix.bonus,desc:affix.desc+"，"+base.desc});
 }
 gainEquip(equipByName(name));
 log(`✨掉落词缀装备【${name}】（加成+${base.bonus+affix.bonus}）！`,"gold");
 return equipByName(name);
}
