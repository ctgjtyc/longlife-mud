//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { attrEff, tickStatuses } from "./buff.js";
import { BALANCE } from "./data/balance.js";
import { IMAGES } from "./data/images.js";
import { NPCS } from "./data/npcs.js";
import { WORLD } from "./data/world.js";
import { addRelation } from "./dialogue.js";
import { startFight } from "./fight.js";
import { hasMemory, memoryCount, syncMemories } from "./memory.js";
import { bioLog, diffMult } from "./meta.js";
import { mainStep0, routeByStep } from "./story.js";
import { strongholdBonus } from "./world.js";

//==== core.js：全局状态 / 装备 / 成就 / 存档 / UI 工具 / 时间流逝 ====

//游戏全局状态（v8：六属性 + flags 因果标记 + P3 容器字段 + P4 叙事引擎字段 + P6 元游戏/多人字段 + J34 后续 NPC 深度扩展/记忆阅历字段 + 版本号）
export let gs={
 version:8,
 cult:0,
 stone:100,
 year:0,
 hp:100,
 hpmax:100,
 status:"平安无事",
 equip:"无",
 equipBonus:0,
 achs:[],
 step:0,
 dead:false,
 endType:0,
 inFight:false,
 enemy:null,
 attrs:Object.assign({},BALANCE.attrsInit),
 flags:{},
 inventory:{},      // P3a 背包 {物品名:数量}
 ownedEquips:[],    // P3a 持有装备名列表
 statuses:[],       // P3a 持久状态 [{id,name,years,attrMods,hpPerYear,cultPerYear}]
 reputation:{},     // P3b 势力声望 {势力:数值}
 arts:{},           // P3b 已习功法 {id:层数}
 talent:null,       // P3b 命格 id（开局三选一）
 mp:20,             // P3b 当前灵力（mpMax 派生，不落档）
 quests:{},         // P4 任务 {id:步索引|"done"|"failed"}
 relations:{},      // P4 NPC 关系 {npcId:好感}
 npcLifespan:{},    // J34 后续：NPC 寿命 {npcId:{expireYear:离世年份}}
 disciples:[],      // J34 后续：弟子 [{name,joinYear,talent,expireYear}]
 enemies:[],        // J34 后续：仇敌 [{npcId,name,grudgeYear,reason}]
 foes:[],           // J34 方向2：团体战斗敌人数组（运行时，不落档）
 foeIndex:0,        // J34 方向2：当前目标索引（运行时）
 foeReward:{cult:0,stone:0}, // J34 方向2：团体总奖励（运行时）
 foeLeader:null,    // J34 方向2：团体首领（词缀掉落基准，运行时）
 memories:{},       // J34 方向3：记忆与阅历 {id: 解锁年份}
 aiEnabled:false,   // P5 动态事件 AI 增强开关（可选，默认关；仅运行时，不落档）
 diff:1,            // P6 难度 0=简单 1=普通 2=硬核
 bio:[],            // P6 传记事件 [{year,name,desc}]（跨世累积）
 ng:0               // P6 周目数（多周目继承）
};
//ESM 下 gs 为模块级可变绑定，跨模块整体重置须经本 setter（避免对导入绑定的非法赋值）
export function setGs(v){gs=v;}
//装备库
export const allEquip=[
 {name:"破旧布衣",bonus:0,desc:"凡俗衣物"},
 {name:"青锋短剑",bonus:12,desc:"普通法器，杀伐之力小幅提升"},
 {name:"玄木护符",bonus:8,desc:"微弱护佑，降低灾祸概率"},
 {name:"岁月古玉",bonus:25,desc:"长生者至宝，时光加速修为"},
 {name:"魔骨血甲",bonus:30,desc:"魔道防具，代价是容易被正道追杀"},
 {name:"流云道袍",bonus:18,desc:"正道法袍，对抗妖魔有加成"},
 {name:"噬魂魔刃",bonus:35,desc:"凶煞魔兵，伤害极高，但持续侵蚀神魂"}
];

