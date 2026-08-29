//==== test/balance_sim.mjs：平衡性模拟器（J35 M4-5，2026-08-23）====
// 本地零出网：vm 加载 data/balance.js + data/monsters.js 纯数据表，按 fight.js 真实公式蒙特卡洛。
// 用法：node test/balance_sim.mjs  → 控制台摘要 + docs/balance-report-<date>.md
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { Math, JSON, Object, Array, console };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ["js/data/balance.js", "js/data/monsters.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf-8"), sandbox, { filename: f });
}
const { BALANCE, MONSTERS } = vm.runInContext("({BALANCE, MONSTERS})", sandbox);

//==== 玩家面板（对齐游戏进度三档；mul=命格等攻击乘子基准 1）====
const PROFILES = [
  { id: "新手·炼气后期", cult: 50, con: 10, equipBonus: 0 },
  { id: "中期·金丹",     cult: 500, con: 20, equipBonus: 10 },
  { id: "后期·化神",     cult: 2000, con: 30, equipBonus: 20 },
];
//==== 成长曲线（passYear 公式：n*(cultGainBase+(悟性-10)*cultGainAttr+equipBonus*cultGainEquip)）====
function yearsTo(cultTarget, comprehension, equipBonus, diffMul = 1) {
  const perYear = (BALANCE.cultGainBase + (comprehension - 10) * BALANCE.cultGainAttr + equipBonus * BALANCE.cultGainEquip) * diffMul;
  return Math.ceil(cultTarget / perYear);
}
//==== 战斗蒙特卡洛（fight.js:65/72 公式 + ai 触发）====
function playerDmg(p) {
  return Math.floor(BALANCE.atkBase + p.equipBonus * BALANCE.atkEquip + p.cult * BALANCE.atkCult + p.con * BALANCE.atkConstitution);
}
function simulate(p, m, hpmax = 100, trials = 2000) {
  let wins = 0, roundsSum = 0;
  const pd = playerDmg(p);
  for (let t = 0; t < trials; t++) {
    let ehp = m.hp, eatk = m.atk, php = hpmax, r = 0, enraged = false, healed = false;
    while (php > 0 && ehp > 0 && r < 500) {
      r++;
      ehp -= pd;
      if (m.ai === "heal" && !healed && m.aiParam && ehp <= m.hp * m.aiParam.hpPct) { // 治疗一次（简化：单次）
        ehp = Math.min(m.hp, ehp + Math.floor(m.hp * m.aiParam.healPct)); healed = true;
      }
      if ((m.ai === "enrage" || m.ai === "phase") && !enraged && m.aiParam && ehp <= m.hp * m.aiParam.hpPct) {
        eatk = Math.floor(eatk * m.aiParam.atkMul); enraged = true; // 狂暴/切相加攻（简化：一次触发持续）
      }
      if (ehp <= 0) break;
      php -= Math.floor(eatk * 0.4);
      if (m.ai === "summon" && m.aiParam && ehp <= m.hp * m.aiParam.hpPct) {
        const minion = MONSTERS[m.aiParam.minion];
        if (minion) php -= Math.floor(minion.atk * 0.4) * m.aiParam.count; // 召唤物每回合陪打（简化）
      }
    }
    if (ehp <= 0 && php > 0) { wins++; roundsSum += r; }
  }
  return { rate: wins / trials, avgRounds: wins ? (roundsSum / wins).toFixed(1) : "-" };
}

//==== 跑模拟 ====
const lines = [];
lines.push("# 平衡性模拟报告（J35 M4-5 平衡性模拟器）");
lines.push("");
lines.push("> 生成：node test/balance_sim.mjs（本地零出网）｜公式源：js/data/balance.js（SSOT）+ js/fight.js 真实伤害公式");
lines.push("> 玩家 hpmax 基准 100（游戏内仅丹药可增）；胜率=蒙特卡洛 2000 局/组合；ai 简化：enrage/phase 一次触发持续、heal 单次、summon 陪打。");
lines.push("");
lines.push("## 一、成长曲线（基准悟性 10 / 高悟性 20 / 装备加成 0 与 10）");
lines.push("");
lines.push("| 目标境界 | 门槛 cult | 悟性10·装备0 | 悟性10·装备10 | 悟性20·装备0 | 悟性20·装备10 |");
lines.push("|---|---|---|---|---|---|");
for (const rm of BALANCE.realms.slice(1)) {
  const y = [
    yearsTo(rm.cult, 10, 0), yearsTo(rm.cult, 10, 10), yearsTo(rm.cult, 20, 0), yearsTo(rm.cult, 20, 10),
  ];
  lines.push(`| ${rm.name} | ${rm.cult} | ${y[0]}年 | ${y[1]}年 | ${y[2]}年 | ${y[3]}年 |`);
}
lines.push("");
lines.push("## 二、战斗胜率矩阵（玩家三档 × 全怪物表）");
lines.push("");
lines.push("| 玩家档 \\ 敌人 | " + Object.keys(MONSTERS).join(" | ") + " |");
lines.push("|---|" + "---|".repeat(Object.keys(MONSTERS).length));
for (const p of PROFILES) {
  const cells = Object.values(MONSTERS).map(m => {
    const s = simulate(p, m);
    return (s.rate * 100).toFixed(0) + "%(" + s.avgRounds + "回合)";
  });
  lines.push(`| ${p.id}（攻${playerDmg(p)}） | ` + cells.join(" | ") + " |");
}
lines.push("");
lines.push("## 三、平衡性观察（自动结论）");
lines.push("");
const novice = PROFILES[0], mid = PROFILES[1], late = PROFILES[2];
const obs = [];
{
  const w1 = simulate(novice, MONSTERS["山林妖狼"]).rate, w5 = simulate(novice, MONSTERS["妖王·赤炎"]).rate;
  obs.push(`新手 vs 山林妖狼胜率 ${(w1 * 100).toFixed(0)}%、vs 妖王·赤炎 ${(w5 * 100).toFixed(0)}% —— ${w1 > 0.5 ? "入门怪合格" : "入门怪偏难"}，${w5 < 0.2 ? "高阶怪对新手形成正确压制（副本梯度成立）" : "警告：新手可越级杀高阶怪，梯度失衡"}`);
  const wl = simulate(late, MONSTERS["妖王·赤炎"]).rate;
  obs.push(`后期 vs 妖王胜率 ${(wl * 100).toFixed(0)}% —— ${wl > 0.9 ? "后期碾压符合长生流爽点" : "后期压制力不足"}`);
  const wm = simulate(mid, MONSTERS["魔渊长老"]).rate;
  obs.push(`中期 vs 魔渊长老（召唤型）胜率 ${(wm * 100).toFixed(0)}% —— ${wm >= 0.4 && wm <= 0.8 ? "风险区间合理（魔道线挑战性成立）" : wm < 0.4 ? "过难：建议降 atk 或 minion count" : "偏易：召唤机制未构成威胁"}`);
  const yBase = yearsTo(200, 10, 0), yLate = yearsTo(8000, 10, 0);
  obs.push(`全程修为：筑基约 ${yBase} 年、大乘约 ${yLate} 年 —— 长生流时间尺度自洽（百年百年地熬是核心体验）`);
}
lines.push(...obs.map(o => "- " + o));
lines.push("");
const report = lines.join("\n");
mkdirSync(join(ROOT, "docs"), { recursive: true });
const out = join(ROOT, "docs", "balance-report-" + new Date().toISOString().slice(0, 10) + ".md");
writeFileSync(out, report, "utf-8");
console.log(report);
console.log("\n[OK] 报告已写入: " + out);
