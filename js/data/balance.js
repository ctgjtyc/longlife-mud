//==== data/balance.js：数值配置表（平衡表 SSOT）====

const BALANCE={
 // 六属性初始值（旧档迁移时补此默认；悟性=10 保证 cult 公式与原版一致零漂移）
 attrsInit:{constitution:10,soul:10,spirit:10,comprehension:10,heart:0,demon:0},
 // 属性中文名（UI 展示）
 attrsName:{constitution:"体魄",soul:"神魂",spirit:"灵力",comprehension:"悟性",heart:"道心",demon:"魔性"},
 // 境界阈值表（派生值：由 cult 计算，不落存档）
 realms:[
  {name:"炼气期",cult:0},
  {name:"筑基期",cult:200},
  {name:"金丹期",cult:500},
  {name:"元婴期",cult:1000},
  {name:"化神期",cult:2000},
  {name:"渡劫期",cult:4000},
  {name:"大乘期",cult:8000}
 ],
 // 修为年增长公式：n*(cultGainBase + (悟性-10)*cultGainAttr + 装备*cultGainEquip)
 cultGainBase:2,
 cultGainAttr:0.1,
 cultGainEquip:0.15,
 // 战斗公式
 atkBase:15,
 atkEquip:1.2,
 atkCult:0.04,
 atkConstitution:0.5,
 // P3b 玩法系统参数
 tribBase:0.5,        // 渡劫基础成功率（渡劫功法叠加）
 encounterBase:0.4,   // 奇遇基础触发概率（命格叠加）
 alchemyBase:0.8      // 炼丹炼器基础成功率（配方 baseRate 覆盖）
};
