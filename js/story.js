//==== story.js：主线剧情分支 / 结局 / 路由 / 重置 ====

//开局主线
function mainStep0(){
 gs.step=0;
 hidePortrait(); // 隐藏立绘/场景（回到主菜单）
 // J35 体验轮（用户 2026-08-23 定向）：奇遇随机出现于选择之间，不再作显式选项；flags.encCd 冷却防连发
 if(!gs.flags.encCd && typeof BALANCE!=="undefined" &&
    Math.random()<BALANCE.encounterBase*((typeof directorEventRate==="function")?directorEventRate():1)*0.6){
  gs.flags.encCd=1;
  triggerEncounter(true);
  return;
 }
 gs.flags.encCd=0;
 // 剧情分支（功能管理类已移入右侧【功能】侧栏，见 applyUi/sideGo）
 log("\n你拥有无尽岁月。接下来，你打算做什么？");
 addBtn("① 寻一处山谷隐居，苟住慢慢熬时间",()=>enterHide());
 addBtn("② 下山闯荡江湖，历练搏机缘",()=>enterJianghu());
 addBtn("③ 前往大宗门，尝试拜入山门",()=>enterZongmen());
 addBtn("④ 潜入魔渊，走上魔道之路",()=>enterModao());
 addBtn("⑤ 前往【妖山古林】副本冒险",()=>stepCopyYaoShan());
 addBtn("⑥ 触发世间偶遇事件",()=>triggerRandomEvent());
 if(hiddenLunhui()){ // 隐藏剧情：轮回镜（正魔兼修）
  addBtn("🪞【隐藏】踏入轮回镜界",()=>stepCopyLunhui());
 }
 if(questAvailable("q_hidden_lunhui")){ // 隐藏任务：轮回镜（先埋后收：需 F4 传说伏笔）
  addBtn("🪞【隐藏】轮回镜：勘破前世今生",()=>{acceptQuest("q_hidden_lunhui");questPanel();});
 }
 if(questAvailable("q_hidden_changsheng")){ // 隐藏剧情：长生者之秘（三系声望+岁月+伏笔）
  addBtn("🔮【隐藏】探寻长生者之秘",()=>{acceptQuest("q_hidden_changsheng");questPanel();});
 }
 // P5：开放世界与扩展
 let wev=pendingWorldEvent(); // 时间动态世界事件（year 到达优先展示）
 if(wev){addBtn(`🌍【世界事件】${wev.title}`,()=>sceneWorldEvent(wev));}
 addBtn("🗺踏入大世界",()=>sceneRegion());
 // J34 方向3：记忆与阅历（往事随岁月记起，阅历解锁剧情）
 syncMemories();
}

//==== 隐居线（enter=推进副作用，scene=幂等渲染；读档只走 scene，修复读档时间多走 bug）====
function enterHide(){
 gs.step=1;
 acceptQuest("q_main_hide"); // P4：主线任务化（隐居线）
 bioLog("隐居山谷","寻到幽谷，不问世事，静待岁月流转。"); // P6 传记
 showScene("snow_temple","幽谷·孤居"); // 场景插图（seedream 内嵌）
 log("\n【隐居山谷】你寻到一处人迹罕至的幽谷，搭了间茅屋，不问世事。");
 passYear(30);
 log(`转眼三十年。茅屋漏雨，你修了三次。修为随岁月慢慢涨。`);
 sceneHide();
}
function sceneHide(){
 gs.step=1;
 log("\n【幽谷茅屋】屋外有棵歪脖子松树，风一吹，松针沙沙地响。");
 // flags 因果链：江湖结怨后回隐居，可隐匿避祸
 if(checkCond({type:"flag",key:"jianghu_hunted",val:true})){
  addBtn("🏕隐匿行踪，深居简出二十年",()=>{
   log("你深居简出，避开了仇家的耳目。");
   passYear(20);
   setFlag("jianghu_hunted",false);
   log("风头过后，你重获安宁。");
   sceneHide();
  });
 }
 // flags 因果链：入魔后隐居不再安全
 if(checkCond({type:"flag",key:"modao",val:true})){
  addBtn("☠魔道修士循迹寻至山谷，迎战",()=>{
   log("\n魔道修士寻至幽谷，认出你叛逃之身！","danger");
   startFight(monsterList[1]);
  });
 }
 addBtn("继续隐居，再熬70年",()=>{
  passYear(70);
  log("\n百年光阴，你在山谷里看桃花开了又谢，谢了又开。");
  addAch("a3");
  addBtn("继续千年隐居【隐世结局】",()=>endingHide());
  addBtn("耐不住寂寞，决定下山",()=>enterJianghu());
  addBtn("隐居期间外出探索【上古星陨遗迹】",()=>stepCopyStarRelic());
 });
 addBtn("现在就下山闯荡",()=>enterJianghu());
 addBtn("📖原著隐居锚点",()=>sceneNovelLine("hide")); // J35 M3 五线锚点对照
}
function endingHide(){
 gs.endType=1;
 log("\n════════结局·万古隐仙═══════","gold");
 log("山谷里的茅屋塌过三次，你又搭了三次。最后一次，你懒得再搭，就坐在那棵歪脖子松树下。");
 log("松针落进衣领，你也没掸。");
 log("山下的王朝换了七姓。你只记得第一代皇帝登基那年，山脚集市上卖糖葫芦的老汉，嗓门很大。");
 log("后来没人再上山。你也渐渐忘了自己叫什么。");
 log("【结局：万古隐仙，与世无争】","gold");
 sceneEnding(1);
}

