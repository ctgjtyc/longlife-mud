//==== novel.js：可替换多主题多文本剧情库（novel-lib-v2）====
// 数据：js/data/novel.js（THEMES 多主题数组，每主题含多篇 novels）
// 当前主题：_THEME；当前篇：_NOVEL（指向选中主题内的某篇）。
// 切换主题 -> 应用主题皮肤(css 变量) + 默认取该主题第一篇；切换篇目 -> 同步更新游戏名。

var _THEME = THEMES && THEMES.length ? THEMES[0] : null;
var _NOVEL = _firstNovel();

//==== 面板注册表：面板 id -> {label,icon,fn,desc}（数据驱动侧栏按钮，见 docs/面板可替换规范.md）====
var PANELS={
 inventory:{label:"行囊",    icon:"🎒", fn:"sceneInventory", desc:"物品与装备"},
 arts:    {label:"功法阁",  icon:"📖", fn:"sceneArts",      desc:"功法学习"},
 alchemy: {label:"炼丹炼器",icon:"⚗", fn:"sceneAlchemy",   desc:"炼丹炼器"},
 faction: {label:"势力声望",icon:"🏛", fn:"sceneFaction",   desc:"势力声望"},
 quest:   {label:"任务面板",icon:"📜", fn:"questPanel",     desc:"任务面板"},
 npc:     {label:"拜访故人",icon:"💬", fn:"sceneNpc",       desc:"角色互动"},
 memory:  {label:"回忆往事",icon:"📖", fn:"sceneMemory",    desc:"回忆往事"},
 novel:   {label:"原著剧情",icon:"📚", fn:"sceneNovel",     desc:"原著剧情"},
 bio:     {label:"人物传记",icon:"📜", fn:"sceneBiography", desc:"人物传记"},
 hint:    {label:"提示",    icon:"💡", fn:"sceneHint",      desc:"提示"},
 diff:    {label:"难度设置",icon:"⚙", fn:"sceneDifficulty",desc:"难度设置"},
 gen:     {label:"AI生成",  icon:"✨", fn:"sceneGenSettings", desc:"AI 生成等级（L0/L1 本地）"},
 director:{label:"剧情导演",icon:"🎬", fn:"sceneDirector",   desc:"节奏调节（结局锁定）"},
 share:   {label:"存档分享",icon:"🤝", fn:"sceneShare",     desc:"存档分享"},
 mod:     {label:"模组面板",icon:"📦", fn:"sceneModPanel",  desc:"模组面板"},
 // ---- 转生/异界专属面板 ----
 skilltree:{label:"技能树",icon:"🌳", fn:"sceneSkillTree", desc:"技能加点"},
 party:   {label:"伙伴",   icon:"🤝", fn:"sceneParty",     desc:"同伴伙伴"},
 bestiary:{label:"图鉴",   icon:"📖", fn:"sceneBestiary",  desc:"敌方/灵物图鉴"}
};