//成就库
export const allAch={
 a1:{name:"长生伊始",desc:"觉醒长生系统",got:false},
 a2:{name:"百年光阴",desc:"存活满100年",got:false},
 a3:{name:"隐世闲人",desc:"选择隐居千年不问世事",got:false},
 a4:{name:"江湖浪客",desc:"闯荡江湖历经厮杀",got:false},
 a5:{name:"魔道沉沦",desc:"踏入魔道之路",got:false},
 a6:{name:"当世无敌",desc:"修为抵达世间顶峰",got:false},
 a7:{name:"轮回过客",desc:"长生者也迎来终结结局",got:false},
 a8:{name:"遗迹探索者",desc:"通关上古洞府副本",got:false},
 a9:{name:"斩妖行者",desc:"击杀一头强大妖兽",got:false},
 a10:{name:"红尘渡客",desc:"经历凡人情缘事件",got:false}
};

//怪物库已迁至 data/monsters.js（P4 战斗深度：AI/阶段BOSS/词缀掉落）

//==== 存档读档 localstorage ====
// 运行时字段不落档（H 修复：战斗中存档→读档后幽灵敌人攻击）；单槽/槽位/分享码三通道共用同一份清单（P1-1 收敛）
export const RUNTIME_KEYS=["inFight","enemy","foes","foeIndex","foeReward","foeLeader","aiEnabled"];
//落档快照清洗（saveGame/saveToSlot/exportSave 共用：浅拷贝+剥离运行时字段）
export function sanitizeSave(){
 let snap=Object.assign({},gs);
 for(let k of RUNTIME_KEYS)delete snap[k];
 snap.inFight=false;snap.enemy=null;snap.foes=null;
 return snap;
}
//读档运行时兜底（_applySaveData 共用：旧档/分享码残留的战斗态整组清空，防幽灵战斗）
export function _resetRuntimeState(){
 gs.inFight=false;gs.enemy=null;gs.foes=null;
 gs.foeIndex=0;gs.foeReward={cult:0,stone:0};gs.foeLeader=null;gs.aiEnabled=false;
}
export function saveGame(){
 if(localStorage.getItem("mud_save")&&!confirm("已有旧存档，确定覆盖保存？"))return;
 let saveData={gs:sanitizeSave(),allAch:allAch};
 localStorage.setItem("mud_save",JSON.stringify(saveData));
 log("✅游戏已保存至本地浏览器存档");
}
export function loadGame(){
 let s=localStorage.getItem("mud_save");
 if(!s){log("⚠没有找到存档");return;}
 let d;
 try{d=JSON.parse(s);}catch(e){log("⚠存档数据损坏，无法读取（可清除存档后重开）","red");return;}
 if(!d||typeof d!=="object"||!d.gs||typeof d.gs!=="object"){log("⚠存档结构异常，无法读取","red");return;}
 _applySaveData(d);
}
//读档共用落地（单槽/槽位/最近档/分享码共用：迁移+运行时字段兜底+路由；okMsg/okCls 可换导入语境文案）
export function _applySaveData(d,okMsg,okCls){
 gs=d.gs;
 migrateSave();
 _resetRuntimeState(); // 旧档/分享码残留运行时字段兜底清空（防幽灵战斗）
 Object.assign(allAch,d.allAch||{});
 renderAch();
 refreshUi();
 log(okMsg||"✅存档读取成功！",okCls||"");
 clearOpt();
 routeByStep();
}

