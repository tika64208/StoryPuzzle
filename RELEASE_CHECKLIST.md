# 谜境拼图发布清单

## 代码内已补齐

- `pages/legal/index`
  - 隐私政策页
  - 用户协议页
  - 发布检查页
- `services/logger.js`
  - 基础埋点
  - 错误日志
  - 运行日志导出
- `services/release.js`
  - 广告、协议、日志、主体信息的发布检查
- `pages/center/index`
  - 隐私/协议/发布检查入口
  - 运行日志复制与清空入口
- `app.js`
  - `onLaunch`
  - `onShow`
  - `onHide`
  - `onError`
  - `onUnhandledRejection`
  - `onPageNotFound`

## 发布前仍需你填写

- `config/legal.js`
  - `companyName`
  - `contactEmail`
  - `supportWechat`
- `config/runtime.js`
  - `rewardedVideoAdUnitId`
  - `interstitialAdUnitId`
  - `logUploadUrl`，如果你需要远端日志上报
  - 把 `enableMockAd` 改成 `false`

## 微信公众平台仍需补齐

- 用户隐私保护指引
- 适龄提示
- 小程序备案
- 游戏类目与审核信息
- 图标、分享图、简介、名称校验

## 提审前建议自测

- 从首页到系统关卡完整通关一局
- 自定义谜境生成、导入、删除各走一遍
- 补给站里打开隐私政策、用户协议、发布检查
- 复制一次运行日志，确认能成功导出
- 真机确认广告位、体力、签到、复活逻辑

## 当前最关键的阻塞项

1. 真实广告位还没填
2. 主体名称和联系信息还是占位
3. 远端日志上报还没接
