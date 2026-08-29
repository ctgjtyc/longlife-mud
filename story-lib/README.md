# story-lib 三库一体（J35 v0.3.1）

- `scenarios/` 剧本存储库：题材模块（xiuxian 当前 / xuniqinru 预留），每模块 config.json + anchors.json + chapters/
- `saves-lib/` 存档库：存档导出 Base64 + 导入校验（复用 migrateSave 管线，P6 实施）
- `bio-lib/` 传记库：生平年表导出（对接拾光 /api/diary → personal 域，M4 实施）
- 锚点协议：anchors.json = 剧情定位核心（关键词+触发+摘要+批次位置），游戏内 bigram 定位、创作期语义检索（:7423/bge-m3）双通道
- 架构全文：d:\AI-Qoder\v0.3-剧情架构与AI交互方案.md
