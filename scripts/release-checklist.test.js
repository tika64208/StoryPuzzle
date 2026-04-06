const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateReleaseChecklist } = require('../services/release');

test('release checklist blocks placeholder production config', () => {
  const checklist = evaluateReleaseChecklist({
    runtimeConfig: {
      enableTelemetry: true,
      enableErrorLog: true,
      enableMockAd: true,
      rewardedVideoAdUnitId: 'replace-with-your-rewarded-video-ad-unit-id',
      interstitialAdUnitId: 'replace-with-your-interstitial-ad-unit-id',
      logUploadUrl: ''
    },
    legalConfig: {
      companyName: '待填写主体名称',
      contactEmail: '待填写联系邮箱',
      supportWechat: '待填写客服微信',
      effectiveDate: '2026-04-04'
    },
    appId: '',
    logStats: {
      total: 0,
      events: 0,
      errors: 0
    }
  });

  assert.equal(checklist.summary.canRelease, false);
  assert.ok(checklist.summary.blocking >= 7);
  assert.ok(checklist.blockingItems.some((item) => item.label === '激励视频广告位'));
  assert.ok(checklist.blockingItems.some((item) => item.label === '插屏广告位'));
  assert.ok(checklist.blockingItems.some((item) => item.label === '关闭模拟广告'));
  assert.ok(checklist.blockingItems.some((item) => item.label === '主体名称'));
  assert.ok(checklist.blockingItems.some((item) => item.label === '联系邮箱'));
  assert.ok(checklist.blockingItems.some((item) => item.label === '客服微信'));
  assert.ok(checklist.blockingItems.some((item) => item.label === '日志上报地址'));
});

test('release checklist allows complete production config', () => {
  const checklist = evaluateReleaseChecklist({
    runtimeConfig: {
      enableTelemetry: true,
      enableErrorLog: true,
      enableMockAd: false,
      rewardedVideoAdUnitId: 'adunit-123',
      interstitialAdUnitId: 'adunit-456',
      logUploadUrl: 'https://logs.example.com/wechat/minigame'
    },
    legalConfig: {
      companyName: '杭州谜境网络科技有限公司',
      contactEmail: 'support@example.com',
      supportWechat: 'mijing-support',
      effectiveDate: '2026-04-04'
    },
    appId: 'wxa1fb6e395f1b7cdf',
    logStats: {
      total: 30,
      events: 24,
      errors: 2
    }
  });

  assert.equal(checklist.summary.canRelease, true);
  assert.equal(checklist.summary.blocking, 0);
  assert.equal(checklist.blockingItems.length, 0);
  assert.ok(checklist.readyItems.some((item) => item.label === '日志上报地址'));
});
