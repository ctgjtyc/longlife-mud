//==== memory.js：记忆与阅历引擎（J34 方向3）====
// gs.memories = {id: 解锁年份}；条件驱动解锁，阅历等级由记忆数派生
// 记忆门控对话：checkCond({type:"memory",key:"mem_xxx",val:true}) / ({type:"memory",op:">=",val:N})

//扫描记忆配置表，条件达成即记起（幂等：已解锁不重复记）
function syncMemories(){
 let added=0;
 for(let id in MEMORIES){
  if(gs.memories[id]!==undefined)continue;
  let m=MEMORIES[id];
  if(m.need&&!checkCond(m.need))continue;
  gs.memories[id]=gs.year;
  log(`\n📖【阅历】你记起一段往事：【${m.name}】${m.desc}`,"blue");
  bioLog("阅历",`记起往事【${m.name}】。`);
  added++;
 }
 if(added)refreshUi();
 return added;
}

function hasMemory(id){return gs.memories&&gs.memories[id]!==undefined;}
function memoryCount(){return gs.memories?Object.keys(gs.memories).length:0;}

//阅历等级（由记忆数派生，不落档）
function memoryLevel(){
 let n=memoryCount();
 if(n>=10)return {name:"阅尽沧桑",desc:"千年岁月，故人皆已成灰。你见过太多，也放下了太多。"};
 if(n>=6)return {name:"见多识广",desc:"你走过山川湖海，见过恩怨情仇。"};
 if(n>=3)return {name:"阅历渐丰",desc:"你开始懂得，长生路上，风景比终点更重要。"};
 return {name:"初入红尘",desc:"你的故事，才刚刚开始。"};
}

//回忆场景：盘点已记起的往事
function sceneMemory(){
 syncMemories();
 log("\n📖【回忆】你闭上眼，往事如潮水般涌来。");
 let lv=memoryLevel();
 log(`（阅历：${memoryCount()} 段记忆｜${lv.name}——${lv.desc}）`);
 let unlocked=Object.keys(MEMORIES).filter(id=>hasMemory(id));
 if(!unlocked.length){log("（你尚未留下任何值得铭记的往事。）");}
 for(let id of unlocked){
  let m=MEMORIES[id];
  log(`·【${m.name}】${m.desc}（${gs.memories[id]}年）`);
 }
 addBtn("离开",()=>mainStep0());
}
