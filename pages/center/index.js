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

  handleToggleSound(event) {
    storage.saveSoundEnabled(event.detail.value);
    logger.trackEvent('center_toggle_sound', {
      enabled: !!event.detail.value
    });
    this.refresh();
  },

  handleCustom() {
    logger.trackEvent('center_open_custom');
    wx.navigateTo({
      url: '/pages/custom/index'
    });
  },

  handleOpenPrivacy() {
    logger.trackEvent('center_open_privacy');
    wx.navigateTo({
      url: '/pages/legal/index?type=privacy'
    });
  },

  handleOpenAgreement() {
    logger.trackEvent('center_open_agreement');
    wx.navigateTo({
      url: '/pages/legal/index?type=agreement'
    });
  },

  handleOpenReleaseChecklist() {
    logger.trackEvent('center_open_release_checklist');
    wx.navigateTo({
      url: '/pages/legal/index?type=release'
    });
  },

  handleCopyLogs() {
    const exportText = logger.buildExportText(80);
    wx.setClipboardData({
      data: exportText,
      success: () => {
        logger.trackEvent('center_copy_logs');
        wx.showToast({
          title: '运行日志已复制',
          icon: 'none'
        });
      }
    });
  },

  handleClearLogs() {
    wx.showModal({
      title: '清空运行日志',
      content: '清空后将移除本地埋点和错误日志记录，方便重新开始排查。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        logger.clearLogs();
        logger.trackEvent('center_clear_logs');
        wx.showToast({
          title: '运行日志已清空',
          icon: 'none'
        });
      }
    });
  }
});