//==== 江湖线（enter/scene 拆分）====
function enterJianghu(){
 gs.step=2;
 acceptQuest("q_main_jianghu"); // P4：主线任务化（江湖线）
 bioLog("闯荡江湖","踏入红尘，刀光剑影，历练搏机缘。"); // P6 传记
 log("\n【闯荡江湖】你踏入红尘。头三年，你被人骗过两回，也救过人三回。");
 passYear(12);
 addAch("a4");
 log(`游历12年，见过仇杀，也见过有人为一碗面拼命。`);
 sceneJianghu();
}
function sceneJianghu(){
 gs.step=2;
 log("\n【江湖漂泊】你在一家客栈歇脚。隔壁桌的刀客喝多了，正拍着桌子骂人。");
 addBtn("参与江湖争斗，搏宝物",()=>{
  let r=Math.random();
  if(r>0.35){
   log("\n你拼死夺得一件法器【青锋短剑】");
   gainEquip(allEquip[1]);
   gs.stone+=220;
   passYear(8);
   addBtn("继续江湖漂泊",()=>stepJianghu2());
  }else{
   log("\n遭遇仇家围剿！虽然长生不死，但身受重创，狼狈逃亡。","danger");
   gs.status="身受重伤";
   setFlag("jianghu_hunted",true); // 因果标记：仇家记下了你
   passYear(15);
   addBtn("养伤之后，另寻出路",()=>stepJianghu2());
  }
 });
 addBtn("避开厮杀，四处游历寻宝",()=>stepJianghu2());
 addBtn("江湖偶遇随机事件",()=>triggerRandomEvent());
 addBtn("📖原著江湖锚点",()=>sceneNovelLine("jianghu")); // J35 M3 五线锚点对照
}
function stepJianghu2(){
 log("\n江湖漂泊已久，你如今有诸多道路可以选择。");
 addBtn("前往大宗门求道",()=>enterZongmen());
 addBtn("前往魔渊，投奔魔道",()=>enterModao());
 addBtn("前往妖山古林副本",()=>stepCopyYaoShan());
 addBtn("厌倦纷争，返回山谷隐居",()=>enterHide());
 addBtn("触发世间偶遇事件",()=>triggerRandomEvent());
}

//==== 宗门线（enter/scene 拆分）====
function enterZongmen(){
 gs.step=3;
 acceptQuest("q_main_zongmen"); // P4：主线任务化（宗门线）
 bioLog("拜入仙门","来到青云宗，踏上求道之路。"); // P6 传记
 setFlag("zongmen",true); // P4：宗门任务第一步钩子
 showScene("qingyun_mountain","青云宗·仙门"); // 场景插图（seedream 内嵌）
 log("\n【仙门求道】你来到青云宗山门外。守门弟子上下打量你：「来拜师的？」");
 passYear(5);
 sceneZongmen();
}
function sceneZongmen(){
 gs.step=3;
 if(gs.cult<80){
  log("你的修为不足，无法直接成为内门弟子，只能做外门杂役。");
  addBtn("安心做杂役，靠长生熬资历",()=>{
   passYear(60);
   log("六十年杂役岁月，靠着无尽寿命，终于被宗门高层注意到你的特殊。");
   gs.cult+=120;
   addBtn("留在宗门潜心修炼",()=>stepZongmenEnd());
   addBtn("宗门规矩束缚，叛逃出走",()=>enterJianghu());
  });
 }else{
  log("你的修为足够，直接被收入内门。");
  if(!gs.flags.zongmen_neimen){ // 读档幂等：内门40年仅首次结算（修复存-读无限刷修为）
   passYear(40);
   gs.flags.zongmen_neimen=true;
  }
  addBtn("在宗门继续修行",()=>stepZongmenEnd());
 }
 addBtn("📖原著宗门锚点",()=>sceneNovelLine("zongmen")); // J35 M3 五线锚点对照
}
function stepZongmenEnd(){
 log("\n你在宗门里熬着岁月，从外门熬到内门，从弟子熬成老祖。");
 passYear(120);
 if(gs.cult>=500){
  addAch("a6");
  log("\n你的修为，已经高到连掌门玄真道长见了你，都要先拱手。","gold");
  log("宗门上下称你为老祖。你坐在后山那块青石上，看着弟子们一代代长大、老去。");
  gs.endType=2;
  log("\n════════结局：宗门万古老祖═══════","gold");
  addBtn("🔄重新开局",()=>resetGame());
 }else{
  log("你离世间顶峰还差得远。后山的青石，你还能再坐很多年。");
  addBtn("继续在宗门熬岁月",()=>{passYear(100);stepZongmenEnd();});
  addBtn("离开宗门，去【上古星陨遗迹】副本",()=>stepCopyStarRelic());
  addBtn("下山游历触发NPC事件",()=>triggerRandomEvent());
 }
}

