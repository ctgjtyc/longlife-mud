//==== data/factions.js：势力配置表（内容层 SSOT，P3b）====
// 势力：desc 描述 / oppose 对立阵营（声望互斥：加一方减对立）/ repGain 声望获取倍率

const FACTIONS={
 "青云宗":{desc:"正道大宗，浩然正气",oppose:"魔渊",repGain:1},
 "魔渊":{desc:"魔道圣地，弱肉强食",oppose:"青云宗",repGain:1},
 "散修盟":{desc:"中立散修联盟，兼容并蓄",oppose:null,repGain:1},
 "万妖谷":{desc:"妖族势力，与人为敌",oppose:"青云宗",repGain:1}
};
