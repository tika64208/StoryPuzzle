const legal = require('../config/legal');
const runtime = require('../config/runtime');
const logger = require('./logger');

function isPlaceholder(value) {
  const text = String(value || '').trim();
  if (!text) {
    return true;
  }

  return text.indexOf('待填写') === 0 || text.indexOf('replace-with-your') === 0;
}

function buildItem(label, ready, detail) {
  return {
    label,
    ready: !!ready,
    detail
  };
}

function getReleaseChecklist() {
  const logStats = logger.getLogStats();
  const appRuntime = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
  const runtimeInfo = (appRuntime && (appRuntime.miniProgram || appRuntime.miniGame)) || {};
  const appId = runtimeInfo.appId || '';

  const items = [
    buildItem('AppID 已接入', !!appId, appId || '当前未获取到 AppID'),
    buildItem(
      '激励视频广告位',
      !isPlaceholder(runtime.rewardedVideoAdUnitId),
      !isPlaceholder(runtime.rewardedVideoAdUnitId)
        ? '已填写真实激励视频广告位'
        : '仍在使用占位广告位 ID'
    ),
    buildItem(
      '插屏广告位',
      !isPlaceholder(runtime.interstitialAdUnitId),
      !isPlaceholder(runtime.interstitialAdUnitId)
        ? '已填写真实插屏广告位'
        : '仍在使用占位插屏广告位 ID'
    ),
    buildItem(
      '关闭模拟广告',
      runtime.enableMockAd === false,
      runtime.enableMockAd === false ? '发布态不会再走模拟广告弹窗' : '当前仍开启了模拟广告'
    ),
    buildItem(
      '隐私政策页面',
      true,
      `已内置隐私页面；生效日期 ${legal.effectiveDate}`
    ),
    buildItem(
      '用户协议页面',
      true,
      '已内置用户协议页面'
    ),
    buildItem(
      '主体名称',
      !isPlaceholder(legal.companyName),
      isPlaceholder(legal.companyName) ? '请填写真实主体名称' : legal.companyName
    ),
    buildItem(
      '联系邮箱',
      !isPlaceholder(legal.contactEmail),
      isPlaceholder(legal.contactEmail) ? '请填写对外联系邮箱' : legal.contactEmail
    ),
    buildItem(
      '客服微信',
      !isPlaceholder(legal.supportWechat),
      isPlaceholder(legal.supportWechat) ? '请填写客服微信或客服渠道' : legal.supportWechat
    ),
    buildItem(
      '基础埋点',
      runtime.enableTelemetry,
      runtime.enableTelemetry ? `已启用，当前累计事件 ${logStats.events} 条` : '当前未启用埋点'
    ),
    buildItem(
      '错误日志',
      runtime.enableErrorLog,
      runtime.enableErrorLog ? `已启用，当前累计错误 ${logStats.errors} 条` : '当前未启用错误日志'
    ),
    buildItem(
      '日志上报地址',
      !isPlaceholder(runtime.logUploadUrl),
      isPlaceholder(runtime.logUploadUrl)
        ? '当前仅支持本地复制日志，尚未配置远端上报地址'
        : runtime.logUploadUrl
    )
  ];

  const readyItems = items.filter((item) => item.ready);
  const pendingItems = items.filter((item) => !item.ready);

  return {
    summary: {
      total: items.length,
      ready: readyItems.length,
      pending: pendingItems.length
    },
    readyItems,
    pendingItems,
    tips: [
      '提审前请同步在微信公众平台补全用户隐私保护指引、适龄提示和备案信息。',
      '如果要正式打开广告，请把激励视频和插屏广告位都换成真实 ID，并关闭 enableMockAd。',
      '如果后续要接线上故障排查，建议把 logUploadUrl 指向你自己的日志接收服务。'
    ]
  };
}

module.exports = {
  getReleaseChecklist
};
