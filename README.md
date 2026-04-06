# 谜境拼图

微信小游戏版剧情拼图项目，当前主版本为“倩女幽魂·双生局”剧情线。产品方向是“剧情包装拼图 + 自定义照片谜境”，支持系统章节闯关，也支持玩家把自己的图片生成可分享的关卡。

## 当前版本

- 项目名称：`谜境拼图`
- AppID：`wxa1fb6e395f1b7cdf`
- 工程类型：微信小游戏
- 入口文件：`game.js`、`game.json`
- 主要运行代码：`minigame/app.js`
- 文档同步日期：`2026-04-06`

## 当前已实现

### 主线内容

- 当前系统章节为 `1` 章、`16` 关
- 章节名称：`倩女幽魂·双生局`
- 支持章节旁白、关卡开场剧情、通关后原图欣赏与剧情揭晓
- 上述章节数、关卡数与当前主线名称以 `data/levels.js` 为准，并由脚本测试自动校验

### 拼图玩法

- 拖拽碎片完成拼图
- 相邻且关系正确的碎片会自动编组并一起拖拽
- 拼块吸附、描边反馈、拼合动画、通关庆祝效果
- 失败复活、下一关、重新挑战等完整闭环

### 难度系统

- 每个章节可选择 `3 星 / 4 星 / 5 星` 难度
- 难度分别对应 `3x3 / 4x4 / 5x5` 碎片规格
- 玩家可在章节列表页或章节开场弹层中主动选择难度
- 难度按章节保存到本地存档，下次进入会沿用上次选择

### 得分与排行

- 章节 `3 星` 挑战记 `3` 分，`4 星` 记 `4` 分，`5 星` 记 `5` 分
- 每个关卡只记录历史最高挑战分，避免重复刷分累计
- 总挑战分会写入本地存档，并同步到微信好友排行
- 首页和结算页会展示当前挑战分与总挑战分

### 系统与资源

- 道具系统：`提示`、`定格符`、`引路符`
- 资源系统：`体力`、`金币`、`每日签到`
- 设置系统：`音效开关`、`震动开关`
- 补给中心：激励奖励、日志清理、系统入口

### 自定义谜境

- 相册选图
- 默认样图生成
- 多种切片规格
- 谜境码复制、导入、再次游玩

### 合规与上线能力

- 隐私摘要
- 用户协议
- 发布检查页
- 基础日志与错误记录

## 真实运行结构

当前真正参与小游戏打包和运行的是小游戏链路：

- `game.js`
- `game.json`
- `minigame/app.js`
- `assets/`
- `config/`
- `data/`
- `services/`
- `utils/`

其中：

- `minigame/app.js` 负责首页、章节页、拼图页、结算页、排行页、设置页等主要界面与交互
- `utils/storage.js` 负责体力、金币、进度、章节难度、挑战分等本地存档
- `utils/game.js` 负责拼图核心算法与拖拽、拼合、完成判断
- `services/level-repo.js` 负责系统关卡与自定义谜境的统一读取

## 项目结构

```text
game.js
game.json
minigame/
  app.js
assets/
  audio/
  story/
config/
  legal.js
  runtime.js
data/
  levels.js
  story-art.js
  story-prompt-library.js
services/
  ad.js
  audio.js
  custom-levels.js
  level-repo.js
  logger.js
  release.js
utils/
  game.js
  image.js
  storage.js
pages/
components/
scripts/
```

## 关于 `pages/` 与 `components/`

- 仓库中仍保留 `pages/`、`components/`、`app.json`、`app.js` 等页面版代码
- 当前小游戏工程已通过 `project.config.json -> packOptions.ignore` 将这些目录和文件排除出小游戏打包
- 因此调试和提审时，默认应以 `minigame/app.js` 这条运行链路为准

## 如何打开

1. 用微信开发者工具导入目录 `f:\ai\pintu`
2. 确认工程识别为“小游戏”
3. 如有缓存问题，执行“清缓存并重新编译”
4. 从首页进入继续游戏、章节选关、好友排行或设置系统

## 调试说明

- 当前 `project.config.json` 已配置为小游戏工程
- 调试环境下体力按分钟恢复，便于验证玩法循环
- 广告未接真实广告位时，会走模拟广告逻辑
- 好友排行在开发者工具中可能降级，建议在真机微信环境下验证

## 当前分享方式

- 已支持：`谜境码`
  - 玩家生成自定义谜境后复制谜境码
  - 好友在自定义页导入后即可游玩
- 已支持：主动分享首页或关卡卡片
- 尚未支持：一键分享后直接云端打开同一张自定义图片

## 发布前仍需补齐的配置

### 必填配置

- `config/legal.js`
  - `companyName`
  - `contactEmail`
  - `supportWechat`
- `config/runtime.js`
  - `rewardedVideoAdUnitId`
  - `interstitialAdUnitId`
  - `logUploadUrl`
  - 将 `enableMockAd` 改为 `false`

### 平台侧待完成

- 微信公众平台隐私指引
- 适龄提示
- 小游戏备案
- 游戏类目与审核信息
- 图标、分享图、简介等提审素材

## 相关文档

- 迁移记录：`MINIGAME_MIGRATION.md`
- 发布检查清单：`RELEASE_CHECKLIST.md`
- 提审文案：`SUBMISSION_NOTES.md`

## 下一步建议

1. 接入真实广告位和日志上报
2. 完成平台侧隐私、备案、提审资料
3. 升级自定义谜境分享为云端直玩
4. 继续增强剧情包装、难度差异和排行展示表现