//==== 魔道线（enter/scene 拆分 + 魔性/因果标记联动）====
function enterModao(){
 gs.step=4;
 acceptQuest("q_main_modao"); // P4：主线任务化（魔道线）
 bioLog("堕入魔道","踏入魔渊，与天下正道为敌。"); // P6 传记
 log("\n【魔渊】阴风从谷底灌上来，吹得人骨头发凉。踏入此处，便是与天下正道为敌。","danger");
 addAch("a5");
 gs.attrs.demon+=20;      // 魔性上升（属性与路线联动）
 setFlag("modao",true);   // 因果标记：天下知你入魔，正道/隐居事件随之变化
 passYear(18);
 log("你修魔功，实力暴涨，但正道修士到处追杀魔道之人。");
 sceneModao();
}
function sceneModao(){
 gs.step=4;
 addBtn("获取魔骨血甲，扎根魔渊",()=>{
  gainEquip(allEquip[4]);
  gs.stone+=300;
  passYear(70);
  addBtn("进入魔渊秘穴副本",()=>stepCopyMagicCave());
  addBtn("继续沉沦魔道【魔主结局】",()=>endingDemon());
  addBtn("心生悔意，想要脱离魔道",()=>{
   log("\n正道追杀不休，叛出魔道代价惨重，多次死里逃生。","danger");
   passYear(90);
   addBtn("苟活隐居",()=>endingHide());
  });
 });
 addBtn("不想彻底沉沦，转身离开魔渊",()=>enterJianghu());
 addBtn("📖原著魔道锚点",()=>sceneNovelLine("modao")); // J35 M3 五线锚点对照
}
function endingDemon(){
 gs.endType=3;
 log("\n════════结局：万古魔主═══════","danger");
 log("魔渊的阴风刮了千年，把你的兜帽吹成了布条。");
 log("来讨伐你的正道天骄，前一个的佩剑还插在崖壁上，后一个的名字你已经忘了。");
 log("你数过，崖壁上插着三千四百七十一柄剑。后来懒得数了。");
 log("魔渊深处，引路人又呵出一口白气：「路，是你自己选的。」");
 log("你坐在白骨王座上，忽然想起——你已经很久没听过鸟叫了。");
 sceneEnding(3);
}

//无敌结局
function endingInvincible(){
 gs.endType=4;
 log("\n════════结局：岁月道主·天下无敌═══════","gold");
 log("你站在万山之巅，风把衣袍吹得猎猎作响。");
 log("脚下的云海翻涌，像你当年第一次见到的那片海。");
 log("天下已无人是你的对手。");
 log("你忽然觉得，这世间最寂寞的事，不是打不过，而是——没人再敢向你拔剑。");
 sceneEnding(4);
}

//坏结局：长生归寂
function endingDead(){
 addAch("a7");
 gs.endType=5;
 log("\n════════结局：长生归寂═══════","danger");
 log("你终于遇到了抹杀神魂的东西。");
 log("肉身还在，呼吸还在，但你知道，那个「你」已经没了。");
 log("像一盏灯，灯芯烧尽了，火苗还在，却再也点不亮什么。");
 log("漫长长生旅途，就此落幕。");
 sceneEnding(5);
}

//读取存档后跳转对应步骤（只调幂等 scene 渲染，不再推进时间——读档 bug 修复）
function routeByStep(){
 if(gs.step===0)mainStep0();
 else if(gs.step===1)sceneHide();
 else if(gs.step===2)sceneJianghu();
 else if(gs.step===3)sceneZongmen();
 else if(gs.step===4)sceneModao();
 else if(gs.step===6)stepCopyYaoShan();
 else if(gs.step===7)stepCopyMagicCave();
 else if(gs.step===8)stepCopyStarRelic();
 else mainStep0();
}

//重置状态（多周目/重开共用：仅重置 gs 数据，不动 UI）
function resetState(){
 gs={version:8,cult:0,stone:100,year:0,hp:100,hpmax:100,status:"平安无事",equip:"无",equipBonus:0,achs:[],step:0,dead:false,endType:0,inFight:false,enemy:null,attrs:Object.assign({},BALANCE.attrsInit),flags:{},inventory:{},ownedEquips:[],statuses:[],reputation:{},arts:{},talent:null,mp:20,quests:{},relations:{},npcLifespan:{},disciples:[],enemies:[],foes:[],foeIndex:0,foeReward:{cult:0,stone:0},foeLeader:null,memories:{},aiEnabled:false,diff:1,bio:[],ng:0};
}
//重置游戏
function resetGame(){
 resetState();
 for(let k in allAch){allAch[k].got=false;}
 document.getElementById("logbox").innerHTML="";
 document.getElementById("optbox").innerHTML="";
 document.getElementById("equip").innerText="无";
 document.getElementById("fightui").style.display="none";
 renderAch();
 startGame();
}