//==== J35 体验轮·多槽位存档（用户 2026-08-23 定向：存/读做弹出窗口+多档位）====
// 槽位键 mud_save_slot_{1..6}（旧单槽 mud_save 保留兼容，作「继续上次存档」回落源）
export const SAVE_SLOTS=6;
export function _slotKey(n){return "mud_save_slot_"+n;}
export function _slotMeta(){
 let r={time:new Date().toLocaleString()};
 try{
  r.year=gs.year;r.ng=gs.ng||1;r.endType=gs.endType||0;
  r.realm=realmOf(gs.cult).name;r.talent=gs.talent||"";
 }catch(_){}
 return r;
}
export function slotInfo(n){
 let s=localStorage.getItem(_slotKey(n));
 if(!s)return {empty:true};
 try{let d=JSON.parse(s);return {empty:false,meta:d.meta||{}};}
 catch(_){return {empty:false,meta:{},broken:true};}
}
export function saveToSlot(n){
 let info=slotInfo(n);
 if(!info.empty&&typeof confirm==="function"&&!confirm("槽位 "+n+" 已有存档，确定覆盖？"))return;
 let saveData={gs:sanitizeSave(),allAch:allAch,meta:_slotMeta()}; // 运行时字段不落档（sanitizeSave 三通道共用）
 try{localStorage.setItem(_slotKey(n),JSON.stringify(saveData));}
 catch(e){log("⚠保存失败（存储空间不足？）","red");return;}
 log("✅已保存到槽位 "+n+"（第"+(gs.ng||1)+"世·"+gs.year+"年·"+realmOf(gs.cult).name+"）");
 showSaveWindow(); // 刷新浮窗
}
export function loadFromSlot(n){
 let s=localStorage.getItem(_slotKey(n));
 if(!s){log("⚠槽位 "+n+" 为空","red");return;}
 let d;
 try{d=JSON.parse(s);}catch(e){log("⚠槽位 "+n+" 数据损坏","red");return;}
 if(!d||!d.gs){log("⚠槽位 "+n+" 结构异常","red");return;}
 _saveWinClose();
 _applySaveData(d);
}
export function deleteSlot(n){
 if(typeof confirm==="function"&&!confirm("确定删除槽位 "+n+" 的存档？"))return;
 localStorage.removeItem(_slotKey(n));
 log("已删除槽位 "+n+"。");
 showSaveWindow();
}
//最近档（槽位中 meta.time 最新；无槽位档时回落旧单槽）
export function loadLatest(){
 let best=null;
 for(let n=1;n<=SAVE_SLOTS;n++){
  let info=slotInfo(n);
  if(!info.empty&&info.meta&&info.meta.time&&(!best||info.meta.time>best.time))best={time:info.meta.time,load:()=>loadFromSlot(n)};
 }
 if(!best){
  if(localStorage.getItem("mud_save")){document.getElementById("logbox").innerHTML="";loadGame();return;}
  log("⚠没有任何存档","red");return;
 }
 document.getElementById("logbox").innerHTML="";
 best.load();
}
//存档管理浮窗：每槽一行（摘要+时间+存/读/删）
export var _saveBox=null;
export function _saveWinClose(){if(_saveBox){try{_saveBox.remove();}catch(_){}_saveBox=null;}}
export function showSaveWindow(){
 if(typeof document==="undefined"||!document.body)return;
 _saveWinClose();
 if(typeof _infoBox!=="undefined"&&_infoBox&&_infoBox.remove){try{_infoBox.remove();}catch(_){}} // 互斥浮窗
 let box=document.createElement("div"); box.id="savebox";
 box.style.cssText="position:fixed;left:50%;top:10%;transform:translateX(-50%);z-index:1000;max-width:92%;max-height:76%;overflow:auto;background:var(--panel,#efe8d8);border:1px solid var(--border,#c9bfa8);box-shadow:0 4px 18px var(--shadow,rgba(60,50,30,.18));padding:12px 18px;border-radius:8px;font-size:13px;color:var(--ink,#2f2a24);";
 let h=document.createElement("div");
 h.style.cssText="font-weight:bold;color:var(--gold,#8a6d3b);margin-bottom:8px;";
 h.textContent="💾 存档管理（"+SAVE_SLOTS+" 槽位）";
 let x=document.createElement("span"); x.textContent=" ✕";
 x.style.cssText="float:right;cursor:pointer;font-weight:bold;";
 x.onclick=_saveWinClose;
 h.appendChild(x); box.appendChild(h);
 for(let n=1;n<=SAVE_SLOTS;n++){
  (function(n){
   let info=slotInfo(n);
   let row=document.createElement("div");
   row.style.cssText="margin:6px 0;padding:6px 8px;border:1px solid var(--border-soft,#ddd2bc);border-radius:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;";
   let label=document.createElement("div"); label.style.flex="1 1 160px";
   if(info.empty){label.textContent="槽位 "+n+"：（空）";}
   else if(info.broken){label.textContent="槽位 "+n+"：⚠数据损坏";}
   else{
    let m=info.meta;
    label.textContent="槽位 "+n+"：第"+(m.ng||1)+"世·"+(m.year!==undefined?m.year:"?")+"年·"+(m.realm||"?")+(m.talent?("·命格"+m.talent):"")+(m.endType?"·已结局":"");
    let t=document.createElement("div"); t.style.cssText="font-size:11px;color:var(--sub-text,#6b6255);";
    t.textContent="保存于 "+(m.time||"未知时间");
    label.appendChild(t);
   }
   row.appendChild(label);
   let bSave=document.createElement("button"); bSave.className="btnsmall"; bSave.textContent="💾存";
   bSave.onclick=function(){saveToSlot(n);};
   let bLoad=document.createElement("button"); bLoad.className="btnsmall"; bLoad.textContent="📂读"; if(info.empty)bLoad.disabled=true;
   bLoad.onclick=function(){loadFromSlot(n);};
   let bDel=document.createElement("button"); bDel.className="btnsmall"; bDel.textContent="🗑"; if(info.empty)bDel.disabled=true;
   bDel.onclick=function(){deleteSlot(n);};
   row.appendChild(bSave);row.appendChild(bLoad);row.appendChild(bDel);
   box.appendChild(row);
  })(n);
 }
 let tip=document.createElement("div");
 tip.style.cssText="margin-top:8px;font-size:11px;color:var(--sub-text,#6b6255);";
 tip.textContent="存档保存在本浏览器（localStorage）；「继续上次存档」自动读取最近时间的槽位。";
 box.appendChild(tip);
 document.body.appendChild(box);
 _saveBox=box;
}

