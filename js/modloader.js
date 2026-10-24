//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, allAch, clearOpt, gs, log, refreshUi } from "./core.js";
import { ITEMS } from "./data/items.js";
import { MONSTERS } from "./data/monsters.js";
import { NPCS } from "./data/npcs.js";
import { QUESTS } from "./data/quests.js";
import { OFFICIAL_MODS } from "./data/official_mods.js";
import { startDialogue } from "./dialogue.js";
import { mainStep0 } from "./story.js";

//==== modloader.js：模组系统（P5 模组规范/加载/冲突检测/编辑器 + P5+ 官方模组坊）====
// 模组规范：{id, name, version, content:{quests:{}, npcs:{}, items:{}, monsters:{}, achs:{}}}
// 命名空间隔离：builtin:/mod: 前缀；冲突检测：同 id 且内容不同则拒绝
// 编辑器草稿（浏览器内可视化编辑，prompt 交互）
// P5+ 新增：achs 注入目标（core.js allAch）；官方模组库（data/official_mods.js，与玩家模组同管线）；
//           读档恢复钩子（window.__afterSaveApplied，core.js _applySaveData 尾调用——无循环依赖）

export let modDraft=null;

//模组注入目标（与内置内容同对象，加载即生效）
// achs（core.allAch）经 modSections() 调用时求值——core 在拼接产物中晚序（import 环所致），顶层引用会撞 TDZ
export const MOD_TARGETS={quests:QUESTS,npcs:NPCS,items:ITEMS,monsters:MONSTERS};
//内置内容快照（冲突检测基准）
export const MOD_BUILTIN={};
for(let k in MOD_TARGETS)MOD_BUILTIN[k]=Object.assign({},MOD_TARGETS[k]);
let _achBuiltin=null;
function achBuiltin(){if(!_achBuiltin)_achBuiltin=Object.assign({},allAch);return _achBuiltin;} // 首次调用于启动后=纯内置成就快照
//统一段视图：[段名, 注入目标, 内置快照]（数据段+成就段共用迭代）
export function modSections(){
 return [["quests",QUESTS,MOD_BUILTIN.quests],["npcs",NPCS,MOD_BUILTIN.npcs],
         ["items",ITEMS,MOD_BUILTIN.items],["monsters",MONSTERS,MOD_BUILTIN.monsters],
         ["achs",allAch,achBuiltin()]];
}

//校验模组 JSON 是否符合规范
export function modValidate(mod){
 if(!mod||typeof mod!=="object")return {ok:false,err:"模组必须为对象"};
 if(!mod.id||typeof mod.id!=="string")return {ok:false,err:"缺少 id"};
 if(!mod.name)return {ok:false,err:"缺少 name"};
 if(!mod.version)return {ok:false,err:"缺少 version"};
 if(!mod.content||typeof mod.content!=="object")return {ok:false,err:"缺少 content"};
 return {ok:true};
}

//冲突检测：与内置同 id 且内容不同 → 冲突
export function modConflictCheck(mod){
 let conflicts=[];
 for(let [section,target,builtin] of modSections()){
  let mods=mod.content[section]||{};
  for(let id in mods){
   let b=builtin[id];
   if(b!==undefined&&JSON.stringify(b)!==JSON.stringify(mods[id])){
    conflicts.push({section:section,id:id,type:"builtin"});
   }
  }
 }
 return conflicts;
}

//段注入帮手：achs 段有运行时 got 状态——重注入/重复加载时保留已解锁态（否则读档恢复的成就被数据源 got:false 打回）
function _injectSection(section,target,mods){
 for(let k in mods){
  let v=mods[k];
  if(section==="achs"&&target[k]&&typeof target[k].got==="boolean")v=Object.assign({},v,{got:target[k].got});
  target[k]=v;
 }
}

//加载模组（校验 + 冲突检测 + 注入 + 登记 gs.mods）
export function modLoad(mod){
 let v=modValidate(mod);
 if(!v.ok){log("模组校验失败："+v.err,"red");return false;}
 let conflicts=modConflictCheck(mod);
 if(conflicts.length){
  log(`模组【${mod.name}】存在 ${conflicts.length} 处冲突，拒绝加载：`,"red");
  for(let c of conflicts)log(`  ${c.section}.${c.id}（与内置冲突）`,"red");
  return false;
 }
 for(let [section,target] of modSections()){
  _injectSection(section,target,mod.content[section]||{});
 }
 if(!gs.mods)gs.mods={};
 gs.mods[mod.id]={name:mod.name,version:mod.version};
 log(`✅模组【${mod.name}】v${mod.version} 加载成功。`,"green");
 refreshUi();
 return true;
}

//导出模组 JSON（编辑器产物）
export function modExport(id,name,version,content){
 return JSON.stringify({id:id,name:name,version:version,content:content||{}},null,2);
}

//模组面板
export function sceneModPanel(){
 hideModShop();
 log("\n📦【模组】当前已加载："+(gs.mods&&Object.keys(gs.mods).length?Object.keys(gs.mods).join("、"):"无"));
 addBtn("🎁官方模组坊",()=>sceneOfficialMods());
 addBtn("📤导出模组模板",()=>{
  log("模组 JSON 模板（复制到文件/控制台）：\n"+modExport("my_mod","我的模组","0.1",{quests:{},npcs:{},items:{},monsters:{},achs:{}}),"blue");
  sceneModPanel();
 });
 addBtn("📥加载模组（粘贴 JSON）",()=>sceneModImport());
 addBtn("🛠模组编辑器",()=>sceneModEditor());
 addBtn("离开模组面板",()=>mainStep0());
}

