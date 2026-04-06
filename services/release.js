const legal = require('../config/legal');
const runtime = require('../config/runtime');
const logger = require('./logger');

const PLACEHOLDER_PREFIXES = ['待填写', 'replace-with-your'];

function normalizeText(value) {
  return String(value || '').trim();
}

function isPlaceholder(value) {
  const text = normalizeText(value);
  if (!text) {
    return true;
  }

  return PLACEHOLDER_PREFIXES.some((prefix) => text.indexOf(prefix) === 0);
}

function buildItem(label, ready, detail, options) {
  const nextOptions = options || {};
  const required = nextOptions.required !== false;
  return {
    label,
    ready: !!ready,
    detail,
    required,
    blocking: required && !ready
  };
}

function evaluateReleaseChecklist(context) {
  const {
    runtimeConfig = {},
    legalConfig = {},
    appId = '',
    logStats = { total: 0, events: 0, errors: 0 }
  } = context || {};

  const telemetryEnabled = !!runtimeConfig.enableTelemetry;
  const errorLogEnabled = !!runtimeConfig.enableErrorLog;
  const uploadRequired = telemetryEnabled || errorLogEnabled;

  const items = [
    buildItem('AppID 已接入', !!normalizeText(appId), normalizeText(appId) || '当前未获取到 AppID'),
    buildItem(
      '激励视频广告位',
      !isPlaceholder(runtimeConfig.rewardedVideoAdUnitId),
      !isPlaceholder(runtimeConfig.rewardedVideoAdUnitId)
        ? '已填写真实激励视频广告位'
        : '仍在使用占位激励视频广告位 ID'
    ),
    buildItem(
      '插屏广告位',
      !isPlaceholder(runtimeConfig.interstitialAdUnitId),
      !isPlaceholder(runtimeConfig.interstitialAdUnitId)
        ? '已填写真实插屏广告位'
        : '仍在使用占位插屏广告位 ID'
    ),
    buildItem(
      '关闭模拟广告',
      runtimeConfig.enableMockAd === false,
      runtimeConfig.enableMockAd === false ? '发布态不会再走模拟广告弹窗' : '当前仍开启了模拟广告'
    ),
    buildItem(
      '隐私政策页面',
      true,
      `已内置隐私页面；生效日期 ${normalizeText(legalConfig.effectiveDate) || '未填写'}`,
      { required: false }
    ),
    buildItem('用户协议页面', true, '已内置用户协议页面', { required: false }),
    buildItem(
      '主体名称',
      !isPlaceholder(legalConfig.companyName),
      isPlaceholder(legalConfig.companyName) ? '请填写真实主体名称' : normalizeText(legalConfig.companyName)
    ),
    buildItem(
      '联系邮箱',
      !isPlaceholder(legalConfig.contactEmail),
      isPlaceholder(legalConfig.contactEmail) ? '请填写对外联系邮箱' : normalizeText(legalConfig.contactEmail)
    ),
    buildItem(
      '客服微信',
      !isPlaceholder(legalConfig.supportWechat),
      isPlaceholder(legalConfig.supportWechat) ? '请填写客服微信或客服渠道' : normalizeText(legalConfig.supportWechat)
    ),
    buildItem(
      '基础埋点',
      telemetryEnabled,
      telemetryEnabled ? `已启用，当前累计事件 ${Number(logStats.events) || 0} 条` : '当前未启用埋点',
      { required: false }
    ),
    buildItem(
      '错误日志',
      errorLogEnabled,
      errorLogEnabled ? `已启用，当前累计错误 ${Number(logStats.errors) || 0} 条` : '当前未启用错误日志',
      { required: false }
    ),
    buildItem(
      '日志上报地址',
      !isPlaceholder(runtimeConfig.logUploadUrl),
      !isPlaceholder(runtimeConfig.logUploadUrl)
        ? normalizeText(runtimeConfig.logUploadUrl)
        : uploadRequired
          ? '当前尚未配置远端日志上报地址'
          : '当前未启用远端日志上报',
      { required: uploadRequired }
    )
  ];

  const readyItems = items.filter((item) => item.ready);
  const pendingItems = items.filter((item) => !item.ready);
  const blockingItems = items.filter((item) => item.blocking);
  const canRelease = blockingItems.length === 0;

  const tips = [
    '提审前请同步在微信公众平台补齐用户隐私保护指引、适龄提示和备案信息。',
    canRelease
      ? '当前阻塞项已清空，可以继续做真机回归和提审资料整理。'
      : '请先补齐阻塞项，再进入微信公众平台提审流程。',
    runtimeConfig.enableMockAd === false
      ? '广告已切到发布态，记得再做一次真机广告链路验证。'
      : '广告位切真实 ID 后，记得把 enableMockAd 改成 false。'
  ];

  return {
    summary: {
      total: items.length,
      ready: readyItems.length,
      pending: pendingItems.length,
      blocking: blockingItems.length,
      canRelease
    },
    items,
    readyItems,
    pendingItems,
    blockingItems,
    tips
  };
}

function safeGetAppId() {
  try {
    if (!global.wx || !wx.getAccountInfoSync) {
      return '';
    }
    const account = wx.getAccountInfoSync();
    const runtimeInfo = (account && (account.miniProgram || account.miniGame)) || {};
    return normalizeText(runtimeInfo.appId);
  } catch (error) {
    logger.captureError('release_get_app_id', error);
    return '';
  }
}

function getReleaseChecklist() {
  return evaluateReleaseChecklist({
    runtimeConfig: runtime,
    legalConfig: legal,
    appId: safeGetAppId(),
    logStats: logger.getLogStats()
  });
}

module.exports = {
  evaluateReleaseChecklist,
  getReleaseChecklist,
  isPlaceholder
};
