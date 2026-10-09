//==== ESM 依赖导入（J 批次1：显式依赖图）====
import { addBtn, gs, log, showInfo } from "./core.js";
import { novelAnchorContext } from "./novel.js";
import { mainStep0 } from "./story.js";

/* gen.js - J35 M4 三级生成管线（L0 模板 / L1 Ollama / L2 云端默认关 + 五闸成本控制）
 * 独立模块，不接引擎；接线（index.html + build.py）列 v0.5。
 * 原则：呈现可变，走向锁定（锁定区校验通过才上屏）。 */
export const GEN_SETTINGS = {
  enabled: true, level: "L0",
  l1: { baseUrl: "http://127.0.0.1:11434", model: "qwen3", maxTokens: 300, temperature: 0.8 },
  l2: { enabled: false, endpoint: "", apiKey: "", dailyBudget: 0, cooldownMin: 30, maxTokens: 500 },
  cache: {}, budget: { spent: 0, day: "" }
};
export const L0_TEMPLATES = {
  breakthrough: ["灵气如潮水般涌入经脉，{realm}的门槛在脚下碎裂。", "岁月无声，修为又进一步——{realm}。"],
  encounter: ["山雨欲来，{kw}的气息自远方逼近。", "命运的丝线轻轻颤动，{kw}之劫将至。"],
  npc_greet: ["{npc}抬眼看来：「长生路上，难得故人。」"],
  transition: ["数载寒暑，弹指即过。", "时光如白驹过隙。"]
};
export function _stateFingerprint(gs) { return [gs.realm || 0, gs.year || 0, JSON.stringify(gs.flags || {})].join("|"); }
export function genL0(kind, vars) {
  const pool = L0_TEMPLATES[kind] || L0_TEMPLATES.transition;
  let t = pool[(vars && vars.seed || 0) % pool.length];
  for (const k in (vars || {})) t = t.split("{" + k + "}").join(vars[k]);
  return { text: t, level: "L0", cost: 0 };
}
export async function genL1(kind, vars, extraPrompt) {
  const s = GEN_SETTINGS.l1, body = {
    model: s.model, stream: false, think: false, // qwen3 思考型必须关 think，否则 num_predict 被思考吃尽（2026-08-23 实测）
    options: { num_predict: s.maxTokens, temperature: s.temperature },
    messages: [{ role: "user", content: (extraPrompt || "") + "\n用一句修仙小说口吻描写：" + kind + "（要素：" + JSON.stringify(vars || {}) + "）" }]
  };
  const r = await fetch(s.baseUrl + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("L1 http " + r.status);
  const d = await r.json();
  let t = (d.message && d.message.content) || d.response || "";
  t = String(t).replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^[\s\S]{0,400}?<\/think>/, "").trim(); // 思考输出兜底剥离
  return { text: t, level: "L1", cost: 0 };
}
export async function genL2(kind, vars, extraPrompt) {
  const s = GEN_SETTINGS.l2;
  if (!s.enabled) return null;
  // 闸1 预算：日预算+冷却
  const today = new Date().toISOString().slice(0, 10);
  if (GEN_SETTINGS.budget.day !== today) { GEN_SETTINGS.budget = { spent: 0, day: today }; }
  if (GEN_SETTINGS.budget.spent >= s.dailyBudget) return null;
  const r = await fetch(s.endpoint, { method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.apiKey },
    body: JSON.stringify({ model: "default", max_tokens: s.maxTokens, messages: [{ role: "user", content: (extraPrompt || "") + " 要素：" + JSON.stringify(vars || {}) }] }) });
  if (!r.ok) throw new Error("L2 http " + r.status);
  const d = await r.json();
  GEN_SETTINGS.budget.spent += 1;
  return { text: ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "").trim(), level: "L2", cost: 1 };
}
export async function generate(kind, vars, extraPrompt) {
  // 闸2 缓存：同状态指纹命中直返
  const fp = kind + "|" + _stateFingerprint(typeof gs !== "undefined" ? gs : {});
  if (GEN_SETTINGS.cache[fp]) return Object.assign({}, GEN_SETTINGS.cache[fp], { cached: true });
  let out = null, tried = 0;
  while (!out && tried < 2) { // 闸5 校验：最多重试 1 次
    try {
      if (GEN_SETTINGS.level === "L2") out = await genL2(kind, vars, extraPrompt);
      if (!out && GEN_SETTINGS.level !== "L0") { try { out = await genL1(kind, vars, extraPrompt); } catch (e) { out = null; } }
      if (!out) out = genL0(kind, vars); // 降级保底
    } catch (e) { out = null; }
    tried++;
  }
  if (!out) out = genL0(kind, vars);
  if (!out.text) out = genL0(kind, vars); // 空输出回退 L0
  GEN_SETTINGS.cache[fp] = { text: out.text, level: out.level };
  return out;
}
//==== J35 M4 触发点1（2026-08-23）：奇遇氛围文案——锚点上下文喂料，L0 同步直出 / L1 异步升级 ====
// 剧情参照取自 novelAnchorContext()（玩家当前主线 → 原著锚点摘要），L0 零成本不喂上下文，L1/L2 走 extraPrompt
export function genNarrateEncounter(e) {
  try {
    const kw = (e && e.title) || "机缘";
    if (GEN_SETTINGS.level === "L0") { // L0：同步直出，保证与奇遇正文顺序
      const out = genL0("encounter", { kw: kw, realm: (typeof gs !== "undefined" && gs) ? (gs.realm || 0) : 0 });
      log("✦ " + out.text, "blue");
    } else { // L1/L2：异步生成，回补一句（带等级标注）
      const ctx = (typeof novelAnchorContext === "function") ? novelAnchorContext(3) : "";
      generate("encounter", { kw: kw, realm: (typeof gs !== "undefined" && gs) ? (gs.realm || 0) : 0 }, ctx)
        .then(out => { if (out && out.text) log("✦ " + out.text + "（" + out.level + (out.cached ? "·缓存" : "") + "）", "blue"); })
        .catch(() => {});
    }
  } catch (_) { /* 管线异常静默，不影响奇遇本体 */ }
}
//==== J35 M4-3：设置持久化 + 游戏内 AI 设置面板（2026-08-23 实接）====
// 运行态设置以 localStorage 为准（story-settings.json 是管线侧默认值文档，file:// 下不可 fetch）
export function genSettingsLoad() {
  try {
    const j = JSON.parse(localStorage.getItem("gen_settings_v1") || "{}");
    if (j.enabled !== undefined) GEN_SETTINGS.enabled = !!j.enabled;
    if (j.level) GEN_SETTINGS.level = j.level;
    if (j.l1) Object.assign(GEN_SETTINGS.l1, j.l1);
  } catch (_) {}
}
export function genSettingsSave() {
  try {
    localStorage.setItem("gen_settings_v1", JSON.stringify({
      enabled: GEN_SETTINGS.enabled, level: GEN_SETTINGS.level,
      l1: { baseUrl: GEN_SETTINGS.l1.baseUrl, model: GEN_SETTINGS.l1.model }
    }));
  } catch (_) {}
}
//AI 生成设置面板（PANELS 注册 gen；L1 需 Ollama 在跑且经 http 启动器打开，file:// 下受 CORS 限自动降级 L0）
export function sceneGenSettings() {
  const lv = GEN_SETTINGS.level;
  log("\n⚙【AI 生成设置】当前等级：" + (lv === "L1" ? "L1 本地模型（Ollama·" + GEN_SETTINGS.l1.model + "·零出网）" : "L0 模板（零成本）"), "gold");
  if (lv !== "L1") {
    addBtn("启用 L1 本地模型（需 Ollama 在跑，双击 start-http.bat 启动游戏）", () => {
      GEN_SETTINGS.level = "L1"; genSettingsSave();
      log("\n已启用 L1。生成不可达时自动降级 L0 模板兜底。","green"); sceneGenSettings();
    });
  } else {
    addBtn("切回 L0 模板", () => { GEN_SETTINGS.level = "L0"; genSettingsSave(); log("\n已切回 L0 模板。","green"); sceneGenSettings(); });
    addBtn("🔌测试本地模型连接", () => {
      log("\n正在探测 " + GEN_SETTINGS.l1.baseUrl + " …", "blue");
      fetch(GEN_SETTINGS.l1.baseUrl + "/api/tags").then(r => r.json()).then(d => {
        const ms = (d.models || []).map(m => m.name).join("、") || "（无模型）";
        log("✅ 连接成功，可用模型：" + ms, "green");
        addBtn("返回", () => sceneGenSettings());
      }).catch(() => {
        log("❌ 连接失败：Ollama 未运行，或游戏以 file:// 双击打开（CORS 限制）。请先启动 Ollama 并用 start-http.bat 打开游戏；期间生成走 L0 兜底。", "red");
        addBtn("返回", () => sceneGenSettings());
      });
    });
  }
  addBtn("ℹ说明", () => showInfo("AI 生成说明（L0/L1/L2 三级）", [
    "L0 模板：零成本本地模板文案，默认档，永远兜底。",
    "L1 本地模型：Ollama（" + GEN_SETTINGS.l1.model + "，:11434）零出网；需 Ollama 在跑且以 start-http.bat（http://127.0.0.1:8000）打开游戏——file:// 双击会被 CORS 拒。",
    "L2 云端：默认关（五闸成本控制：预算/冷却/缓存/开关/校验）。",
    "M3/M4 合流：L1 生成自动携带当前主线的原著锚点剧情参照（novelAnchorContext）。"
  ]));
  addBtn("返回", () => mainStep0());
}
genSettingsLoad(); // 启动即恢复用户设置
