//==== faction.js：势力声望系统（P3b：声望增减/阵营判定/门控）====

//声望增减：加一方，对立阵营按 50% 反向扣减（阵营对立互斥）；魔种觉醒命格对魔渊声望+20%
//未知势力（王朝派系/模组势力等不在 FACTIONS 的）照常累加，仅已知势力做对立扣减
function addRep(faction,n){
 let t=TALENTS[gs.talent];
 let mul=1;
 if(faction==="魔渊"&&t&&t.effect&&t.effect.demonRep)mul+=t.effect.demonRep;
 let gain=Math.floor(n*mul);
 gs.reputation[faction]=(gs.reputation[faction]||0)+gain;
 let opp=FACTIONS[faction]&&FACTIONS[faction].oppose;
 if(opp&&gain>0){gs.reputation[opp]=(gs.reputation[opp]||0)-Math.floor(gain*0.5);}
 log(`🏛你对【${faction}】的声望${gain>=0?"+":""}${gain}（当前 ${repLevel(faction)}）`,"blue");
 refreshUi();
}

//声望等级（阈值由数值派生）
function repLevel(faction){
 let v=gs.reputation[faction]||0;
 if(v>=500)return "崇拜";
 if(v>=200)return "尊敬";
 if(v>=50)return "友好";
 if(v>0)return "陌生";
 if(v>-50)return "冷淡";
 return "敌对";
}

//阵营对立判定
function isOpposed(f1,f2){
 if(!FACTIONS[f1]||!FACTIONS[f2])return false;
 return FACTIONS[f1].oppose===f2||FACTIONS[f2].oppose===f1;
}

//声望门控（满足门槛才解锁）
function factionGate(faction,req){
 return (gs.reputation[faction]||0)>=req;
}

//==== 势力面板场景 ====
function sceneFaction(){
 log("\n🏛【势力】你审视自己在各方势力间的声望。");
 for(let f in FACTIONS){
  let v=gs.reputation[f]||0;
  let opp=FACTIONS[f].oppose?`（对立：${FACTIONS[f].oppose}）`:"";
  log(`· ${f}：${v}（${repLevel(f)}）${opp}`);
 }
 addBtn("离开",()=>mainStep0());
}
