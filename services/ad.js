const runtime = require('../config/runtime');
const logger = require('./logger');

let rewardedVideoAd = null;

function getRewardedVideoAd() {
  if (
    runtime.enableMockAd ||
    !wx.createRewardedVideoAd ||
    !runtime.rewardedVideoAdUnitId ||
    runtime.rewardedVideoAdUnitId.indexOf('replace-with-your') === 0
  ) {
    return null;
  }

  if (!rewardedVideoAd) {
    rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: runtime.rewardedVideoAdUnitId
    });
  }

  return rewardedVideoAd;
}

function showMockReward(scene) {
  logger.trackEvent('ad_mock_show', {
    scene
  });

  return new Promise((resolve) => {
    wx.showModal({
      title: '激励广告占位',
      content: `当前处于开发版。点击“继续”可模拟看完广告，领取${scene}奖励。`,
      confirmText: '继续',
      cancelText: '取消',
      success(res) {
        logger.trackEvent('ad_mock_close', {
          scene,
          granted: !!res.confirm
        });
        resolve(!!res.confirm);
      }
    });
  });
}

function showRewardedAction(scene) {
  const ad = getRewardedVideoAd();
  if (!ad) {
    return showMockReward(scene);
  }

  logger.trackEvent('ad_rewarded_request', {
    scene
  });

  return new Promise((resolve) => {
    const closeHandler = (res) => {
      ad.offClose(closeHandler);
      const granted = !res || !!res.isEnded;
      logger.trackEvent('ad_rewarded_close', {
        scene,
        granted
      });
      resolve(granted);
    };

    ad.onClose(closeHandler);
    ad
      .show()
      .catch(() => ad.load().then(() => ad.show()))
      .catch((error) => {
        ad.offClose(closeHandler);
        logger.captureError('ad_rewarded_fallback', error, {
          scene
        });
        showMockReward(scene).then(resolve);
      });
  });
}

module.exports = {
  showRewardedAction
};