// 应用主题皮肤：把主题 css 变量注入 :root
function applyTheme(){
 if(!_THEME||!_THEME.css)return;
 let c=_THEME.css, r=document.documentElement.style;
 let map={
  bg:"--bg", bgFace:"--bg-face", ink:"--ink", inkSoft:"--ink-soft",
  border:"--border", borderSoft:"--border-soft", panel:"--panel", panelLight:"--panel-light",
  gold:"--gold", seal:"--seal", green:"--green", blue:"--blue",
  btnBorder:"--btn-border", hpEmpty:"--hp-empty", subText:"--sub-text",
  glow1:"--glow1", glow2:"--glow2", shadow:"--shadow",
  mtn1:"--mtn1", mtn2:"--mtn2", mtn3:"--mtn3"
 };
 for(let k in map){ if(c[k]!==undefined) r.setProperty(map[k], c[k]); }
 applyUi();
}
//应用主题面板配置：资源栏显隐+标签映射 + 侧栏按钮数据驱动渲染(PANELS注册表)
function applyUi(){
 if(typeof document==="undefined")return;
 let u=_THEME&&_THEME.ui? _THEME.ui:{};
 let res=u.resources||["life","realm","cult","hp","mp","stone","year","status"];
 let at=u.attrs||["constitution","soul","spirit","comprehension","heart","demon"];
 let resL=u.resLabels||{}, atL=u.attrLabels||{};
 let panels=u.panels||[];
 // ① 资源/属性栏：显隐 + 标签映射（主题可重命名标签，如力量/智力/敏捷）
 document.querySelectorAll(".ufield").forEach(function(el){
  let k=el.getAttribute("data-k");
  let isAttr=el.classList.contains("attr");
  let allow=isAttr?(at.indexOf(k)>=0):(res.indexOf(k)>=0);
  el.style.display=(k&&allow)?"":"none";
  if(k&&allow){
   let t=isAttr?atL[k]:resL[k];
   if(t){let lab=el.querySelector(".ulabel"); if(lab)lab.textContent=t;}
  }
 });
 // ② 侧栏按钮：按 ui.panels 顺序 + PANELS 注册表数据驱动渲染
 let c=document.getElementById("sidebtns");
 if(c){
  c.innerHTML="";
  for(let i=0;i<panels.length;i++){
   let p=PANELS[panels[i]]; if(!p)continue;
   let b=document.createElement("button");
   b.className="sidebtn";
   b.setAttribute("data-k",panels[i]);
   b.textContent=(p.icon||"")+(p.label||panels[i]);
   b.onclick=(function(fn){return function(){sideGo(fn);};})(p.fn);
   c.appendChild(b);
  }
 }
}
//侧栏功能按钮入口：按函数名调用（函数自带返回/离开按钮）
function sideGo(fn){
 if(typeof window[fn]==="function")window[fn]();
}
//切换主题（同步应用皮肤 + 默认取该主题第一篇，更新游戏名）
function setTheme(id){
 if(!THEMES||!THEMES.length)return;
 _THEME = THEMES.find(t=>t.id===id) || THEMES[0];
 applyTheme();
 _NOVEL = (_THEME.novels&&_THEME.novels.length)?_THEME.novels[0]:null;
 _novelAnchorCache=null; // 切篇失效，惰性重建
 applyGameTitle();
}
//切换当前篇目（同步更新游戏名标识）
function setNovel(id){
 if(!_THEME||!_THEME.novels||!_THEME.novels.length)return;
 _NOVEL = _THEME.novels.find(n=>n.id===id) || _THEME.novels[0] || null;
 _novelAnchorCache=null; // 切篇失效，惰性重建
 applyGameTitle();
}
//根据当前篇.game 更新游戏名（标题 + 页面头部 + seal）
function applyGameTitle(){
 let name=(_NOVEL&&_NOVEL.game)?_NOVEL.game:"长生梦录";
 let t=document.getElementById("gameTitle"); if(t)t.innerText=name;
 let ts=document.getElementById("gameTitleSpan"); if(ts)ts.innerText=name;
 let tl=document.getElementById("gameTitleShow"); if(tl)tl.innerText=name;
}
//启动时应用当前位置主题皮肤 + 游戏名
if(typeof THEMES!=="undefined"&&THEMES&&THEMES.length){_THEME=THEMES[0];applyTheme();_NOVEL=_firstNovel();applyGameTitle();}

//按章号取章节信息
function novelChapter(ch){
 if(!_NOVEL||!_NOVEL.chapters)return null;
 return _NOVEL.chapters.find(c=>c[0]===ch)||null;
}
//关键词检索（bigram 定位）：命中标题或关键词串，返回匹配章节数组
function novelSearch(kw){
 if(!_NOVEL||!_NOVEL.chapters)return [];
 let k=String(kw||"").trim();
 if(!k)return [];
 return _NOVEL.chapters.filter(c=>c[1].includes(k)||(c[2]||"").includes(k));
}

//随机一章（漫游当前篇）
function novelRandom(){
 if(!_NOVEL||!_NOVEL.chapters||!_NOVEL.chapters.length)return null;
 return _NOVEL.chapters[Math.floor(Math.random()*_NOVEL.chapters.length)];
}

//剧情锚点钩子：返回该章锚点，否则 null（J35 M3 批次1 优化：Map 缓存，切篇失效）
var _novelAnchorCache=null; // {map:章号->锚点, lines:{line->[锚点]}}
function _buildNovelAnchorCache(){
 if(!_NOVEL||!_NOVEL.anchors){_novelAnchorCache=null;return;}
 let m={},ln={};
 for(let a of _NOVEL.anchors){
  if(m[a.chapter]===undefined)m[a.chapter]=a; // 同章多锚点取首
  if(a.line){(ln[a.line]=ln[a.line]||[]).push(a);}
 }
 _novelAnchorCache={map:m,lines:ln};
}
function novelAnchor(ch){
 if(!_novelAnchorCache)_buildNovelAnchorCache();
 if(!_novelAnchorCache)return null;
 return _novelAnchorCache.map[ch]||null;
}

