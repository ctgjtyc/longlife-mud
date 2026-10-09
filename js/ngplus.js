//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, allAch, gs, log, refreshUi, renderAch } from "./core.js";
import { BALANCE } from "./data/balance.js";
import { startGame } from "./main.js";
import { bioLog } from "./meta.js";
import { resetGame, resetState } from "./story.js";

//==== ngplus.js：多周目系统（P5 多周目继承）====
// gs.ng 周目数；结局后可选多周目：继承成就/部分属性/功法/声望/灵石/修为

//多周目继承：成就全保留；属性×30%；功法/声望全保留；灵石×20%；修为×10%；难度/传记跨世保留
export function startNgPlus(){
 let inherit={
  achs:gs.achs.slice(),
  attrs:{},
  arts:gs.arts,
  reputation:gs.reputation,
  stone:Math.floor(gs.stone*0.2),
  cult:Math.floor(gs.cult*0.1),
  ng:(gs.ng||0)+1,
  diff:gs.diff,   // P6：难度跨世保留
  bio:gs.bio      // P6：传记跨世累积
 };
 for(let k in BALANCE.attrsInit){
  inherit.attrs[k]=Math.floor((gs.attrs[k]||BALANCE.attrsInit[k])*0.3);
 }
 resetState();
 gs.ng=inherit.ng;
 gs.diff=inherit.diff;
 gs.bio=inherit.bio;
 gs.achs=inherit.achs;
 for(let k in inherit.attrs)gs.attrs[k]=inherit.attrs[k];
 gs.arts=inherit.arts;
 gs.reputation=inherit.reputation;
 gs.stone=Math.max(100,inherit.stone);
 gs.cult=inherit.cult;
 for(let k in allAch){allAch[k].got=gs.achs.includes(allAch[k].name);}
 renderAch();
 bioLog("转世重生",`开启第${gs.ng}世，带着前世记忆与积累再踏长生路。`); // P6 传记
 log(`\n✨【多周目·第${gs.ng}世】你带着前世的记忆与积累，再次踏上长生之路。`,"gold");
 log("继承：成就全保留；属性×30%；功法全保留；声望全保留；灵石×20%；修为×10%。","blue");
 refreshUi();
 startGame();
}

//结局统一入口：提供重新开局 + 多周目选项（各结局文本自带，此处只挂按钮）
export function sceneEnding(endType){
 gs.endType=endType;
 bioLog("迎来结局",`${["","万古隐仙","宗门老祖","万古魔主","岁月道主","长生归寂"][endType]||"未知"}。`); // P6 传记
 addBtn("🔄重新开局",()=>resetGame());
 addBtn("✨开启多周目（继承部分积累）",()=>startNgPlus());
}