//==== P5+ 官方模组坊：官方彩蛋模组一键安装（与玩家模组同管线，官方内容吃自家狗粮）====
//模组是否已完整注入（任一 content 键缺失即视为未装——用于读档恢复判定）
export function modInstalled(mod){
 for(let [section,target] of modSections()){
  let mods=(mod.content&&mod.content[section])||{};
  for(let id in mods)if(target[id]===undefined)return false;
 }
 return true;
}

//官方模组坊面板（M1.5 §2.2 卡片化：渲染进 #modshopbox 专用容器，不占日志环形缓冲）
export function sceneOfficialMods(){
 log("\n🎁【官方模组坊】官方彩蛋模组，与玩家模组走同一加载管线。");
 let box=document.getElementById("modshopbox");
 if(box){
  box.style.display="block";
  box.innerHTML="";
  for(let id in OFFICIAL_MODS){
   let m=OFFICIAL_MODS[id];
   let installed=modInstalled(m);
   let card=document.createElement("div");card.className="modcard";
   let top=document.createElement("div");top.className="modcard-top";
   top.innerHTML="<span class='modcard-name'>"+_modEsc(m.name)+"</span><span class='modcard-ver'>v"+_modEsc(m.version)+"</span><span class='modcard-badge'>限定</span>";
   let mid=document.createElement("div");mid.className="modcard-desc";mid.textContent=m.desc;
   let bot=document.createElement("div");bot.className="modcard-bot";
   let au=document.createElement("span");au.className="modcard-author";au.textContent=m.author;
   let btn=document.createElement("button");btn.className="modcard-btn"+(installed?" installed":"");
   btn.textContent=installed?"已安装 ✓":"安装";
   btn.disabled=installed;
   btn.onclick=()=>{if(modLoad(m))sceneOfficialMods();};
   bot.appendChild(au);bot.appendChild(btn);
   card.appendChild(top);card.appendChild(mid);card.appendChild(bot);
   box.appendChild(card);
  }
 }
 let m1024=OFFICIAL_MODS["mod_1024"];
 if(m1024&&modInstalled(m1024))addBtn("→ 立即前往代码真人",()=>startCodeJourney());
 addBtn("返回模组面板",()=>sceneModPanel());
}
//模组坊容器显隐（离开面板/回主线时收起）
export function hideModShop(){let box=document.getElementById("modshopbox");if(box)box.style.display="none";}
function _modEsc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

//M1.5 §1.3 一键启程：未装则走官方管线安装（幂等）→ 直达代码真人对话
//R1(D1)：卡片是 index.html 原生 onclick，绕过 addBtn 的 clearOpt——此处必须自清选项区，否则主菜单按钮残留把对话选项挤出首屏
export function startCodeJourney(){
 let m=OFFICIAL_MODS["mod_1024"];
 if(!m){log("官方模组暂不可用","red");return;}
 clearOpt();
 if(!gs.mods||!gs.mods[m.id])modLoad(m);
 else if(!modInstalled(m))restoreOfficialMods();
 startDialogue("daima_zhenren");
}

//读档恢复：存档登记过的官方模组自动重注入（gs.mods 随档保存；玩家粘贴模组仍需手动重载）
export function restoreOfficialMods(){
 let restored=[];
 for(let id in OFFICIAL_MODS){
  if(gs.mods&&gs.mods[id]&&!modInstalled(OFFICIAL_MODS[id])){
   for(let [section,target] of modSections()){
    _injectSection(section,target,OFFICIAL_MODS[id].content[section]||{});
   }
   restored.push(OFFICIAL_MODS[id].name);
  }
 }
 if(restored.length){
  log(`♻官方模组已随存档恢复：${restored.join("、")}`,"green");
  refreshUi();
 }
}
//读档钩子登记（core.js _applySaveData 尾调 window.__afterSaveApplied——经 window 解耦避免 core→modloader 循环依赖）
//追加式包装：拼接顺序不定（import 环），须与 main.js 的卡片刷新钩子共存而非互相覆盖
if(typeof window!=="undefined"){
 const _prevHook=window.__afterSaveApplied;
 window.__afterSaveApplied=()=>{if(typeof _prevHook==="function")_prevHook();restoreOfficialMods();};
}

//模组导入（浏览器 prompt 输入 JSON）
export function sceneModImport(){
 log("\n📥【加载模组】请在浏览器弹窗中粘贴模组 JSON。");
 let json=prompt("粘贴模组 JSON：");
 if(json){
  try{
   let mod=JSON.parse(json);
   modLoad(mod);
  }catch(e){log("JSON 解析失败："+e.message,"red");}
 }
 sceneModPanel();
}

//模组编辑器（可视化：新增任务 → 草稿 → 导出）
export function sceneModEditor(){
 log("\n🛠【模组编辑器】可视化编辑模组内容。");
 addBtn("新增任务（输入 id/名称）",()=>{
  let id=prompt("任务 id（如 q_mod_test）：");
  let name=prompt("任务名称：");
  if(id&&name){
   if(!modDraft)modDraft={};
   if(!modDraft.quests)modDraft.quests={};
   modDraft.quests[id]={name:name,kind:"side",need:null,steps:[{desc:"模组任务第一步",cond:null,reward:{stone:50}}],onDone:{}};
   log(`已加入草稿：任务【${name}】`,"green");
  }
  sceneModEditor();
 });
 addBtn("导出模组 JSON",()=>{
  log("模组 JSON：\n"+modExport("my_mod","我的模组","0.1",modDraft||{}),"blue");
  sceneModEditor();
 });
 addBtn("返回模组面板",()=>sceneModPanel());
}
