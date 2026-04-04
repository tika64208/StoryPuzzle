const runtime = require('../config/runtime');

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
  return new Promise((resolve) => {
    wx.showModal({
      title: '激励广告占位',
      content: `当前处于开发版。点击“继续”可模拟看完广告，领取${scene}奖励。`,
      confirmText: '继续',
      cancelText: '取消',
      success(res) {
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

  return new Promise((resolve) => {
    const closeHandler = (res) => {
      ad.offClose(closeHandler);
      resolve(!res || !!res.isEnded);
    };

    ad.onClose(closeHandler);
    ad
      .show()
      .catch(() => ad.load().then(() => ad.show()))
      .catch(() => {
        ad.offClose(closeHandler);
        showMockReward(scene).then(resolve);
      });
  });
}

module.exports = {
  showRewardedAction
};
