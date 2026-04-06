// Legacy page-based implementation kept for reference and filing support only.
// The actual mini-game runtime entry is `game.js` -> `minigame/app.js`.
const runtime = require('../../config/runtime');
const adService = require('../../services/ad');
const logger = require('../../services/logger');
const storage = require('../../utils/storage');

Page({
  data: {
    profile: null,
    energyText: '',
    hasRealAdUnit: false
  },

  onShow() {
    logger.trackEvent('center_view');
    this.refresh();
    this.startEnergyTicker();
  },

  onHide() {
    this.stopEnergyTicker();
  },

  onUnload() {
    this.stopEnergyTicker();
  },

  startEnergyTicker() {
    this.stopEnergyTicker();
    this.energyTimer = setInterval(() => {
      const profile = storage.getProfile();
      this.setData({
        profile,
        energyText: storage.getEnergyCountdownText(profile)
      });
    }, 1000);
  },

  stopEnergyTicker() {
    if (this.energyTimer) {
      clearInterval(this.energyTimer);
      this.energyTimer = null;
    }
  },

  refresh() {
    const profile = storage.getProfile();
    this.setData({
      profile,
      energyText: storage.getEnergyCountdownText(profile),
      hasRealAdUnit:
        !!runtime.rewardedVideoAdUnitId &&
        runtime.rewardedVideoAdUnitId.indexOf('replace-with-your') !== 0
    });
  },

  handleSignIn() {
    logger.trackEvent('center_sign_in_tap');
    const result = storage.claimDailySignIn();
    if (!result.ok) {
      wx.showToast({
        title: '今天已经签到过了',
        icon: 'none'
      });
      return;
    }

    this.refresh();
    wx.showToast({
      title: '+3 体力 +1 定格符 +1 引路符',
      icon: 'none'
    });
  },

  handleWatchAd() {
    logger.trackEvent('center_watch_energy_ad_tap');
    adService.showRewardedAction('2 点体力').then((granted) => {
      if (!granted) {
        logger.trackEvent('center_watch_energy_ad_cancel');
        return;
      }
      storage.addEnergy(2);
      logger.trackEvent('center_watch_energy_ad_reward');
      this.refresh();
      wx.showToast({
        title: '体力 +2',
        icon: 'none'
      });
    });
  },

  handleWatchUnlockAd() {
    logger.trackEvent('center_watch_unlock_ad_tap');
    adService.showRewardedAction('1 个定格符').then((granted) => {
      if (!granted) {
        logger.trackEvent('center_watch_unlock_ad_cancel');
        return;
      }
      storage.addUnlockDragTools(1);
      logger.trackEvent('center_watch_unlock_ad_reward');
      this.refresh();
      wx.showToast({
        title: '定格符 +1',
        icon: 'none'
      });
    });
  },

  handleWatchGuideAd() {
    logger.trackEvent('center_watch_guide_ad_tap');
    adService.showRewardedAction('1 个引路符').then((granted) => {
      if (!granted) {
        logger.trackEvent('center_watch_guide_ad_cancel');
        return;
      }
      storage.addGuideHintTools(1);
      logger.trackEvent('center_watch_guide_ad_reward');
      this.refresh();
      wx.showToast({
        title: '引路符 +1',
        icon: 'none'
      });
    });
  },

  handleCustom() {
    logger.trackEvent('center_open_custom');
    wx.navigateTo({
      url: '/pages/custom/index'
    });
  },

  handleOpenSettings() {
    logger.trackEvent('center_open_settings');
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  },

  handleOpenInfo() {
    logger.trackEvent('center_open_info');
    wx.navigateTo({
      url: '/pages/info/index'
    });
  }
});
