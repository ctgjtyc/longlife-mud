//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { castSkill } from "./arts.js";
import { attrEff } from "./buff.js";
import { addAch, addBtn, clearOpt, gs, log, passYear, refreshUi, setFlag } from "./core.js";
import { ARTS, TALENTS } from "./data/arts.js";
import { BALANCE } from "./data/balance.js";
import { ITEMS } from "./data/items.js";
import { monsterByName } from "./data/monsters.js";
import { stepCopyMagicCave, stepCopyYaoShan } from "./dungeons.js";
import { useItem } from "./inventory.js";
import { rollLoot } from "./loot.js";
import { syncMemories } from "./memory.js";
import { diffEnemyMult } from "./meta.js";
import { mainStep0 } from "./story.js";

//==== fight.js：回合战斗系统（P4 战斗深度 + J34 方向2 团体战斗）====
// 团体战斗数据模型（运行时，不落档）：gs.foes 敌人数组 / gs.enemy 当前目标 / gs.foeIndex 目标索引
// gs.foeReward 团体总奖励（启动时聚合）/ gs.foeLeader 首领（词缀掉落基准）

//开始战斗：兼容单怪与团体（传数组即团体战）
export function startFight(monsterObj){
 let list=Array.isArray(monsterObj)?monsterObj:[monsterObj];
 startFightGroup(list);
}

//团体战斗：克隆敌人数组，聚合总奖励，记录首领
export function startFightGroup(monsters){
 gs.inFight=true;
 // P1-3 死接线修复：难度敌人倍率（diffEnemyMult）在此接进开战克隆——只缩放血量/攻击，奖励不缩放
 let dm=(typeof diffEnemyMult==="function")?diffEnemyMult():1;
 gs.foes=monsters.map(m=>{let c=JSON.parse(JSON.stringify(m));c.hp=Math.floor(c.hp*dm);c.atk=Math.floor(c.atk*dm);c.hpMax=c.hp;return c;});
 gs.foeIndex=0;
 gs.enemy=gs.foes[0];
 gs.foeLeader=gs.foes[0];
 gs.foeReward={cult:0,stone:0};
 for(let m of gs.foes){
  gs.foeReward.cult+=(m.reward&&m.reward.cult)||0;
  gs.foeReward.stone+=(m.reward&&m.reward.stone)||0;
 }
 document.getElementById("fightui").style.display="block";
 log(`\n⚔战斗开启！遭遇${gs.foes.length>1?gs.foes.length+"名敌人":"【"+gs.enemy.name+"】"}！`,"danger");
 renderFightUi();
 fightTurn();
}
export function renderFightUi(){
 document.getElementById("enemyName").innerText=gs.enemy.name+(gs.foes.length>1?`（${gs.foeIndex+1}/${gs.foes.length}）`:"");
 document.getElementById("enemyHpText").innerText=gs.enemy.hp;
 let pct=Math.max(0,gs.enemy.hp)/gs.enemy.hpMax*100;
 document.getElementById("enemyHpBar").style.width=pct+"%";
}
export function fightTurn(){
 if(!gs.inFight)return;
 clearOpt();
 addBtn("🗡挥剑攻击",()=>{playerAttack();});
 // P3b：主动技能（已习得的 active 功法）
 let actives=Object.keys(gs.arts).filter(id=>ARTS[id]&&ARTS[id].type==="active");
 for(let id of actives){
  let a=ARTS[id];
  addBtn(`⚡施展【${id}】（耗${a.mpCost}灵力，伤${a.dmg}）`,()=>{castSkill(id);});
 }
 addBtn("🛡防御格挡",()=>{playerDefend();});
 addBtn("🎒使用道具",()=>{fightItem();}); // P4：战斗内用消耗品
 addBtn("🏃尝试逃跑（不一定成功）",()=>{tryEscape();});
}
//P4：战斗内道具子菜单（用消耗品后返回战斗）
export function fightItem(){
 clearOpt();
 log("\n🎒【战斗道具】你翻找随身之物。");
 let consumables=Object.keys(gs.inventory).filter(n=>ITEMS[n]&&ITEMS[n].type==="consumable");
 if(!consumables.length){log("（没有可用道具）");}
 for(let n of consumables){
  addBtn(`使用【${n}】×${gs.inventory[n]}`,()=>{
   useItem(n);
   if(gs.hp>0)fightTurn();
  });
 }
 addBtn("返回战斗",()=>fightTurn());
}
export function playerAttack(){
 let t=TALENTS[gs.talent];
 let mul=(t&&t.effect&&t.effect.atkMul)||1;
 let dmg=Math.floor((BALANCE.atkBase + gs.equipBonus*BALANCE.atkEquip + gs.cult*BALANCE.atkCult + attrEff("constitution")*BALANCE.atkConstitution)*mul);
 log(`你发起攻击，对【${gs.enemy.name}】造成 ${dmg} 点伤害！`,"green");
 if(damageEnemy(dmg))return;
 enemyTurn();
}
export function playerDefend(){
 log("你摆出防御姿态，降低受到的伤害");
 let edmg=Math.floor(gs.enemy.atk*0.4);
 gs.hp-=edmg;
 log(`敌方攻击，防御抵消部分伤害，受到${edmg}伤害`,"red");
 checkPlayerDead();
 if(!gs.enemy)return; // 重伤路径 endFight 已置空 enemy，勿再渲染战斗 UI（修复 TypeError）
 renderFightUi();
 if(gs.hp>0)fightTurn();
}
export function tryEscape(){
 let r=Math.random();
 if(r>0.45){
  log("✅你成功脱身逃离战场！");
  endFight();
  backAfterFight();
 }else{
  log("❌逃跑失败！敌人紧追不放！","danger");
  enemyTurn();
 }
}

