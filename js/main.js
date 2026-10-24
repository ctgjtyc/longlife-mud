//==== main.js：游戏入口（ESM 装配根；显式引入全部模块，加载顺序机器保障）====
// 数据层（叶子模块，无其它依赖）
import "./data/balance.js";
import "./data/items.js";
import { TALENTS } from "./data/arts.js";
import "./data/factions.js";
import "./data/monsters.js";
import "./data/quests.js";
import "./data/npcs.js";
import "./data/memories.js";
import "./data/novel_changsheng_400.js";
import "./data/novel.js";
import "./data/world.js";
import "./data/dynasty.js";
import "./data/images.js";
import "./data/official_mods.js";
// 引擎层
import { SAVE_SLOTS, addAch, addBtn, allAch, allEquip, gs, loadLatest, log, refreshUi, showPortrait, showSaveWindow, clearSave, togglePortrait } from "./core.js";
import { sceneMemory } from "./memory.js";
import "./buff.js";
import { gainEquip, sceneInventory, sceneAlchemy } from "./inventory.js";
import { sceneArts } from "./arts.js";
import { sceneFaction } from "./faction.js";
import "./encounter.js";
import { questPanel } from "./quest.js";
import { sceneNpc } from "./dialogue.js";
import "./loot.js";
import "./fight.js";
import "./dungeons.js";
import "./events.js";
import { mainStep0, endingHide, endingDemon, endingInvincible, endingDead } from "./story.js";
import "./world.js";
import "./trade.js";
import "./dynasty.js";
import { sceneGenSettings } from "./gen.js";
import "./eventgen.js";
import { sceneDirector } from "./director.js";
import "./ngplus.js";
import { sceneModPanel, startCodeJourney, restoreOfficialMods } from "./modloader.js";
import { bioLog, diffInitStone, sceneBiography, sceneHint, sceneDifficulty } from "./meta.js";
import { sceneNovel, sceneSkillTree, sceneParty, sceneBestiary } from "./novel.js";
import { sceneShare } from "./share.js";

//==== 浏览器全局挂载：ESM 下函数不再自动挂 window，内联 onclick 与按名分发需显式暴露 ====
Object.assign(window, {
 // index.html 内联 onclick
 showSaveWindow, clearSave, togglePortrait, mainStep0,
 // 侧栏 PANELS 注册表按名分发（sideGo → window[fn]）
 sceneInventory, sceneArts, sceneAlchemy, sceneFaction, questPanel, sceneNpc,
 sceneMemory, sceneNovel, sceneBiography, sceneHint, sceneDifficulty,
 sceneGenSettings, sceneDirector, sceneShare, sceneModPanel,
 sceneSkillTree, sceneParty, sceneBestiary,
 // 结局锁定校验（directorAssertLock → window[fnName]）
 endingHide, endingDemon, endingInvincible, endingDead,
 // M1.5：1024 彩蛋入口卡片（index.html 内联 onclick）
 startCodeJourney, toggleSideDrawer
});

//==== M1.5 §2.1：1024 彩蛋入口卡片显隐（命格选定后显示；m_1024_fly 达成后转为「已飞升·重温」）====
export function refreshFestCard(){
 let c=document.getElementById("festcard");
 let d=document.getElementById("festdone");
 if(!c||!d)return;
 let fly=!!(allAch["m_1024_fly"]&&allAch["m_1024_fly"].got);
 c.style.display=(gs.talent&&!fly)?"flex":"none";
 d.style.display=fly?"block":"none";
}
//成就/主线钩子注册（core addAch 与 story mainStep0 经 window 回调，避免 core→main 循环依赖）
window.__afterAch=refreshFestCard;
window.__refreshFestCard=refreshFestCard;
//读档追加快照刷新（与 modloader 的模组恢复钩子追加式共存，拼接顺序无关）
if(typeof window!=="undefined"){
 const _prevSave=window.__afterSaveApplied;
 window.__afterSaveApplied=()=>{if(typeof _prevSave==="function")_prevSave();refreshFestCard();};
}

//==== M1.5 §2.6：移动端侧栏底部抽屉开关（桌面端无样式副作用）====
export function toggleSideDrawer(){
 let p=document.getElementById("sidepanel");
 if(p&&p.classList)p.classList.toggle("side-open");
}

//==== 游戏入口 ====

//开局
export function startGame(){
 document.getElementById("logbox").innerHTML="";
 // 有存档先问去向（修复：onload 无条件新开局，误触保存即覆盖旧档）
 let hasAny=false;
 for(let n=1;n<=(typeof SAVE_SLOTS!=="undefined"?SAVE_SLOTS:6);n++){if(localStorage.getItem("mud_save_slot_"+n)){hasAny=true;break;}}
 if(localStorage.getItem("mud_save"))hasAny=true;
 if(hasAny){
  log("检测到已有存档。");
  addBtn("📖继续上次存档",()=>{document.getElementById("logbox").innerHTML="";loadLatest();});
  addBtn("🌱重新开局（旧档保留，保存时覆盖）",()=>{document.getElementById("logbox").innerHTML="";newGameStart();});
  return;
 }
 newGameStart();
}
export function newGameStart(){
 document.getElementById("logbox").innerHTML="";
 refreshFestCard(); // M1.5：重开局先收起彩蛋卡片（等命格选定后再显示）
 showPortrait("hero","主角·长生者"); // 开局立绘（seedream 内嵌）
 log("===觉醒长生系统===");
 log("你从沉睡中苏醒，脑海响起冰冷系统声音：");
 log("【长生系统绑定成功，宿主获得无限寿命。只要活下去，时间会带给你无尽修为。】");
 log("乱世修仙界。妖魔横行，宗门林立，无数人求长生而不得。而你，天生不死。\n");
 bioLog("觉醒长生","长生系统绑定，获得无限寿命，踏上无尽岁月。"); // P6 传记
 if(gs.ng===0&&gs.stone===100&&typeof diffInitStone==="function")gs.stone=diffInitStone(); // P6 难度初始灵石（仅全新开局）
 addAch("a1");
 gainEquip(allEquip[0]);
 refreshUi();
 chooseTalent(); // P3b：命格三选一
}

//==== 命格三选一（P3b：开局觉醒，互斥）====
export function chooseTalent(){
 log("\n【命格觉醒】冥冥之中，你感应到命格在呼唤，只能择一。","gold");
 let pool=Object.keys(TALENTS);
 let picks=[];
 while(picks.length<3&&pool.length){
  let i=Math.floor(Math.random()*pool.length);
  picks.push(pool.splice(i,1)[0]);
 }
 for(let id of picks){
  let t=TALENTS[id];
  addBtn(`【${id}】——${t.desc}`,()=>{
   gs.talent=id;
   bioLog("命格觉醒",`觉醒命格【${id}】。`); // P6 传记
   log(`你觉醒了命格【${id}】！`,"gold");
   refreshUi();
   mainStep0();
  });
 }
}

window.onload=startGame;