//==== 存档 v6 迁移：v1（无 version/attrs/flags）→ v2 补默认 → v3 补 P3 容器 → v5 补 P4 叙事引擎 → v6 补 P6 元游戏/多人，数值零漂移 ====
// 标量默认表（migrate 尾段兜底）：极旧档/坏档缺标量字段→补默认，消灭 NaN 残留向量；已有值一律不动（零漂移）
export const SAVE_SCALAR_DEFAULTS={cult:0,stone:100,year:0,hp:100,hpmax:100,status:"平安无事",equip:"无",equipBonus:0,step:0,dead:false,endType:0,mp:20};
export function migrateSave(){
 if(!gs.version)gs.version=2;
 if(!gs.attrs)gs.attrs={};
 for(let k in BALANCE.attrsInit){
  if(gs.attrs[k]===undefined)gs.attrs[k]=BALANCE.attrsInit[k];
 }
 if(!gs.flags)gs.flags={};
 if(!gs.customEquips)gs.customEquips=[]; // P4 词缀装备随档持久化（读档后 equipByName 可寻回）
 // v2→v3：补 P3 容器字段，缺失即补默认，已有值不动（零漂移）
 if(gs.version<3){
  if(!gs.inventory)gs.inventory={};
  if(!gs.ownedEquips)gs.ownedEquips=[];
  if(!gs.statuses)gs.statuses=[];
  if(!gs.reputation)gs.reputation={};
  if(!gs.arts)gs.arts={};
  if(gs.talent===undefined)gs.talent=null;
  if(gs.mp===undefined)gs.mp=mpMax();
  gs.version=3;
 }
 // v3→v5：补 P4 叙事引擎字段（v4 未单独发版，直接升 v5）
 if(gs.version<5){
  if(!gs.quests)gs.quests={};
  if(!gs.relations)gs.relations={};
  gs.version=5;
 }
 // v5→v6：补 P6 元游戏/多人字段
	if(gs.version<6){
	 if(gs.diff===undefined)gs.diff=1;
	 if(!gs.bio)gs.bio=[];
	 if(gs.ng===undefined)gs.ng=0;
	 gs.version=6;
	}
	// v6→v7：补 J34 后续 NPC 深度扩展字段
	if(gs.version<7){
	 if(!gs.npcLifespan)gs.npcLifespan={};
	 if(!gs.disciples)gs.disciples=[];
	 if(!gs.enemies)gs.enemies=[];
	 // J34 方向2：团体战斗运行时字段（防旧档缺字段）
	 if(!gs.foes)gs.foes=[];
	 if(gs.foeIndex===undefined)gs.foeIndex=0;
	 if(!gs.foeReward)gs.foeReward={cult:0,stone:0};
	 if(gs.foeLeader===undefined)gs.foeLeader=null;
	 gs.version=7;
	}
	// v7→v8：补 J34 方向3 记忆与阅历字段
	if(gs.version<8){
	 if(!gs.memories)gs.memories={};
	 gs.version=8;
	}
	// 标量默认表兜底（P2「migrateSave 不补标量」修复）：缺失/null/NaN 标量补默认，已有值零漂移。
	// 放在版本链之后——mp 等字段先走版本链语义（v<3 用 mpMax()），仍缺才落默认表
	for(let k in SAVE_SCALAR_DEFAULTS){
	 let v=gs[k];
	 if(v===undefined||v===null||(typeof v==="number"&&isNaN(v)))gs[k]=SAVE_SCALAR_DEFAULTS[k];
	}
}
export function clearSave(){
 if(typeof confirm==="function"&&!confirm("确定清除存档？此操作不可恢复！"))return;
 localStorage.removeItem("mud_save"); // 旧单槽
 for(let n=1;n<=SAVE_SLOTS;n++)localStorage.removeItem(_slotKey(n)); // P1-2 修复：6 槽位一并清除（否则再开局仍提示检测到存档）
 log("🗑存档已清除（单槽+"+SAVE_SLOTS+" 槽位）");
}

