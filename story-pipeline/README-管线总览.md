# 剧本锚点化管线总览（J35）v1

> 架构：Kimi 四段流水线 + 本地校验回路 | 主力模型：豆包 2.1 turbo（Step 1）| 更新：2026-08-13

## 目录结构（D:\AI-app\longlife-mud\story-pipeline\）

```
story-pipeline/
├── step0_split.py        # 切分对账：56 槽原文包 + manifest + 状态机（已运行）
├── step1_豆包指令模板.md  # 塔身操作模板（用户跑豆包时参照）
├── step2_verify.py       # 机器校验：五节齐备/章号覆盖/伏笔引用/词级忠实抽查
├── step3_merge.py        # 锚点合成：digest + chapters.json → anchors.json
├── chunks/               # 55 槽原文包 ch%04d-%04d.txt
├── manifest.json         # 槽位清单/章号对账/长度比对/digest 路径
├── progress.json         # 进度：done（PASS 槽列表）/ redo（不合格槽）
├── state.json            # 接力状态机：realm/active_chars/open_foreshadows
└── redo-queue.json       # Step 2 输出：不合格槽与原因
```

## 角色分工

| 角色 | 步骤 | 内容 |
|------|------|------|
| 本地 Python（已跑） | Step 0 | 分章对账 → 55 槽原文包 + manifest + state |
| 你 + 豆包 2.1 turbo | Step 1 | 每槽 1 次对话（模板见 step1 文档），产物 digest-*.md |
| Q（我） | Step 2 | 每回收一批跑校验，PASS 入 done，FAIL 进 redo |
| Q（我） | Step 3 | 全部 PASS 后合成 anchors.json（anchor-v1 格式） |

## 命令（在 story-pipeline 目录下）

```bash
# Step 2：校验全部已填槽（增量式，done 自动跳过）
py -3 step2_verify.py

# Step 2：只校验指定槽（如 0001-0050）
py -3 step2_verify.py 0001-0050

# Step 3：全部 PASS 后合成锚点
py -3 step3_merge.py
```

## 断点续跑与回环

- **断点续跑**：progress.json 记录 done 槽；校验脚本幂等，重跑自动跳过已 PASS 槽
- **redo 回环**：不合格槽进 redo-queue.json → 用户携原因回豆包重跑该槽 → 产物覆盖 → 再校验
- **接力回写**：每批 PASS 后 Q 把该槽「## 接力」节回写 state.json（下槽继承用）
- **全绿信号**：Step 2 输出 `== done:55 redo:0 ==` 即可跑 Step 3

## 质量防线

1. Step 2 自动查：五节齐备 / 事件链章号全覆盖 / 伏笔「收无埋」/ 词级忠实抽查（随机 3 章 bigram 零命中即 FAIL）
2. 用户侧红线：忠实原文、章号以正文为准、缺章跳过、伏笔宁缺毋滥标「待考」
3. 源文真实缺口（2026-08-13 审计 + 2026-08-14 复核确认）：2664-2669 + 2674-2973 共 306 章——末卷源文章号在 2673 后跳变至 2974；chapters.json gaps_after 已同步修正
4. digest 校验断档修复（2026-08-14）：末槽 2974-3010 的 digest 被拆成 `digest-2974-3000.md` + `digest-3001-3010.md`（Kimi 批次 15/16），manifest 原引用不存在的 `digest-2974-3010.md` 导致 step2 静默跳过最后 37 章；现 manifest 引用双文件、step2 支持 digest 列表合并校验、step0 内置 `DIGEST_OVERRIDES` 防回退
5. 缺口占位 digest：`chapters/digest-2674-2973.md` 已建，标记源文缺失（无正文不可填），跨缺口伏笔连续性需在 ch2673/ch2974 两端人工核对

## 终态

anchors.json 定稿 → 接入游戏引擎（J35 v0.5：管线接线 + 分支深化 + Director 实装）
