//==== meta.js：元游戏（P6 传记/难度/提示系统）====

//==== 难度系统：0=简单 1=普通 2=硬核（gs.diff 落档）====
const DIFFS=[
 {id:0,name:"简单",desc:"修为增长×1.5，初始灵石200，敌人强度×0.8"},
 {id:1,name:"普通",desc:"标准体验"},
 {id:2,name:"硬核",desc:"修为增长×0.7，初始灵石50，敌人强度×1.3"}
];
function setDifficulty(d){
 if(d<0||d>2)return;
 gs.diff=d;
 log(`难度已设为【${DIFFS[d].name}】：${DIFFS[d].desc}`,"blue");
 refreshUi();
}
function diffMult(){ // 修为增长倍率
 return gs.diff===0?1.5:(gs.diff===2?0.7:1);
}
function diffEnemyMult(){ // 敌人强度倍率
 return gs.diff===0?0.8:(gs.diff===2?1.3:1);
}
function diffInitStone(){ // 难度初始灵石
 return gs.diff===0?200:(gs.diff===2?50:100);
}
function sceneDifficulty(){
 log("\n⚙【难度设置】","blue");
 for(let d of DIFFS){
  addBtn(`【${d.name}】${d.desc}`,()=>{setDifficulty(d.id);sceneDifficulty();});
 }
 addBtn("返回",()=>mainStep0());
}

//==== 传记：gs.bio 记录关键节点 [{year,name,desc}]，跨世累积 ====
function bioLog(name,desc){
 if(!gs.bio)gs.bio=[];
 gs.bio.push({year:gs.year,name:name,desc:desc});
}
function biography(){
 let lines=[];
 lines.push(`《长生赋》人物传记 · 第${gs.ng||1}世`);
 lines.push(`——${gs.year}年，${realmOf(gs.cult).name}，修为${gs.cult}点`);
 if(gs.talent)lines.push(`命格：${gs.talent}`);
 if(gs.bio&&gs.bio.length){
  lines.push("── 生平大事 ──");
  for(let b of gs.bio)lines.push(`[${b.year}年] ${b.name}：${b.desc}`);
 }
 if(gs.achs&&gs.achs.length)lines.push("── 成就 ──\n"+gs.achs.join("、"));
 if(gs.reputation&&Object.keys(gs.reputation).length){
  lines.push("── 声望 ──");
  for(let k in gs.reputation)lines.push(`${k}：${gs.reputation[k]}`);
 }
 if(gs.endType)lines.push(`结局：${["","万古隐仙","宗门老祖","万古魔主","岁月道主","长生归寂"][gs.endType]}`);
 return lines.join("\n");
}
function sceneBiography(){
 log("\n📜【人物传记】","gold");
 log(biography());
 addBtn("📤导出传记（复制到剪贴板）",()=>{
  let txt=biography();
  if(typeof navigator!=="undefined"&&navigator.clipboard&&navigator.clipboard.writeText){
   navigator.clipboard.writeText(txt).then(()=>log("传记已复制！","green")).catch(()=>{});
  }else if(typeof prompt==="function"){
   prompt("复制以下传记：",txt);
  }
 });
 addBtn("🕊存入拾光记忆库",()=>bioToShiguang()); // J35 M4-4：传记对接拾光 personal 域
 addBtn("返回",()=>mainStep0());
}
//==== J35 M4-4：传记写入拾光（:8766 /api/diary → docs/personal/，零出网）====
// 双通道：①直投（拾光若放行本页 Origin 则直接入库）②403/网络失败→下载 .md 由拾光「导入」功能落库（拾光拒跨源 Origin 是其 CSRF 防护设计，不绕过）
function bioToShiguang(){
 const title="长生赋·人物传记·第"+(gs.ng||1)+"世·"+gs.year+"年";
 const body=biography();
 const today=new Date().toISOString().slice(0,10);
 fetch("http://127.0.0.1:8766/api/diary",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({title:title,body:body+"\n\n（MUD游戏《长生梦录》传记导出）",date:today,private:false})
 }).then(r=>r.json()).then(d=>{
  if(d.ok){log("✅ 已存入拾光个人记忆域（doc_id:"+d.doc_id+"）。","green");addBtn("返回",()=>sceneBiography());}
  else{log("拾光返回错误："+(d.error||"未知")+"，走文件导出通道。","red");bioDownloadFallback(title,body,today);}
 }).catch(()=>{
  log("直连拾光不可达（服务未开或跨源拦截——拾光仅放行自家页面，属安全设计）。已转文件导出：","red");
  bioDownloadFallback(title,body,today);
 });
}
function bioDownloadFallback(title,body,date){
 try{
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["# "+title+"\n\n"+body+"\n"],{type:"text/markdown"}));
  a.download="longlife-bio-"+date+".md";
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  log("📦 已下载 longlife-bio-"+date+".md → 打开拾光(:8766)用「导入」功能选择该文件即入个人记忆域。","blue");
 }catch(_){ log("自动下载失败，请用「导出传记（复制到剪贴板）」手动粘贴。","red"); }
 addBtn("返回",()=>sceneBiography());
}

//==== 提示系统：任务/可去地点/日志检索 ====
function sceneHint(){
 log("\n💡【提示】","blue");
 let active=Object.keys(gs.quests||{}).filter(k=>gs.quests[k]!=="done"&&gs.quests[k]!=="failed");
 if(active.length){
  log("── 进行中任务 ──","gold");
  for(let id of active){
   let q=QUESTS[id];
   if(q)log(`【${q.name}】${q.kind==="main"?"主线":(q.kind==="loop"?"循环":"支线")}`);
  }
 }else{
  log("── 当前无进行中任务 ──","gold");
 }
 let cur=curRegion();
 if(cur&&cur.adjacent){
  log("── 可去地点 ──","gold");
  for(let adj of cur.adjacent){
   let r=WORLD.regions[adj];
   if(r)log(`【${r.name}】${r.desc}`);
  }
 }
 log("── 日志检索 ──","gold");
 log("输入关键词可检索过往日志（searchLog）。");
 addBtn("🔍检索日志（输入关键词）",()=>{
  let kw=typeof prompt==="function"?prompt("输入检索关键词："):"";
  if(kw)searchLog(kw);
 });
 addBtn("返回",()=>mainStep0());
}
function searchLog(kw){
 if(!kw)return 0;
 let lb=document.getElementById("logbox");
 let txt=lb.innerText||"";
 let lines=txt.split("\n").filter(l=>l.includes(kw));
 log(`检索【${kw}】命中 ${lines.length} 条：`,"blue");
 for(let l of lines.slice(-20))log(l);
 return lines.length;
}
