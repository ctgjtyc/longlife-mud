//==== trade.js：交易系统（P5 地区物价/倒卖）====
// 地区物价：WORLD.regions[r].basePrice；波动 ±20%；低买高卖倒卖

//当前区域某物品物价（含随机波动 0.8~1.2）
function regionPrice(item){
 let r=curRegion();
 let base=r.basePrice[item];
 if(base===undefined)return null;
 let wave=0.8+Math.random()*0.4;
 return Math.max(1,Math.floor(base*wave));
}

//交易场景（买入：区域物价；卖出：持有材料按当前区域价）
function sceneTrade(){
 let r=curRegion();
 log(`\n🏪【${r.name}】集市，物价随行就市。`);
 let goods=Object.keys(r.basePrice);
 for(let it of goods){
  let p=regionPrice(it);
  addBtn(`购买【${it}】（${p}灵石）`,()=>{
   if(gs.stone>=p){gs.stone-=p;addItem(it,1);log(`你购得【${it}】。`,"green");}
   else log("灵石不足！","red");
   sceneTrade();
  });
 }
 let owned=Object.keys(gs.inventory).filter(n=>ITEMS[n]&&ITEMS[n].type==="material");
 if(owned.length){
  log("（出售材料）");
  for(let it of owned){
   let p=regionPrice(it);
   addBtn(`出售【${it}】×${gs.inventory[it]}（${p}灵石/个）`,()=>{
    removeItem(it,1);gs.stone+=p;
    log(`你售出【${it}】，得灵石${p}。`,"green");
    sceneTrade();
   });
  }
 }
 addBtn("离开集市",()=>sceneRegion());
}
