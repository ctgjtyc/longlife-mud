//==== main.js：游戏入口 ====

//开局
function startGame(){
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
function newGameStart(){
 document.getElementById("logbox").innerHTML="";
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
function chooseTalent(){
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
