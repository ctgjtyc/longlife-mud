//==== share.js：多人雏形（P6 存档分享/道具交换，无实时战斗）====
// 分享码格式：CFSAVE1.<encodeURIComponent(JSON)> / CFGIFT1.<...>，纯 JS 无环境依赖

//==== 存档导出：gs+allAch 序列化为分享码 ====
// P1-1 收敛：与本地槽位共用 sanitizeSave（战斗态清洗），import 走 _applySaveData（迁移+运行时兜底+结构校验）
function exportSave(){
 let data={gs:sanitizeSave(),allAch:allAch,ver:gs.version};
 let code="CFSAVE1."+encodeURIComponent(JSON.stringify(data));
 if(typeof navigator!=="undefined"&&navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(code).then(()=>log("存档码已复制！可发给他人导入。","green")).catch(()=>{});
 }else if(typeof prompt==="function"){
  prompt("复制以下存档码（发给他人）：",code);
 }
 log("📤存档已导出为分享码。","blue");
 return code;
}
function importSave(code){
 try{
  if(!code||code.indexOf("CFSAVE1.")!==0)throw new Error("格式错误");
  let d=JSON.parse(decodeURIComponent(code.slice(8)));
  if(!d||typeof d!=="object"||!d.gs||typeof d.gs!=="object")throw new Error("缺 gs");
  _applySaveData(d,"📥存档导入成功！","green");
  return true;
 }catch(e){
  log("存档导入失败："+e.message,"red");
  return false;
 }
}

//==== 道具交换码：背包道具打包为码（纯离线交换）====
function exportGift(){
 let items=gs.inventory||{};
 let keys=Object.keys(items);
 if(!keys.length){log("背包空空，无可交换道具。","red");return null;}
 let code="CFGIFT1."+encodeURIComponent(JSON.stringify({items:items}));
 if(typeof navigator!=="undefined"&&navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(code).then(()=>log("交换码已复制！","green")).catch(()=>{});
 }else if(typeof prompt==="function"){
  prompt("复制以下交换码：",code);
 }
 log("🎁道具已打包为交换码。","blue");
 return code;
}
function importGift(code){
 try{
  if(!code||code.indexOf("CFGIFT1.")!==0)throw new Error("格式错误");
  let d=JSON.parse(decodeURIComponent(code.slice(8)));
  if(!d.items)throw new Error("缺 items");
  for(let k in d.items)addItem(k,d.items[k]);
  log("🎁道具交换成功！获得："+Object.keys(d.items).map(k=>`${k}×${d.items[k]}`).join("、"),"green");
  return true;
 }catch(e){
  log("交换码导入失败："+e.message,"red");
  return false;
 }
}

//==== 分享面板入口 ====
function sceneShare(){
 log("\n🤝【存档分享 / 道具交换】","blue");
 log("分享码为纯文本，可复制粘贴给他人离线导入；无实时战斗。");
 addBtn("📤导出存档码",()=>exportSave());
 addBtn("📥导入存档码",()=>{
  let code=typeof prompt==="function"?prompt("粘贴他人分享的存档码："):"";
  if(code)importSave(code);
 });
 addBtn("🎁导出道具交换码",()=>exportGift());
 addBtn("🎁导入道具交换码",()=>{
  let code=typeof prompt==="function"?prompt("粘贴道具交换码："):"";
  if(code)importGift(code);
 });
 addBtn("返回",()=>mainStep0());
}
