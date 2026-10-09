//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, gs, log, refreshUi } from "./core.js";
import { ITEMS } from "./data/items.js";
import { MONSTERS } from "./data/monsters.js";
import { NPCS } from "./data/npcs.js";
import { QUESTS } from "./data/quests.js";
import { mainStep0 } from "./story.js";

//==== modloader.js：模组系统（P5 模组规范/加载/冲突检测/编辑器）====
// 模组规范：{id, name, version, content:{quests:{}, npcs:{}, items:{}, monsters:{}}}
// 命名空间隔离：builtin:/mod: 前缀；冲突检测：同 id 且内容不同则拒绝
// 编辑器草稿（浏览器内可视化编辑，prompt 交互）

export let modDraft=null;

//模组注入目标（与内置内容同对象，加载即生效）
export const MOD_TARGETS={quests:QUESTS,npcs:NPCS,items:ITEMS,monsters:MONSTERS};
//内置内容快照（冲突检测基准）
export const MOD_BUILTIN={};
for(let k in MOD_TARGETS)MOD_BUILTIN[k]=Object.assign({},MOD_TARGETS[k]);

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
 for(let section in MOD_TARGETS){
  let mods=mod.content[section]||{};
  for(let id in mods){
   let builtin=MOD_BUILTIN[section][id];
   if(builtin!==undefined&&JSON.stringify(builtin)!==JSON.stringify(mods[id])){
    conflicts.push({section:section,id:id,type:"builtin"});
   }
  }
 }
 return conflicts;
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
 for(let section in MOD_TARGETS){
  let mods=mod.content[section]||{};
  for(let id in mods)MOD_TARGETS[section][id]=mods[id];
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
 log("\n📦【模组】当前已加载："+(gs.mods&&Object.keys(gs.mods).length?Object.keys(gs.mods).join("、"):"无"));
 addBtn("📤导出模组模板",()=>{
  log("模组 JSON 模板（复制到文件/控制台）：\n"+modExport("my_mod","我的模组","0.1",{quests:{},npcs:{},items:{},monsters:{}}),"blue");
  sceneModPanel();
 });
 addBtn("📥加载模组（粘贴 JSON）",()=>sceneModImport());
 addBtn("🛠模组编辑器",()=>sceneModEditor());
 addBtn("离开模组面板",()=>mainStep0());
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
