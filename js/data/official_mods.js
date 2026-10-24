//==== data/official_mods.js：官方模组库（P5+ 1024 程序员节）====
// 官方彩蛋模组：与玩家自制模组走完全相同的注入管线（modValidate/modConflictCheck/modLoad），
// 官方内容先吃自己的狗粮——这是模组系统稳定性的最好证明。
// 规范同 modloader.js：{id,name,version,desc,author,content:{quests,npcs,items,monsters,achs}}
// achs 为 P5+ 新增注入目标（core.js allAch）；对话选项 fight 字段 / reward.flags / reward.achs 同批引擎扩展。
export const OFFICIAL_MODS={
 "mod_1024":{
  id:"mod_1024",
  name:"1024·码道飞升",
  version:"1.0.0",
  author:"长生MUD×WorkBuddy 官方",
  desc:"程序员节限定彩蛋：山道旁结识一位敲键盘的修士，修为打磨至 1024，斩除 Bug 心魔，诵出 Hello World 真言——成就码道飞升。（2026-10-24 程序员节献礼）",
  content:{
   quests:{
    "q_1024_1":{
     name:"初窥码道",kind:"chain",need:{type:"flag",key:"q1024_met",val:true},
      steps:[
      {desc:"听代码真人论道，习得码道三境",cond:{type:"flag",key:"q1024_taught",val:true},reward:{stone:64}},
      {desc:"将修为打磨至 1024——码道之基，2 的十次方（背包使用【代码卷轴】可直达 1024，亦可自行修炼）",cond:{type:"attr",key:"cult",op:">=",val:1024},reward:{stone:128}}
     ],
     onDone:{flags:{q1024_1_done:true},rep:{散修盟:10},items:{"回血散":3},unlockQuest:"q_1024_2"}
    },
    "q_1024_2":{
     name:"斩除心魔",kind:"chain",need:{type:"flag",key:"q1024_1_done",val:true},
     steps:[
      {desc:"在代码真人处领受考验，斩除 Bug 心魔",cond:{type:"flag",key:"bug_1024_slain",val:true},reward:{cult:128,stone:256}}
     ],
     onDone:{flags:{q1024_2_done:true},rep:{散修盟:10},unlockQuest:"q_1024_3"}
    },
    "q_1024_3":{
     name:"Hello World 飞升",kind:"chain",need:{type:"flag",key:"q1024_2_done",val:true},
     steps:[
      {desc:"向代码真人诵出真言『Hello, World』",cond:{type:"flag",key:"hello_world_chanted",val:true},reward:{cult:512,stone:512}}
     ],
     onDone:{achs:["m_1024_fly"],flags:{q1024_3_done:true},rep:{散修盟:20}}
    }
   },
   npcs:{
    "daima_zhenren":{
     name:"代码真人",faction:"散修盟",desc:"自称来自「硅基」的游方修士，敲键盘如抚琴，口吐真言 printf(\"长生\")",need:null,lifespan:1024,
     dialogue:{
      "start":{
       text:"山道旁的青石上盘坐着一位灰袍修士，袍子洗得发白，膝上摊着一块微微发光的黑板子，十指在上面敲得飞快，像在弹一张看不见的琴。见你驻足，他头也不抬：「道友，可知今日是何日子？」",
       options:[
        {text:"愿闻其详",effect:{flags:{q1024_met:true},achs:["m_1024_meet"],relation:{daima_zhenren:5}},next:"story1024"},
        {text:"与他论道：何为码道？",need:{type:"flag",key:"q1024_met",val:true},next:"teach"},
        {text:"⚔ 领受考验：直面 Bug 心魔（战斗）",need:{type:"flag",key:"q1024_1_done",val:true},fight:"Bug心魔"},
        {text:"✨ 诵出真言：Hello, World",need:{type:"flag",key:"q1024_2_done",val:true},next:"chant"},
        {text:"不打扰了，告辞",next:"end"}
       ]
      },
      "story1024":{
       text:"灰袍修士终于抬起头，眼睛亮得不像个活了两千岁的人：「十月二十四。2 的十次方，1024。吾辈码修的节日。」他把黑板子转过来给你看，上面密密麻麻，全是天书一样的符文。「此物名曰键盘，此术名曰编程。一念生万物，一念噬百魂。你既有长生之姿，或许……与码道有缘。」",
       options:[
        {text:"与他论道：何为码道？",next:"teach"},
        {text:"改日再来请教",next:"end"}
       ]
      },
      "teach":{
       text:"「码道三境。」他竖起一根手指。他又压低声音：「码修心魔名唤 Bug，无形无相，专在子时上线前袭来，斩之不尽，唯勤可御。你若真想入门，先把修为打磨到 `1024`，那是码道之基。」临别，他塞给你一卷泛黄的卷轴：「此卷乃吾辈千年码道心得，参悟可抵千年苦修。码道之基，咫尺可至——去罢，斩了那心魔，再来见我。」",
       code:["> 码道三境","  第一境：能跑就行","  第二境：不要动它   // 祖传代码，动一行，崩十里","  第三境：方敢言重构"],
       options:[
        {text:"谨记教诲，收下卷轴（获得【代码卷轴】）",effect:{flags:{q1024_taught:true},cult:64,items:{"代码卷轴":1},relation:{daima_zhenren:10}},next:"end"}
       ]
      },
      "chant":{
       text:"你深吸一口气，对着青山旷野，一字一句地诵出：`Hello——World`。风停了一瞬。青石上的黑板子忽然亮起一片绿光，映得他眼中如星河倒灌。「编译通过，」代码真人缓缓起身，郑重抱拳，「零报错，零警告。欢迎入道，道友。从今日起，你也是码修了。长生路远，愿你的代码永无 Bug。」",
       options:[
        {text:"回礼：愿前辈永不加班",effect:{flags:{hello_world_chanted:true},cult:256,relation:{daima_zhenren:20}},next:"end"}
       ]
      }
     }
    }
   },
   items:{
    "代码卷轴":{type:"consumable",desc:"上古卷轴，展开只有一行真言：Hello, World。参悟后修为+1024",use:{cult:1024}}
   },
   monsters:{
    "Bug心魔":{name:"Bug心魔",hp:144,atk:10,reward:{cult:256,stone:512,flags:{bug_1024_slain:true}},ai:"enrage",aiParam:{hpPct:0.35,atkMul:1.5},affixDrop:["噬魂","魔骨"]}
   },
   achs:{
    "m_1024_meet":{name:"初遇代码真人",desc:"十月二十四，山道青石上遇见一位敲键盘的修士",got:false},
    "m_1024_fly":{name:"Hello World 飞升",desc:"在修仙世界写下第一行代码，一次编译通过",got:false}
   }
  }
 }
};