//剧情库主面板：可切主题 + 切篇目 + 检索 + 随机
function sceneNovel(){
 log("\n📚【剧情库】主题："+(_THEME?(("《"+_THEME.name+"》")+( _THEME.desc?("·"+_THEME.desc):"") ):"无"),"gold");
 if(_NOVEL){
  log("当前篇：《"+_NOVEL.title+"》·"+_NOVEL.author+" · 类型："+_NOVEL.type);
  if(_NOVEL.desc)log(_NOVEL.desc+"\n");
  let nAnch=(_NOVEL.anchors||[]).length;
  log("共 "+_NOVEL.chapters.length+" 章"+(nAnch?("·"+nAnch+" 剧情锚点（📌=检索命中）"):"")+"。可按关键词定位对应章节（人物/地名/功法名等）。");
 }else{
  log("（当前主题暂无已导入文本。可切换主题，或在 js/data/novel.js 的该主题 novels 里加一篇。）","blue");
 }
 addBtn("🎨切换主题",()=>sceneThemePick());
 if(_NOVEL)addBtn("🔄切换篇目",()=>sceneNovelPick());
 if(_NOVEL)addBtn("🔍检索关键词",()=>sceneNovelSearch());
 if(_NOVEL)addBtn("🎲随机一章",()=>{let c=novelRandom();if(c)sceneNovelChapter(c[0]);});
 if(novelAnchorsByLine("world").length)addBtn("🌍世界大事锚点",()=>sceneNovelLine("world"));
 addBtn("返回",()=>mainStep0());
}

//主题选择
function sceneThemePick(){
 log("\n🎨【选择主题】每主题可含多篇文章，切换后皮肤与游戏名随之更新：","blue");
 for(let t of (THEMES||[])){
  let cur=(_THEME&&t.id===_THEME.id)?"（当前）":"";
  let cnt=(t.novels&&t.novels.length)?t.novels.length+"篇":"0篇";
  addBtn((cur?"✓ ":"")+"《"+t.name+"》·"+cnt+cur,()=>{setTheme(t.id);log("\n已切换主题为《"+(_THEME? _THEME.name:"")+"》。","gold");sceneNovel();});
 }
 addBtn("返回",()=>sceneNovel());
}

//篇目选择（当前主题内）
function sceneNovelPick(){
 if(!_THEME||!_THEME.novels||!_THEME.novels.length){log("当前主题暂无文本。","red");sceneNovel();return;}
 log("\n📄【选择篇目】《"+_THEME.name+"》下共 "+_THEME.novels.length+" 篇：");
 for(let n of _THEME.novels){
  let cur=(_NOVEL&&n.id===_NOVEL.id)?"（当前）":"";
  addBtn((cur?"✓ ":"")+"《"+n.title+"》·"+n.type+cur,()=>{setNovel(n.id);log("\n已切换为《"+(_NOVEL? _NOVEL.title:"")+"》。","gold");sceneNovel();});
 }
 addBtn("返回",()=>sceneNovel());
}

//检索界面
function sceneNovelSearch(){
 log("\n🔍【检索】当前《"+_NOVEL.title+"》，输入关键词（人物名/地名/功法名）：","blue");
 addBtn("输入关键词",()=>{
  let kw=typeof prompt==="function"?prompt("输入检索关键词："):"";
  if(!kw){sceneNovelSearch();return;}
  let hits=novelSearch(kw);
  if(!hits.length){log("未找到与【"+kw+"】相关的章节。","red");addBtn("重新检索",()=>sceneNovelSearch());addBtn("返回",()=>sceneNovel());return;}
  log("检索【"+kw+"】命中 "+hits.length+" 章：","gold");
  for(let c of hits.slice(0,20))addBtn((novelAnchor(c[0])?"📌":"")+"第"+c[0]+"章 "+c[1],()=>sceneNovelChapter(c[0]));
  if(hits.length>20)log("……共 "+hits.length+" 章，仅显示前 20。");
  addBtn("重新检索",()=>sceneNovelSearch());
  addBtn("返回",()=>sceneNovel());
 });
 addBtn("返回",()=>sceneNovel());
}

//章节详情（含剧情锚点与前后章导航）
function sceneNovelChapter(ch){
 let c=novelChapter(ch);
 if(!c){log("没有此章。","red");sceneNovel();return;}
 log("\n📖 第"+c[0]+"章 "+c[1],"gold");
 if(c[2])log("关键词："+c[2]);
 let a=novelAnchor(c[0]);
 if(a){
  if(a.title)log("·"+a.title);
  if(a.trigger)log("触发："+a.trigger);
  if(a.summary)log("剧情："+a.summary);
  let refs=Array.isArray(a.refs)?a.refs:(a.refs||"").split(",").filter(Boolean); // 兼容数组/逗号串两代格式
  if(refs.length)log("关联："+refs.join("、"));
  if(a.line)log("线属："+(NOVEL_LINE_NAMES[a.line]||a.line),"blue");
 }else{
  log("（本篇暂无该章剧情锚点）","blue");
 }
 addBtn("◀上一章",()=>sceneNovelChapter(Math.max(1,c[0]-1)));
 addBtn("下一章▶",()=>sceneNovelChapter(Math.min(_NOVEL.chapters.length,c[0]+1)));
 addBtn("返回检索",()=>sceneNovelSearch());
 addBtn("返回剧情库",()=>sceneNovel());
}

