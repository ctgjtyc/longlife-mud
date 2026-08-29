//==== dynasty.js：王朝系统（P5 凡俗王朝纷争）====
// 参与派系纷争，获取声望/灵石；事件 flag 记录已抉择

//王朝场景（派系声望 + 未触发纷争事件）
function sceneDynasty(){
 let d=DYNASTIES["大夏王朝"];
 log(`\n🏛【${d.name}】${d.desc}`);
 log("（派系）");
 for(let k in d.factions){
  log(`  ${k}：${d.factions[k].desc}（声望 ${gs.reputation[k]||0}）`);
 }
 let pending=d.events.filter(e=>!gs.flags["dyn_evt_"+e.id]);
 if(pending.length){
  log("（当前纷争）");
  for(let e of pending){
   addBtn(`【${e.title}】${e.desc}`,()=>sceneDynastyEvent(e));
  }
 }else{
  log("（暂无纷争，天下暂安）");
 }
 addBtn("离开王朝",()=>sceneRegion());
}

//王朝纷争事件（抉择 → 效果 → 置 flag）
function sceneDynastyEvent(e){
 log(`\n🏛【${e.title}】${e.desc}`);
 for(let c of e.choices){
  addBtn(c.text,()=>{
   applyEffect(c.effect);
   if(c.flag)setFlag(c.flag,true);
   setFlag("dyn_evt_"+e.id,true);
   log("王朝局势因你的抉择而变。","blue");
   sceneDynasty();
  });
 }
 addBtn("暂不介入",()=>sceneDynasty());
}