//成就
export function addAch(key){
 if(allAch[key].got)return;
 allAch[key].got=true;
 gs.achs.push(allAch[key].name);
 log(`\n🏆【解锁成就：${allAch[key].name}】${allAch[key].desc}`,"ach");
 renderAch();
}
export function renderAch(){
 document.getElementById("achtext").innerText=gs.achs.length>0?gs.achs.join(" | "):"暂无";
}

//装备
export function setEquip(eq){
 if(!eq){log("装备数据缺失，无法穿戴","red");return;} // 旧档残留名防御（审查 H11 二号位）
 gs.equip=eq.name;
 gs.equipBonus=eq.bonus;
 document.getElementById("equip").innerText=`${eq.name}【${eq.desc}】 加成+${eq.bonus}`;
}

//日志与UI工具
export function log(txt,cls=""){
 const lb=document.getElementById("logbox");
 let sp=document.createElement("span");
 if(cls)sp.className=cls;
 sp.innerText=txt+"\n";
 lb.appendChild(sp);
 // 自动滚动：滚动容器是 logbox 的父级 .scroll-area（状态栏固定，剧情区独立滚动）
 const sc=lb.parentElement;
 if(sc)sc.scrollTop=sc.scrollHeight;
}
export function clearOpt(){document.getElementById("optbox").innerHTML="";}
export function addBtn(text,cb){
 let b=document.createElement("button");
 b.innerText=text;
 b.onclick=()=>{clearOpt();cb();};
 document.getElementById("optbox").appendChild(b);
}
export function refreshUi(){
 document.getElementById("cult").innerText=gs.cult;
 document.getElementById("stone").innerText=gs.stone;
 document.getElementById("year").innerText=gs.year;
 document.getElementById("status").innerText=gs.status;
 document.getElementById("hp").innerText=gs.hp;
 document.getElementById("hpmax").innerText=gs.hpmax;
 document.getElementById("mp").innerText=gs.mp;
 document.getElementById("mpmax").innerText=mpMax();
 document.getElementById("realm").innerText=realmOf(gs.cult).name;
 for(let k in BALANCE.attrsName){
  let el=document.getElementById("attr-"+k);
  if(el)el.innerText=attrEff(k); // 有效属性（含状态修正）
 }
}