//==== J35 M3 五线锚点：按线浏览原著对照（hide/jianghu/zongmen/modao/fuben/world）====
var NOVEL_LINE_NAMES={hide:"隐居·苟道种田",jianghu:"江湖·市井游历",zongmen:"宗门·五蕴宗",modao:"魔道·杀戮正邪",fuben:"副本·秘境历练",world:"世界大事"};
function novelAnchorsByLine(line){
 if(!_novelAnchorCache)_buildNovelAnchorCache();
 if(!_novelAnchorCache)return [];
 return _novelAnchorCache.lines[line]||[];
}
//锚点上下文（J35 M4 合流点）：按玩家当前主线（gs.step→线）取锚点摘要串，供 gen L1 extraPrompt 喂料
var STEP_LINE={1:"hide",2:"jianghu",3:"zongmen",4:"modao",6:"fuben",7:"fuben",8:"fuben"};
function novelAnchorContext(n){
 n=n||3;
 if(typeof gs==="undefined"||!gs)return "";
 let line=STEP_LINE[gs.step]||null;
 if(!line)return "";
 let as=novelAnchorsByLine(line);
 if(!as.length)return "";
 return "原著剧情参照（"+(NOVEL_LINE_NAMES[line]||line)+"）："+as.slice(0,n).map(a=>"第"+a.chapter+"章"+a.title+"："+a.summary).join("；");
}
//按线锚点面板（story.js 五线场景入口调用；无锚点时给出提示并返回剧情库）
function sceneNovelLine(line){
 let name=NOVEL_LINE_NAMES[line]||line;
 let as=novelAnchorsByLine(line);
 log("\n📖【原著锚点·"+name+"】《"+(_NOVEL?_NOVEL.title:"")+"》命中 "+as.length+" 个：","gold");
 if(!as.length)log("（本篇暂无该线锚点，可在剧情库切换篇目。）","blue");
 for(let a of as){
  addBtn("第"+a.chapter+"章 "+a.title,function(){sceneNovelChapter(a.chapter);});
 }
 addBtn("返回剧情库",function(){sceneNovel();});
}

//==== 转生/异界专属面板：技能树 / 伙伴 / 图鉴 ====
var gs_skill=gs_skill||{points:0,tree:{}}; // 技能点（转生成长资源）
function sceneSkillTree(){
 let sk=(typeof gs==="object"&&gs)?gs:{}; // 兜底
 log("\n🌳【技能树】转生世界以技能点驱动成长，当前技能点："+(sk_pts()),"gold");
 let tree=[
  {id:"str",name:"力量强化",max:10,desc:"物理伤害 +2/级"},
  {id:"agi",name:"敏捷身法",max:10,desc:"闪避率 +2%/级"},
  {id:"int",name:"精神增幅",max:5, desc:"魔力上限 +10/级"}
 ];
 for(let t of tree){
  let cur=(gs_skill.tree[t.id]||0);
  let full=cur>=t.max;
  log((full?"✔ ":"· ")+t.name+"（"+cur+"/"+t.max+"）"+t.desc);
  if(!full)addBtn("升级【"+t.name+"】（-1技能点）",(function(t){return function(){
   if(gs_skill.points<1){log("技能点不足！","red");sceneSkillTree();return;}
   gs_skill.points--; gs_skill.tree[t.id]=(gs_skill.tree[t.id]||0)+1;
   log("已升级【"+t.name+"】！","green");refreshUi();sceneSkillTree();
  };})(t));
 }
 addBtn("🎁获得技能点（演示）",function(){gs_skill.points++;log("技能点 +1，当前 "+gs_skill.points,"gold");sceneSkillTree();});
 addBtn("返回",function(){mainStep0();});
}
function sk_pts(){return gs_skill.points;}
function sceneParty(){
 if(!gs.party)gs.party=[];
 log("\n🤝【伙伴】与你同行的异界队友：","gold");
 if(!gs.party.length){log("（暂无伙伴，剧情中可结识。）","blue");}
 else{for(let p of gs.party)log("· "+p.name+"【"+p.title+"】好感"+p.favor+" 战力"+p.power);}
 addBtn("返回",function(){mainStep0();});
}
function sceneBestiary(){
 if(!gs.bestiary)gs.bestiary={};
 log("\n📖【图鉴】收录遭遇过的灵物与敌人：","gold");
 let keys=Object.keys(gs.bestiary);
 if(!keys.length){log("（图鉴空白，战斗/遭遇会逐步收录。）","blue");}
 else{for(let k of keys)log("· "+k+"：遭遇/击杀 "+gs.bestiary[k]+" 次");}
 addBtn("返回",function(){mainStep0();});
}
