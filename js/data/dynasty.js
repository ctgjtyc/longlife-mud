//==== data/dynasty.js：凡俗王朝配置（内容层 SSOT，P5 王朝纷争）====
// 王朝：factions 派系（声望）/ events 纷争事件（choices 选项，flag 记录已抉择）

export const DYNASTIES={
 "大夏王朝":{
  name:"大夏王朝",desc:"立国三百载，如今内忧外患，气数渐衰",
  factions:{
   "夏室":{desc:"正统皇室",repGain:1},
   "叛军":{desc:"揭竿而起的义军",repGain:1},
   "藩王":{desc:"拥兵自重的藩王",repGain:1}
  },
  events:[
   {id:"dy_border",title:"边境烽烟",desc:"北境蛮族犯边，夏室与藩王为军费争执不下",choices:[
    {text:"资助夏室守边",effect:{stone:-200,rep:{夏室:40}},flag:"dy1_ming"},
    {text:"资助藩王平乱",effect:{stone:-200,rep:{藩王:40}},flag:"dy1_fan"},
    {text:"坐观其变",effect:{stone:50},flag:"dy1_watch"}
   ]},
   {id:"dy_famine",title:"粮荒民变",desc:"连年大旱，饥民揭竿，叛军声势渐壮",choices:[
    {text:"开仓济民",effect:{stone:-150,rep:{夏室:30,散修盟:20}},flag:"dy2_ji"},
    {text:"资助叛军",effect:{stone:-150,rep:{叛军:40}},flag:"dy2_pan"},
    {text:"不问凡俗",effect:{},flag:"dy2_ignore"}
   ]}
  ]
 }
};
