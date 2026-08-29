//==== world.js：大世界引擎（P5 开放世界）====
// gs.pos 当前区域；移动消耗岁月；据点升级（gs.world.strongholds 持久）；时间动态世界事件

//当前区域（默认红尘江湖）
function curRegion(){return WORLD.regions[gs.pos]||WORLD.regions.jianghu;}

//通用效果结算（世界事件/王朝/动态事件共用：rep/items/stone/cult/attrs）
function applyEffect(e){
 if(!e)return;
 if(e.rep)for(let k in e.rep)addRep(k,e.rep[k]);
 if(e.items)for(let k in e.items)addItem(k,e.items[k]);
 if(e.stone)gs.stone+=e.stone;
 if(e.cult)gs.cult+=e.cult;
 if(e.attrs)for(let k in e.attrs)gs.attrs[k]+=e.attrs[k];
}

//移动（相邻区域 + 消耗岁月）
function moveTo(regionId){
 let r=WORLD.regions[regionId];
 if(!r){log("没有此地");return;}
 let cur=curRegion();
 if(!cur.adjacent.includes(regionId)){log(`【${r.name}】与当前【${cur.name}】不相邻，无法直接前往`,"red");return;}
 gs.pos=regionId;
 log(`你启程前往【${r.name}】，跋山涉水。`);
 passYear(5);
 if(enemyRevenge())return; // J34 后续：仇敌寻仇（触发战斗则不再渲染抵达）
 if(ambushCheck(r))return; // J34 方向2：区域伏击（触发战斗则不再渲染抵达）
 log(`你抵达【${r.name}】：${r.desc}`,"blue");
 sceneRegion();
}

//J34 方向2：区域伏击（危险区域按 ambushRate 概率触发；30% 概率遭遇团体）
function ambushCheck(r){
 if(!r.ambushRate||Math.random()>=r.ambushRate)return false;
 let pool=r.monsters||["山林妖狼"];
 let n=Math.random()<0.3?2:1;
 let foes=[];
 for(let i=0;i<n;i++){
  let m=monsterByName(pool[Math.floor(Math.random()*pool.length)]);
  if(m)foes.push(m);
 }
 if(!foes.length)return false;
 log(`\n⚠你被${foes.length>1?foes.length+"名妖兽":"【"+foes[0].name+"】"}伏击！`,"danger");
 startFight(foes);
 return true;
}

//区域场景（据点/交易/动态事件/王朝/移动）
function sceneRegion(){
 let r=curRegion();
 log(`\n📍【${r.name}】${r.desc}`);
 if(r.stronghold){
  let sh=WORLD.strongholds[r.stronghold];
  addBtn(`🏯进入据点【${sh.name}】（Lv${strongholdLevel(r.stronghold)}）`,()=>sceneStronghold(r.stronghold));
 }
 addBtn("🏪在此交易",()=>sceneTrade());
 addBtn("🌍触发动态事件",()=>sceneDynamicEvent());
 addBtn("🏛关注凡俗王朝",()=>sceneDynasty());
 log("（可前往）");
 for(let adj of r.adjacent){
  let ar=WORLD.regions[adj];
  addBtn(`🚶前往【${ar.name}】`,()=>moveTo(adj));
 }
 addBtn("返回主界面",()=>mainStep0());
}

//据点等级（gs.world.strongholds 持久，默认 1）
function strongholdLevel(id){
 return (gs.world&&gs.world.strongholds&&gs.world.strongholds[id])||1;
}
function setStrongholdLevel(id,lv){
 if(!gs.world)gs.world={strongholds:{}};
 if(!gs.world.strongholds)gs.world.strongholds={};
 gs.world.strongholds[id]=lv;
}

//据点被动加成（每10年额外修为）
function strongholdBonus(id){
 let sh=WORLD.strongholds[id];
 if(!sh)return 0;
 let lv=strongholdLevel(id);
 let b=0;
 for(let u of sh.upgrades){
  if(lv>=u.level&&u.effect.startsWith("cultPerYear"))b+=parseInt(u.effect.replace("cultPerYear+",""));
 }
 return b;
}

//据点场景（升级消耗灵石）
function sceneStronghold(id){
 let sh=WORLD.strongholds[id];
 let lv=strongholdLevel(id);
 log(`\n🏯【${sh.name}】当前等级 Lv${lv}，每10年额外修为+${strongholdBonus(id)}。`);
 let up=sh.upgrades.find(u=>u.level===lv+1);
 if(up){
  addBtn(`升级至 Lv${up.level}（需灵石${up.cost}）`,()=>{
   if(gs.stone>=up.cost){gs.stone-=up.cost;setStrongholdLevel(id,lv+1);log(`【${sh.name}】升级至 Lv${lv+1}！`,"gold");}
   else log("灵石不足！","red");
   sceneStronghold(id);
  });
 }else log("（已达最高等级）");
 addBtn("离开据点",()=>sceneRegion());
}

//待触发的时间动态世界事件（year 到达且未抉择）
function pendingWorldEvent(){
 for(let ev of WORLD.dynEvents){
  if(gs.year>=ev.year&&!gs.flags["dyn_"+ev.id])return ev;
 }
 return null;
}

//世界事件场景（mainStep0 优先展示；flag 记录已抉择）
function sceneWorldEvent(ev){
 setFlag("dyn_"+ev.id,true);
 log(`\n🌍【世界事件：${ev.title}】${ev.desc}`,"gold");
 for(let c of ev.choices){
  addBtn(c.text,()=>{
   applyEffect(c.effect);
   if(c.flag)setFlag(c.flag,true);
   log("你做出了抉择，世界随之改变。","blue");
   mainStep0();
  });
 }
}