//==== 立绘/场景插图展示（seedream base64 内嵌）====
// 状态：pw._open=true 展开 / false 收起。首次出现由右侧滑入，之后可手动收起避免遮挡文本。
export function showPortrait(key,label){
 let pb=document.getElementById("portraitbox");
 let pi=document.getElementById("portraitimg");
 let pl=document.getElementById("portraitlabel");
 let pw=document.getElementById("portraitwrap");
 if(!pb||!pi||!pl||!IMAGES||!IMAGES[key])return hidePortrait();
 pi.src=IMAGES[key];
 pl.innerText=label||"";
 pb.style.display="block";
 // 首次出现：从收起态切换为展开，触发右侧滑入 transition
 if(pw&&pw._open!==true){
   pw.classList.remove("collapsed");
   pw._open=true;
   let t=document.getElementById("portraitToggle");
   if(t)t.innerText="➖ 收起插图";
 }
}
export function showScene(key,label){
 // 场景图复用人像展示逻辑，统一右侧滑入/收起
 showPortrait(key,label);
}
export function togglePortrait(){
 let pw=document.getElementById("portraitwrap");
 if(!pw)return;
 if(pw._open){ // 收起
   pw.classList.add("collapsed");
   pw._open=false;
   let t=document.getElementById("portraitToggle");
   if(t)t.innerText="➕ 展开插图";
 }else{ // 展开
   pw.classList.remove("collapsed");
   pw._open=true;
   let t=document.getElementById("portraitToggle");
   if(t)t.innerText="➖ 收起插图";
 }
}
export function hidePortrait(){
 let pb=document.getElementById("portraitbox");
 if(pb)pb.style.display="none";
}

//==== 条件表达式系统（方向⑤）：数组=AND，单条不匹配即 false ====
// 类型：attr(修为/六属性) flag(因果标记) year(年份) item/rep(P3 接入)
export function checkCond(c){
 if(Array.isArray(c))return c.every(checkCond);
 if(!c)return true;
 let v=condValue(c);
 if(v===null)return true; // 未接入类型/缺失字段：不拦截
 switch(c.op||"=="){
  case ">":return v>c.val;
  case ">=":return v>=c.val;
  case "<":return v<c.val;
  case "<=":return v<=c.val;
  case "==":return v==c.val;
  case "!=":return v!=c.val;
 }
 return false;
}
export function condValue(c){
 switch(c.type){
  case "attr":
   if(gs[c.key]!==undefined)return gs[c.key];
   if(gs.attrs&&gs.attrs[c.key]!==undefined)return gs.attrs[c.key];
   return null;
  case "flag":return !!gs.flags[c.key]?true:false;
  case "year":return gs.year;
  case "item":return (gs.inventory&&gs.inventory[c.key])||0; // P3 背包接入
  case "rep":return (gs.reputation&&gs.reputation[c.key])||0; // P3 势力接入
  case "relation":return (gs.relations&&gs.relations[c.key])||0; // P4 NPC 好感接入
  case "disciple":return (gs.disciples&&gs.disciples.length)||0; // J34 后续：弟子数
  case "enemy":return (gs.enemies&&gs.enemies.length)||0;        // J34 后续：仇敌数
  case "memory": // J34 方向3：记忆门控（key=具体记忆→布尔；无 key=阅历数）
   if(c.key)return hasMemory(c.key)?true:false;
   return memoryCount();
 }
 return null;
}
export function setFlag(k,v){gs.flags[k]=v;}

//==== 境界：派生值（由 cult 计算，不落存档）====
export function realmOf(cult){
 let r=BALANCE.realms[0];
 for(let i=BALANCE.realms.length-1;i>=0;i--){
  if(cult>=BALANCE.realms[i].cult){r=BALANCE.realms[i];break;}
 }
 return r;
}

