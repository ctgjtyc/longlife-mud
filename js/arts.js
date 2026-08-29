//==== arts.js：功法系统（P3b：习得/被动加成/主动技能/渡劫节点）====

//习得功法（检查 cultReq，重复习得拒绝）
function learnArt(id){
 let a=ARTS[id];
 if(!a){log("没有此功法");return false;}
 if(gs.arts[id]){log(`你已习得【${id}】`);return false;}
 if(gs.cult<a.cultReq){log(`修为不足，需 ${a.cultReq} 点修为才能习得【${id}】`,"red");return false;}
 gs.arts[id]=1;
 log(`📖你习得功法【${id}】——${a.desc}`,"gold");
 refreshUi();
 return true;
}

//被动功法属性加成（并入 attrEff，常驻生效）
function artBonus(k){
 let v=0;
 for(let id in gs.arts){
  let a=ARTS[id];
  if(!a)continue; // 旧档残留已删功法 id 防御（防 attrEff 崩线）
  if(a.type==="passive"&&a.attrMods&&a.attrMods[k])v+=a.attrMods[k];
 }
 return v;
}

//主动技能释放：战斗中命中敌方，战斗外仅演示
function castSkill(id){
 let a=ARTS[id];
 if(!a||a.type!=="active"){log("没有此技能");return false;}
 if(!gs.arts[id]){log(`你尚未习得【${id}】`,"red");return false;}
 if(!costMp(a.mpCost))return false;
 if(gs.inFight&&gs.enemy){
  log(`你施展【${id}】，对【${gs.enemy.name}】造成 ${a.dmg} 点伤害！`,"gold");
  if(damageEnemy(a.dmg))return true; // J34 方向2：团体战斗目标切换/全灭统一结算
  enemyTurn();
 }else{
  log(`你施展【${id}】，灵力激荡，气势如虹。`,"gold");
 }
 return true;
}

//渡劫成功率：基础 + 渡劫节点功法加成（上限 95%）
function tribulationChance(){
 let base=BALANCE.tribBase;
 for(let id in gs.arts){
  let a=ARTS[id];
  if(!a)continue; // 旧档残留防御
  if(a.type==="tribulation"&&a.tribBonus)base+=a.tribBonus;
 }
 return Math.min(0.95,base);
}

//渡劫事件（P3b：渡劫期后触发，成败两分支）
function triggerTribulation(){
 log("\n⚡【渡劫】雷云密布，天劫降临！","danger");
 let ch=tribulationChance();
 log(`渡劫成功率：${Math.floor(ch*100)}%`);
 addBtn("引动天劫，放手一搏",()=>{
  if(Math.random()<ch){
   log("雷劫加身，你以无上道行硬抗天劫，成功渡过！","gold");
   gs.cult+=2000;
   gs.attrs.heart+=5;
   log("修为+2000，道心+5！","green");
   addBtn("渡劫功成，继续前行",()=>mainStep0());
  }else{
   log("天劫恐怖，你被劈得灰飞烟灭……但长生不灭，肉身重塑。","red");
   gs.hp=Math.max(1,Math.floor(gs.hpmax*0.3));
   gs.status="天劫重伤";
   passYear(50);
   log("耗费五十年光阴，你才从劫后余烬中恢复。","red");
   addBtn("劫后余生，继续前行",()=>mainStep0());
  }
 });
 addBtn("暂避锋芒，改日再渡",()=>mainStep0());
}

//==== 功法阁场景 ====
function sceneArts(){
 log("\n📖【功法阁】你翻阅典籍，参悟功法。");
 log(`当前修为：${gs.cult} 点｜灵力：${gs.mp}/${mpMax()}`);
 let learned=Object.keys(gs.arts);
 if(learned.length){log(`已习得：${learned.join("、")}`);}
 else{log("（尚未习得任何功法）");}
 let learnable=Object.keys(ARTS).filter(id=>!gs.arts[id]&&gs.cult>=ARTS[id].cultReq);
 if(learnable.length){
  for(let id of learnable){
   let a=ARTS[id];
   addBtn(`习得【${id}】——${a.desc}`,()=>{learnArt(id);sceneArts();});
  }
 }else{
  log("（当前没有可习得的功法）");
 }
 // 渡劫入口（渡劫期及以上）
 if(gs.cult>=4000){
  addBtn("⚡引动天劫（渡劫）",()=>triggerTribulation());
 }
 addBtn("离开功法阁",()=>mainStep0());
}
