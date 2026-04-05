# 谜境拼图

微信小游戏版剧情拼图项目，当前已完成首发版主链路。产品方向是“剧情包装拼图 + 自定义照片谜境”，支持系统章节闯关，也支持玩家把自己的图片生成关卡。

## 当前版本

- 项目名称：`谜境拼图`
- AppID：`wxa1fb6e395f1b7cdf`
- 工程类型：微信小游戏
- 入口文件：`game.js`、`game.json`
- 主要运行代码：`minigame/app.js`

## 首发版已完成

- 首页、章节页、关卡页、游戏页、结算页、补给站、法律页的小游戏 UI
- 系统剧情章节
  - 当前共 `4` 章、`19` 关
  - 第一章为 `倩女幽魂`
  - `ch01 ~ ch03` 已补齐剧情图资源
- 拼图玩法
  - 拖拽碎片
  - 相邻且关系正确时可组成碎片组一起拖拽
  - 拼块吸附、荧光描边、微位移动画
  - 通关后停留欣赏原图，不立即跳出
- 道具系统
  - `提示`
  - `定格符`
  - `引路符`
  - 失败复活
- 资源系统
  - 体力
  - 金币
  - 每日签到
  - 调试版体力快速恢复
- 自定义谜境
  - 相册选图
  - 默认样图生成
  - 多种切片规格
  - 谜境码复制、导入、再次游玩
- 体验包装
  - 深海透明拟态风格
  - 页面切换动效
  - 拼图粒子反馈
  - 音效与环境氛围音
- 上线基础能力
  - 隐私摘要
  - 用户协议
  - 发布检查页
  - 基础日志与错误记录

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
```

## 如何打开

1. 用微信开发者工具导入目录 `f:\ai\pintu`
2. 确认工程识别为“小游戏”
3. 如有缓存问题，执行“清缓存并重新编译”
4. 直接从首页进入首章或章节选关

## 调试说明

- 当前 `project.config.json` 已配置为小游戏工程
- 为避免小游戏打包报错，原小程序遗留文件已通过 `packOptions.ignore` 排除
- 调试环境下体力按分钟恢复，便于真机验证玩法循环
- 广告未接真实广告位时，会走模拟广告逻辑

## 当前分享方式

- 已支持：`谜境码`
  - 玩家生成自定义谜境后复制谜境码
  - 好友在自定义页导入后即可游玩
- 尚未支持：`一键转发后直达同一张图片`
  - 这部分需要后续补云存储或后端分享能力

## 发布前还需要补的内容

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

## 下一步建议

1. 接入真实广告位和日志上报
2. 完成平台侧隐私、备案、提审资料
3. 升级自定义谜境分享为云端直玩
4. 继续增强异形碎片和更强剧情包装