//时间流逝，长生被动涨修为（无状态时悟性=10 与原版公式完全一致，零漂移；P6 难度倍率；J34 后续弟子加成）
export function passYear(n){
 gs.year+=n;
 let gain= n*(BALANCE.cultGainBase+(attrEff("comprehension")-10)*BALANCE.cultGainAttr+gs.equipBonus*BALANCE.cultGainEquip);
 gs.cult+=Math.floor(gain*(typeof diffMult==="function"?diffMult():1)*(1+discipleCultBonus()/100));
 // P1-4 死接线修复：据点被动「每10年额外修为」接进时间主链（多据点叠加；flat 不乘难度/弟子倍率，与据点面板口径一致）
 if(typeof strongholdBonus==="function"&&typeof WORLD!=="undefined"&&WORLD.strongholds){
  let shb=0;
  for(let id in WORLD.strongholds)shb+=strongholdBonus(id);
  if(shb>0)gs.cult+=Math.floor(shb*n/10);
 }
 tickStatuses(n); // P3a：BUFF/DEBUFF 随岁月 tick
 tickNpcLifespan(n); // J34 后续：NPC 寿命随岁月流逝
 tickDisciples(n);   // J34 后续：弟子成长/离世
 syncMemories();     // J34 方向3：岁月流逝，往事自然记起
 gs.mp=mpMax();   // P3b：岁月流逝，灵力自然回满
 refreshUi();
 if(gs.year>=100)addAch("a2");
}

//==== J34 后续：NPC 寿命流逝（首次对话初始化 expireYear；寿元尽则离世）====
export function npcExpireYear(npcId){
 let npc=NPCS[npcId];
 if(!npc)return null;
 if(!gs.npcLifespan[npcId]){
  let lifespan=npc.lifespan!==undefined?npc.lifespan:200;
  gs.npcLifespan[npcId]={expireYear:gs.year+lifespan};
 }
 return gs.npcLifespan[npcId].expireYear;
}
export function isNpcDead(npcId){
 return gs.npcLifespan[npcId]&&gs.year>=gs.npcLifespan[npcId].expireYear;
}
export function npcRemaining(npcId){
 let e=npcExpireYear(npcId);
 if(e===null)return null;
 return Math.max(0,e-gs.year);
}
export function tickNpcLifespan(n){
 for(let id in gs.npcLifespan){
  if(gs.year>=gs.npcLifespan[id].expireYear&&!gs.flags["npc_dead_"+id]){
   setFlag("npc_dead_"+id,true);
   let npc=NPCS[id];
   if(npc){
    log(`\n【${npc.name}】寿元已尽，与世长辞。`,"danger");
    bioLog("故人离世",`${npc.name}寿元已尽，与世长辞。`);
   }
  }
 }
}

//==== J34 后续：收徒系统（弟子成长周期；凡人寿元 80 年；每名弟子修炼+5%）====
export function addDisciple(name,talent){
 gs.disciples.push({name:name,joinYear:gs.year,talent:talent||"中平",expireYear:gs.year+80});
 log(`\n🎓你收下弟子【${name}】（资质：${talent||"中平"}），传其吐纳之法。`,"gold");
 bioLog("收徒",`收下弟子【${name}】（资质：${talent||"中平"}）。`);
 refreshUi();
 return true;
}
export function discipleCount(){return gs.disciples.length;}
export function discipleCultBonus(){return gs.disciples.length*5;}
export function tickDisciples(n){
 let dead=[];
 for(let d of gs.disciples){
  if(gs.year>=d.expireYear)dead.push(d);
 }
 for(let d of dead){
  gs.disciples=gs.disciples.filter(x=>x!==d);
  log(`\n【${d.name}】寿元已尽，在你膝下走完一生。你亲手葬了他。`,"danger");
  gs.cult+=50;
  log(`弟子临终将毕生感悟传于你，修为+50。`,"blue");
  bioLog("弟子离世",`弟子【${d.name}】寿元已尽，临终传功。`);
 }
}
export function sceneDisciples(){
 log("\n🎓【弟子】你回想膝下弟子。");
 if(!gs.disciples.length){
  log("（你尚未收徒。长生路上，收一名弟子，或许能让你记得自己也曾年轻过。）");
 }else{
  for(let d of gs.disciples){
   let rem=d.expireYear-gs.year;
   log(`·【${d.name}】资质：${d.talent}｜入门${gs.year-d.joinYear}年｜余寿${rem}年`);
  }
  log(`当前弟子 ${gs.disciples.length} 名，修炼速度+${discipleCultBonus()}%。`);
 }
 addBtn("离开",()=>mainStep0());
}