//对当前目标造成伤害；目标死亡切换下一目标；全部击杀→fightWin
export function damageEnemy(dmg){
 let e=gs.enemy;
 e.hp-=dmg;
 renderFightUi();
 if(e.hp>0)return false;
 log(`你击杀了【${e.name}】！`,"gold");
 gs.foes.splice(gs.foeIndex,1);
 if(!gs.foes.length){fightWin();return true;}
 gs.foeIndex=Math.min(gs.foeIndex,gs.foes.length-1);
 gs.enemy=gs.foes[gs.foeIndex];
 log(`【${gs.enemy.name}】冲上前来！`,"danger");
 renderFightUi();
 return true;
}

//敌方回合：所有存活敌人各攻击一次（含各自 AI）
export function enemyTurn(){
 for(let m of gs.foes){
  let dmg=m.atk+Math.floor(Math.random()*8);
  // P4：敌人 AI（狂暴/阶段/治疗/召唤，均按血量比例触发一次）
  if(m.ai==="enrage"&&m.hp<m.hpMax*(m.aiParam.hpPct||0.5)){
   if(!m._enraged){m._enraged=true;log(`${m.name}陷入狂暴，攻击暴涨！`,"danger");}
   dmg=Math.floor(dmg*(m.aiParam.atkMul||1.5));
  }
  if(m.ai==="phase"&&m.hp<m.hpMax*(m.aiParam.hpPct||0.5)){
   if(!m._phased){
    m._phased=true;
    m.atk=Math.floor(m.atk*(m.aiParam.atkMul||1.3));
    log(`${m.name}进入第二阶段，气势陡然攀升！`,"danger");
   }
  }
  if(m.ai==="heal"&&m.hp<m.hpMax*(m.aiParam.hpPct||0.4)){
   if(!m._healed){
    m._healed=true;
    let heal=Math.floor(m.hpMax*(m.aiParam.healPct||0.25));
    m.hp=Math.min(m.hpMax,m.hp+heal);
    log(`${m.name}汲取天地灵气，恢复${heal}点生命！`,"blue");
   }
  }
  if(m.ai==="summon"&&m.hp<m.hpMax*(m.aiParam.hpPct||0.5)){
   if(!m._summoned){
    m._summoned=true;
    let minion=monsterByName(m.aiParam.minion);
    log(`${m.name}召唤出${m.aiParam.minion}助战！`,"danger");
    if(minion){gs.hp-=minion.atk;log(`${m.aiParam.minion}对你发动攻击，造成${minion.atk}伤害！`,"red");}
   }
  }
  gs.hp-=dmg;
  log(`${m.name}发动攻击，对你造成 ${dmg} 伤害！`,"red");
  if(gs.hp<=0){checkPlayerDead();return;}
 }
 checkPlayerDead();
 renderFightUi();
 if(gs.hp>0)fightTurn();
}
export function fightWin(){
 log(`🎉你击退了所有敌人！`,"gold");
 addAch("a9");
 let rw=gs.foeReward;
 gs.cult+=rw.cult;
 gs.stone+=rw.stone;
 log(`获得修为+${rw.cult}，灵石+${rw.stone}`);
 // P4：任务钩子（斩妖支线 + 秘境主线副本通关标记）
 setFlag("kill_monster",true);
 if(gs.step===6)setFlag("dungeon_yaoshan",true);
 else if(gs.step===7)setFlag("dungeon_magiccave",true);
 else if(gs.step===8)setFlag("dungeon_starrelic",true);
 syncMemories(); // J34 方向3：初战/副本通关记起往事
 rollLoot(gs.foeLeader); // P4：词缀掉落（带 affixDrop 的 BOSS，rollLoot 内部判空）
 endFight();
 backAfterFight();
}
export function endFight(){
 gs.inFight=false;
 gs.enemy=null;
 gs.foes=[];
 gs.foeIndex=0;
 gs.foeReward={cult:0,stone:0};
 gs.foeLeader=null;
 document.getElementById("fightui").style.display="none";
 refreshUi();
}
export function checkPlayerDead(){
 //长生特性：hp归零不会真正死亡，重伤，多年后恢复
 if(gs.hp<=0){
  log("\n💔你身受致命重创！长生特性触发，肉身不灭，但神魂受损。","danger");
  gs.hp=20;
  gs.status="神魂重伤";
  passYear(40);
  log("耗费四十年光阴缓缓恢复伤势");
  refreshUi();
  endFight();
  backAfterFight();
 }
}
export function backAfterFight(){
 //战斗结束回到对应剧情分支
 if(gs.step===6){stepCopyYaoShan();}
 else if(gs.step===7){stepCopyMagicCave();}
 else mainStep0();
}
