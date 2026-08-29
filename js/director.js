/* director.js - J35 M3 剧情导演模块首版（引擎/叙事分离：参数可变、走向结局锁定）
 * 设计对齐 director-config-pack：可调面（节奏/变体）vs 锁定面（已发生事实/主线/结局）。
 * 首版落地：pace 节奏（事件密度因子）+ 结局锁定校验 + 面板；intensity/顺序/变体批次列后续
 * （intensity 与既有 diff 难度系统的叠加关系需内容侧裁决，不空接）。 */
const DIRECTOR = {
  pace: "normal",       // slow|normal|fast
  intensity: "normal",  // low|normal|high（首版未接引擎，仅存参）
  variantSeed: 0        // 叙事变体种子（同一周目稳定，跨周目可换）
};
const DIRECTOR_PACE = { slow: 0.6, normal: 1, fast: 1.5 };      // 事件密度因子
const DIRECTOR_YEAR = { slow: 1.5, normal: 1, fast: 0.7 };      // 岁月步长建议因子（叙事层选用）
const DIRECTOR_EVENT_BASE = 0.8;                                // 随机事件基础密度（triggerRandomEvent 入口门）
// 结局锁定清单（story.js 锁定区，AI/模组只可填充不可改走向）
const LOCKED_ENDINGS = ["endingHide", "endingDemon", "endingInvincible", "endingDead"];

function directorEventRate() { return DIRECTOR_PACE[DIRECTOR.pace] || 1; }
function directorYearFactor() { return DIRECTOR_YEAR[DIRECTOR.pace] || 1; }
// 锁定校验：结局函数必须在锁定清单且真实存在（mod 校验/回归门可用）
function directorAssertLock(fnName) {
  return LOCKED_ENDINGS.indexOf(fnName) >= 0 && typeof window[fnName] === "function";
}
function directorSettingsLoad() {
  try {
    const j = JSON.parse(localStorage.getItem("director_settings_v1") || "{}");
    if (j.pace) DIRECTOR.pace = j.pace;
    if (j.intensity) DIRECTOR.intensity = j.intensity;
    if (typeof j.variantSeed === "number") DIRECTOR.variantSeed = j.variantSeed;
  } catch (_) {}
}
function directorSettingsSave() {
  try { localStorage.setItem("director_settings_v1", JSON.stringify({ pace: DIRECTOR.pace, intensity: DIRECTOR.intensity, variantSeed: DIRECTOR.variantSeed })); } catch (_) {}
}
// 导演面板：节奏三档 + 结局锁定清单展示（PANELS 注册 director）
function sceneDirector() {
  log("\n🎬【剧情导演】节奏：" + DIRECTOR.pace + "（事件密度×" + directorEventRate() + "·岁月因子×" + directorYearFactor() + "）｜强度：" + DIRECTOR.intensity + "（未接引擎，列后续批次）", "gold");
  for (const p of ["slow", "normal", "fast"]) {
    let cur = DIRECTOR.pace === p ? "✓ " : "";
    addBtn(cur + "节奏：" + ({ slow: "慢热·岁月悠长（事件稀疏）", normal: "标准", fast: "快节奏·世事频仍" })[p], () => {
      DIRECTOR.pace = p; directorSettingsSave();
      log("节奏已调为 " + p + "（事件密度×" + directorEventRate() + "）。", "green"); sceneDirector();
    });
  }
  addBtn("🎲换一个变体种子（-1）", () => {
    DIRECTOR.variantSeed = (DIRECTOR.variantSeed - 1) | 0; directorSettingsSave();
    log("变体种子：" + DIRECTOR.variantSeed + "（跨周目叙事变体启用时生效）。", "green"); sceneDirector();
  });
  addBtn("ℹ锁定面说明", () => showInfo("剧情导演·可调面与锁定面", [
    "可调面：节奏（事件密度×" + directorEventRate() + "·岁月因子×" + directorYearFactor() + "）、变体种子；强度/顺序批次列后续。",
    "锁定面：结局走向（" + LOCKED_ENDINGS.join("、") + "）、主线已发生事实——AI 与模组只可填充，不可改写。",
    "奇遇亦受节奏影响：回到主菜单时按密度随机出现（不再是显式选项）。"
  ]));
  addBtn("返回", () => mainStep0());
}
directorSettingsLoad();