//==== J34 后续：结仇系统（对话/事件触发；仇敌寻仇战斗；可化解）====
export function addEnemy(npcId,reason){
 if(gs.enemies.some(e=>e.npcId===npcId))return false;
 let name=NPCS[npcId]?NPCS[npcId].name:npcId;
 gs.enemies.push({npcId:npcId,name:name,grudgeYear:gs.year,reason:reason||"结怨"});
 addRelation(npcId,-50);
 log(`\n☠你与【${name}】结下仇怨：${reason||"结怨"}！`,"danger");
 bioLog("结仇",`与【${name}】结仇：${reason||"结怨"}。`);
 refreshUi();
 return true;
}
export function hasEnemy(npcId){return gs.enemies.some(e=>e.npcId===npcId);}
export function removeEnemy(npcId){gs.enemies=gs.enemies.filter(e=>e.npcId!==npcId);}
export function enemyMonster(npcId){
 let npc=NPCS[npcId];
 let base=gs.cult*0.15;
 let name=npc?npc.name:npcId;
 return {name:name,hp:Math.floor(150+base),atk:Math.floor(15+base*0.1),reward:{cult:Math.floor(80+base*0.5),stone:Math.floor(150+base)},ai:"normal"};
}
export function enemyRevenge(){
 let alive=gs.enemies.filter(e=>!isNpcDead(e.npcId));
 if(!alive.length)return false;
 if(Math.random()<0.3){
  let e=alive[Math.floor(Math.random()*alive.length)];
  log(`\n☠【${e.name}】寻仇而至，拦在你面前！`,"danger");
  startFight(enemyMonster(e.npcId));
  return true;
 }
 return false;
}
export function sceneEnemies(){
 log("\n☠【仇敌】你回想结下的仇怨。");
 if(!gs.enemies.length){log("（你尚未与人结仇。长生路上，恩怨自随缘。）");}
 for(let e of gs.enemies){
  let st=isNpcDead(e.npcId)?"（已故，仇怨随风散）":"（仍记恨于你）";
  log(`·【${e.name}】结仇于${e.grudgeYear}年：${e.reason}${st}`);
 }
 addBtn("离开",()=>mainStep0());
}

//==== P3b：灵力系统（mpMax 派生，不落档）====
export function mpMax(){return 20+(attrEff("soul")||0)*1+(attrEff("spirit")||0)*2;}
export function costMp(n){
 if((gs.mp||0)<n){log("灵力不足！","red");return false;}
 gs.mp-=n;
 refreshUi();
 return true;
}

//==== J35 体验轮：信息浮窗（说明类文字不进历程流，用户 2026-08-23 定向）====
//showInfo(标题, 行数组)：固定浮层，主题 CSS 变量自适应皮肤；点 ✕ 关闭；重复调用替换旧窗
export var _infoBox=null;
export function showInfo(title,lines){
 if(typeof document==="undefined"||!document.body)return;
 if(_infoBox){try{_infoBox.remove();}catch(_){}_infoBox=null;}
 let box=document.createElement("div"); box.id="infobox";
 box.style.cssText="position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:999;max-width:86%;max-height:70%;overflow:auto;background:var(--panel,#efe8d8);border:1px solid var(--border,#c9bfa8);box-shadow:0 4px 18px var(--shadow,rgba(60,50,30,.18));padding:12px 18px;border-radius:8px;font-size:13px;color:var(--ink,#2f2a24);";
 let h=document.createElement("div");
 h.style.cssText="font-weight:bold;color:var(--gold,#8a6d3b);margin-bottom:6px;";
 h.textContent=title;
 let x=document.createElement("span"); x.textContent=" ✕";
 x.style.cssText="float:right;cursor:pointer;font-weight:bold;";
 x.onclick=function(){box.remove();};
 h.appendChild(x);
 box.appendChild(h);
 let arr=Array.isArray(lines)?lines:[String(lines)];
 for(let l of arr){
  let p=document.createElement("div");
  p.style.margin="4px 0";
  p.textContent=l;
  box.appendChild(p);
 }
 document.body.appendChild(box);
 _infoBox=box;
}
